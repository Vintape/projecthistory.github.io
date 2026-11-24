const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const guidePanel = $('#guide-panel');
const expertsDialog = $('#experts-dialog');
const expertsMessages = $('#experts-messages');
const routeDialog = $('#route-dialog');
const accountDialog = $('#account-dialog');
const chronicleDialog = $('#chronicle-dialog');
const videoDialog = $('#video-dialog');
const searchDialog = $('#search-dialog');
const searchForm = $('#search-form');
const guideForm = $('#guide-form');
const guideSubmit = guideForm.querySelector('button[type="submit"]');
const routeForm = $('#route-form');
const routeSubmit = routeForm.querySelector('button[type="submit"]');
const authForm = $('#auth-form');
const mapView = createMapView($('#map'), {
  zoomIn: $('#zoom-in'), zoomOut: $('#zoom-out'), reset: $('#zoom-reset'), display: $('#map-scale'),
});
const profileForm = $('#profile-form');
const guideMessages = $('#guide-messages');
const hostedApi = $('meta[name="atlas-api"]')?.content;
const apiBase = hostedApi || '/api';
const sessionStorageKey = `pervoistochnik.session:${apiBase}`;
const emptyContent = {
  story: 'Для этой точки пока нет отдельной истории.',
  film: 'Для этой точки пока нет видео.',
  character: 'Для этой точки пока нет персонажей.',
  history: 'Для этой точки пока нет материалов по истории.',
};
const materialLabels = {
  film: 'Фильм', story: 'Сказка, легенда или рассказ', character: 'Персонаж', book: 'Книга', event: 'Историческое событие',
};
const searchStopWords = new Set(['и', 'в', 'во', 'о', 'об', 'из', 'на', 'по', 'про', 'для', 'с', 'со', 'у', 'от', 'к', 'ко']);
const byRussianName = new Intl.Collator('ru');

let atlas;
let materialIndex = [];
let region;
let point;
let mode = 'adult';
let contentType = 'film';
let showFeature = true;
let profile = null;
let sessionToken = hostedApi ? readSessionToken() : null;
let routeTarget;
let guideContextId = null;
let guideRevision = 0;
let routePayload = null;
let routeOrigin;
let routeRevision = 0;
let authMode = 'login';
let returnToRoute = false;
let returnToChronicle = false;
let localMap = false;
const ladogaRegionId = 'leningrad-oblast';
const isLadoga = () => region.id === ladogaRegionId;

const russiaPlaces = [
  ['Карелия', 23, 29.5], ['Ленинградская область', 17.5, 35.8],
  ['Архангельск', 30, 36.8], ['Москва', 15.3, 48.4],
  ['Марий Эл', 27.5, 48.1], ['Чувашия', 26.3, 51.5], ['Удмуртия', 29.4, 54.5],
  ['Башкортостан', 28.4, 59.8], ['Калмыкия', 14.9, 67], ['Дербент', 10.5, 81.7],
  ['Сургут', 41.5, 53], ['Тюмень', 41.5, 57.7], ['Новосибирск', 40.8, 69.4],
  ['Красноярск', 51.6, 62.1], ['Иркутск', 59.7, 73.8], ['Якутск', 67.8, 48],
  ['Петропавловск-Камчатский', 89.1, 48.1], ['Южно-Сахалинск', 88.5, 71.7], ['Владивосток', 84.8, 90.5],
];
const regionPins = new Map([
  ['Ленинградская область', ladogaRegionId], ['Иркутск', 'irkutsk-oblast'],
  ['Санкт-Петербург', 'saint-petersburg'], ['Пермский край', 'perm-krai'],
]);

