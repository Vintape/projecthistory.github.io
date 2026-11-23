import bundledCatalog from "./pilot_catalog.json" with { type: "json" };

type Mode = "child" | "adult";
type RouteFormat = "day" | "weekend" | "online";
type Source = { title: string; url: string };

type Entry = {
  id: string;
  title: string;
  child: string;
  adult: string;
  source: Source;
  type?: string;
  locality?: string;
  aliases?: string[];
  keywords?: string[];
  questions?: string[];
  scope?: string;
  minAge?: number;
};

type Material = Entry & { type: string };
type GuideContext = Entry & { locality: string; content: Material[] };

type Point = GuideContext & {
  locality: string;
  regionId?: string;
  lat: number;
  lon: number;
  walk?: boolean;
  interests: string[];
};

type BundledPoint = Omit<Point, "content"> & {
  content?: Material[];
  contentRefs?: string[];
};

type Region = Omit<GuideContext, "title" | "content"> & {
  name: string;
  history?: string;
  culture?: string;
  peoples?: string[];
  content?: Material[];
};

type GuideAnswer = {
  answer: string;
  sources: Source[];
  engine: "catalog" | "yandex";
};

export class CatalogError extends Error {}

const catalog: {
  region?: { name?: string };
  regions?: Region[];
  points: BundledPoint[];
} = bundledCatalog;
const regions = catalog.regions ?? [];
const regionsById = new Map(regions.map((region) => [region.id, region]));
const rawPoints = catalog.points;
const materialsById = new Map(
  [...regions, ...rawPoints].flatMap((owner) =>
    (owner.content ?? []).map((entry) => [entry.id, entry] as const)
  ),
);

const points: Point[] = rawPoints.map(({ contentRefs, content, ...point }) => ({
  ...point,
  content: [
    ...(content ?? []),
    ...(contentRefs ?? []).map((id) => {
      const entry = materialsById.get(id);
      if (!entry) throw new Error(`Unknown catalog material: ${id}`);
      return entry;
    }),
  ],
}));

const pointsById = new Map(points.map((point) => [point.id, point]));

export function getCatalog() {
  return structuredClone({ ...bundledCatalog, points });
}

const YANDEX_ENDPOINT =
  "https://ai.api.cloud.yandex.net/foundationModels/v1/completion";
const YANDEX_TIMEOUT_MS = 8_000;
const MAX_COMPLETION_BYTES = 32_768;
const MAX_ROUTE_POINTS = 6;

const WORDS = /[а-яa-z]+|[0-9]+/giu;
const ENDINGS =
  /(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ая|яя|ое|ее|ый|ий|ой|ые|ие|ов|ев|ей|ах|ях|ам|ям|ом|ем|ую|юю|ия|ья|ию|ью|ии|ьи|[аеёиоуыэюяь])$/;
const STOP_WORDS = new Set(
  `а в во бы и или к ко на о об от по про с со у для из до это этот эти этим этом эта здесь там
    места месте место местом местный местные что кто где зачем отчего почему чем как такой такая такое
    так за ли есть какие какой какая какого можно предложи расскажи расскажите рассказывать рассказывают
    покажи узнать известен известна известно интересен интересна интересно интересного особенного
    увидеть посмотреть посмотреться почитать почитайте начать называется называют связан связана связаны
    связано знать знают находится находятся важен важна важны пожалуйста мне нам еще его ее их могу можем
    было были был сейчас кратко стоит посетить побывать музей заповедник град остров исторический`
    .split(/\s+/),
);
// Normalized questions contain only words separated by spaces. JavaScript's
// word boundaries do not cover Cyrillic.
const ORIENTATION =
  /(?:^| )(?:расскаж[а-яa-z]*|покаж[а-яa-z]*|интерес[а-яa-z]*|увид[а-яa-z]*|посмотр[а-яa-z]*|извест[а-яa-z]*|наход[а-яa-z]*|что (?:это|здесь))(?= |$)/;
const VISIT_DETAILS =
  /(?:^| )(?:билет[а-яa-z]*|расписани[а-яa-z]*|цен[ауые]|стоимост[а-яa-z]*|добрат[а-яa-z]*|парковк[а-яa-z]*|открыто|закрыто|часы работы|режим работы|во сколько|сколько стоит)(?= |$)/;
