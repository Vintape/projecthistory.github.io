"""Catalog guide and family routes for the regional atlas."""

import json
import os
import re
from http.client import HTTPException
from math import cos, hypot, radians
from pathlib import Path
from urllib.request import Request, urlopen


CATALOG_FILE = Path(__file__).with_name("pilot_catalog.json")
YANDEX_ENDPOINT = "https://ai.api.cloud.yandex.net/foundationModels/v1/completion"
YANDEX_TIMEOUT = 8
FORMATS = ("day", "weekend", "online")
MODES = ("child", "adult")
MAX_ROUTE_POINTS = 6

WORDS = re.compile(r"[а-яa-z]+|[0-9]+", re.IGNORECASE)
ENDINGS = re.compile(r"(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ая|яя|ое|ее|ый|ий|ой|ые|ие|ов|ев|ей|ах|ях|ам|ям|ом|ем|ую|юю|ия|ья|ию|ью|ии|ьи|[аеёиоуыэюяь])$")
STOP_WORDS = set("""а в во бы и или к ко на о об от по про с со у для из до это этот эти этим этом эта здесь там
    места месте место местом местный местные что кто где зачем отчего почему чем как такой такая такое
    так за ли есть какие какой какая какого можно предложи расскажи расскажите рассказывать рассказывают
    покажи узнать известен известна известно интересен интересна интересно интересного особенного
    увидеть посмотреть посмотреться почитать почитайте начать называется называют связан связана связаны
    связано знать знают находится находятся важен важна важны пожалуйста мне нам еще его ее их могу можем
    было были был сейчас кратко стоит посетить побывать музей заповедник град остров исторический""".split())
ORIENTATION = re.compile(r"\b(?:расскаж\w*|покаж\w*|интерес\w*|увид\w*|посмотр\w*|извест\w*|наход\w*|что (?:это|здесь))\b")
VISIT_DETAILS = re.compile(r"\b(?:билет\w*|расписани\w*|цен[ауые]|стоимост\w*|добрат\w*|парковк\w*|открыто|закрыто|часы работы|режим работы|во сколько|сколько стоит)\b")
DATE_QUESTION = re.compile(r"\b(?:когда|какого года|в каком году|в каком веке)\b")
DATE_INFO = re.compile(r"\b(?:\d{3,4}|[IVXLCDM]+)\s*(?:гг?\.?|год\w*|столет\w*|век\w*)", re.IGNORECASE)
LINK_TEXT = re.compile(r"(?:https?:|www\.|\b[а-яa-z0-9-]+\.[a-zрф]{2,}(?=\W|$)|[<>])", re.IGNORECASE)
FAMILY_WORDS = re.compile(r"^(?:предк|прапрад|прадед|прабаб|дедушк|бабушк|родослов|генеалог|родствен|семейн|фамили|родител|брать|сестр|отец|отц|мам[ауые]|пап[ауые])|^(?:мать|матери|дед[ауе]?|бабк[аи])$")
PERSONAL_FAMILY_WORDS = re.compile(r"^(?:прапрад|прадед|прабаб|дедушк|бабушк)")
FAMILY_POSSESSIVES = {"мой", "мои", "моя", "мое", "моих", "моего", "моей", "мою", "наш", "наши", "наших", "нашего", "нашей", "наша", "нашу"}
MATERIAL_OVERVIEWS = {
    "что это", "о чем это", "о чем этот материал", "что это за материал", "где узнать больше",
    "расскажи об этом материале", "расскажи про этот материал", "расскажи об этом", "расскажи о нем",
    "расскажи об этом событии", "о чем эта книга", "о чем этот фильм",
}
REGION_TOPICS = {
    "peoples": re.compile(r"^(?:народ|населя|этнич|национальн|коренн)"),
    "culture": re.compile(r"^(?:культур|традици|обыча|ремесл)"),
    "history": re.compile(r"^(?:истори|прошл)"),
}
TOPIC_WORDS = {
    "story": re.compile(r"(?:легенд|сказк|предани|сюжет|истори|миф|былин)"),
    "film": re.compile(r"(?:мульт|кино|фильм|анимац|экранизац)"),
    "character": re.compile(r"(?:персонаж|геро|писател|поэт|личност)"),
}


