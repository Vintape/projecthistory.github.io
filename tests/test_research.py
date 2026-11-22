import unittest

from research import build_research


class ResearchTest(unittest.TestCase):
    def test_family_details_remain_user_reported_and_military_search_is_relevant(self):
        result = build_research({"mode": "roots", "surname": "Ахметовы", "place": "Казань", "clue": "Прадед пропал без вести на фронте в 1942-м", "duration": "day", "interest": "history"})
        self.assertEqual(result["known"][0]["value"], "Ахметовы")
        self.assertEqual(result["steps"][0]["id"], "military")
        self.assertIn("Память народа", [source["title"] for source in result["sources"]])
        self.assertEqual(len(result["route"]), 1)
        self.assertEqual(result["scope"], "Татарстан")

    def test_empty_input_and_online_culture_are_supported(self):
        self.assertEqual(build_research({})["known"], [])
        result = build_research({"mode": "culture", "duration": "online", "interest": "craft"})
        self.assertEqual(result["known"], [])
        self.assertEqual(result["route"][0]["title"], "Виртуальная прогулка")
        self.assertTrue(all(place["url"].startswith("https://") for place in result["route"][0]["places"]))

    def test_outside_place_does_not_create_family_connection(self):
        result = build_research({"place": "Москва", "duration": "weekend"})
        self.assertEqual(result["known"][0]["value"], "Москва")
        self.assertEqual(len(result["route"]), 2)
        self.assertIn("Татарстан", result["routeNote"])

    def test_pilot_route_prefers_an_explicitly_entered_town(self):
        result = build_research({"place": "село Свияжск", "duration": "day"})
        self.assertEqual(result["route"][0]["title"], "Один день · Свияжск")
        self.assertIn("Музей истории Свияжска", [place["title"] for place in result["route"][0]["places"]])

    def test_model_ranks_paraphrases_and_uses_a_default_for_unknown_clues(self):
        for clue, step in [
            ("Бабушка в девичестве носила другое имя семьи", "identity"),
            ("Есть надпись на старой фотографии", "documents"),
            ("деревня могла называться по-другому", "location"),
            ("asdf", "interview"),
        ]:
            with self.subTest(clue=clue):
                self.assertEqual(build_research({"clue": clue})["steps"][0]["id"], step)


if __name__ == "__main__":
    unittest.main()
