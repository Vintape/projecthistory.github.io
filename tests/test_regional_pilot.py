import unittest
from unittest.mock import patch

import pilot


def source(name):
    return {"title": name, "url": f"https://example.org/{name}"}


def make_point(point_id, locality, region_id, lon):
    return {
        "id": point_id, "title": f"Музей {locality}", "locality": locality, "regionId": region_id,
        "lat": 60, "lon": lon, "interests": ["музеи"], "content": [],
        "child": f"Здесь можно узнать о городе {locality}.",
        "adult": f"В музее изучают прошлое города {locality}.", "source": source(point_id),
    }


STORY = {
    "id": "story", "title": "Старая легенда", "type": "story",
    "child": "Легенда рассказывает, откуда у озера имя.",
    "adult": "Легенда рассказывает, откуда у озера имя.", "source": source("story"),
}
FILM = {**STORY, "id": "film", "title": "Фильм для взрослых", "type": "film", "minAge": 16, "source": source("film")}


class RegionalPilotTest(unittest.TestCase):
    def setUp(self):
        region = {
            "id": "north", "name": "Северный край", "locality": "Северный край", "aliases": ["Североград"],
            "child": "В Северном крае много озёр.", "adult": "На севере края изучают ледниковые озёра.",
            "source": source("north"), "content": [STORY],
        }
        other_region = {
            **region, "id": "south", "name": "Южный край", "locality": "Южный край", "aliases": [],
            "child": "В Южном крае много холмов.", "source": source("south"), "content": [],
        }
        self.first = make_point("first", "Заречье", "north", 30.0)
        self.second = make_point("second", "Нагорье", "north", 30.5)
        self.second["content"] = [FILM, STORY]
        self.outside = make_point("outside", "Озерск", "south", 30.1)
        patcher = patch.object(pilot, "get_catalog", return_value={
            "regions": [region, other_region], "points": [self.first, self.outside, self.second],
        })
        patcher.start()
        self.addCleanup(patcher.stop)

    def guide(self, message, **overrides):
        return pilot.answer_guide({"message": message, "mode": "child", **overrides})

    def route(self, **overrides):
        return pilot.plan_route({"mode": "child", "regionId": "north", "format": "day", **overrides})

    def test_guide_resolves_a_region_alias_and_locality_by_question(self):
        result = self.guide("Расскажи о Северограде")
        self.assertIn("озёр", result["answer"])
        self.assertEqual(result["sources"], [source("north")])
        self.assertIn("каталог", result["answer"].lower())
        result = self.guide("Что посмотреть в Нагорье?", regionId="north")
        self.assertEqual(result["sources"], [source("second")])

    def test_guide_uses_open_material_and_filters_age_restricted_material(self):
        result = self.guide("О чём этот материал?", regionId="north", pointId="second", materialId="story")
        self.assertEqual(result["sources"], [source("story")])
        with self.assertRaises(ValueError):
            self.guide("О чём этот материал?", regionId="north", pointId="second", materialId="film")

    def test_regional_family_questions_do_not_use_cloud_or_infer_ancestry(self):
        with patch.object(pilot, "_yandex_credentials", return_value=("key", "folder")), patch.object(pilot, "urlopen") as network:
            for question in ("Мои предки жили в Нагорье?", "Моя мама жила в Нагорье?"):
                result = self.guide(question, regionId="north", allowCloud=True, mode="adult")
                self.assertEqual(result["sources"], [])
                self.assertIn("семь", result["answer"].lower())
            network.assert_not_called()

    def test_regional_child_guide_uses_catalog_with_cloud_enabled(self):
        with patch.object(pilot, "_yandex_credentials", return_value=("key", "folder")), patch.object(pilot, "urlopen") as network:
            result = self.guide("Расскажи о Северном крае", regionId="north", allowCloud=True)
            self.assertEqual(result["sources"], [source("north")])
            self.assertEqual(result["engine"], "catalog")
            network.assert_not_called()

    def test_all_route_formats_respect_manual_pick_order(self):
        for route_format in ("day", "weekend", "online"):
            with self.subTest(route_format=route_format):
                route = self.route(format=route_format, pointIds=["second", "first"], interest="кино")
                self.assertEqual([stop["id"] for stop in route["stops"]], ["second", "first"])
                self.assertNotIn(FILM["title"], route["stops"][0]["reason"])
        route = self.route(format="online", pointIds=["second", "first"], interest="кино", mode="adult")
        self.assertIn(FILM["title"], route["stops"][0]["reason"])

    def test_routes_validate_manual_stops_and_keep_default_neighbors_in_region(self):
        for malformed in (["first", "first"], ["first", "outside"], "first", ["first"] * 7):
            with self.subTest(malformed=malformed), self.assertRaises(ValueError):
                self.route(pointIds=malformed)
        route = self.route(format="weekend", pointId="first")
        self.assertEqual([stop["id"] for stop in route["stops"]], ["first", "second"])
