import json
import os
import unittest
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pilot


KREMLIN_SOURCE = {"title": "Музей-заповедник", "url": "https://example.org/kremlin"}
LEGEND_SOURCE = {"title": "Архив легенд", "url": "https://example.org/legend"}
FILM_SOURCE = {"title": "Каталог анимации", "url": "https://example.org/animation"}
CHARACTER_SOURCE = {"title": "Городская энциклопедия", "url": "https://example.org/character"}
ISLAND_SOURCE = {"title": "Музей острова", "url": "https://example.org/island"}


def make_point(point_id, title, locality, lat, lon, source, interests):
    return {
        "id": point_id, "title": title, "locality": locality, "lat": lat, "lon": lon,
        "child": "Здесь можно узнать историю места.",
        "adult": "В музее представлены исторические памятники.",
        "source": source, "interests": interests, "content": [],
    }


def catalog_fixture():
    kazan = make_point("kazan", "Казанский кремль", "Казань", 55.8, 49.1, KREMLIN_SOURCE, ["легенды", "мультфильмы"])
    kazan["content"] = [
        {
            "id": "zilant-legend", "type": "story", "title": "Легенда о Зиланте",
            "child": "В легенде Зилант — крылатый змей.",
            "adult": "Зилант — мифологический образ крылатого змея.",
            "questions": ["Что рассказывают о крылатом змее?"],
            "source": LEGEND_SOURCE,
        },
        {
            "id": "shurale-film", "type": "film", "title": "Шурале",
            "child": "Это мультфильм о лесном герое.",
            "adult": "Анимация знакомит с фольклорным героем.",
            "scope": "region",
            "source": FILM_SOURCE,
        },
        {
            "id": "zilant-character", "type": "character", "title": "Зилант на гербе",
            "child": "Крылатый дракон украшает герб города.",
            "adult": "На городском гербе изображён Зилант.",
            "source": CHARACTER_SOURCE,
        },
    ]
    sviyazhsk = make_point("sviyazhsk", "Остров-град Свияжск", "Свияжск", 55.77, 48.66, ISLAND_SOURCE, ["археология"])
    bolgar = make_point("bolgar", "Болгарское городище", "Болгар", 54.98, 49.04, ISLAND_SOURCE, ["археология"])
    return {"region": {"name": "Татарстан", "description": "Культурный путеводитель"}, "points": [kazan, sviyazhsk, bolgar]}


def cloud_response(answer, source_ids, *, status="ALTERNATIVE_STATUS_FINAL", wrapped=True):
    result = {
        "alternatives": [{
            "message": {"role": "assistant", "text": json.dumps({"answer": answer, "sourceIds": source_ids})},
            "status": status,
        }],
        "usage": {"inputTextTokens": "100", "completionTokens": "30", "totalTokens": "130"},
        "modelVersion": "test",
    }
    body = {"result": result} if wrapped else result
    return BytesIO(json.dumps(body).encode())