function create(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function externalLink(title, url) {
  const link = create('a', title, 'source');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function readSessionToken() {
  try {
    return sessionStorage.getItem(sessionStorageKey);
  } catch {
    return null;
  }
}

function setSessionToken(token) {
  sessionToken = token;
  try {
    if (token) sessionStorage.setItem(sessionStorageKey, token);
    else sessionStorage.removeItem(sessionStorageKey);
  } catch {
    // The current page can still use the session if browser storage is disabled.
  }
}

async function api(path, data) {
  const requestToken = ['atlas', 'register', 'login'].includes(path) ? null : sessionToken;
  const options = {headers: new Headers(), signal: AbortSignal.timeout(16000)};
  if (hostedApi) {
    options.credentials = 'omit';
    options.redirect = 'error';
  }
  if (requestToken) options.headers.set('Authorization', `Bearer ${requestToken}`);
  if (data !== undefined) {
    options.method = 'POST';
    options.headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(data);
  }
  const response = await fetch(`${apiBase}/${path}`, options);
  if (!response.ok) {
    if (response.status === 401 && requestToken && requestToken === sessionToken) clearSession();
    const json = await response.json().catch(() => null);
    const error = new Error(json?.error || 'Запрос не выполнен.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function showError(id, error) {
  const target = $(id);
  target.hidden = !error;
  const connectionFailed = error instanceof TypeError || error?.name === 'TimeoutError';
  target.textContent = connectionFailed ? 'Связь прервалась. Попробуйте ещё раз.' : error?.message ?? '';
}

function setMode(nextMode) {
  if (mode !== nextMode) {
    resetGuideConversation();
    invalidateRoute();
  }
  mode = nextMode;
  for (const control of $$('[data-mode]')) control.setAttribute('aria-pressed', String(control.dataset.mode === mode));
  document.body.dataset.audience = mode;
  if (region) {
    renderPoint();
    syncGuide();
  }
}

function renderContent() {
  for (const button of $$('[data-type]')) {
    button.setAttribute('aria-pressed', String(button.dataset.type === contentType));
    if (button.dataset.type === 'history') button.hidden = !contentForMode('history').length;
  }
  const container = $('#place-content');
  if (showFeature && isLadoga() && !point && contentForMode('story').length) {
    container.replaceChildren(renderLegendFeature());
    return;
  }
  const entries = contentForMode(contentType);
  if (!entries.length) {
    container.replaceChildren(create('p', emptyContent[contentType], 'content-empty'));
    return;
  }
  container.replaceChildren(...entries.map(materialDetails));
}

function materialDetails(entry) {
  const details = create('details');
  details.dataset.material = entry.id;
  details.append(create('summary', entry.title));
  if (entry.kind) details.append(create('p', entry.kind, 'content-kind'));
  details.append(create('p', entry[mode]));
  if (entry.type === 'film') details.append(filmControl(entry));
  else details.append(externalLink(entry.source.title, entry.source.url));
  if (entry.relatedSource) {
    const related = create('p');
    related.append(externalLink(entry.relatedSource.title, entry.relatedSource.url));
    details.append(related);
  }
  return details;
}

function renderLegendFeature() {
  const feature = create('article', undefined, 'place-feature');
  const illustration = create('img');
  illustration.src = 'assets/slide-466/ladoga-article.png';
  illustration.alt = '';
  const heading = create('h3', '«Легенды Старой Ладоги»');
  const title = create('div', undefined, 'feature-title');
  title.append(create('p', 'Статья'), heading);
  const films = create('button', 'Фильмы о традициях и людях', 'feature-films');
  films.type = 'button';
  films.addEventListener('click', () => setContentType('film', true));
  const read = create('button', 'Читать', 'button feature-read');
  read.type = 'button';
  read.addEventListener('click', () => {
    const ladoga = regionPoints().find(place => place.id === 'staraya-ladoga');
    const stories = materialsForMode(ladoga?.content ?? [], 'story').map(materialDetails);
    if (stories[0]) stories[0].open = true;
    $('#legend-content').replaceChildren(...stories);
    $('#legend-dialog').showModal();
  });
  feature.append(illustration, title, films, read);
  return feature;
}

function setContentType(type, moveFocus = false) {
  contentType = type;
  showFeature = false;
  renderContent();
  if (moveFocus) $(`[data-type="${type}"]`).focus();
}

function renderPoint() {
  const selected = point ?? region;
  $('#place-locality').textContent = region.name;
  $('#place-locality').hidden = !point;
  $('#place-title').textContent = point?.title ?? region.name;
  $('#place-description').textContent = point || !isLadoga() ? selected[mode] : mode === 'child'
    ? 'Узнай, как жили русские, вепсы, ижоры, водь и финны. Начни путешествие со Старой Ладоги!'
    : 'Здесь жили и живут русские, вепсы, ижоры, водь и ингерманландские финны.';
  $('#place-source').hidden = !point && isLadoga();
  $('#place-source').href = selected.source.url;
  $('#place-source').textContent = `Источник · ${selected.source.title}`;
  const image = $('#place-image');
  $('#place-photo').hidden = !selected.photo;
  const caption = $('#photo-caption');
  if (selected.photo) {
    image.src = `assets/${selected.photo.file}`;
    image.alt = selected.photo.alt;
    caption.replaceChildren(externalLink(selected.photo.credit, selected.photo.creditUrl || 'assets/ladoga-credits.md'));
  }
  caption.hidden = !selected.photo || (!point && isLadoga());
  for (const button of $$('#markers button, #place-list button')) {
    const selected = point?.id === button.dataset.point;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  }
  $('#back-map').hidden = !localMap && !point;
  $('#back-map').textContent = localMap ? '‹ К карте России' : '‹ К карточке региона';
  renderContent();
}

function selectPoint(selected, moveFocus = false) {
  point = selected;
  contentType = selected.content.length ? materialTab(selected.content[0]) : 'story';
  showFeature = false;
  renderPoint();
  syncGuide();
  if (moveFocus) {
    $('#place-title').focus({preventScroll: true});
    $('#place-panel').scrollIntoView({block: 'nearest'});
  }
}

function contentForMode(type) {
  const entries = point?.content ?? [...(region.content ?? []), ...regionPoints().flatMap(place => place.content)];
  return materialsForMode([...new Map(entries.map(entry => [entry.id, entry])).values()], type);
}

function materialsForMode(entries, type) {
  return entries.filter(entry => materialTab(entry) === type && materialAvailable(entry));
}

function materialTab(entry) {
  return entry.type === 'book' || entry.type === 'event' ? 'history' : entry.type;
}

function materialAvailable(entry) {
  return mode === 'adult' || (entry.minAge ?? 0) < 12;
}

function searchWords(text) {
  const words = (text.normalize('NFKC').toLowerCase().replaceAll('ё', 'е').match(/[\p{L}\p{N}]+/gu) ?? []);
  return [...new Set(words.filter(word => !searchStopWords.has(word)).map(word => {
    const stem = word.replace(/(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ая|яя|ое|ее|ый|ий|ой|ые|ие|ов|ев|ей|ах|ях|ам|ям|[аеёиоуыэюяь])$/u, '');
    return word.length >= 5 && stem.length >= 4 ? stem : word;
  }))];
}

function buildMaterialIndex() {
  const records = [];
  for (const area of atlas.regions) {
    const added = new Set();
    const add = (entry, place = null) => {
      if (added.has(entry.id) || !materialLabels[entry.type]) return;
      added.add(entry.id);
      const metadata = [area.name, area.locality, ...(area.aliases ?? []), place?.title, place?.locality,
        entry.kind, materialLabels[entry.type], ...(entry.peoples ?? []), ...(entry.keywords ?? [])];
      records.push({entry, area, place, titleWords: searchWords(entry.title), metadataWords: searchWords(metadata.join(' ')),
        descriptionWords: {adult: searchWords(entry.adult ?? ''), child: searchWords(entry.child ?? '')}});
    };
    for (const entry of (area.content ?? [])) add(entry);
    for (const place of atlas.points.filter(candidate => candidate.regionId === area.id)) {
      for (const entry of place.content) add(entry, place);
    }
  }
  materialIndex = records;
  const {region: regionFilter, people, type} = searchForm.elements;
  regionFilter.replaceChildren(new Option('Все регионы', ''), ...atlas.regions.map(area => new Option(area.name, area.id)));
  const names = [...new Set(records.flatMap(record => record.entry.peoples ?? []))].sort(byRussianName.compare);
  people.replaceChildren(new Option('Все народы', ''), ...names.map(name => new Option(name, name)));
  type.replaceChildren(new Option('Все материалы', ''), ...Object.entries(materialLabels).map(([id, label]) => new Option(label, id)));
}

function wordMatches(words, term) {
  if (words.includes(term)) return 2;
  return term.length >= 3 && words.some(word => word.startsWith(term)) ? 1 : 0;
}

function openSearchResult({area, place, entry}) {
  searchDialog.close('material');
  selectRegion(area, area.id === ladogaRegionId && place?.locality === 'Старая Ладога');
  if (place) selectPoint(place);
  setContentType(materialTab(entry));
  const detail = $$('#place-content details').find(card => card.dataset.material === entry.id);
  if (detail) {
    detail.open = true;
    detail.querySelector('summary').focus({preventScroll: true});
    detail.scrollIntoView({block: 'nearest'});
  }
}

function renderSearch() {
  const filters = Object.fromEntries(new FormData(searchForm));
  const terms = searchWords(filters.query);
  const matches = [];
  for (const record of materialIndex) {
    const {entry, area, titleWords, metadataWords, descriptionWords} = record;
    if (!materialAvailable(entry) || (filters.region && filters.region !== area.id) ||
      (filters.people && !entry.peoples?.includes(filters.people)) || (filters.type && filters.type !== entry.type)) continue;
    const scores = terms.map(term => 6 * wordMatches(titleWords, term) + 3 * wordMatches(metadataWords, term) +
      wordMatches(descriptionWords[mode], term));
    if (scores.every(Boolean)) matches.push({record, score: scores.reduce((total, score) => total + score, 0)});
  }
  matches.sort((first, second) => second.score - first.score ||
    Number(second.record.area.id === region.id) - Number(first.record.area.id === region.id) ||
    byRussianName.compare(first.record.entry.title, second.record.entry.title));
  $('#search-status').textContent = matches.length ? `Найдено материалов — ${matches.length}` :
    'Ничего не найдено. Попробуйте другой запрос или снимите фильтр.';
  $('#search-results').replaceChildren(...matches.map(({record}) => {
    const row = create('li');
    const button = create('button', undefined, 'search-result');
    button.type = 'button';
    button.append(create('strong', record.entry.title), create('span',
      [materialLabels[record.entry.type], record.area.name, record.place?.title].filter(Boolean).join(' · ')));
    button.addEventListener('click', () => openSearchResult(record));
    row.append(button);
    return row;
  }));
}

function filmControl(entry, label = 'Смотреть') {
  const original = entry.watchUrl || entry.source.url;
  const hasVideo = /^https:\/\/streammtk\.prlib\.ru\/\d+\.mp4$/.test(entry.videoUrl || '');
  const hasEmbed = /^https:\/\/rutube\.ru\/play\/embed\/[a-f0-9]{32}\/?$/.test(entry.embedUrl || '');
  if (!hasVideo && !hasEmbed) {
    return externalLink('Открыть оригинал', original);
  }
  const button = create('button', label, 'text-control film-control');
  button.type = 'button';
  button.addEventListener('click', () => {
    $('#video-kind').textContent = entry.kind;
    $('#video-title').textContent = entry.title;
    $('#video-error').hidden = true;
    const player = create(hasVideo ? 'video' : 'iframe');
    if (hasVideo) {
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.setAttribute('aria-label', entry.title);
      player.addEventListener('error', () => {
        if (videoDialog.open && player.parentElement === $('#video-player')) $('#video-error').hidden = false;
      });
      player.src = entry.videoUrl;
    } else {
      player.title = entry.title;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.allow = 'fullscreen; picture-in-picture; encrypted-media';
      player.allowFullscreen = true;
      player.src = entry.embedUrl;
    }
    $('#video-player').replaceChildren(player);
    $('#video-source').replaceChildren(externalLink('Открыть оригинал на площадке', original));
    videoDialog.showModal();
  });
  return button;
}

function setMapScope(showLocal) {
  localMap = showLocal;
  point = showLocal ? regionPoints().find(place => place.id === 'staraya-ladoga') : null;
  contentType = showLocal ? 'story' : isLadoga() ? 'film' : 'history';
  showFeature = !showLocal && isLadoga();
  $('#map').classList.toggle('shows-local', showLocal);
  $('#overview-map').hidden = showLocal;
  $('#local-map').hidden = !showLocal;
  $('#map-note').hidden = true;
  $('#map-index').hidden = showLocal;
  $('#map-scope').hidden = !isLadoga();
  $('#map-scope').textContent = showLocal ? 'Карта России' : 'Точки Старой Ладоги';
  $('#map').setAttribute('aria-label', showLocal ? 'Схема Старой Ладоги' : 'Иллюстрированная карта России');
  mapView.show($(showLocal ? '#local-map' : '#overview-layer'));
  renderRegionPlaces();
  renderPoint();
  syncGuide();
}

function regionPoints() {
  return atlas.points.filter(place => place.regionId === region.id);
}

function selectRegion(selected, openLocal = false) {
  region = selected;
  $('#map-region').value = region.id;
  for (const marker of $$('#russia-markers [data-region]')) {
    marker.setAttribute('aria-pressed', String(marker.dataset.region === region.id));
  }
  setMapScope(openLocal);
}

function addRussiaMarkers() {
  const markers = $('#russia-markers');
  const index = $('#map-index-list');
  markers.replaceChildren();
  index.replaceChildren();
  const places = [...russiaPlaces, ['Санкт-Петербург', 20.3, 36.7], ['Пермский край', 33.1, 50.5]];
  for (const [name, x, y] of places) {
    const target = atlas.regions.find(entry => entry.id === regionPins.get(name));
    const entry = create('button', target?.name ?? name);
    entry.type = 'button';
    entry.addEventListener('click', () => openMapPlace(name, target));
    index.append(entry);
    if (target) {
      const marker = create('button', undefined, 'russia-marker');
      marker.type = 'button';
      marker.setAttribute('aria-label', target.id === ladogaRegionId ? `${name} — открыть Старую Ладогу` : target.name);
      marker.title = target.name;
      marker.dataset.region = target.id;
      marker.setAttribute('aria-controls', 'place-panel');
      marker.style.left = `${x}%`;
      marker.style.top = `${y}%`;
      marker.addEventListener('click', () => openMapPlace(name, target));
      markers.append(marker);
    }
  }
  markers.onclick = event => {
    if (event.target.closest('button')) return;
    const {left, top, width, height} = markers.getBoundingClientRect();
    let closest;
    let bestDistance = 19;
    for (const [name, x, y] of places) {
      const distance = Math.hypot(event.clientX - left - width * x / 100, event.clientY - top - height * y / 100);
      if (distance >= bestDistance) continue;
      closest = name;
      bestDistance = distance;
    }
    if (closest) openMapPlace(closest, atlas.regions.find(entry => entry.id === regionPins.get(closest)));
  };
}

function openMapPlace(name, target) {
  if (target) {
    const openLocal = target.id === ladogaRegionId;
    selectRegion(target, openLocal);
    if (openLocal) $('#map-scope').focus({preventScroll: true});
    return;
  }
  const note = $('#map-note');
  const ask = create('button', 'Спросить ИИ-ассистента', 'text-control');
  ask.type = 'button';
  ask.addEventListener('click', () => {
    guideForm.elements.message.value = `Расскажи об этом месте: ${name}`;
    openGuide();
  });
  note.replaceChildren(document.createTextNode(`${name} · Можно узнать больше в чате. `), ask);
  note.hidden = false;
  ask.focus({preventScroll: true});
}

function addMarkers() {
  const markers = $('#markers');
  markers.replaceChildren();
  // Approximate positions on the local schematic.
  const west = 32.275;
  const east = 32.332;
  const south = 59.986;
  const north = 60.019;
  for (const selected of atlas.points.filter(place => place.locality === 'Старая Ладога')) {
    const marker = create('button', undefined, `map-marker marker-${selected.id}`);
    const pin = create('span', undefined, 'marker-pin');
    pin.setAttribute('aria-hidden', 'true');
    marker.append(pin, create('span', selected.mapLabel || selected.title, 'marker-label'));
    marker.style.left = `${100 * (selected.lon - west) / (east - west)}%`;
    marker.style.top = `${100 * (north - selected.lat) / (north - south)}%`;
    bindPlaceControl(marker, selected);
    markers.append(marker);
  }
}

function bindPlaceControl(button, selected) {
  button.type = 'button';
  button.dataset.point = selected.id;
  button.setAttribute('aria-controls', 'place-panel');
  button.addEventListener('click', () => selectPoint(selected, matchMedia('(max-width: 920px)').matches));
}

function renderRegionPlaces() {
  const list = $('#place-list');
  const places = regionPoints().filter(place => !localMap || place.locality === 'Старая Ладога');
  list.hidden = !places.length;
  list.replaceChildren(...places.map(place => {
    const button = create('button', place.mapLabel || place.title);
    bindPlaceControl(button, place);
    return button;
  }));
}

function syncGuide() {
  if (!region) return;
  const contextId = point?.id ?? region.id;
  if (guideContextId !== contextId) {
    guideContextId = contextId;
    resetGuideConversation();
  }
  $('#guide-example').hidden = !!point || !isLadoga() || mode === 'child' || guideMessages.hasChildNodes();
  $('#guide-place').hidden = !point && isLadoga();
  $('#guide-place').textContent = point?.title ?? region.name;
  $('#guide-prompts').hidden = !point;
  guideForm.elements.message.placeholder = point ? 'Что можно здесь увидеть?' : 'Спросите о народах или регионе…';
  syncGuideIntro();
  const prompts = (point?.questions ?? []).map(item => typeof item === 'string' ? item : item.question).filter(Boolean);
  $('#guide-prompts').replaceChildren(...(prompts.length ? prompts.slice(0, 3) : ['Чем интересно это место?', 'Что здесь посмотреть?', 'Какие здесь есть истории?']).map(prompt => {
    const button = create('button', prompt);
    button.type = 'button';
    button.addEventListener('click', () => {
      guideForm.elements.message.value = prompt;
      guideForm.elements.message.focus();
    });
    return button;
  }));
}

function resetGuideConversation() {
  guideRevision += 1;
  guideMessages.replaceChildren();
  showError('#guide-error', null);
  $('#guide-status').hidden = true;
  guideSubmit.disabled = false;
}

function guideUsesCloud() {
  return atlas.cloudAvailable === true;
}

function syncGuideIntro() {
  const intro = $('#guide-intro');
  intro.hidden = !guideUsesCloud() && !point && !guideMessages.hasChildNodes();
  intro.textContent = guideUsesCloud()
    ? 'Вопросы обрабатывает ЯндексGPT. Личные данные лучше оставить в семейном кабинете.'
    : 'Ответы по материалам каталога.';
}

function openGuide() {
  if (!region) return;
  guidePanel.hidden = false;
  $('#nav-guide').setAttribute('aria-expanded', 'true');
  setGuideCollapsed(false);
  guidePanel.scrollIntoView({block: 'nearest'});
  guideForm.elements.message.focus();
}

function setGuideCollapsed(collapsed) {
  const button = $('#minimize-guide');
  $('#guide-body').hidden = collapsed;
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-label', collapsed ? 'Развернуть ИИ-ассистент' : 'Свернуть ИИ-ассистент');
  button.textContent = collapsed ? '+' : '−';
}

function sendDemoMessage(event, messages) {
  event.preventDefault();
  const input = event.currentTarget.elements.message;
  const text = input.value.trim();
  if (!text) return;
  appendChatExchange(messages, text, {answer: 'ДИНАСТИЯ!!!'});
  input.value = '';
  input.focus();
}

function appendChatExchange(messages, text, {answer, sources, engine}) {
  const message = create('div', undefined, 'message message-question');
  message.append(create('p', text));
  const reply = create('div', undefined, 'message');
  reply.append(create('p', answer));
  if (engine) {
    reply.append(create('span', engine === 'yandex' ? 'Ответ ЯндексGPT' : 'Ответ по каталогу', 'form-hint'));
  }
  if (sources?.length) {
    const links = create('div', undefined, 'guide-sources');
    links.append(...sources.map(source => externalLink(source.title, source.url)));
    reply.append(links);
  }
  if (messages === guideMessages && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    const read = create('button', 'Озвучить', 'text-control');
    read.type = 'button';
    read.addEventListener('click', () => {
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(answer);
      speech.lang = 'ru-RU';
      speechSynthesis.speak(speech);
    });
    reply.append(read);
  }
  messages.append(message, reply);
  messages.scrollTop = messages.scrollHeight;
  if (messages === guideMessages) {
    $('#guide-example').hidden = true;
    syncGuideIntro();
  }
}

async function askGuide(event) {
  event.preventDefault();
  if (guideSubmit.disabled) return;
  showError('#guide-error', null);

  const input = guideForm.elements.message;
  const message = input.value.trim();
  if (!message) return;
  const revision = guideRevision;
  const context = point ? {pointId: guideContextId} : {regionId: guideContextId};
  const allowCloud = guideUsesCloud();
  const status = $('#guide-status');
  guideSubmit.disabled = true;
  status.textContent = allowCloud ? 'ЯндексGPT готовит ответ…' : 'Ищем ответ в каталоге…';
  status.hidden = false;
  try {
    const reply = await api('guide', {message, ...context, mode, allowCloud});
    if (revision === guideRevision) {
      appendChatExchange(guideMessages, message, reply);
      if (input.value.trim() === message) input.value = '';
    }
  } catch (error) {
    if (revision === guideRevision) showError('#guide-error', error);
  } finally {
    if (revision === guideRevision) {
      guideSubmit.disabled = false;
      status.hidden = true;
    }
  }
}

function openRoute(selected, useFamily = false) {
  if (!region) return;
  const familyPlace = useFamily && profile?.ancestorPlace;
  const nextTarget = selected ? {pointId: selected.id} : familyPlace ? {} : {regionId: region.id};
  const nextOrigin = nextTarget.pointId || nextTarget.regionId || `family:${familyPlace}`;
  if (routeOrigin !== nextOrigin) invalidateRoute();
  routeOrigin = nextOrigin;
  routeTarget = nextTarget;
  $('#route-place').textContent = selected?.title || (familyPlace ? `География семьи · ${familyPlace}` : region.name);
  showError('#route-error', null);
  routeDialog.showModal();
}

function invalidateRoute() {
  routeRevision += 1;
  routePayload = null;
  routeSubmit.disabled = false;
  $('#route-result').hidden = true;
  $('#route-actions').hidden = true;
  $('#route-progress').hidden = true;
  showError('#route-error', null);
}

function routeStops(route) {
  const stops = create('ol', undefined, 'route-stops');
  for (const stop of route.stops) {
    const item = create('li');
    item.append(create('strong', stop.title), create('p', stop.reason), externalLink(stop.source.title, stop.source.url));
    stops.append(item);
  }
  return stops;
}

function renderRoute(route) {
  const result = $('#route-result');
  result.replaceChildren(create('h3', route.title), create('p', route.overview), routeStops(route));
  result.hidden = false;
  $('#route-actions').hidden = false;
  $('#route-status').textContent = '';
  $('#save-route').disabled = false;
}

function activeRoutes() {
  return (profile?.routes || []).filter(route => route.stops?.length);
}

async function buildRoute(event) {
  event.preventDefault();
  if (routeSubmit.disabled) return;
  invalidateRoute();
  const revision = routeRevision;
  const payload = {...Object.fromEntries(new FormData(routeForm)), mode, ...routeTarget};
  routeSubmit.disabled = true;
  $('#route-progress').hidden = false;
  try {
    const route = await api('route', payload);
    if (revision !== routeRevision) return;
    routePayload = payload;
    renderRoute(route);
  } catch (error) {
    if (revision === routeRevision) showError('#route-error', error);
  } finally {
    if (revision === routeRevision) {
      routeSubmit.disabled = false;
      $('#route-progress').hidden = true;
    }
  }
}

async function saveRoute() {
  if (!routePayload) return;
  if (!profile) {
    returnToRoute = true;
    routeDialog.close();
    openAccount(true);
    return;
  }
  const button = $('#save-route');
  const revision = routeRevision;
  button.disabled = true;
  showError('#route-error', null);
  try {
    const result = await api('routes', routePayload);
    profile = result.profile;
    renderAccount();
    if (revision === routeRevision) $('#route-status').textContent = 'Маршрут сохранён в семейном кабинете.';
  } catch (error) {
    if (revision === routeRevision) {
      button.disabled = false;
      showError('#route-error', error);
    }
  }
}

function setAuth(next) {
  authMode = next;
  const register = next === 'register';
  $('#register-name').hidden = !register;
  authForm.elements.name.disabled = !register;
  authForm.elements.name.required = register;
  authForm.elements.password.minLength = register ? 8 : 1;
  authForm.elements.password.autocomplete = register ? 'new-password' : 'current-password';
  showPassword(false);
  authForm.querySelector('button[type="submit"]').textContent = register ? 'Создать профиль' : 'Войти';
  for (const button of $$('[data-auth]')) button.setAttribute('aria-pressed', String(button.dataset.auth === next));
  showError('#account-error', null);
}

function showPassword(visible) {
  authForm.elements.password.type = visible ? 'text' : 'password';
  const toggle = $('#toggle-password');
  toggle.setAttribute('aria-pressed', String(visible));
  toggle.textContent = visible ? 'Скрыть' : 'Показать';
}

function clearPassword() {
  authForm.elements.password.value = '';
  showPassword(false);
}

function renderAccount() {
  $('#auth-panel').hidden = Boolean(profile);
  $('#profile-panel').hidden = !profile;
  if (!profile) return;
  for (const [key, value] of Object.entries(profile)) {
    const input = profileForm.elements.namedItem(key);
    if (input) input.value = value ?? '';
  }
  const saved = $('#saved-routes');
  saved.replaceChildren();
  const routes = activeRoutes();
  for (const route of routes) {
    const entry = create('div', undefined, 'saved-entry');
    const details = create('details');
    details.append(create('summary', route.title), create('p', route.overview), routeStops(route));
    const remove = create('button', 'Убрать', 'text-control');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Убрать маршрут ${route.title}`);
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      showError('#account-error', null);
      try {
        profile = (await api('routes/remove', {id: route.id})).profile;
        invalidateRoute();
        renderAccount();
      } catch (error) {
        remove.disabled = false;
        showError('#account-error', error);
      }
    });
    entry.append(details, remove);
    saved.append(entry);
  }
  if (!routes.length) saved.append(create('p', 'Соберите маршрут на карте, чтобы сохранить его здесь.', 'form-hint'));
  $('#print-chronicle').hidden = false;
}

function clearSession() {
  if (hostedApi) setSessionToken(null);
  profile = null;
  $('#account-status').textContent = '';
  setAuth('login');
  renderAccount();
}

function openAccount(fromRoute = false, fromChronicle = false) {
  returnToRoute = fromRoute;
  returnToChronicle = fromChronicle;
  clearPassword();
  showError('#account-error', null);
  $('#account-status').textContent = '';
  renderAccount();
  accountDialog.showModal();
}

async function authenticate(event) {
  event.preventDefault();
  const submit = authForm.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  showError('#account-error', null);
  try {
    const result = await api(authMode, Object.fromEntries(new FormData(authForm)));
    if (hostedApi) {
      if (typeof result.token !== 'string' || !result.token) throw new Error('Не удалось начать сеанс.');
      setSessionToken(result.token);
    }
    profile = result.profile;
    authForm.reset();
    showPassword(false);
    renderAccount();
    if (accountDialog.open && returnToRoute) {
      returnToRoute = false;
      accountDialog.close();
      routeDialog.showModal();
      await saveRoute();
    } else if (accountDialog.open && returnToChronicle) {
      returnToChronicle = false;
      showChronicle();
    }
  } catch (error) {
    showError('#account-error', error);
  } finally {
    submit.disabled = false;
  }
}

async function updateProfile(event) {
  event.preventDefault();
  showError('#account-error', null);
  const submit = profileForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  $('#account-status').textContent = '';
  try {
    const data = Object.fromEntries(new FormData(profileForm));
    data.childAge = data.childAge === '' ? null : Number(data.childAge);
    profile = (await api('profile', data)).profile;
    renderAccount();
    $('#account-status').textContent = 'Профиль сохранён.';
  } catch (error) {
    showError('#account-error', error);
  } finally {
    submit.disabled = false;
  }
}

function showChronicle() {
  if (!profile) {
    openAccount(false, true);
    return;
  }
  const routes = activeRoutes();
  const notes = $('#chronicle-notes');
  notes.replaceChildren(create('h3', profile.name));
  if (profile.ancestorPlace) notes.append(create('p', `География семьи · ${profile.ancestorPlace}`));
  if (!routes.length) notes.append(create('p', 'Сохраните первый маршрут, чтобы он появился в летописи.', 'form-hint'));
  for (const route of routes) {
    const chapter = create('article');
    chapter.append(create('h4', route.title), create('p', route.overview), routeStops(route));
    notes.append(chapter);
  }
  accountDialog.close();
  chronicleDialog.showModal();
}

function setMenu(open) {
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('#atlas-nav').classList.toggle('is-open', open);
}

function openSubscription() {
  $('#subscription-dialog').showModal();
}

for (const control of $$('[data-mode]')) control.addEventListener('click', () => setMode(control.dataset.mode));
for (const control of $$('[data-type]')) control.addEventListener('click', () => setContentType(control.dataset.type));
for (const control of $$('[data-auth]')) control.addEventListener('click', () => setAuth(control.dataset.auth));
$('#open-guide').addEventListener('click', openGuide);
$('#nav-guide').addEventListener('click', openGuide);
$('#minimize-guide').addEventListener('click', () => setGuideCollapsed(!$('#guide-body').hidden));
$('#close-guide').addEventListener('click', () => {
  guidePanel.hidden = true;
  $('#nav-guide').setAttribute('aria-expanded', 'false');
  $(matchMedia('(max-width: 560px)').matches ? '#menu-toggle' : '#nav-guide').focus();
});
$('#guide-films').addEventListener('click', () => setContentType('film', true));
$('#guide-stories').addEventListener('click', () => setContentType('story', true));
$('#guide-route').addEventListener('click', () => openRoute(point));
$('#buy-subscription').addEventListener('click', openSubscription);
$('#mobile-subscription').addEventListener('click', openSubscription);
$('#subscription-account').addEventListener('click', () => {
  $('#subscription-dialog').close();
  openAccount();
});
$('#nav-experts').addEventListener('click', () => expertsDialog.showModal());
$('#mobile-experts').addEventListener('click', () => expertsDialog.showModal());
$('#map-region').addEventListener('change', event => selectRegion(atlas.regions.find(entry => entry.id === event.target.value)));
$('#map-scope').addEventListener('click', () => setMapScope(!localMap));
$('#back-map').addEventListener('click', () => {
  setMapScope(false);
  $(isLadoga() ? '#map-scope' : '#map-region').focus({preventScroll: true});
});
$('#build-route').addEventListener('click', () => openRoute(point));
$('#nav-roots').addEventListener('click', () => openAccount());
$('#nav-chronicle').addEventListener('click', showChronicle);
$('#nav-route').addEventListener('click', () => openRoute(null, true));
$('#nav-account').addEventListener('click', () => openAccount());
$('#map-search').addEventListener('click', () => {
  renderSearch();
  searchDialog.returnValue = '';
  searchDialog.showModal();
  searchForm.elements.query.focus();
});
searchDialog.addEventListener('close', () => {
  if (!searchDialog.open && searchDialog.returnValue !== 'material') $('#map-search').focus({preventScroll: true});
});
searchDialog.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.isComposing) {
    event.preventDefault();
    searchDialog.close();
  }
});
searchForm.addEventListener('input', renderSearch);
searchForm.addEventListener('reset', () => requestAnimationFrame(renderSearch));
searchForm.addEventListener('submit', event => event.preventDefault());
$('#toggle-password').addEventListener('click', () => showPassword(authForm.elements.password.type === 'password'));
$('#menu-toggle').addEventListener('click', event => setMenu(event.currentTarget.getAttribute('aria-expanded') !== 'true'));
$('#atlas-nav').addEventListener('click', event => {
  if (!event.target.closest('a, button') || $('#menu-toggle').getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  $('#menu-toggle').focus();
}, true);
$('.atlas-header').addEventListener('keydown', event => {
  if (event.key !== 'Escape' || $('#menu-toggle').getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  $('#menu-toggle').focus();
});
if (hostedApi) $('#profile-storage').textContent = 'Профиль и маршруты хранятся в семейном кабинете онлайн.';
$('#save-route').addEventListener('click', saveRoute);
$('#print').addEventListener('click', () => window.print());
videoDialog.addEventListener('close', () => {
  $('#video-player video')?.pause();
  $('#video-player').replaceChildren();
});
accountDialog.addEventListener('close', () => {
  if (!accountDialog.open) {
    clearPassword();
    returnToRoute = false;
    returnToChronicle = false;
  }
});
$('#print-chronicle').addEventListener('click', showChronicle);
$('#logout').addEventListener('click', async () => {
  const button = $('#logout');
  button.disabled = true;
  showError('#account-error', null);
  try {
    await api('logout', {});
    clearSession();
    invalidateRoute();
  } catch (error) {
    showError('#account-error', error);
  } finally {
    button.disabled = false;
  }
});
guideForm.addEventListener('submit', askGuide);
$('#experts-form').addEventListener('submit', event => sendDemoMessage(event, expertsMessages));
routeForm.addEventListener('submit', buildRoute);
routeForm.addEventListener('change', invalidateRoute);
authForm.addEventListener('submit', authenticate);
profileForm.addEventListener('submit', updateProfile);

async function loadAtlas() {
  const status = $('#atlas-status');
  status.textContent = 'Загружаем карту…';
  try {
    atlas = await api('atlas');
    const initialRegion = atlas.regions.find(entry => entry.id === ladogaRegionId) ?? atlas.regions[0];
    if (!initialRegion) throw new Error('Каталог регионов пуст.');
    $('#map-region').replaceChildren(...atlas.regions.map(entry => new Option(entry.name, entry.id)));
    addRussiaMarkers();
    addMarkers();
    buildMaterialIndex();
    selectRegion(initialRegion);
    status.hidden = true;
    $('#atlas-grid').hidden = false;
    if (accountDialog.open) renderAccount();
  } catch {
    const retry = create('button', 'Повторить загрузку', 'button atlas-outline');
    retry.type = 'button';
    retry.addEventListener('click', loadAtlas);
    status.replaceChildren(document.createTextNode('Не удалось загрузить карту. '), retry);
  }
}

if (location.protocol === 'file:') {
  location.replace('https://vintape.github.io/projecthistory.github.io/mvp/');
} else {
  loadAtlas();
  const initialSessionToken = sessionToken;
  api('profile').then(data => {
    if (!data.profile || profile || sessionToken !== initialSessionToken) return;
    profile = data.profile;
    if (accountDialog.open) renderAccount();
  }).catch(() => {});
}