const DATE_QUESTION =
  /(?:^| )(?:когда|какого года|в каком году|в каком веке)(?= |$)/;
const DATE_INFO =
  /(?<![\p{L}\p{N}_])(?:\p{Nd}{3,4}|[IVXLCDM]+)\s*(?:гг?\.?|год|столет|век)/iu;
const LINK_TEXT =
  /(?:https?:|www\.|(?<![\p{L}\p{N}_])[а-яa-z0-9-]+\.[a-zрф]{2,}(?![\p{L}\p{N}_])|[<>])/iu;
const FAMILY_WORDS =
  /^(?:предк|прапрад|прадед|прабаб|дедушк|бабушк|родослов|генеалог|родствен|семейн|фамили|родител|брать|сестр|отец|отц|мам[ауые]|пап[ауые])|^(?:мать|матери|дед[ауе]?|бабк[аи])$/;
const PERSONAL_FAMILY_WORDS =
  /^(?:прапрад|прадед|прабаб|дедушк|бабушк)/;
const FAMILY_POSSESSIVES = new Set([
  "мой",
  "мои",
  "моя",
  "мое",
  "моих",
  "моего",
  "моей",
  "мою",
  "наш",
  "наши",
  "наших",
  "нашего",
  "нашей",
  "наша",
  "нашу",
]);
const MATERIAL_OVERVIEWS = new Set([
  "что это",
  "о чем это",
  "о чем этот материал",
  "что это за материал",
  "где узнать больше",
  "расскажи об этом материале",
  "расскажи про этот материал",
  "расскажи об этом",
  "расскажи о нем",
  "расскажи об этом событии",
  "о чем эта книга",
  "о чем этот фильм",
]);
const REGION_TOPICS = [
  ["peoples", /^(?:народ|населя|этнич|национальн|коренн)/],
  ["culture", /^(?:культур|традици|обыча|ремесл)/],
  ["history", /^(?:истори|прошл)/],
] as const;
const TOPIC_WORDS = [
  ["story", /^(?:легенд|сказк|предани|сюжет|истори|миф|былин)/],
  ["film", /^(?:мульт|кино|фильм|анимац|экранизац)/],
  ["character", /^(?:персонаж|геро|писател|поэт|личност)/],
] as const;
const DATE_TERMS = new Set(["когда", "году", "года", "век", "веке", "снят"]);

function words(text: string): string[] {
  return text.toLowerCase().replaceAll("ё", "е").match(WORDS) ?? [];
}

function stem(word: string): string {
  if (["крае", "края", "краю", "краем"].includes(word)) return "край";
  const shortened = word.replace(ENDINGS, "");
  return shortened.length >= 4 ? shortened : word;
}

function terms(text: string): Set<string> {
  return new Set(words(text).filter((word) => !STOP_WORDS.has(word)).map(stem));
}

function topics(text: string): Set<string> {
  const tokens = words(text);
  return new Set(
    TOPIC_WORDS.filter(([, pattern]) =>
      tokens.some((word) => pattern.test(word))
    )
      .map(([name]) => name),
  );
}

function isSubset(first: Set<string>, second: Set<string>): boolean {
  return Array.from(first).every((term) => second.has(term));
}

function intersectionSize(first: Set<string>, second: Set<string>): number {
  return Array.from(first).filter((term) => second.has(term)).length;
}

function trim(text: string): string {
  return text.replace(
    // Preserve the whitespace recognized by Python's str.strip().
    // deno-lint-ignore no-control-regex
    /^[\p{White_Space}\u001c-\u001f]+|[\p{White_Space}\u001c-\u001f]+$/gu,
    "",
  );
}

function readText(
  payload: Record<string, unknown>,
  key: string,
  limit: number,
  required = false,
): string {
  const value = payload[key];
  if (value == null && !required) return "";
  if (typeof value !== "string" || Array.from(value).length > limit) {
    throw new CatalogError(`Проверьте значение поля «${key}».`);
  }
  const text = trim(value);
  if (required && !text) {
    throw new CatalogError(`Проверьте значение поля «${key}».`);
  }
  return text;
}

