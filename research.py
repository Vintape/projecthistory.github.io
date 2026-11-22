"""Build a research plan from a curated catalog and a local text classifier."""

from collections import Counter
from math import log, sqrt
import re


SOURCES = {
    "archive": ("Архивы Татарстана", "Портал архивных каталогов и исторических материалов республики.", "https://archives.tatar/"),
    "metrics": ("Метрические книги и архивные базы", "Проверьте, какие базы ведёт Госархив. Для метрических книг начните с населённого пункта и примерного года.", "https://arhiv.tatarstan.ru/perechen-informatsionnih-sistem-baz-dannih.htm"),
    "military": ("Память народа", "Поиск документов об участниках Великой Отечественной войны. Сверяйте совпадения по году и месту рождения.", "https://pamyat-naroda.ru/how-to-search/"),
    "collection": ("Электронный каталог музеев Татарстана", "Музейные коллекции и материалы для знакомства с историей и бытом региона.", "https://collections.museum.tatar.ru/entity/MUSEUM/5"),
}

PLACES = {
    "kremlin": ("Казанский Кремль", "Казань", "Познакомьтесь с историей Казани и посетите музей истории татарского народа и Татарстана.", "https://go.kzn.ru/places/muzei-zapovednik-kazanskii-kreml"),
    "sloboda": ("Старо-Татарская слобода", "Казань · улица Габдуллы Тукая", "Пройдитесь по историческому кварталу. Загляните в тематические музеи, чтобы познакомиться с татарским бытом и кухней.", "https://go.kzn.ru/places/staro-tatarskaia-sloboda"),
    "museum": ("Национальный музей Татарстана", "Казань · Кремлёвская, 2", "Посмотрите, как музейные предметы рассказывают об истории и традициях народов региона.", "https://go.kzn.ru/places/nacionalnyi-muzei-respubliki-tatarstan"),
    "sviyazhsk": ("Музей истории Свияжска", "Свияжск", "Узнайте, как менялся город и чем жили его жители. Проверьте режим работы музея перед поездкой.", "https://ostrovgrad.ru/muzej-istorii-sviyazhska/"),
    "monastery": ("Успенский монастырь", "Свияжск", "Посмотрите архитектурный ансамбль и узнайте об истории монастыря. Уточните правила посещения собора.", "https://ostrovgrad.ru/uspenskij-sobor-i-monastyr/"),
    "collection": (SOURCES["collection"][0], "Онлайн", *SOURCES["collection"][1:]),
}

STEPS = {
    "interview": ("Поговорите со старшими", "Спросите, где и когда жил родственник, кто это помнит и сохранились ли письма или фотографии."),
    "identity": ("Уточните имя и фамилию", "Запишите полное имя, девичью фамилию и варианты написания. Отмечайте, откуда известен каждый вариант."),
    "location": ("Уточните место и его старое название", "Сверьте современное и историческое название населённого пункта. Уточните район или уезд, если одноимённых мест несколько."),
    "documents": ("Разберите семейный документ", "Проверьте оборот фотографии, штампы, даты и подписи. Сохраните копию и выпишите текст, который можно прочитать."),
    "metrics": ("Проверьте записи о рождении и браке", "Начните с места и примерного года события. По дореволюционным событиям проверьте метрические книги, если они сохранились."),
    "military": ("Проверьте военные документы", "Попробуйте поиск по имени, году рождения и месту призыва. Сравните несколько признаков, прежде чем связать запись с семьёй."),
}

# Examples train a compact character n-gram classifier. No examples contain real personal data.
EXAMPLES = {
    "identity": ["девичья фамилия бабушки", "бабушка в девичестве носила другую фамилию", "несколько вариантов написания имени", "после свадьбы сменила фамилию", "в документах фамилия записана по-разному", "не знаю полное имя и отчество", "у прабабушки другая фамилия до замужества"],
    "location": ["деревня могла называться иначе", "старое название села", "не знаю где находилась деревня", "семья переехала в другой район", "населённый пункт исчез с карты", "в каком уезде была деревня", "не помню название посёлка", "прадед уехал из деревни в Казань"],
    "documents": ["сохранилась старая фотография с надписью", "есть надпись на обороте снимка", "старые семейные фотографии", "нашли письмо и открытку", "читаю старую рукопись", "есть скан неизвестного документа", "на фотографии есть штамп ателье", "есть семейный альбом"],
    "metrics": ["ищу запись о рождении", "когда прадед женился", "родился до революции", "свидетельство о браке", "сведения о крещении", "метрические книги прихода", "ищу дату смерти", "прабабушка родилась около 1900 года"],
    "military": ["пропал без вести на фронте", "прадеда призвали в армию", "служил во время войны", "воевал в великой отечественной", "наградной лист и медаль", "ищу воинскую часть", "вернулся с фронта", "в 1942 погиб на войне", "дед работал в госпитале в годы войны"],
}


