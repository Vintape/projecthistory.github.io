import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import unicodedata
from contextlib import closing, contextmanager
from pathlib import Path


SESSION_MAX_AGE = 30 * 24 * 60 * 60
PASSWORD_ITERATIONS = 600_000
EMAIL_PATTERN = re.compile(r"[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+")
TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9_-]{43}")
ROUTE_FIELDS = ("id", "title", "overview", "stops", "format")


def _payload(value):
    if not isinstance(value, dict):
        raise ValueError("Проверьте данные формы.")
    return value


def _text(value, limit, message, *, required=False):
    if value is None and not required:
        return ""
    if not isinstance(value, str):
        raise ValueError(message)
    normalized = unicodedata.normalize("NFC", " ".join(value.split()))
    if len(normalized) > limit or not normalized.isprintable() or (required and not normalized):
        raise ValueError(message)
    return normalized


def _email(value):
    message = "Введите адрес электронной почты."
    email = _text(value, 254, message, required=True).casefold()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        raise ValueError(message)
    return email


def _password(value):
    if not isinstance(value, str) or not 8 <= len(value) <= 256:
        raise ValueError("Пароль должен содержать от 8 до 256 символов.")
    try:
        return value.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ValueError("Введите пароль заново.") from error


def _child_age(value):
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        if re.fullmatch(r"[0-9]{1,2}", value):
            value = int(value)
    if value is None or (type(value) is int and 0 <= value <= 18):
        return value
    raise ValueError("Укажите возраст ребёнка от 0 до 18 лет.")


def _profile_fields(payload):
    fields = {}
    if "name" in payload:
        fields["name"] = _text(payload["name"], 100, "Введите имя длиной до 100 символов.", required=True)
    if "childAge" in payload:
        fields["child_age"] = _child_age(payload["childAge"])
    if "ancestorPlace" in payload:
        fields["ancestor_place"] = _text(payload["ancestorPlace"], 160, "Укажите место предков длиной до 160 символов.")
    return fields


def _token_hash(token):
    if isinstance(token, str) and TOKEN_PATTERN.fullmatch(token):
        return hashlib.sha256(token.encode("ascii")).digest()
    return None