class PilotTest(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        catalog_path = Path(directory.name) / "pilot_catalog.json"
        catalog_path.write_text(json.dumps(catalog_fixture(), ensure_ascii=False), encoding="utf-8")
        for patcher in (patch.object(pilot, "CATALOG_FILE", catalog_path), patch.dict(os.environ, {}, clear=True)):
            patcher.start()
            self.addCleanup(patcher.stop)

    def guide(self, message, **overrides):
        return pilot.answer_guide({"message": message, "pointId": "kazan", "mode": "child", **overrides})

    def route(self, **overrides):
        return pilot.plan_route({"pointId": "kazan", "mode": "child", "interest": "археология", "format": "day", **overrides})

    def test_catalog_reads_the_bundled_json_in_utf8(self):
        self.assertEqual(pilot.get_catalog()["region"]["name"], "Татарстан")

    def test_local_guide_uses_the_requested_reading_level_and_exact_source(self):
        self.assertEqual(self.guide("Чем интересно это место?"), {
            "answer": "Здесь можно узнать историю места.", "sources": [KREMLIN_SOURCE], "engine": "catalog",
        })
        self.assertIn("представлены исторические памятники", self.guide("Что здесь посмотреть?", mode="adult")["answer"])

    def test_inflected_name_and_curated_question_find_the_specific_story(self):
        for question in ("Расскажи о Зиланте", "Что рассказывают о крылатом змее?"):
            with self.subTest(question=question):
                result = self.guide(question)
                self.assertIn("крылатый змей", result["answer"])
                self.assertEqual(result["sources"], [LEGEND_SOURCE])

    def test_regional_film_is_identified_as_regional_when_the_user_asks_about_the_place(self):
        result = self.guide("Есть ли фильм об этом месте?")
        self.assertEqual(result["sources"], [FILM_SOURCE])
        self.assertIn("региональн", result["answer"].lower())

    def test_generic_character_question_prefers_the_character_source(self):
        self.assertEqual(self.guide("Кто связан с этим местом?")["sources"], [CHARACTER_SOURCE])

    def test_unknown_fact_and_other_locality_are_not_attributed_to_a_source(self):
        for question in ("Кто ремонтировал крышу Казанского кремля в 1937 году?", "Расскажи про Свияжск"):
            with self.subTest(question=question):
                result = self.guide(question)
                self.assertEqual(result["sources"], [])
                self.assertIn("каталог", result["answer"].lower())

    def test_opening_times_point_to_the_current_official_source(self):
        result = self.guide("Во сколько открывается музей завтра?")
        self.assertIn("проверьте", result["answer"].lower())
        self.assertEqual(result["sources"], [KREMLIN_SOURCE])

    def test_cloud_is_skipped_without_consent_or_complete_configuration(self):
        with patch.object(pilot, "urlopen") as request:
            self.assertEqual(self.guide("Что здесь посмотреть?", allowCloud=True)["engine"], "catalog")
            os.environ["YANDEX_API_KEY"] = "test-secret"
            self.assertFalse(pilot.cloud_available())
            self.assertEqual(self.guide("Что здесь посмотреть?", allowCloud=True)["engine"], "catalog")
            os.environ["YANDEX_FOLDER_ID"] = "test-folder"
            self.assertTrue(pilot.cloud_available())
            self.assertEqual(self.guide("Что здесь посмотреть?")["engine"], "catalog")
            request.assert_not_called()

    def test_cloud_sends_mode_and_selected_point_context_and_resolves_citation_ids(self):
        os.environ.update(YANDEX_API_KEY="test-secret", YANDEX_FOLDER_ID="test-folder")
        for wrapped in (True, False):
            with self.subTest(wrapped=wrapped), patch.object(pilot, "urlopen", return_value=cloud_response(
                "В легенде Зилант — крылатый змей.", ["zilant-legend"], wrapped=wrapped,
            )) as network:
                result = self.guide("Кто такой Зилант?", allowCloud=True, ancestorPlace="Личное место")
                request, = network.call_args.args
                self.assertGreater(network.call_args.kwargs["timeout"], 0)
                self.assertEqual(request.full_url, "https://ai.api.cloud.yandex.net/foundationModels/v1/completion")
                self.assertEqual(request.get_header("Authorization"), "Api-Key test-secret")
                self.assertEqual(request.get_header("X-data-logging-enabled"), "false")
                payload = json.loads(request.data)
                self.assertEqual(payload["modelUri"], "gpt://test-folder/yandexgpt-5.1")
                self.assertIn("крылатый змей", payload["messages"][0]["text"])
                self.assertIn("реб", payload["messages"][0]["text"].lower())
                self.assertIn('"scope": "region"', payload["messages"][0]["text"])
                self.assertEqual(payload["messages"][-1], {"role": "user", "text": "Кто такой Зилант?"})
                self.assertNotIn("Личное место", request.data.decode())
                self.assertNotIn("test-secret", request.data.decode())
                self.assertEqual(result, {
                    "answer": "В легенде Зилант — крылатый змей.", "sources": [LEGEND_SOURCE], "engine": "yandex",
                })

    def test_cloud_falls_back_on_transport_error_or_unverifiable_sources(self):
        os.environ.update(YANDEX_API_KEY="test-secret", YANDEX_FOLDER_ID="test-folder")
        expected = self.guide("Кто такой Зилант?")
        with patch.object(pilot, "urlopen", side_effect=TimeoutError):
            self.assertEqual(self.guide("Кто такой Зилант?", allowCloud=True), expected)
        for answer, ids, status in (
            ("Зилант — крылатый змей.", ["sviyazhsk"], "ALTERNATIVE_STATUS_FINAL"),
            ("Подробнее на https://example.net", ["zilant-legend"], "ALTERNATIVE_STATUS_FINAL"),
            ("Зилант — крылатый змей.", ["zilant-legend"], "ALTERNATIVE_STATUS_TRUNCATED_FINAL"),
        ):
            with self.subTest(answer=answer, ids=ids, status=status), patch.object(
                pilot, "urlopen", return_value=cloud_response(answer, ids, status=status),
            ):
                self.assertEqual(self.guide("Кто такой Зилант?", allowCloud=True), expected)

    def test_day_route_stays_at_the_selected_locality(self):
        result = self.route()
        self.assertEqual(result["format"], "day")
        self.assertEqual([stop["id"] for stop in result["stops"]], ["kazan"])
        self.assertEqual(result["stops"][0]["source"], KREMLIN_SOURCE)

    def test_weekend_route_pairs_the_selected_stop_with_a_nearby_one(self):
        result = self.route(format="weekend")
        self.assertEqual([stop["id"] for stop in result["stops"]], ["kazan", "sviyazhsk"])
        self.assertIn("проверьте", result["overview"].lower())

    def test_online_route_prioritizes_material_matching_the_interest(self):
        result = self.route(format="online", interest="мультфильмы")
        self.assertEqual(result["format"], "online")
        self.assertEqual([stop["id"] for stop in result["stops"]], ["shurale-film", "zilant-legend", "zilant-character"])
        self.assertEqual(result["stops"][0]["source"], FILM_SOURCE)
        self.assertIn("материал", result["overview"].lower())

    def test_route_recognizes_ancestor_locality_and_keeps_a_user_selected_point(self):
        unselected = self.route(pointId=None, ancestorPlace="родился в Болгаре")
        self.assertEqual(unselected["stops"][0]["id"], "bolgar")
        selected = self.route(ancestorPlace="родился в Болгаре")
        self.assertEqual(selected["stops"][0]["id"], "kazan")

    def test_child_route_pacing_varies_with_age_without_echoing_ancestor_input(self):
        younger = self.route(childAge=6, ancestorPlace="Личная запись")
        older = self.route(childAge=18, ancestorPlace="Личная запись")
        self.assertNotEqual(younger["overview"], older["overview"])
        self.assertNotIn("Личная запись", json.dumps(younger, ensure_ascii=False))

    def test_invalid_inputs_raise_validation_errors(self):
        for fields in ({"pointId": []}, {"pointId": "unknown"}, {"mode": "other"}, {"allowCloud": "true"}, {"message": " "}):
            with self.subTest(guide=fields), self.assertRaises(ValueError):
                pilot.answer_guide({"pointId": "kazan", "mode": "child", "message": "Привет", **fields})
        for fields in ({"interest": []}, {"format": []}, {"format": "long"}, {"childAge": True}, {"ancestorPlace": []}):
            with self.subTest(route=fields), self.assertRaises(ValueError):
                self.route(**fields)


if __name__ == "__main__":
    unittest.main()