def get_catalog():
    with CATALOG_FILE.open(encoding="utf-8") as file:
        catalog = json.load(file)
    entries = {
        entry["id"]: entry
        for owner in [*catalog.get("regions", []), *catalog["points"]]
        for entry in owner.get("content", [])
    }
    for point in catalog["points"]:
        if "contentRefs" in point:
            point["content"] = [*point.get("content", []), *(entries[key] for key in point.pop("contentRefs"))]
    return catalog


def _for_mode(point, mode):
    return {**point, "content": [entry for entry in point.get("content", []) if mode != "child" or entry.get("minAge", 0) < 12]}


def _words(text):
    return WORDS.findall(text.lower().replace("ё", "е"))


def _stem(word):
    if word in {"крае", "края", "краю", "краем"}:
        return "край"
    shortened = ENDINGS.sub("", word)
    return shortened if len(shortened) >= 4 else word


def _terms(text):
    return {_stem(word) for word in _words(text) if word not in STOP_WORDS}


def _topics(text):
    return {name for word in _words(text) for name, pattern in TOPIC_WORDS.items() if pattern.match(word)}


def _read_text(payload, key, limit, *, required=False):
    value = payload.get(key)
    if value is None and not required:
        return ""
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValueError(f"Проверьте значение поля «{key}».")
    return value.strip()


def _preferences(payload):
    if not isinstance(payload, dict):
        raise ValueError("Ожидается объект с параметрами.")
    mode = payload.get("mode")
    if mode not in MODES:
        raise ValueError("Выберите детский или взрослый режим.")
    return _read_text(payload, "pointId", 60), mode


def _resolve_region(payload, catalog):
    region_id = _read_text(payload, "regionId", 60)
    if region_id:
        region = next((region for region in catalog.get("regions", []) if region["id"] == region_id), None)
        if region is None:
            raise ValueError("Выберите регион из каталога.")
        return region
    return None


def _names(entry):
    return [entry.get("name", entry.get("title", "")), entry.get("locality", ""), *entry.get("aliases", [])]


def _name_score(entry, question_terms):
    return max((len(name) for label in _names(entry) if (name := _terms(label)) <= question_terms), default=0)


def _named_entries(entries, question_terms):
    scored = [(_name_score(entry, question_terms), entry) for entry in entries]
    best = max((score for score, _ in scored), default=0)
    return [entry for score, entry in scored if score == best and best]


def _question_about_region(question, context, mode):
    tokens = _words(question)
    names = set().union(*(_terms(label) for label in _names(context)))
    question_terms = _terms(question) - names
    if DATE_QUESTION.search(" ".join(tokens)) or any(token.isdigit() for token in tokens):
        return None
    topics = []
    for key, pattern in REGION_TOPICS.items():
        text = context.get(key)
        if not text or not any(pattern.match(token) for token in tokens):
            continue
        if key == "peoples":
            text = f"В карточке региона представлены сведения о следующих народах: {', '.join(text)}."
        topics.append(text)
    if topics:
        return "\n\n".join(topics)
    if not question_terms or ORIENTATION.search(" ".join(tokens)) and question_terms <= {"регион", "край", "област", "город"}:
        return context[mode]
    return None


def _catalog_reply(answer, entries=(), *, regional):
    if regional and entries:
        answer = f"По материалам каталога. {answer}"
    return {"answer": answer, "sources": _sources(entries), "engine": "catalog"}


def _sources(entries):
    return list({entry["source"]["url"]: entry["source"] for entry in entries}.values())


def _entry_names(entry):
    return " ".join([entry["title"], entry.get("locality", ""), *entry.get("keywords", [])])