function preferences(
  payload: Record<string, unknown>,
): { pointId: string; mode: Mode } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new CatalogError("Ожидается объект с параметрами.");
  }
  const mode = payload.mode;
  if (mode !== "child" && mode !== "adult") {
    throw new CatalogError("Выберите детский или взрослый режим.");
  }
  return { pointId: readText(payload, "pointId", 60), mode };
}

function resolveRegion(payload: Record<string, unknown>): Region | undefined {
  const id = readText(payload, "regionId", 60);
  if (!id) return undefined;
  const region = regionsById.get(id);
  if (!region) throw new CatalogError("Выберите регион из каталога.");
  return region;
}

type NamedEntry = {
  name?: string;
  title?: string;
  locality?: string;
  aliases?: string[];
};

function names(entry: NamedEntry): string[] {
  return [
    entry.name ?? entry.title ?? "",
    entry.locality ?? "",
    ...(entry.aliases ?? []),
  ];
}

function namedEntries<T extends NamedEntry>(
  entries: T[],
  questionTerms: Set<string>,
): T[] {
  const scored = entries.map((entry) => {
    const score = Math.max(
      0,
      ...names(entry).map(terms)
        .filter((name) => isSubset(name, questionTerms)).map((name) =>
          name.size
        ),
    );
    return { entry, score };
  });
  const best = Math.max(0, ...scored.map(({ score }) => score));
  return best
    ? scored.filter(({ score }) => score === best).map(({ entry }) => entry)
    : [];
}

function questionAboutRegion(
  question: string,
  region: Region,
  mode: Mode,
): string | undefined {
  const tokens = words(question);
  const normalized = tokens.join(" ");
  if (
    DATE_QUESTION.test(normalized) ||
    tokens.some((token) => /^\d+$/.test(token))
  ) return undefined;
  const summaries: string[] = [];
  for (const [key, pattern] of REGION_TOPICS) {
    const text = region[key];
    if (!text?.length || !tokens.some((token) => pattern.test(token))) continue;
    summaries.push(
      Array.isArray(text)
        ? `В карточке региона представлены сведения о следующих народах: ${
          text.join(", ")
        }.`
        : text,
    );
  }
  if (summaries.length) return summaries.join("\n\n");
  const regionTerms = new Set(
    names(region).flatMap((label) => [...terms(label)]),
  );
  const questionTerms = new Set(
    [...terms(question)].filter((term) => !regionTerms.has(term)),
  );
  if (
    !questionTerms.size ||
    ORIENTATION.test(normalized) &&
      isSubset(questionTerms, new Set(["регион", "край", "област", "город"]))
  ) {
    return region[mode];
  }
}

function forMode(context: GuideContext, mode: Mode): GuideContext {
  if (mode !== "child") return context;
  return {
    ...context,
    content: context.content.filter((entry) => (entry.minAge ?? 0) < 12),
  };
}

function regionContext(region: Region): GuideContext {
  return { ...region, title: region.name, content: region.content ?? [] };
}

function sources(entries: Entry[]): Source[] {
  return Array.from(
    new Map(entries.map((entry) => [entry.source.url, entry.source])).values(),
  );
}

function catalogReply(answer: string, entries: Entry[] = []): GuideAnswer {
  return {
    answer: regions.length && entries.length
      ? `По материалам каталога. ${answer}`
      : answer,
    sources: sources(entries),
    engine: "catalog",
  };
}

