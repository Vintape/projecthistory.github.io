import unittest

from cultures import EXHIBITS, recommend_exhibit


class CulturesTest(unittest.TestCase):
    def test_recommendations_use_interests(self):
        for interest, exhibit_id in [("головной убор с вышивкой", "kalfak"), ("напитки и деревянные чаши", "choron"), ("мастера по обработке меди", "muchal")]:
            with self.subTest(interest=interest):
                self.assertEqual(recommend_exhibit(interest), exhibit_id)

    def test_unknown_interest_gives_no_recommendation(self):
        self.assertIsNone(recommend_exhibit("abcdef"))

    def test_exhibits_link_to_museum_and_have_unambiguous_answers(self):
        self.assertEqual(len(EXHIBITS), 3)
        for exhibit in EXHIBITS:
            self.assertTrue(exhibit["source"].startswith("https://collection.ethnomuseum.ru/entity/OBJECT/"))
            self.assertIn(exhibit["answer"], exhibit["options"])
            self.assertEqual(len(set(exhibit["options"])), 3)


if __name__ == "__main__":
    unittest.main()