def _search_entry(question, point, mode):
    entries = [point, *point["content"]]
    normalized = " ".join(_words(question))
    for entry in entries:
        if any(normalized == " ".join(_words(prompt)) for prompt in entry.get("questions", [])):
            return [entry]

    topic = _topics(question)
    if normalized.startswith("кто связан"):
        topic.add("character")
    includes_date = DATE_QUESTION.search(normalized)
    place_terms = _terms(point["locality"]) | set().union(*(_terms(alias) for alias in point.get("aliases", [])))
    question_terms = _terms(question) - place_terms
    if includes_date and question_terms:
        for entry in entries:
            if DATE_INFO.search(entry[mode]) and any(
                DATE_QUESTION.search(" ".join(_words(prompt))) and question_terms == _terms(prompt) - place_terms
                for prompt in entry.get("questions", [])
            ):
                return [entry]
    topic_terms = {_stem(word) for word in _words(question) if any(pattern.match(word) for pattern in TOPIC_WORDS.values())}
    detail_terms = question_terms - topic_terms - {"когда", "году", "года", "век", "веке", "снят"}

    if topic and not detail_terms and not includes_date:
        related = [entry for entry in point["content"] if entry["type"] in topic]
        if related:
            return related[:2]
    if not topic and not includes_date and ORIENTATION.search(normalized) and question_terms <= _terms(point["title"]):
        return [point]
    if not detail_terms:
        if includes_date and point.get("type") and DATE_INFO.search(point[mode]):
            return [point]
        return []

    candidates = []
    point_names = _terms(point["title"])
    for entry in entries:
        if includes_date and not DATE_INFO.search(entry[mode]):
            continue
        if topic and entry is not point and entry["type"] not in topic:
            continue
        name_terms = _terms(_entry_names(entry))
        evidence = name_terms | _terms(entry[mode])
        if detail_terms <= evidence | point_names and detail_terms & (evidence - point_names):
            candidates.append((len(detail_terms & name_terms), entry))
    if candidates:
        return [max(candidates, key=lambda match: match[0])[1]]
    return []


def _guide_text(entry, mode, *, include_title):
    if entry.get("scope") == "region":
        return f"Из региональной подборки — «{entry['title']}». {entry[mode]}"
    if include_title:
        return f"«{entry['title']}». {entry[mode]}"
    return entry[mode]


def _yandex_credentials():
    return os.environ.get("YANDEX_API_KEY", "").strip(), os.environ.get("YANDEX_FOLDER_ID", "").strip()


def cloud_available():
    return all(_yandex_credentials())


def _yandex_answer(question, point, mode, api_key, folder_id):
    entries = {entry["id"]: entry for entry in (point, *point["content"])} if point else {}
    context = [
        {
            "id": entry["id"], "title": entry["title"], "type": entry.get("type", "place"),
            "scope": entry.get("scope", "point"), "text": entry[mode],
        }
        for entry in entries.values()
    ]
    audience = "простыми словами, подходящими ребёнку" if mode == "child" else "с точными формулировками"
    current = point["title"] if point else "отсутствует"
    instructions = (
        f"Ты ИИ-ассистент сайта «Первоисточник». Отвечай по-русски {audience}, обычно в 1–4 предложениях. "
        "Отвечай на вопрос пользователя. Указанное в вопросе место важнее текущей карточки на карте. "
        "Для вопросов без названия места используй текущую карточку, если это помогает. "
        "Когда спрашивают о городе или регионе в целом, начни с общего обзора. Материалы каталога могут его дополнить. "
        "Вопросы вне каталога отвечай по общим знаниям. Если вопрос неясен, попроси уточнить. "
        "Отличай предания от установленных фактов. Не выдумывай сведения, источники и актуальные цены или расписания. "
        "Сомнительные сведения помечай как непроверенные. Не определяй происхождение человека по фамилии или месту жительства. "
        "Верни JSON-объект с полем answer (непустой текст без ссылок и разметки) "
        "и sourceIds (массив только тех идентификаторов из материалов, которые подтверждают использованные факты). "
        "Если материалы не использованы, верни пустой массив sourceIds. "
        f"Текущая карточка: {current}. Материалы: {json.dumps(context, ensure_ascii=False)}"
    )
    payload = {
        "modelUri": f"gpt://{folder_id}/yandexgpt-5.1",
        "completionOptions": {
            "stream": False, "temperature": 0.1, "maxTokens": "350", "reasoningOptions": {"mode": "DISABLED"},
        },
        "messages": [{"role": "system", "text": instructions}, {"role": "user", "text": question}],
        "jsonObject": True,
    }
    request = Request(YANDEX_ENDPOINT, data=json.dumps(payload).encode("utf-8"), headers={
        "Content-Type": "application/json", "x-data-logging-enabled": "false", "x-folder-id": folder_id,
    })
    request.add_unredirected_header("Authorization", f"Api-Key {api_key}")
    try:
        with urlopen(request, timeout=YANDEX_TIMEOUT) as response:
            data = json.loads(response.read(32_768))
        alternative = data.get("result", data)["alternatives"][0]
        if alternative["status"] != "ALTERNATIVE_STATUS_FINAL":
            return None
        reply = json.loads(alternative["message"]["text"])
        answer, source_ids = reply["answer"], reply["sourceIds"]
    except (OSError, HTTPException, ValueError, AttributeError, KeyError, IndexError, TypeError):
        return None
    if not isinstance(answer, str) or not 0 < len(answer.strip()) <= 1_200 or LINK_TEXT.search(answer) or api_key in answer:
        return None
    if not isinstance(source_ids, list) or any(not isinstance(value, str) or value not in entries for value in source_ids):
        return None
    return {"answer": answer.strip(), "sources": _sources(entries[value] for value in source_ids), "engine": "yandex"}


