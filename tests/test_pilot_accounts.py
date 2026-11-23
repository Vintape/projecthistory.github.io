import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path

from pilot_accounts import Accounts


class AccountsTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.database = Path(directory.name) / 'accounts.sqlite3'
        self.accounts = Accounts(self.database)
        self.credentials = {'email': ' Семья@Example.com ', 'password': 'пробный пароль'}

    def register(self):
        return self.accounts.register({'name': ' Анна  Ахметова ', **self.credentials})

    def test_registration_returns_only_the_normalized_profile(self):
        profile, token = self.register()
        self.assertEqual(profile, {
            'name': 'Анна Ахметова',
            'email': 'семья@example.com',
            'childAge': None,
            'ancestorPlace': '',
            'familyNote': '',
            'researchQuestion': '',
            'routes': [],
        })
        self.assertEqual(Accounts(self.database).get(token), profile)
        self.assertNotIn(self.credentials['password'].encode(), self.database.read_bytes())
        self.assertNotIn(token.encode(), self.database.read_bytes())

    def test_login_issues_an_independent_session_that_can_be_revoked(self):
        profile, registration_token = self.register()
        with self.assertRaises(PermissionError):
            self.accounts.login({**self.credentials, 'password': 'другой пароль'})
        login_profile, login_token = self.accounts.login(self.credentials)
        self.assertEqual(login_profile, profile)
        self.assertNotEqual(registration_token, login_token)
        self.accounts.logout(login_token)
        self.assertIsNone(self.accounts.get(login_token))
        self.assertEqual(self.accounts.get(registration_token), profile)
        with self.assertRaises(PermissionError):
            self.accounts.update(login_token, {'name': 'Мария'})

    def test_expired_sessions_cannot_read_or_update_a_profile(self):
        _, token = self.register()
        with closing(sqlite3.connect(self.database)) as connection, connection:
            connection.execute('UPDATE sessions SET expires_at = 0')
        self.assertIsNone(self.accounts.get(token))
        with self.assertRaises(PermissionError):
            self.accounts.update(token, {'name': 'Мария'})

    def test_registration_checks_input_and_rejects_duplicate_addresses(self):
        for fields in (
            {'name': ' '},
            {'email': 'семья.example.com'},
            {'password': 'коротко'},
            {'childAge': True},
            {'childAge': 19},
        ):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.accounts.register({'name': 'Анна', **self.credentials, **fields})
        self.register()
        with self.assertRaises(ValueError):
            self.accounts.register({'name': 'Мария', **self.credentials, 'email': 'СЕМЬЯ@example.com'})

    def test_updates_preserve_unspecified_fields_and_protect_the_address(self):
        _, token = self.register()
        updated = self.accounts.update(token, {
            'childAge': '10', 'ancestorPlace': ' село  Свияжск ', 'email': 'other@example.com',
        })
        self.assertEqual(updated['name'], 'Анна Ахметова')
        self.assertEqual(updated['email'], 'семья@example.com')
        self.assertEqual(updated['childAge'], 10)
        self.assertEqual(updated['ancestorPlace'], 'село Свияжск')
        with self.assertRaises(ValueError):
            self.accounts.update(token, {'name': 'Мария', 'childAge': '1.5'})
        self.assertEqual(self.accounts.get(token), updated)
        self.assertIsNone(self.accounts.update(token, {'childAge': ''})['childAge'])

    def test_route_saves_are_independent_and_scoped_to_the_family(self):
        _, token = self.register()
        _, other_token = self.accounts.register({
            **self.credentials, 'name': 'Мария', 'email': 'other@example.com',
        })
        routes = [{
            'id': route_id, 'title': title, 'overview': 'Прогулка по городу',
            'stops': [{'title': 'Музей'}], 'format': 'Один день',
        } for route_id, title in [('kazan', 'Казань'), ('sviyazhsk', 'Свияжск')]]
        with ThreadPoolExecutor(max_workers=3) as executor:
            list(executor.map(lambda route: self.accounts.save_route(token, route), [*routes, routes[0]]))
        self.assertCountEqual(self.accounts.get(token)['routes'], routes)
        self.assertEqual(self.accounts.remove_route(other_token, 'kazan')['routes'], [])
        self.assertEqual(self.accounts.remove_route(token, 'kazan')['routes'], [routes[1]])

    def test_journal_carries_memories_and_questions_across_sessions(self):
        _, token = self.register()
        _, other = self.accounts.register({**self.credentials, 'name': 'Другая семья', 'email': 'other@example.com'})
        self.accounts.update(token, {
            'familyNote': ' Дедушка жил в Перми.\r\n\r\nТак рассказывала бабушка. ',
            'researchQuestion': 'В каком году семья переехала?',
        })
        loaded, _ = Accounts(self.database).login(self.credentials)
        self.assertEqual(loaded['familyNote'], 'Дедушка жил в Перми.\n\nТак рассказывала бабушка.')
        self.assertEqual(loaded['researchQuestion'], 'В каком году семья переехала?')
        self.assertEqual(self.accounts.get(other)['familyNote'], '')
        with self.assertRaises(ValueError):
            self.accounts.update(token, {'researchQuestion': 'я' * 351})
        self.assertEqual(self.accounts.get(token), loaded)
