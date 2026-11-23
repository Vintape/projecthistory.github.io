"""Run the local Perovoistochnik web application."""

import argparse
from functools import partial
from getpass import getpass
from hashlib import sha256
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import ssl
import sys
from tempfile import NamedTemporaryFile
from urllib.parse import urlsplit

from cultures import EXHIBITS, recommend_exhibit
from pilot import answer_guide, cloud_available, get_catalog, plan_route
from pilot_accounts import Accounts, SESSION_MAX_AGE
from research import build_research

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
YANDEX_CONFIG = ROOT / ".runtime" / "yandex.json"
YANDEX_ENV = ("YANDEX_FOLDER_ID", "YANDEX_API_KEY")
SESSION_COOKIE = "pervoistochnik_session"


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; object-src 'none'; frame-ancestors 'none'; frame-src https://rutube.ru; media-src 'self' https://streammtk.prlib.ru; base-uri 'none'; form-action 'self'")
        super().end_headers()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def cookie(self, name):
        try:
            value = SimpleCookie(self.headers.get("Cookie", "")).get(name)
        except CookieError:
            return ""
        return value.value if value else ""

    def local_request(self):
        host = self.headers.get("Host", "")
        return host in self.server.allowed_hosts and self.headers.get("Origin", f"http://{host}") == f"http://{host}"

    def send_json(self, status, payload, cookie=None):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            name, token, age = cookie
            self.send_header("Set-Cookie", f"{name}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={age}")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ("/family.html", "/collection.html"):
            self.send_response(302)
            self.send_header("Location", "/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if not path.startswith("/api/"):
            super().do_GET()
            return
        if not self.local_request():
            self.send_json(403, {"error": "Откройте приложение по локальному адресу."})
            return
        if path == "/api/atlas":
            self.send_json(200, {**get_catalog(), "cloudAvailable": cloud_available()})
        elif path == "/api/profile":
            self.send_json(200, {"profile": self.server.accounts.get(self.cookie(SESSION_COOKIE))})
        elif path == "/api/exhibits":
            self.send_json(200, EXHIBITS)
        else:
            self.send_json(404, {"error": "Страница не найдена."})

    def do_POST(self):
        if not self.local_request():
            self.send_json(403, {"error": "Откройте приложение по локальному адресу."})
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json(415, {"error": "Ожидается JSON."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16_384:
                self.send_json(413, {"error": "Запрос слишком длинный или пустой."})
                return
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            self.send_json(400, {"error": "Проверьте данные формы."})
            return
        try:
            self.handle_action(urlsplit(self.path).path, data)
        except PermissionError as exc:
            self.send_json(401, {"error": str(exc)})
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})

    def handle_action(self, path, data):
        accounts = self.server.accounts
        token = self.cookie(SESSION_COOKIE)
        profile = accounts.get(token) if token else None
        if path == "/api/register" or path == "/api/login":
            action = accounts.register if path == "/api/register" else accounts.login
            profile, new_token = action(data)
            if token:
                accounts.logout(token)
            self.send_json(200, {"profile": profile}, (SESSION_COOKIE, new_token, SESSION_MAX_AGE))
        elif path == "/api/logout":
            accounts.logout(token)
            self.send_json(200, {"profile": None}, (SESSION_COOKIE, "", 0))
        elif path == "/api/profile":
            self.send_json(200, {"profile": accounts.update(token, data)})
        elif path == "/api/route" or path == "/api/routes":
            if path == "/api/routes" and not profile:
                raise PermissionError("Войдите в семейный кабинет, чтобы сохранить маршрут.")
            effective = dict(data)
            if profile:
                for key in ("ancestorPlace", "childAge"):
                    effective.setdefault(key, profile[key])
            route = plan_route(effective)
            if path == "/api/routes":
                fingerprint = json.dumps(route, sort_keys=True, ensure_ascii=False).encode()
                route["id"] = sha256(fingerprint).hexdigest()[:24]
                self.send_json(200, {"profile": accounts.save_route(token, route)})
            else:
                self.send_json(200, route)
        elif path == "/api/routes/remove":
            self.send_json(200, {"profile": accounts.remove_route(token, data.get("id"))})
        elif path == "/api/guide":
            self.send_json(200, answer_guide(data))
        elif path == "/api/recommend":
            interest = data.get("interest")
            self.send_json(200, {"id": recommend_exhibit(interest[:180]) if isinstance(interest, str) else None})
        elif path == "/api/research":
            self.send_json(200, build_research(data))
        else:
            self.send_json(404, {"error": "Страница не найдена."})

def configure_yandex():
    if not sys.stdin.isatty():
        raise SystemExit("Откройте Терминал для скрытого ввода API-ключа.")
    folder_id = input("ID каталога Yandex Cloud: ").strip()
    api_key = getpass("API-ключ Yandex AI Studio (ввод скрыт): ").strip()
    if any(not value or not value.isascii() or not value.isprintable() or
           any(character.isspace() for character in value) for value in (folder_id, api_key)):
        raise SystemExit("Введите ID каталога и API-ключ без пробелов.")
    YANDEX_CONFIG.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    with NamedTemporaryFile(mode="w", encoding="utf-8", dir=YANDEX_CONFIG.parent, delete=False) as file:
        temporary = Path(file.name)
        try:
            json.dump(dict(zip(YANDEX_ENV, (folder_id, api_key))), file)
            file.close()
            temporary.replace(YANDEX_CONFIG)
        finally:
            temporary.unlink(missing_ok=True)
    print("Настройки сохранены. Перезапустите сайт, чтобы подключить ЯндексGPT.")


def load_yandex_config():
    if any(os.environ.get(name) for name in YANDEX_ENV):
        return
    try:
        values = json.loads(YANDEX_CONFIG.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return
    except (OSError, ValueError):
        print("Настройки ЯндексGPT не прочитаны. Запустите app.py --configure-yandex.", file=sys.stderr)
        return
    if isinstance(values, dict) and all(isinstance(values.get(name), str) and values[name].strip() for name in YANDEX_ENV):
        os.environ.update({name: values[name] for name in YANDEX_ENV})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--configure-yandex", action="store_true", help="сохранить параметры ЯндексGPT для локального запуска")
    args = parser.parse_args()
    if args.configure_yandex:
        configure_yandex()
        return
    load_yandex_config()
    if sys.platform == "darwin" and ssl.get_default_verify_paths().cafile is None:
        system_ca_bundle = Path("/etc/ssl/cert.pem")
        if system_ca_bundle.is_file():
            os.environ.setdefault("SSL_CERT_FILE", str(system_ca_bundle))
    database = Path(os.environ.get("PERVOISTOCHNIK_DB", ROOT / ".runtime" / "family.sqlite3"))
    database.parent.mkdir(parents=True, exist_ok=True)
    handler = partial(Handler, directory=PUBLIC)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        port = server.server_port
        server.allowed_hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        server.accounts = Accounts(database)
        print(f"Первоисточник · http://127.0.0.1:{port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