def answer_guide(payload):
    point_id, mode = _preferences(payload)
    question = _read_text(payload, "message", 900, required=True)
    allow_cloud = payload.get("allowCloud", False)
    if not isinstance(allow_cloud, bool):
        raise ValueError("Укажите, можно ли использовать ЯндексGPT.")
    catalog = get_catalog()
    regions = catalog.get("regions", [])
    points = {point["id"]: point for point in catalog["points"]}
    region = _resolve_region(payload, catalog)
    material_id = _read_text(payload, "materialId", 60)
    selected_point = points.get(point_id)
    if point_id and not selected_point:
        raise ValueError("Выберите место из каталога.")
    if region and selected_point and selected_point.get("regionId") != region["id"]:
        raise ValueError("Выбранное место находится в другом регионе.")

    question_terms = _terms(question)
    tokens = _words(question)
    normalized = " ".join(tokens)
    family_words = any(FAMILY_WORDS.match(word) for word in tokens)
    personal_question = any(PERSONAL_FAMILY_WORDS.match(word) for word in tokens) or (
        family_words and not FAMILY_POSSESSIVES.isdisjoint(tokens)
    )
    if regions and personal_question:
        return _catalog_reply(
            "Место на карте помогает узнать историю региона. Для истории вашей семьи нужны семейные документы или архивные записи.",
            regional=True,
        )

    named_regions = _named_entries(regions, question_terms)
    named_points = _named_entries(points.values(), question_terms)
    exact_regions = [entry for entry in named_regions if _terms(entry["name"]) <= question_terms]
    if not selected_point and not material_id and len(exact_regions) == 1 and not any(
        _terms(point["title"]) <= question_terms for point in named_points
    ):
        if not region:
            region = exact_regions[0]
        if region == exact_regions[0]:
            named_points = []
    if not selected_point and not material_id and named_points:
        local_points = [point for point in named_points if not region or point.get("regionId") == region["id"]]
        if len({point["locality"] for point in local_points}) == 1:
            selected_point = local_points[0]
    if not region and not selected_point and len(named_regions) == 1:
        region = named_regions[0]
    selected_context = selected_point or (region and {**region, "title": region["name"]})
    context = _for_mode(selected_context, mode) if selected_context else None
    if material_id:
        material = next((entry for entry in context["content"] if entry["id"] == material_id), None) if context else None
        if material is None:
            raise ValueError("Выберите доступный материал в карточке места или региона.")
        context = {**material, "locality": context["locality"], "content": []}

    if allow_cloud:
        api_key, folder_id = _yandex_credentials()
        if api_key and folder_id:
            requested = named_points[0] if len(named_points) == 1 else None
            mentions_point = requested and any(
                (label := _terms(name)) and label <= question_terms
                for name in [requested["title"], *requested.get("aliases", [])]
            )
            if not mentions_point and len(named_regions) == 1:
                requested_region = named_regions[0]
                if requested_region["id"] != (selected_point or {}).get("regionId"):
                    requested = {**requested_region, "title": requested_region["name"]}
            cloud_context = _for_mode(requested, mode) if requested and not material_id else context
            result = _yandex_answer(question, cloud_context, mode, api_key, folder_id)
            if result:
                return result

    if not context:
        if not regions:
            raise ValueError("Выберите место из каталога.")
        return _catalog_reply("Выберите регион или место из каталога либо укажите его название в вопросе.", regional=True)

    region_id = selected_point.get("regionId") if selected_point else region["id"]
    if regions:
        other_place = (named_points and all(point.get("regionId") != region_id for point in named_points)) or (
            named_regions and all(entry["id"] != region_id for entry in named_regions)
        )
        if selected_point and named_points and selected_point not in named_points:
            other_place = True
    else:
        other_place = any(
            _terms(other["locality"]) <= question_terms
            for other in points.values() if other["locality"] != selected_point["locality"]
        )

    if not other_place:
        if VISIT_DETAILS.search(normalized):
            return _catalog_reply(
                "В каталоге нет актуального расписания, цен и сведений о проезде. Перед поездкой проверьте их на сайте места.",
                [selected_point or context], regional=bool(regions),
            )
        if material_id and normalized in MATERIAL_OVERVIEWS:
            return _catalog_reply(_guide_text(context, mode, include_title=True), [context], regional=bool(regions))
        if not selected_point and not material_id:
            answer = _question_about_region(question, context, mode)
            if answer:
                return _catalog_reply(answer, [context], regional=bool(regions))
        entries = _search_entry(question, context, mode)
        if entries:
            answer = "\n\n".join(_guide_text(entry, mode, include_title=len(entries) > 1) for entry in entries)
            if selected_point and entries == [context] and not material_id and "где наход" in normalized:
                answer = f"{context['title']} — {context['locality']}. {answer}"
            return _catalog_reply(answer, entries, regional=bool(regions))
    return _catalog_reply(
        f"В каталоге пока нет ответа на этот вопрос в карточке «{context['title']}». "
        "Можно спросить, чем интересно это место или регион, либо открыть другой материал.",
        regional=bool(regions),
    )