def features(text):
    tokens = re.findall(r"[а-яa-z]+", text.lower().replace("ё", "е"))
    padded = [f"^{token}$" for token in tokens]
    return Counter(token[start:start + size] for token in padded for size in (3, 4) for start in range(len(token) - size + 1))


def train(labeled_phrases):
    examples = [(label, features(phrase)) for label, phrases in labeled_phrases.items() for phrase in phrases]
    counts = Counter(gram for _, vector in examples for gram in vector)
    weights = {gram: log((1 + len(examples)) / (1 + count)) + 1 for gram, count in counts.items()}
    return weights, [(label, normalize(vector, weights)) for label, vector in examples]


def normalize(counts, weights):
    vector = {gram: count * weights.get(gram, 1) for gram, count in counts.items()}
    length = sqrt(sum(weight ** 2 for weight in vector.values())) or 1
    return {gram: weight / length for gram, weight in vector.items()}


RESEARCH_MODEL = train(EXAMPLES)


def classify(text, model, default=None):
    weights, trained = model
    query = normalize(features(text), weights)
    best_label, best_score = default, 0.14
    for label, example in trained:
        score = sum(weight * query.get(gram, 0) for gram, weight in example.items())
        if score > best_score:
            best_label, best_score = label, score
    return best_label


def clean(payload, key, limit):
    value = payload.get(key)
    return " ".join(value.split())[:limit] if isinstance(value, str) else ""


def allowed(payload, key, options, default):
    value = payload.get(key)
    return value if isinstance(value, str) and value in options else default


def source_entry(key):
    title, description, url = SOURCES[key]
    return {"title": title, "description": description, "url": url}


def route_group(title, keys):
    places = []
    for key in keys:
        name, address, description, url = PLACES[key]
        places.append({"title": name, "address": address, "description": description, "url": url})
    return {"title": title, "places": places}


def build_route(duration, interest, place):
    kazan_stops = {
        "history": ["museum", "kremlin", "sloboda"],
        "craft": ["sloboda", "museum", "kremlin"],
        "architecture": ["kremlin", "sloboda", "museum"],
    }[interest]
    sviyazhsk_stops = ["monastery", "sviyazhsk"] if interest == "architecture" else ["sviyazhsk", "monastery"]
    itinerary = [("Казань", kazan_stops), ("Свияжск", sviyazhsk_stops)]
    if re.fullmatch(r"(?:(?:село|с\.|остров-град)\s*)?свияжск", place.casefold()):
        itinerary.reverse()
    primary_city, primary_stops = itinerary[0]
    if duration == "online":
        return [route_group("Виртуальная прогулка", ["collection", primary_stops[0]])]
    if duration == "weekend":
        return [route_group(f"День {day} · {city}", stops) for day, (city, stops) in enumerate(itinerary, 1)]
    return [route_group(f"Один день · {primary_city}", primary_stops)]


def build_research(payload):
    mode = allowed(payload, "mode", ("roots", "culture"), "roots")
    duration = allowed(payload, "duration", ("day", "weekend", "online"), "day")
    interest = allowed(payload, "interest", ("history", "craft", "architecture"), "history")
    fields = [("Фамилия", clean(payload, "surname", 80)), ("Место", clean(payload, "place", 100)), ("Семейная подсказка", clean(payload, "clue", 600))]
    known = [{"label": label, "value": value} for label, value in fields if mode == "roots" and value]
    place, clue = fields[1][1], fields[2][1]
    lead = classify(clue, RESEARCH_MODEL, "interview") if mode == "roots" else "culture"
    if lead == "culture":
        steps = [{"id": "culture", "title": "Выберите тему для прогулки", "description": "Откройте электронную коллекцию и выберите один предмет, о котором хотите узнать больше. Найдите его эпоху, материал и назначение."}]
        sources = ["collection"]
    else:
        sequence = list(dict.fromkeys([lead, "location" if not place else "metrics", "interview", "identity"]))[:3]
        steps = [{"id": key, "title": STEPS[key][0], "description": STEPS[key][1]} for key in sequence]
        sources = (["military"] if lead == "military" else []) + ["archive", "metrics", "collection"]
    return {
        "mode": mode,
        "scope": "Татарстан",
        "known": known,
        "steps": steps,
        "sources": [source_entry(key) for key in sources],
        "route": build_route(duration, interest, place if mode == "roots" else ""),
        "routeNote": "Культурный маршрут по Татарстану. Связь остановок с историей семьи нужно подтверждать документами." if mode == "roots" else "Знакомство с Татарстаном по материалам музеев и городского туристического портала.",
        "modelUsed": lead not in ("interview", "culture"),
    }
