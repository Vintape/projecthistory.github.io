import unittest
from unittest.mock import patch

import pilot


class LadogaCatalogTest(unittest.TestCase):
    def test_ladoga_remains_the_legacy_default_and_its_stories_have_pdf_sources(self):
        catalog = pilot.get_catalog()
        self.assertEqual(catalog["region"]["name"], "Ленинградская область")
        ladoga = [point for point in catalog["points"] if point["locality"] == "Старая Ладога"]
        self.assertEqual({point["id"] for point in ladoga}, {"staraya-ladoga", "ladoga-mounds", "ladoga-monastery"})
        stories = [entry for point in ladoga for entry in point["content"] if entry["type"] == "story"]
        self.assertTrue(stories)
        self.assertTrue(all(entry["source"]["url"].endswith(".pdf") for entry in stories))
        route = pilot.plan_route({"format": "day", "mode": "adult"})
        self.assertEqual(route["stops"][0]["id"], "staraya-ladoga")

    def test_the_guide_answers_with_a_source_even_with_multiple_points_in_ladoga(self):
        with patch.object(pilot, "_yandex_credentials", return_value=("", "")):
            result = pilot.answer_guide({"pointId": "ladoga-mounds", "mode": "child", "message": "Почему курган называют Олеговой могилой?"})
        self.assertIn("точно неизвестно", result["answer"])
        self.assertTrue(result["sources"][0]["url"].endswith(".pdf"))

    def test_travel_route_has_three_local_points_and_child_route_skips_rated_video(self):
        route = {"pointId": "staraya-ladoga", "mode": "child", "interest": "археология", "format": "day"}
        walking = pilot.plan_route(route)
        self.assertEqual(len(walking["stops"]), 3)
        self.assertEqual({stop["locality"] for stop in walking["stops"]}, {"Старая Ладога"})
        online = pilot.plan_route({**route, "format": "online", "interest": "кино о раскопках"})
        self.assertNotIn("ladoga-diary", {stop["id"] for stop in online["stops"]})