def _interest_score(interest, labels):
    return len(_terms(interest) & _terms(" ".join(labels)))


def _distance_km(first, second):
    latitude = radians((first["lat"] + second["lat"]) / 2)
    return 111 * hypot(second["lat"] - first["lat"], (second["lon"] - first["lon"]) * cos(latitude))


def _route_stop(entry, point, reason):
    return {"id": entry["id"], "title": entry["title"], "locality": point["locality"], "reason": reason, "source": entry["source"]}


def _route_materials(point, mode, interest, topics):
    return sorted(_for_mode(point, mode)["content"], key=lambda entry: (
        entry["type"] in topics, _interest_score(interest, [entry["title"], *entry.get("keywords", [])]),
    ), reverse=True)


def _manual_route_points(payload, points, region):
    point_ids = payload.get("pointIds")
    if point_ids is None:
        return []
    if not isinstance(point_ids, list) or len(point_ids) > MAX_ROUTE_POINTS or any(
        not isinstance(point_id, str) or point_id not in points for point_id in point_ids
    ) or len(set(point_ids)) != len(point_ids):
        raise ValueError(f"Выберите до {MAX_ROUTE_POINTS} разных мест из каталога.")
    selected = [points[point_id] for point_id in point_ids]
    if selected:
        region_id = region["id"] if region else selected[0].get("regionId")
        if any(point.get("regionId") != region_id for point in selected):
            raise ValueError("Выберите места одного региона.")
    return selected


def _manual_route(points, region, mode, age, route_format, interest, topics):
    titles = {"day": "На один день", "weekend": "На выходные", "online": "Онлайн"}
    overviews = {
        "day": "Посетите выбранные места в этом порядке. Сверьте время в дороге и часы посещения перед поездкой.",
        "weekend": "Распределите выбранные места на два дня в указанном порядке. Сверьте время в дороге и часы посещения.",
        "online": "Откройте материалы о выбранных местах по порядку и обсудите их вместе.",
    }
    stops = []
    for point in points:
        materials = _route_materials(point, mode, interest, topics) if route_format == "online" else []
        if materials:
            entry = materials[0]
            stops.append(_route_stop({**point, "source": entry["source"]}, point, _guide_text(entry, mode, include_title=True)))
        else:
            stops.append(_route_stop(point, point, point[mode]))
    label = region["name"] if region and len(points) > 1 else points[0]["title"]
    return {"title": f"{titles[route_format]} — {label}", "overview": overviews[route_format] + _pacing(mode, age, route_format),
            "stops": stops, "format": route_format}


def _pacing(mode, age, route_format):
    if mode == "adult":
        return " Сравните описание в каталоге с материалом музея."
    if age is not None and age <= 8:
        if route_format == "online":
            return " Выберите один короткий материал и попросите ребёнка пересказать самое интересное."
        return " Начните с одной детали, которую ребёнок может найти сам, и оставьте время для пауз."
    if age is not None and age >= 12:
        return " Предложите ребёнку выбрать один вопрос и поискать ответ в материале музея."
    return " По очереди назовите по одной детали, которая вас удивила."