class Accounts:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
        os.close(os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600))
        with self._connect() as connection:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash BLOB NOT NULL,
                    password_salt BLOB NOT NULL,
                    password_iterations INTEGER NOT NULL,
                    child_age INTEGER CHECK (child_age BETWEEN 0 AND 18),
                    ancestor_place TEXT NOT NULL DEFAULT ''
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash BLOB PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    expires_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS saved_routes (
                    id INTEGER PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    route_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    UNIQUE (account_id, route_id)
                );
            """)

    @contextmanager
    def _connect(self):
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys = ON")
            yield connection

    @staticmethod
    def _public_profile(connection, account):
        routes = connection.execute(
            "SELECT data FROM saved_routes WHERE account_id = ? ORDER BY id DESC", (account["id"],)
        )
        return {
            "name": account["name"],
            "email": account["email"],
            "childAge": account["child_age"],
            "ancestorPlace": account["ancestor_place"],
            "routes": [json.loads(row["data"]) for row in routes],
        }

    @staticmethod
    def _start_session(connection, account_id):
        now = int(time.time())
        token = secrets.token_urlsafe(32)
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        connection.execute(
            "INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)",
            (_token_hash(token), account_id, now + SESSION_MAX_AGE),
        )
        return token

    @staticmethod
    def _session_account(connection, token):
        token_hash = _token_hash(token)
        if token_hash is None:
            return None
        return connection.execute("""
            SELECT accounts.id, name, email, child_age, ancestor_place
            FROM sessions JOIN accounts ON accounts.id = sessions.account_id
            WHERE token_hash = ? AND expires_at > ?
        """, (token_hash, int(time.time()))).fetchone()

    @contextmanager
    def _authenticated_write(self, token):
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            account = self._session_account(connection, token)
            if account is None:
                raise PermissionError("Войдите в семейный кабинет.")
            yield connection, account

    def register(self, payload):
        payload = _payload(payload)
        fields = _profile_fields(payload)
        if "name" not in fields:
            raise ValueError("Введите имя длиной до 100 символов.")
        email = _email(payload.get("email"))
        password = _password(payload.get("password"))
        salt = secrets.token_bytes(16)
        password_hash = hashlib.pbkdf2_hmac("sha256", password, salt, PASSWORD_ITERATIONS)
        with self._connect() as connection:
            cursor = connection.execute("""
                INSERT INTO accounts (
                    name, email, password_hash, password_salt, password_iterations, child_age, ancestor_place
                ) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (email) DO NOTHING
            """, (fields["name"], email, password_hash, salt, PASSWORD_ITERATIONS,
                  fields.get("child_age"), fields.get("ancestor_place", "")))
            if cursor.rowcount == 0:
                raise ValueError("Аккаунт с такой почтой уже существует. Войдите в кабинет.")
            account = connection.execute("SELECT * FROM accounts WHERE id = ?", (cursor.lastrowid,)).fetchone()
            token = self._start_session(connection, account["id"])
            return self._public_profile(connection, account), token

    def login(self, payload):
        payload = _payload(payload)
        email = _email(payload.get("email"))
        password = _password(payload.get("password"))
        with self._connect() as connection:
            account = connection.execute("SELECT * FROM accounts WHERE email = ?", (email,)).fetchone()
            salt = account["password_salt"] if account else bytes(16)
            iterations = account["password_iterations"] if account else PASSWORD_ITERATIONS
            candidate = hashlib.pbkdf2_hmac("sha256", password, salt, iterations)
            if account is None or not hmac.compare_digest(candidate, account["password_hash"]):
                raise PermissionError("Проверьте почту и пароль.")
            token = self._start_session(connection, account["id"])
            current = self._session_account(connection, token)
            return self._public_profile(connection, current), token

    def get(self, token):
        with self._connect() as connection:
            connection.execute("BEGIN")
            account = self._session_account(connection, token)
            return self._public_profile(connection, account) if account else None

    def logout(self, token):
        token_hash = _token_hash(token)
        if token_hash is not None:
            with self._connect() as connection:
                connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))

    def update(self, token, payload):
        with self._authenticated_write(token) as (connection, account):
            fields = _profile_fields(_payload(payload))
            if fields:
                account = {**dict(account), **fields}
                connection.execute("""
                    UPDATE accounts SET name = ?, child_age = ?, ancestor_place = ? WHERE id = ?
                """, (account["name"], account["child_age"], account["ancestor_place"], account["id"]))
            return self._public_profile(connection, account)

    def save_route(self, token, route):
        with self._authenticated_write(token) as (connection, account):
            if not isinstance(route, dict) or not all(field in route for field in ROUTE_FIELDS):
                raise ValueError("Не удалось сохранить маршрут.")
            route_id = _text(route["id"], 128, "Не удалось сохранить маршрут.", required=True)
            snapshot = {field: route[field] for field in ROUTE_FIELDS}
            snapshot["id"] = route_id
            try:
                data = json.dumps(snapshot, ensure_ascii=True, allow_nan=False)
            except (TypeError, ValueError) as error:
                raise ValueError("Не удалось сохранить маршрут.") from error
            connection.execute("""
                INSERT INTO saved_routes (account_id, route_id, data) VALUES (?, ?, ?)
                ON CONFLICT (account_id, route_id) DO UPDATE SET data = excluded.data
            """, (account["id"], route_id, data))
            return self._public_profile(connection, account)

    def remove_route(self, token, route_id):
        with self._authenticated_write(token) as (connection, account):
            route_id = _text(route_id, 128, "Укажите маршрут, который нужно удалить.", required=True)
            connection.execute(
                "DELETE FROM saved_routes WHERE account_id = ? AND route_id = ?", (account["id"], route_id)
            )
            return self._public_profile(connection, account)