function searchEntries(
  question: string,
  point: GuideContext,
  mode: Mode,
): Entry[] {
  const entries = [point, ...point.content];
  const tokens = words(question);
  const normalized = tokens.join(" ");
  const exact = entries.find((entry) =>
    entry.questions?.some((prompt) => normalized === words(prompt).join(" "))
  );
  if (exact) return [exact];

  const topic = topics(question);
  if (normalized.startsWith("кто связан")) topic.add("character");
  const includesDate = DATE_QUESTION.test(normalized);
  const localityTerms = terms(point.locality);
  for (const alias of point.aliases ?? []) {
    for (const term of terms(alias)) localityTerms.add(term);
  }
  const questionTerms = new Set(
    Array.from(terms(question)).filter((term) => !localityTerms.has(term)),
  );
  if (includesDate && questionTerms.size) {
    const dateEntry = entries.find((entry) =>
      DATE_INFO.test(entry[mode]) && entry.questions?.some((prompt) => {
        if (!DATE_QUESTION.test(words(prompt).join(" "))) return false;
        const promptTerms = new Set(
          [...terms(prompt)].filter((term) => !localityTerms.has(term)),
        );
        return promptTerms.size === questionTerms.size &&
          isSubset(promptTerms, questionTerms);
      })
    );
    if (dateEntry) return [dateEntry];
  }
  const topicTerms = new Set(
    tokens.filter((word) =>
      TOPIC_WORDS.some(([, pattern]) => pattern.test(word))
    )
      .map(stem),
  );
  const detailTerms = new Set(
    Array.from(questionTerms).filter((term) =>
      !topicTerms.has(term) && !DATE_TERMS.has(term)
    ),
  );

  if (topic.size && !detailTerms.size && !includesDate) {
    const related = point.content.filter((entry) => topic.has(entry.type));
    if (related.length) return related.slice(0, 2);
  }

  const pointNames = terms(point.title);
  if (
    !topic.size && !includesDate && ORIENTATION.test(normalized) &&
    isSubset(questionTerms, pointNames)
  ) return [point];
  if (!detailTerms.size) {
    return includesDate && point.type && DATE_INFO.test(point[mode])
      ? [point]
      : [];
  }

  let best: Entry | undefined;
  let bestScore = -1;
  for (const entry of entries) {
    if (includesDate && !DATE_INFO.test(entry[mode])) continue;
    if (topic.size && entry !== point && !topic.has(entry.type ?? "")) continue;
    const names = terms(
      [entry.title, entry.locality ?? "", ...(entry.keywords ?? [])].join(" "),
    );
    const evidence = new Set([...names, ...terms(entry[mode])]);
    if (!isSubset(detailTerms, new Set([...evidence, ...pointNames]))) continue;
    if (
      !Array.from(detailTerms).some((term) =>
        evidence.has(term) && !pointNames.has(term)
      )
    ) continue;
    const score = intersectionSize(detailTerms, names);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best ? [best] : [];
}

function guideText(entry: Entry, mode: Mode, includeTitle: boolean): string {
  if (entry.scope === "region") {
    return `Из региональной подборки — «${entry.title}». ${entry[mode]}`;
  }
  return includeTitle ? `«${entry.title}». ${entry[mode]}` : entry[mode];
}

function yandexCredentials() {
  return {
    apiKey: trim(Deno.env.get("YANDEX_API_KEY") ?? ""),
    folderId: trim(Deno.env.get("YANDEX_FOLDER_ID") ?? ""),
  };
}

export function cloudAvailable(): boolean {
  const { apiKey, folderId } = yandexCredentials();
  return Boolean(apiKey && folderId);
}

async function readCompletion(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > MAX_COMPLETION_BYTES) {
        await reader.cancel();
        return "";
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

async function yandexAnswer(
  question: string,
  point: GuideContext | undefined,
  mode: Mode,
  apiKey: string,
  folderId: string,
): Promise<GuideAnswer | null> {
  const entries = new Map(
    (point ? [point, ...point.content] : []).map((entry) => [entry.id, entry]),
  );
  const context = Array.from(entries.values(), (entry) => ({
    id: entry.id,
    title: entry.title,
    type: entry.type ?? "place",
    scope: entry.scope ?? "point",
    text: entry[mode],
  }));
  const audience = mode === "child"
    ? "простыми словами, подходящими ребёнку"
    : "с точными формулировками";
  const instructions =
    `Ты ИИ-ассистент сайта «Первоисточник». Отвечай по-русски ${audience}, обычно в 1–4 предложениях. ` +
    "Отвечай на вопрос пользователя. Указанное в вопросе место важнее текущей карточки на карте. " +
    "Для вопросов без названия места используй текущую карточку, если это помогает. " +
    "Когда спрашивают о городе или регионе в целом, начни с общего обзора. Материалы каталога могут его дополнить. " +
    "Вопросы вне каталога отвечай по общим знаниям. Если вопрос неясен, попроси уточнить. " +
    "Отличай предания от установленных фактов. Не выдумывай сведения, источники и актуальные цены или расписания. " +
    "Сомнительные сведения помечай как непроверенные. Не определяй происхождение человека по фамилии или месту жительства. " +
    "Верни JSON-объект с полем answer (непустой текст без ссылок и разметки) " +
    "и sourceIds (массив только тех идентификаторов из материалов, которые подтверждают использованные факты). " +
    "Если материалы не использованы, верни пустой массив sourceIds. " +
    `Текущая карточка: ${point?.title ?? "отсутствует"}. Материалы: ${JSON.stringify(context)}`;
  const request = {
    modelUri: `gpt://${folderId}/yandexgpt-5.1`,
    completionOptions: {
      stream: false,
      temperature: 0.1,
      maxTokens: "350",
      reasoningOptions: { mode: "DISABLED" },
    },
    messages: [
      { role: "system", text: instructions },
      { role: "user", text: question },
    ],
    jsonObject: true,
  };

  try {
    const response = await fetch(YANDEX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-data-logging-enabled": "false",
        "x-folder-id": folderId,
        "Authorization": `Api-Key ${apiKey}`,
      },
      body: JSON.stringify(request),
      redirect: "error",
      signal: AbortSignal.timeout(YANDEX_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const data = JSON.parse(await readCompletion(response));
    const result = Object.hasOwn(data, "result") ? data.result : data;
    if (!Array.isArray(result?.alternatives)) return null;
    const alternative = result.alternatives[0];
    if (alternative?.status !== "ALTERNATIVE_STATUS_FINAL") return null;
    const reply = alternative.message?.text;
    if (typeof reply !== "string") return null;
    const { answer, sourceIds } = JSON.parse(reply);
    if (
      typeof answer !== "string" || LINK_TEXT.test(answer) ||
      answer.includes(apiKey)
    ) {
      return null;
    }
    const cleanAnswer = trim(answer);
    if (!cleanAnswer || Array.from(cleanAnswer).length > 1_200) return null;
    if (!Array.isArray(sourceIds)) return null;

    const citations: Entry[] = [];
    for (const id of sourceIds) {
      const entry = typeof id === "string" ? entries.get(id) : undefined;
      if (!entry) return null;
      citations.push(entry);
    }
    return {
      answer: cleanAnswer,
      sources: sources(citations),
      engine: "yandex",
    };
  } catch {
    return null;
  }
}

export async function answerGuide(
  payload: Record<string, unknown>,
  reserveCloud?: () => Promise<void>,
): Promise<GuideAnswer> {
  const { pointId, mode } = preferences(payload);
  const question = readText(payload, "message", 900, true);
  const allowCloud = "allowCloud" in payload ? payload.allowCloud : false;
  if (typeof allowCloud !== "boolean") {
    throw new CatalogError("Укажите, можно ли использовать ЯндексGPT.");
  }
  let region = resolveRegion(payload);
  const materialId = readText(payload, "materialId", 60);
  let selectedPoint = pointsById.get(pointId);
  if (pointId && !selectedPoint) {
    throw new CatalogError("Выберите место из каталога.");
  }
  if (region && selectedPoint && selectedPoint.regionId !== region.id) {
    throw new CatalogError("Выбранное место находится в другом регионе.");
  }

  const questionTerms = terms(question);
  const tokens = words(question);
  const normalized = tokens.join(" ");
  const familyWords = tokens.some((word) => FAMILY_WORDS.test(word));
  const personalQuestion =
    tokens.some((word) => PERSONAL_FAMILY_WORDS.test(word)) ||
    (familyWords && tokens.some((word) => FAMILY_POSSESSIVES.has(word)));
  if (regions.length && personalQuestion) {
    return catalogReply(
      "Место на карте помогает узнать историю региона. Для истории вашей семьи нужны семейные документы или архивные записи.",
    );
  }

  const namedRegions = namedEntries(regions, questionTerms);
  let namedPoints = namedEntries(points, questionTerms);
  const exactRegions = namedRegions.filter((entry) =>
    isSubset(terms(entry.name), questionTerms)
  );
  if (
    !selectedPoint && !materialId && exactRegions.length === 1 &&
    !namedPoints.some((point) => isSubset(terms(point.title), questionTerms))
  ) {
    region ??= exactRegions[0];
    if (region === exactRegions[0]) namedPoints = [];
  }
  if (!selectedPoint && !materialId && namedPoints.length) {
    const localPoints = namedPoints.filter((point) =>
      !region || point.regionId === region.id
    );
    if (new Set(localPoints.map((point) => point.locality)).size === 1) {
      selectedPoint = localPoints[0];
    }
  }
  if (!region && !selectedPoint && namedRegions.length === 1) {
    region = namedRegions[0];
  }
  const selectedContext = selectedPoint ?? (region && regionContext(region));
  let context = selectedContext && forMode(selectedContext, mode);
  if (materialId) {
    const material = context?.content.find((entry) => entry.id === materialId);
    if (!context || !material) {
      throw new CatalogError(
        "Выберите доступный материал в карточке места или региона.",
      );
    }
    context = { ...material, locality: context.locality, content: [] };
  }

  if (allowCloud) {
    const { apiKey, folderId } = yandexCredentials();
    if (apiKey && folderId) {
      const requestedRegion = namedRegions.length === 1 ? namedRegions[0] : undefined;
      const requestedPoint = namedPoints.length === 1 ? namedPoints[0] : undefined;
      const mentionsPoint = requestedPoint && [requestedPoint.title, ...(requestedPoint.aliases ?? [])]
        .map(terms).some((label) => label.size > 0 && isSubset(label, questionTerms));
      const requested = requestedRegion && requestedRegion.id !== selectedPoint?.regionId && !mentionsPoint
        ? regionContext(requestedRegion)
        : requestedPoint;
      const cloudContext = !materialId && requested ? forMode(requested, mode) : context;
      await reserveCloud?.();
      const result = await yandexAnswer(question, cloudContext, mode, apiKey, folderId);
      if (result) return result;
    }
  }

  if (!context) {
    if (!regions.length) throw new CatalogError("Выберите место из каталога.");
    return catalogReply("Выберите регион или место из каталога либо укажите его название в вопросе.");
  }

  const regionId = selectedPoint?.regionId ?? region?.id;
  const otherPlace = regions.length
    ? (namedPoints.length > 0 &&
      namedPoints.every((point) => point.regionId !== regionId)) ||
      (namedRegions.length > 0 &&
        namedRegions.every((entry) => entry.id !== regionId)) ||
      Boolean(
        selectedPoint && namedPoints.length &&
          !namedPoints.includes(selectedPoint),
      )
    : points.some((other) =>
      other.locality !== context.locality &&
      isSubset(terms(other.locality), questionTerms)
    );

  if (!otherPlace) {
    if (VISIT_DETAILS.test(normalized)) {
      return catalogReply(
        "В каталоге нет актуального расписания, цен и сведений о проезде. Перед поездкой проверьте их на сайте места.",
        [selectedPoint ?? context],
      );
    }

    if (materialId && MATERIAL_OVERVIEWS.has(normalized)) {
      return catalogReply(guideText(context, mode, true), [context]);
    }
    if (region && !selectedPoint && !materialId) {
      const answer = questionAboutRegion(question, region, mode);
      if (answer) return catalogReply(answer, [context]);
    }
    const entries = searchEntries(question, context, mode);
    if (entries.length) {
      let answer = entries.map((entry) =>
        guideText(entry, mode, entries.length > 1)
      )
        .join("\n\n");
      if (
        selectedPoint && !materialId && entries.length === 1 &&
        entries[0] === context &&
        normalized.includes("где наход")
      ) {
        answer = `${context.title} — ${context.locality}. ${answer}`;
      }
      return catalogReply(answer, entries);
    }
  }

  return catalogReply(
    `В каталоге пока нет ответа на этот вопрос в карточке «${context.title}». ` +
      "Можно спросить, чем интересно это место или регион, либо открыть другой материал.",
  );
}

function interestScore(interest: Set<string>, labels: string[]): number {
  return intersectionSize(interest, terms(labels.join(" ")));
}

function distanceKm(first: Point, second: Point): number {
  const latitude = (first.lat + second.lat) / 2 * Math.PI / 180;
  return 111 * Math.hypot(
    second.lat - first.lat,
    (second.lon - first.lon) * Math.cos(latitude),
  );
}

function routeStop(entry: Entry, point: Point, reason: string) {
  return {
    id: entry.id,
    title: entry.title,
    locality: point.locality,
    reason,
    source: entry.source,
  };
}

function routeMaterials(
  point: Point,
  mode: Mode,
  interest: Set<string>,
  relatedTopics: Set<string>,
): Material[] {
  const score = (entry: Material) =>
    interestScore(interest, [entry.title, ...(entry.keywords ?? [])]);
  return [...forMode(point, mode).content].sort((first, second) =>
    Number(relatedTopics.has(second.type)) -
      Number(relatedTopics.has(first.type)) ||
    score(second) - score(first)
  );
}

function manualRoutePoints(
  value: unknown,
  region: Region | undefined,
): Point[] {
  if (value == null) return [];
  const message = `Выберите до ${MAX_ROUTE_POINTS} разных мест из каталога.`;
  if (
    !Array.isArray(value) || value.length > MAX_ROUTE_POINTS ||
    new Set(value).size !== value.length
  ) {
    throw new CatalogError(message);
  }
  const selected = value.map((id) => {
    const point = typeof id === "string" ? pointsById.get(id) : undefined;
    if (!point) throw new CatalogError(message);
    return point;
  });
  const regionId = region?.id ?? selected[0]?.regionId;
  if (selected.some((point) => point.regionId !== regionId)) {
    throw new CatalogError("Выберите места одного региона.");
  }
  return selected;
}

function manualRoute(
  selected: Point[],
  region: Region | undefined,
  mode: Mode,
  age: number | null,
  format: RouteFormat,
  interest: Set<string>,
  relatedTopics: Set<string>,
) {
  const titles = {
    day: "На один день",
    weekend: "На выходные",
    online: "Онлайн",
  };
  const overviews = {
    day:
      "Посетите выбранные места в этом порядке. Сверьте время в дороге и часы посещения перед поездкой.",
    weekend:
      "Распределите выбранные места на два дня в указанном порядке. Сверьте время в дороге и часы посещения.",
    online:
      "Откройте материалы о выбранных местах по порядку и обсудите их вместе.",
  };
  const stops = selected.map((point) => {
    const entry = format === "online"
      ? routeMaterials(point, mode, interest, relatedTopics)[0]
      : undefined;
    return entry
      ? routeStop(
        { ...point, source: entry.source },
        point,
        guideText(entry, mode, true),
      )
      : routeStop(point, point, point[mode]);
  });
  const label = region && selected.length > 1 ? region.name : selected[0].title;
  return {
    title: `${titles[format]} — ${label}`,
    overview: overviews[format] + pacing(mode, age, format),
    stops,
    format,
  };
}

function pacing(mode: Mode, age: number | null, format: RouteFormat): string {
  if (mode === "adult") {
    return " Сравните описание в каталоге с материалом музея.";
  }
  if (age !== null && age <= 8) {
    return format === "online"
      ? " Выберите один короткий материал и попросите ребёнка пересказать самое интересное."
      : " Начните с одной детали, которую ребёнок может найти сам, и оставьте время для пауз.";
  }
  if (age !== null && age >= 12) {
    return " Предложите ребёнку выбрать один вопрос и поискать ответ в материале музея.";
  }
  return " По очереди назовите по одной детали, которая вас удивила.";
}

export function planRoute(payload: Record<string, unknown>) {
  const { pointId, mode } = preferences(payload);
  const format = payload.format;
  if (format !== "day" && format !== "weekend" && format !== "online") {
    throw new CatalogError("Выберите формат маршрута.");
  }
  const interest = readText(payload, "interest", 180);
  const ancestorPlace = terms(readText(payload, "ancestorPlace", 180));
  const age = payload.childAge ?? null;
  if (
    age !== null &&
    (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 18)
  ) {
    throw new CatalogError("Укажите возраст ребёнка от 0 до 18 лет.");
  }
  let region = resolveRegion(payload);
  const selected = manualRoutePoints(payload.pointIds, region);
  const interestTerms = terms(interest);
  const relatedTopics = topics(interest);
  if (selected.length) {
    const regionId = selected[0].regionId;
    region ??= regionId === undefined ? undefined : regionsById.get(regionId);
    return manualRoute(
      selected,
      region,
      mode,
      age,
      format,
      interestTerms,
      relatedTopics,
    );
  }

  const selectedPoint = pointsById.get(pointId);
  if (pointId && !selectedPoint) {
    throw new CatalogError("Выберите место из каталога.");
  }
  if (region && selectedPoint && selectedPoint.regionId !== region.id) {
    throw new CatalogError("Выбранное место находится в другом регионе.");
  }

  const scorePoint = (entry: Point) =>
    interestScore(interestTerms, entry.interests);
  let point = selectedPoint;
  if (!point) {
    let availablePoints = region
      ? points.filter((point) => point.regionId === region?.id)
      : points;
    const matches = namedEntries(availablePoints, ancestorPlace);
    if (
      matches.length &&
      new Set(matches.map((point) => point.locality)).size === 1
    ) {
      availablePoints = matches;
    } else if (!region) {
      const regionMatches = namedEntries(regions, ancestorPlace);
      region = regionMatches.length === 1
        ? regionMatches[0]
        : regions.find((entry) => entry.name === catalog.region?.name);
      if (region) {
        availablePoints = availablePoints.filter((entry) =>
          entry.regionId === region?.id
        );
      }
    }
    if (!availablePoints.length) {
      throw new CatalogError(
        "Для выбранного региона пока нет мест в каталоге.",
      );
    }
    point = availablePoints.reduce((best, entry) =>
      scorePoint(entry) > scorePoint(best) ? entry : best
    );
  }
  const regionalPoints = points.filter((entry) =>
    entry.regionId === point.regionId
  );
  const materials = routeMaterials(point, mode, interestTerms, relatedTopics);

  let title: string;
  let overview: string;
  let stops: ReturnType<typeof routeStop>[];
  if (format === "online") {
    title = `Онлайн — ${point.title}`;
    overview =
      "Откройте материалы из каталога по порядку и обсудите их вместе.";
    const entries = materials.length ? materials.slice(0, 3) : [point];
    stops = entries.map((entry) =>
      routeStop(
        entry,
        point,
        entry.scope === "region"
          ? `Из региональной подборки. ${entry[mode]}`
          : entry[mode],
      )
    );
  } else if (format === "day") {
    title = `День в одной точке — ${point.title}`;
    overview =
      "Прочитайте карточку места перед визитом и выберите, что хотите увидеть в музее. Проверьте режим работы на сайте музея.";
    const first = materials[0];
    if (
      first &&
      (relatedTopics.has(first.type) ||
        interestScore(interestTerms, first.keywords ?? []))
    ) {
      overview +=
        ` Для подготовки подойдёт материал «${first.title}» в каталоге.`;
    }
    stops = [routeStop(point, point, point[mode])];
    if (point.walk) {
      const neighbors = regionalPoints.filter((entry) =>
        entry !== point && entry.walk && entry.locality === point.locality
      ).sort((first, second) =>
        distanceKm(point, first) - distanceKm(point, second)
      );
      if (neighbors.length) {
        stops.push(
          ...neighbors.slice(0, 2).map((entry) =>
            routeStop(entry, entry, entry[mode])
          ),
        );
        title = `День в Старой Ладоге — ${point.title}`;
        overview =
          "Начните с выбранного места и продолжите прогулку вдоль Волхова. Сверьте часы посещения памятников на сайтах источников.";
      }
    }
  } else {
    const neighbors = regionalPoints.filter((entry) =>
      entry !== point && distanceKm(point, entry) <= 135
    )
      .sort((first, second) =>
        scorePoint(second) - scorePoint(first) ||
        distanceKm(point, first) - distanceKm(point, second)
      );
    if (neighbors.length) {
      title = `Выходные — ${point.title} и окрестности`;
      overview =
        "Выделите отдельный день на каждую точку. Проверьте время в дороге и режим работы музеев перед поездкой.";
    } else {
      title = `Выходные — ${point.title}`;
      overview =
        "Посвятите один день знакомству с местом. На второй оставьте время для чтения материалов из его карточки. Проверьте режим работы музея.";
    }
    stops = [point, ...neighbors.slice(0, 1)]
      .map((entry) => routeStop(entry, entry, entry[mode]));
  }

  return {
    title,
    overview: overview + pacing(mode, age, format),
    stops,
    format,
  };
}