def plan_route(payload):
    point_id, mode = _preferences(payload)
    route_format = payload.get("format")
    if route_format not in FORMATS:
        raise ValueError("Выберите формат маршрута.")
    interest = _read_text(payload, "interest", 180)
    ancestor_place = _read_text(payload, "ancestorPlace", 180)
    age = payload.get("childAge")
    if age is not None and (type(age) is not int or not 0 <= age <= 18):
        raise ValueError("Укажите возраст ребёнка от 0 до 18 лет.")
    catalog = get_catalog()
    regions = catalog.get("regions", [])
    points = {point["id"]: point for point in catalog["points"]}
    region = _resolve_region(payload, catalog)
    selected = _manual_route_points(payload, points, region)
    topics = _topics(interest)
    if selected:
        region = region or next((entry for entry in regions if entry["id"] == selected[0].get("regionId")), None)
        return _manual_route(selected, region, mode, age, route_format, interest, topics)
    if point_id and point_id not in points:
        raise ValueError("Выберите место из каталога.")
    if region and point_id and points[point_id].get("regionId") != region["id"]:
        raise ValueError("Выбранное место находится в другом регионе.")

    available_points = [point for point in points.values() if not region or point.get("regionId") == region["id"]]
    if point_id:
        point = points[point_id]
    else:
        matches = _named_entries(available_points, _terms(ancestor_place))
        if matches and len({entry["locality"] for entry in matches}) == 1:
            available_points = matches
        elif not region:
            region_matches = _named_entries(regions, _terms(ancestor_place))
            if len(region_matches) == 1:
                region = region_matches[0]
            else:
                legacy_name = catalog.get("region", {}).get("name")
                region = next((entry for entry in regions if entry["name"] == legacy_name), None)
            if region:
                available_points = [entry for entry in available_points if entry.get("regionId") == region["id"]]
        if not available_points:
            raise ValueError("Для выбранного региона пока нет мест в каталоге.")
        point = max(available_points, key=lambda entry: _interest_score(interest, entry["interests"]))

    regional_points = [entry for entry in points.values() if entry.get("regionId") == point.get("regionId")]
    materials = _route_materials(point, mode, interest, topics)
    if route_format == "online":
        title = f"Онлайн — {point['title']}"
        overview = "Откройте материалы из каталога по порядку и обсудите их вместе."
        stops = [
            _route_stop(entry, point, entry[mode] if entry.get("scope") != "region" else f"Из региональной подборки. {entry[mode]}")
            for entry in (materials[:3] or [point])
        ]
    elif route_format == "day":
        title = f"День в одной точке — {point['title']}"
        overview = "Прочитайте карточку места перед визитом и выберите, что хотите увидеть в музее. Проверьте режим работы на сайте музея."
        if materials and (materials[0]["type"] in topics or _interest_score(interest, materials[0].get("keywords", []))):
            overview += f" Для подготовки подойдёт материал «{materials[0]['title']}» в каталоге."
        stops = [_route_stop(point, point, point[mode])]
        if point.get("walk"):
            neighbors = [entry for entry in regional_points if entry is not point and entry.get("walk") and entry["locality"] == point["locality"]]
            neighbors.sort(key=lambda entry: _distance_km(point, entry))
            stops.extend(_route_stop(entry, entry, entry[mode]) for entry in neighbors[:2])
            if neighbors:
                title = f"День в Старой Ладоге — {point['title']}"
                overview = "Начните с выбранного места и продолжите прогулку вдоль Волхова. Сверьте часы посещения памятников на сайтах источников."
    else:
        title = f"Выходные — {point['title']} и окрестности"
        overview = "Выделите отдельный день на каждую точку. Проверьте время в дороге и режим работы музеев перед поездкой."
        candidates = [entry for entry in regional_points if entry is not point and _distance_km(point, entry) <= 135]
        candidates.sort(key=lambda entry: (-_interest_score(interest, entry["interests"]), _distance_km(point, entry)))
        stops = [_route_stop(entry, entry, entry[mode]) for entry in [point, *candidates[:1]]]
        if len(stops) == 1:
            title = f"Выходные — {point['title']}"
            overview = "Посвятите один день знакомству с местом. На второй оставьте время для чтения материалов из его карточки. Проверьте режим работы музея."

    return {"title": title, "overview": overview + _pacing(mode, age, route_format), "stops": stops, "format": route_format}
