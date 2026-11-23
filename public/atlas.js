const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const guideDialog = $('#guide-dialog');
const expertsDialog = $('#experts-dialog');
const expertsMessages = $('#experts-messages');
const routeDialog = $('#route-dialog');
const accountDialog = $('#account-dialog');
const chronicleDialog = $('#chronicle-dialog');
const videoDialog = $('#video-dialog');
const guideForm = $('#guide-form');
const routeForm = $('#route-form');
const authForm = $('#auth-form');
const profileForm = $('#profile-form');
const guideMessages = $('#guide-messages');
const hostedApi = $('meta[name="atlas-api"]')?.content;
const apiBase = hostedApi || '/api';
const sessionStorageKey = `pervoistochnik.session:${apiBase}`;
const markerButtons = [];
const routeSelections = new Map();
const guideHistory = new Map();
const guideDrafts = new Map();
const guideRequests = new Set();
const materialTypes = [
  ['story', 'Сказки и мифы', '▤'],
  ['film', 'Фильмы', '▸'],
  ['character', 'Персонажи', '✦'],
  ['book', 'Книги', '▥'],
  ['event', 'События', '◈'],
];
const placeCategories = {place: 'Историческое место', museum: 'Музей', person: 'Место, связанное с человеком'};
const emptyContent = {
  story: 'В этой подборке пока нет сказок и мифов.',
  film: 'В этой подборке пока нет фильмов.',
  character: 'В этой подборке пока нет персонажей.',
  book: 'В этой подборке пока нет книг.',
  event: 'В этой подборке пока нет событий.',
};

let atlas;
let region = null;
let point = null;
let mode = 'adult';
let contentType = 'story';
let profile = null;
let sessionToken = hostedApi ? readSessionToken() : null;
let routeRegion = null;
let routePoint = null;
let guideContext = null;
let guideMaterial = null;
let guideTrigger = null;
let guestQuestions = null;
let routePayload = null;
let routeRevision = 0;
let authMode = 'login';
let returnToRoute = false;
let mapLevel = 0;
let ladogaDetail = false;
let mapPan = {x: 0, y: 0};
let mapDrag = null;

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
  const options = {headers: new Headers()};
  if (hostedApi) {
    options.credentials = 'omit';
    options.redirect = 'error';
  }
  if (requestToken) options.headers.set('Authorization', `Bearer ${requestToken}`);
  if (data !== undefined) {
    options.method = 'POST';
    options.headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(data);
    options.signal = AbortSignal.timeout(16000);
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
  const network = error instanceof TypeError || error?.name === 'TimeoutError' || error?.name === 'AbortError';
  target.textContent = error ? network ? 'Связь прервалась. Попробуйте ещё раз.' : error.message : '';
}

function setMode(nextMode) {
  if (mode === nextMode) return;
  mode = nextMode;
  for (const control of $$('[data-mode]')) control.setAttribute('aria-pressed', String(control.dataset.mode === mode));
  document.body.dataset.audience = mode;
  if (!atlas) return;
  if (mode === 'child' && (guideMaterial?.minAge ?? 0) >= 12) guideMaterial = null;
  renderSelection();
  resetRoute();
}

function regionPoints(selected = region) {
  return selected ? atlas.points.filter(place => place.regionId === selected.id) : [];
}

function renderSelection() {
  $('#place-panel').hidden = !point;
  const regionPanel = $('#region-panel');
  if (regionPanel) regionPanel.hidden = Boolean(point);
  if (point) renderPoint();
  else renderRegion();
  renderMedia();
  syncGuide();
}

function renderRegion() {
  const title = $('#region-title');
  if (!title) return;
  title.textContent = region?.name || 'Выберите регион';
  $('#region-description').textContent = region?.[mode] || region?.description || 'Откройте регион на карте или в списке.';
  const locality = $('#region-locality');
  if (locality) {
    locality.textContent = region?.locality && region.locality !== region.name ? region.locality : '';
    locality.hidden = !locality.textContent;
  }
  const source = $('#region-source');
  if (source) {
    source.hidden = !region?.source;
    if (region?.source) {
      source.href = region.source.url;
      source.textContent = `Источник · ${region.source.title}`;
    }
  }
  const photo = $('#region-photo');
  if (photo) setPhoto(region?.photo, photo, $('#region-image'), $('#region-photo-caption'));
  $('#region-details').replaceChildren();
  for (const [key, label] of [['history', 'История'], ['culture', 'Культура'], ['peoples', 'Народы']]) {
    const field = region?.[key];
    const value = Array.isArray(field) ? field.join(', ') : field?.[mode] || field;
    if (!value) continue;
    const details = create('details');
    details.open = key === 'history';
    details.append(create('summary', label), create('p', value));
    $('#region-details').append(details);
  }
  const controls = $('#region-points');
  controls.classList.toggle('region-choice-list', !region);
  controls.classList.toggle('region-point-list', Boolean(region));
  controls.setAttribute('aria-label', region ? `Места · ${region.name}` : 'Регионы');
  controls.replaceChildren(...(region ? regionPoints().map(place => {
    const button = placeControl(place, place.title, 'button atlas-outline');
    if (placeCategories[place.category]) button.title = placeCategories[place.category];
    return button;
  }) : atlas.regions.map(item => regionControl(item, 'button atlas-outline'))));
  const guide = $('#region-guide');
  if (guide) guide.hidden = !region;
  const route = $('#region-route');
  if (route) route.hidden = !region;
  if (guide && route && guide.parentElement === route.parentElement) guide.parentElement.hidden = !region;
}

function renderContent() {
  for (const button of $$('[data-type]')) button.setAttribute('aria-pressed', String(button.dataset.type === contentType));
  const container = $('#place-content');
  const entries = contentForMode(contentType);
  if (!entries.length) {
    container.replaceChildren(create('p', emptyContent[contentType], 'content-empty'));
    return;
  }
  container.replaceChildren(...entries.map(entry => {
    const details = create('details');
    details.append(create('summary', entry.title));
    if (entry.kind) details.append(create('p', entry.kind, 'content-kind'));
    details.append(create('p', entry[mode] || entry.description));
    if (entry.type === 'film') details.append(filmControl(entry));
    if (entry.source) details.append(externalLink(entry.source.title, entry.source.url));
    if (entry.relatedSource) {
      const related = create('p');
      related.append(externalLink(entry.relatedSource.title, entry.relatedSource.url));
      details.append(related);
    }
    details.append(materialGuide(entry));
    return details;
  }));
}

function renderPoint() {
  $('#place-locality').textContent = [region.name, point.locality !== region.name ? point.locality : null].filter(Boolean).join(' · ');
  $('#place-title').textContent = point.title;
  $('#place-description').textContent = point[mode];
  $('#place-source').href = point.source.url;
  $('#place-source').textContent = `Источник · ${point.source.title}`;
  setPhoto(point.photo, $('#place-photo'), $('#place-image'), $('#photo-caption'));
  renderPointMarkers();
  renderContent();
  updateRoutePointButton();
}

function setPhoto(photo, figure, image, caption) {
  figure.hidden = !photo;
  if (!photo) return;
  image.src = `assets/${photo.file}`;
  image.alt = photo.alt || '';
  if (caption) {
    const legacyCredit = region?.id === 'leningrad-oblast' ? 'assets/ladoga-credits.md' : '';
    const creditUrl = photo.creditUrl || photo.url || legacyCredit;
    caption.replaceChildren(...(photo.credit ? [creditUrl ? externalLink(photo.credit, creditUrl) : photo.credit] : []));
    caption.hidden = !photo.credit;
  }
}

function renderPointMarkers() {
  for (const button of markerButtons) {
    const selected = point?.id === button.dataset.point;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  }
}

function selectRegion(selected, moveFocus = false) {
  region = selected;
  point = null;
  ladogaDetail = false;
  guideMaterial = null;
  if ($('#region-form-result')) $('#region-form-result').textContent = '';
  renderMap();
  renderSelection();
  if (moveFocus) focusCard('#region-title', '#region-panel');
}

function selectPoint(selected, moveFocus = true) {
  if (point?.id !== selected.id) guideMaterial = null;
  point = selected;
  contentType = availableMaterials(selected.content)[0]?.type ?? 'story';
  renderSelection();
  if (moveFocus) focusCard('#place-title', '#place-panel');
}

function focusCard(title, panel) {
  $(title)?.focus({preventScroll: true});
  $(panel)?.scrollIntoView({block: 'nearest'});
}

function renderMedia() {
  const container = $('#media-cards');
  const heading = $('#media-title');
  heading.textContent = region ? 'Материалы о культуре региона' : 'Материалы о культуре регионов';
  container.classList.toggle('media-overview', !region);
  if (!region) {
    container.closest('.media-board').hidden = false;
    container.replaceChildren(...atlas.regions.flatMap(item => {
      const entries = availableMaterials(item.content);
      const entry = entries.find(candidate => candidate.image) || entries[0];
      if (!entry) return [];
      const card = create('article', undefined, 'media-card overview-material');
      const photo = entry.image || item.photo?.file;
      if (photo) {
        const picture = create('div', undefined, 'media-art');
        const image = create('img');
        image.src = `assets/${photo}`;
        image.alt = '';
        image.loading = 'lazy';
        picture.append(image);
        card.append(picture);
      }
      const text = create('div', undefined, 'media-copy');
      const open = create('button', 'Открыть материал', 'text-control');
      open.type = 'button';
      open.setAttribute('aria-label', `Открыть материал «${entry.title}»`);
      open.addEventListener('click', () => {
        selectRegion(item);
        const details = $$('#media-cards details').find(element => element.dataset.material === entry.id);
        if (!details) return;
        details.open = true;
        details.querySelector('summary').focus();
      });
      text.append(create('p', item.name), create('h3', entry.title), open);
      card.append(text);
      return [card];
    }));
    return;
  }
  const categories = materialTypes.filter(([type]) => contentForMode(type).length);
  container.closest('.media-board').hidden = !categories.length;
  container.replaceChildren(...categories.map(([type, heading, symbol]) => {
    const card = create('article', undefined, `media-card media-${type}`);
    card.append(create('h2', heading));
    for (const entry of contentForMode(type)) {
      const cover = create('div', undefined, 'media-art');
      if (entry.image) {
        const img = create('img');
        img.src = `assets/${entry.image}`;
        img.alt = entry.imageAlt || '';
        cover.append(img);
      } else {
        cover.setAttribute('aria-hidden', 'true');
        cover.append(create('span', symbol));
      }
      const copy = create('details', undefined, 'media-copy');
      copy.dataset.material = entry.id;
      copy.append(create('summary', entry.title), create('p', entry.kind || point?.locality || region?.name));
      copy.append(create('p', entry[mode] || entry.description));
      if (type === 'film') copy.append(filmControl(entry));
      if (entry.source) copy.append(externalLink(entry.source.title, entry.source.url));
      if (entry.relatedSource) copy.append(externalLink(entry.relatedSource.title, entry.relatedSource.url));
      copy.append(materialGuide(entry));
      card.append(cover, copy);
    }
    return card;
  }));
}

function contentForMode(type) {
  const entries = point?.content ?? region?.content ?? [];
  return availableMaterials(entries).filter(entry => entry.type === type);
}

function availableMaterials(entries = []) {
  return entries.filter(entry => mode === 'adult' || (entry.minAge ?? 0) < 12);
}

function materialGuide(entry) {
  const button = create('button', 'Спросить об этом материале', 'text-control material-guide');
  button.type = 'button';
  button.addEventListener('click', () => openGuide(button, entry));
  return button;
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
    const player = create(hasVideo ? 'video' : 'iframe');
    if (hasVideo) {
      player.controls = true;
      player.playsInline = true;
      player.preload = 'metadata';
      player.setAttribute('aria-label', entry.title);
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

function setZoom(level) {
  mapLevel = Math.max(0, Math.min(2, level));
  if (!mapLevel) mapPan = {x: 0, y: 0};
  updateMapTransform();
  $('#map').classList.toggle('map-pannable', mapLevel > 0);
  $('#zoom-in').disabled = mapLevel === 2;
  $('#zoom-out').disabled = mapLevel === 0;
  $('#zoom-reset').disabled = mapLevel === 0;
}

function updateMapTransform() {
  const scale = 1 + mapLevel * .35;
  const layer = region ? $('#local-map') : $('#overview-layer');
  const map = $('#map');
  const xLimit = (scale - 1) * map.clientWidth * .7;
  const yLimit = (scale - 1) * map.clientHeight * .7;
  mapPan.x = Math.max(-xLimit, Math.min(xLimit, mapPan.x));
  mapPan.y = Math.max(-yLimit, Math.min(yLimit, mapPan.y));
  layer.style.scale = String(scale);
  layer.style.translate = `${mapPan.x}px ${mapPan.y}px`;
}

function startMapDrag(event) {
  if (!mapLevel || mapDrag || event.button !== 0 || event.target.closest('button')) return;
  mapDrag = {id: event.pointerId, x: event.clientX - mapPan.x, y: event.clientY - mapPan.y};
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add('map-dragging');
}

function moveMapDrag(event) {
  if (mapDrag?.id !== event.pointerId) return;
  mapPan = {x: event.clientX - mapDrag.x, y: event.clientY - mapDrag.y};
  updateMapTransform();
}

function stopMapDrag(event) {
  if (mapDrag?.id !== event.pointerId) return;
  mapDrag = null;
  event.currentTarget.classList.remove('map-dragging');
}

function mapKeys(event) {
  if (event.target !== event.currentTarget) return;
  const delta = {ArrowLeft: [36, 0], ArrowRight: [-36, 0], ArrowUp: [0, 36], ArrowDown: [0, -36]}[event.key];
  if (delta && mapLevel) {
    mapPan.x += delta[0];
    mapPan.y += delta[1];
    updateMapTransform();
  } else if (event.key === '+' || event.key === '=') setZoom(mapLevel + 1);
  else if (event.key === '-') setZoom(mapLevel - 1);
  else if (event.key === '0') setZoom(0);
  else return;
  event.preventDefault();
}

function renderMap() {
  const local = $('#local-map');
  const map = $('#map');
  const note = $('#map-note');
  const markers = $('#markers');
  const list = $('#place-list');
  $('#overview-map').hidden = Boolean(region);
  local.hidden = !region;
  local.querySelector('.map-background').hidden = true;
  local.classList.toggle('schematic-map', Boolean(region));
  $('#back-map').hidden = !region;
  $('#map-scope').textContent = ladogaDetail ? '‹ Схема региона' : region ? '‹ Карта России' : 'Выбрать регион';
  map.setAttribute('aria-label', ladogaDetail ? 'Схема Старой Ладоги' : region ? `Схема мест · ${region.name}` : 'Иллюстрированная карта России');
  list.hidden = !region;
  list.setAttribute('aria-label', region ? `Места · ${region.name}` : 'Места');
  markers.setAttribute('aria-label', list.getAttribute('aria-label'));
  markers.replaceChildren();
  list.replaceChildren();
  markerButtons.length = 0;
  const places = regionPoints();
  if (region) {
    const ladogaPlaces = places.filter(place => place.walk && place.locality === 'Старая Ладога');
    const ladoga = ladogaDetail || (places.length > 0 && ladogaPlaces.length === places.length);
    local.querySelector('.map-background').hidden = !ladoga;
    local.classList.toggle('schematic-map', !ladoga);
    note.textContent = ladoga ? 'Схема Старой Ладоги показывает примерное расположение мест.' : 'Схема показывает примерное расположение мест.';
    if (!ladoga && ladogaPlaces.length) {
      const details = create('button', 'Открыть схему Старой Ладоги', 'text-control');
      details.type = 'button';
      details.addEventListener('click', () => {
        if (point && !ladogaPlaces.includes(point)) closePlace();
        ladogaDetail = true;
        renderMap();
        $('#map-scope').focus();
      });
      note.append(' ', details);
    }
    const displayed = ladoga ? ladogaPlaces : places;
    for (const place of displayed) addPointMarker(place, displayed, ladoga);
    renderPointMarkers();
  } else {
    note.textContent = '';
  }
  note.hidden = !region;
  setZoom(0);
}

function regionControl(selected, className, label = selected.name) {
  const control = create('button', label, className);
  control.type = 'button';
  control.dataset.region = selected.id;
  control.setAttribute('aria-controls', 'region-panel local-map');
  control.addEventListener('click', () => selectRegion(selected, true));
  return control;
}

function addRussiaMarkers() {
  const positions = {
    'saint-petersburg': {x: 16, y: 33}, 'leningrad-oblast': {x: 18.5, y: 38},
    'perm-krai': {x: 34, y: 48}, 'irkutsk-oblast': {x: 59.7, y: 73.8},
  };
  for (const selected of atlas.regions) {
    const marker = regionControl(selected, `russia-marker russia-marker-active russia-marker-${selected.id}`, '');
    marker.setAttribute('aria-label', selected.name);
    marker.append(create('span', selected.name, 'russia-region-label'));
    const {x, y} = selected.map || positions[selected.id] || {x: 50, y: 50};
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    $('#russia-markers').append(marker);
  }
}

function placeControl(place, label, className) {
  const button = create('button', label, className);
  button.type = 'button';
  button.dataset.point = place.id;
  button.setAttribute('aria-controls', 'place-panel');
  button.addEventListener('click', () => selectPoint(place));
  return button;
}

function pointPosition(place, places, ladoga) {
  if (ladoga) return {x: 100 * (place.lon - 32.275) / .057, y: 100 * (60.019 - place.lat) / .033};
  const longitudes = places.map(item => item.lon);
  const latitudes = places.map(item => item.lat);
  const west = Math.min(...longitudes);
  const east = Math.max(...longitudes);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  return {
    x: east === west ? 50 : 16 + 68 * (place.lon - west) / (east - west),
    y: south === north ? 50 : 18 + 64 * (north - place.lat) / (north - south),
  };
}

function addPointMarker(place, places, ladoga) {
  const {x, y} = pointPosition(place, places, ladoga);
  const marker = placeControl(place, '', `map-marker marker-${place.id}`);
  marker.setAttribute('aria-label', place.title);
  const pin = create('span', undefined, 'marker-pin');
  pin.setAttribute('aria-hidden', 'true');
  marker.append(pin, create('span', place.mapLabel || place.title, 'marker-label'));
  marker.style.left = `${x}%`;
  marker.style.top = `${y}%`;
  marker.classList.toggle('map-marker-label-left', x > 60);
  const fallback = placeControl(place, place.mapLabel || place.title);
  markerButtons.push(marker, fallback);
  $('#markers').append(marker);
  $('#place-list').append(fallback);
}

function closePlace() {
  if (!point) return;
  point = null;
  guideMaterial = null;
  renderPointMarkers();
  renderSelection();
  focusCard('#region-title', '#region-panel');
}

function mapOverview() {
  if (!atlas) return;
  selectRegion(null);
  $('#map-scope').focus();
}

function placeName(text) {
  return text.toLocaleLowerCase('ru').replaceAll('ё', 'е').replace(/[^\p{L}\d]+/gu, ' ').trim();
}

function matchesName(query, name) {
  const normalized = placeName(name || '');
  return Boolean(normalized && ` ${query} `.includes(` ${normalized} `));
}

function matchRegion(text) {
  const query = placeName(text);
  const matchingRegions = atlas.regions.filter(item => [item.name, item.locality, ...(item.aliases || [])].some(name => matchesName(query, name)));
  if (matchingRegions.length === 1) return matchingRegions[0];
  return null;
}

function startRegionSearch(event) {
  event.preventDefault();
  if (!atlas) return;
  const rawPlace = event.currentTarget.elements.ancestorPlace.value.trim();
  const result = $('#region-form-result');
  if (!rawPlace) {
    result.textContent = 'Введите название населённого пункта или региона.';
    return;
  }
  const query = placeName(rawPlace);
  const matchedRegion = matchRegion(rawPlace);
  const candidates = matchedRegion ? regionPoints(matchedRegion) : atlas.points;
  const matchedPlaces = candidates.filter(place => [place.title, place.mapLabel, place.locality, ...(place.aliases || [])].some(name => matchesName(query, name)));
  const found = matchedRegion || (matchedPlaces.length ? atlas.regions.find(item => matchedPlaces.every(place => place.regionId === item.id)) : null);
  if (!found) {
    result.textContent = `В каталоге пока нет подборки для места «${rawPlace}». Можно выбрать регион на карте или сохранить место в семейном кабинете.`;
    return;
  }
  selectRegion(found, true);
  result.textContent = matchedPlaces.length === 1 ? `В регионе найдено место «${matchedPlaces[0].title}». Его можно открыть на карте или в списке.` : `Найдена подборка «${found.name}». Выберите место на карте или в списке.`;
}

function syncGuide() {
  const context = region ? [region.id, point?.id, guideMaterial?.id, mode].join(':') : null;
  if (context !== guideContext) {
    guideContext = context;
    guideMessages.replaceChildren();
    for (const {message, reply} of guideHistory.get(context) || []) appendChatExchange(guideMessages, message, reply);
    guideForm.elements.message.value = guideDrafts.get(context) || '';
    guideForm.elements.allowCloud.checked = false;
    showError('#guide-error', null);
  }
  $('#guide-place').textContent = [region?.name, point?.title, guideMaterial?.title].filter(Boolean).join(' · ');
  $('#guide-cloud').hidden = !context || mode !== 'adult' || !atlas.cloudAvailable;
  if ($('#guide-cloud').hidden) guideForm.elements.allowCloud.checked = false;
  guideForm.elements.message.disabled = !context;
  syncGuideIntro();
  syncGuideStatus();
  const entry = guideMaterial || point || region;
  const prompts = (entry?.questions ?? []).map(item => typeof item === 'string' ? item : item.question).filter(Boolean);
  const general = guideMaterial ? ['О чём этот материал?', 'Где узнать больше?'] : point ? ['Чем интересно это место?', 'Что здесь посмотреть?', 'Какие здесь есть истории?'] : ['Какие места здесь посмотреть?', 'Какие народы жили в регионе?', 'Что известно об истории региона?'];
  $('#guide-prompts').replaceChildren(...(entry ? (prompts.length ? prompts.slice(0, 3) : general) : []).map(prompt => {
    const button = create('button', prompt);
    button.type = 'button';
    button.addEventListener('click', () => {
      guideForm.elements.message.value = prompt;
      guideDrafts.set(guideContext, prompt);
      guideForm.elements.message.focus();
    });
    return button;
  }));
}

function syncGuideIntro() {
  const intro = $('#guide-intro');
  if (!guideContext) intro.textContent = 'Выберите регион на карте или в списке, чтобы задать вопрос по каталогу.';
  else if (guideForm.elements.allowCloud.checked) intro.textContent = 'Вопрос отправится в ЯндексGPT. Проводник покажет источники ответа.';
  else intro.textContent = 'Проводник отвечает по каталогу и показывает источники.';
}

function syncGuideStatus() {
  const pending = guideRequests.has(guideContext);
  const status = $('#guide-status');
  const remaining = guestQuestions ?? atlas?.guestLimit;
  const usingCloud = !$('#guide-cloud').hidden && guideForm.elements.allowCloud.checked;
  const quota = profile || !usingCloud || !Number.isInteger(remaining) ? '' : `Вопросов к ЯндексGPT на сегодня: ${remaining}.`;
  status.textContent = pending ? 'Проводник готовит ответ…' : quota;
  status.hidden = !guideContext || !status.textContent;
  guideForm.querySelector('button[type="submit"]').disabled = !guideContext || pending;
  $('#guide-continuation').hidden = !guideContext || !guideHistory.get(guideContext)?.length;
}

function openGuide(trigger, material) {
  if (!atlas) return;
  if (material !== undefined) guideMaterial = material;
  guideTrigger = trigger;
  guideDialog.hidden = false;
  syncGuide();
  guideDialog.scrollIntoView({block: 'nearest'});
  if (guideContext) guideForm.elements.message.focus();
  else ($('#close-guide') || $('#region-title'))?.focus();
}

function closeGuide() {
  guideDialog.hidden = true;
  const trigger = guideTrigger?.getClientRects().length ? guideTrigger : $('#nav-guide');
  trigger?.focus();
}

function showResearchChecklist(event) {
  event.preventDefault();
  const input = event.currentTarget.elements.message;
  const text = input.value.trim();
  if (!text) return;
  appendChatExchange(expertsMessages, text, {
    answer: 'Для будущей консультации запишите место, фамилию и примерные годы. Отдельно отметьте источник каждого сведения и вопрос, который хотите проверить. Сохраните эти записи в семейной летописи.',
    engine: 'demo',
  });
  input.value = '';
  input.focus();
}

function appendChatExchange(messages, text, {answer, sources, engine}) {
  const message = create('div', undefined, 'message message-question');
  message.append(create('p', text));
  const reply = create('div', undefined, 'message');
  reply.append(create('p', answer));
  if (engine) {
    const labels = {yandex: 'Ответ ЯндексGPT', catalog: 'Ответ по каталогу', training: 'Учебный ответ', demo: 'Демонстрационный ответ'};
    reply.append(create('span', labels[engine] || 'Ответ проводника', 'form-hint'));
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
}

async function askGuide(event) {
  event.preventDefault();
  const input = guideForm.elements.message;
  const message = input.value.trim();
  const context = guideContext;
  if (!message || !context || guideRequests.has(context)) return;
  const allowCloud = !$('#guide-cloud').hidden && guideForm.elements.allowCloud.checked;
  const payload = {regionId: region.id, pointId: point?.id, materialId: guideMaterial?.id, message, mode, allowCloud};
  const draft = input.value;
  showError('#guide-error', null);
  guideRequests.add(context);
  syncGuideStatus();
  try {
    const reply = await api('guide', payload);
    if (Number.isInteger(reply.remaining)) guestQuestions = reply.remaining;
    const exchanges = guideHistory.get(context) || [];
    exchanges.push({message, reply});
    guideHistory.set(context, exchanges);
    if (guideDrafts.get(context) === draft) guideDrafts.delete(context);
    if (context === guideContext) {
      appendChatExchange(guideMessages, message, reply);
      if (input.value === draft) input.value = '';
    }
  } catch (error) {
    if (error.status === 429) guestQuestions = 0;
    if (context === guideContext) showError('#guide-error', error);
  } finally {
    guideRequests.delete(context);
    syncGuideStatus();
  }
}

function openRoute(selected) {
  if (!atlas) return;
  const nextRegion = selected ? atlas.regions.find(item => item.id === selected.regionId) : region || routeRegion || (profile?.ancestorPlace && matchRegion(profile.ancestorPlace)) || atlas.regions[0];
  if (routeRegion !== nextRegion || routePoint !== selected) resetRoute();
  routeRegion = nextRegion;
  routePoint = selected || null;
  renderRouteSelection();
  showError('#route-error', null);
  routeDialog.showModal();
}

function resetRoute() {
  routeRevision++;
  routePayload = null;
  $('#route-result').hidden = true;
  $('#route-actions').hidden = true;
  showError('#route-error', null);
}

function selectedRoutePoints(selected) {
  return [...(routeSelections.get(selected.id) || [])];
}

function toggleRoutePoint(selectedRegion, selectedPoint, included) {
  const selection = routeSelections.get(selectedRegion.id) || new Set();
  if (included) selection.add(selectedPoint.id);
  else selection.delete(selectedPoint.id);
  routeSelections.set(selectedRegion.id, selection);
  if (routeRegion === selectedRegion) resetRoute();
  updateRoutePointButton();
}

function updateRoutePointButton() {
  const button = $('#add-route-point');
  if (!button || !point) return;
  const included = selectedRoutePoints(region).includes(point.id);
  button.textContent = included ? 'Убрать из маршрута' : 'Добавить в маршрут';
  button.setAttribute('aria-pressed', String(included));
}

function renderRouteSelection() {
  const heading = $('#route-place');
  heading.textContent = routePoint ? `${routeRegion.name} · ${routePoint.title}` : routeRegion.name;
  const container = $('#route-selection');
  if (!container) return;
  const selector = create('select');
  for (const item of atlas.regions) {
    const option = create('option', item.name);
    option.value = item.id;
    selector.append(option);
  }
  selector.value = routeRegion.id;
  selector.addEventListener('change', () => {
    routeRegion = atlas.regions.find(item => item.id === selector.value);
    routePoint = null;
    resetRoute();
    renderRouteSelection();
    container.querySelector('select').focus();
  });
  const regionField = create('label', 'Регион ');
  regionField.append(selector);

  const selection = create('fieldset', undefined, 'route-points');
  const tip = create('p', undefined, 'form-hint');
  const updateTip = () => {
    const count = selectedRoutePoints(routeRegion).length;
    tip.textContent = count ? `Выбрано точек: ${count}.` : routePoint ? `Начните с места «${routePoint.title}» или укажите точки самостоятельно.` : 'Выберите точки или попросите атлас подобрать их.';
  };
  selection.append(create('legend', 'Точки маршрута'), tip);
  for (const place of regionPoints(routeRegion)) {
    const checkbox = create('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedRoutePoints(routeRegion).includes(place.id);
    checkbox.addEventListener('change', () => {
      toggleRoutePoint(routeRegion, place, checkbox.checked);
      updateTip();
    });
    const label = create('label');
    label.append(checkbox, create('span', place.title));
    selection.append(label);
  }
  updateTip();
  container.replaceChildren(regionField, selection);
}

function routeStops(route) {
  const stops = create('ol', undefined, 'route-stops');
  for (const stop of route.stops) {
    const item = create('li');
    item.append(create('strong', stop.title));
    if (stop.locality) item.append(create('p', stop.locality, 'form-hint'));
    if (stop.reason) item.append(create('p', stop.reason));
    if (stop.source) item.append(externalLink(stop.source.title, stop.source.url));
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
  $('#route-chronicle').hidden = true;
  $('#quick-route-summary').textContent = route.title;
}

function activeRoutes() {
  return (profile?.routes || []).filter(route => route.stops?.length);
}

async function buildRoute(event) {
  event.preventDefault();
  const submit = routeForm.querySelector('button[type="submit"]');
  if (!routeRegion || submit.disabled) return;
  const pointIds = selectedRoutePoints(routeRegion);
  const pointId = routePoint && (!pointIds.length || pointIds.includes(routePoint.id)) ? routePoint.id : undefined;
  const payload = {...Object.fromEntries(new FormData(routeForm)), regionId: routeRegion.id, mode, pointId, pointIds: pointIds.length ? pointIds : undefined};
  const revision = routeRevision;
  submit.disabled = true;
  showError('#route-error', null);
  try {
    const route = await api('route', payload);
    if (revision !== routeRevision) return;
    routePayload = payload;
    renderRoute(route);
  } catch (error) {
    if (revision === routeRevision) showError('#route-error', error);
  } finally {
    submit.disabled = false;
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
    if (revision === routeRevision) {
      $('#route-status').textContent = 'Маршрут сохранён в семейном кабинете.';
      $('#route-chronicle').hidden = false;
    }
    const saved = result.route || profile.routes?.[0];
    if (saved) $('#quick-route-summary').textContent = saved.title;
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
  authForm.querySelector('button[type="submit"]').textContent = register ? 'Создать профиль' : 'Войти';
  for (const button of $$('[data-auth]')) button.setAttribute('aria-pressed', String(button.dataset.auth === next));
  showError('#account-error', null);
}

function renderAccount() {
  $('#auth-panel').hidden = Boolean(profile);
  $('#profile-panel').hidden = !profile;
  if (!profile) return;
  for (const input of profileForm.elements) {
    if (input.name) input.value = profile[input.name] ?? '';
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
  $('#nav-roots').hidden = !profile.ancestorPlace;
}

function clearSession() {
  if (hostedApi) setSessionToken(null);
  profile = null;
  profileForm.reset();
  $('#saved-routes').replaceChildren();
  $('#chronicle-notes').replaceChildren();
  $('#quick-route-summary').textContent = 'Добавьте места, которые хочется посетить или изучить онлайн.';
  $('#account-status').textContent = '';
  setAuth('login');
  renderAccount();
}

function openAccount(fromRoute = false) {
  if (!fromRoute) returnToRoute = false;
  showError('#account-error', null);
  $('#account-status').textContent = '';
  renderAccount();
  accountDialog.showModal();
}

async function authenticate(event) {
  event.preventDefault();
  const submit = authForm.querySelector('button[type="submit"]');
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
    renderAccount();
    if (returnToRoute) {
      returnToRoute = false;
      accountDialog.close();
      routeDialog.showModal();
      await saveRoute();
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
  const notes = $('#chronicle-notes');
  const routes = activeRoutes();
  notes.replaceChildren();
  if (profile) {
    notes.append(create('h3', profile.name));
    if (profile.ancestorPlace) notes.append(create('p', `География семьи · ${profile.ancestorPlace}`));
    for (const [key, title] of [
      ['familyNote', 'Семейное воспоминание'],
      ['researchQuestion', 'Вопрос для проверки'],
    ]) {
      if (!profile[key]) continue;
      const entry = create('article', undefined, 'journal-text');
      entry.append(create('h4', title), create('p', profile[key]));
      notes.append(entry);
    }
  }
  if (routes.length) notes.append(create('h3', 'Сохранённые маршруты'));
  for (const route of routes) {
    const chapter = create('article');
    chapter.append(create('h4', route.title), create('p', route.overview), routeStops(route));
    notes.append(chapter);
  }
  const hasEntries = Boolean(profile?.ancestorPlace || profile?.familyNote || profile?.researchQuestion || routes.length);
  if (!hasEntries) {
    notes.append(create('p', profile
      ? 'Добавьте семейное воспоминание или вопрос для проверки в кабинете.'
      : 'Откройте семейный кабинет, чтобы сохранить воспоминания, вопросы для проверки и маршруты.', 'form-hint'));
  }
  $('#print').hidden = !hasEntries;
  if (accountDialog.open) accountDialog.close();
  if (routeDialog.open) routeDialog.close();
  chronicleDialog.showModal();
}

for (const control of $$('[data-mode]')) control.addEventListener('click', () => setMode(control.dataset.mode));
for (const control of $$('[data-type]')) control.addEventListener('click', () => { contentType = control.dataset.type; renderContent(); });
for (const control of $$('[data-auth]')) control.addEventListener('click', () => setAuth(control.dataset.auth));
$('#open-guide').addEventListener('click', event => openGuide(event.currentTarget, null));
$('#region-guide')?.addEventListener('click', event => openGuide(event.currentTarget, null));
$('#nav-guide').addEventListener('click', event => openGuide(event.currentTarget));
$('#rail-guide').addEventListener('click', event => openGuide(event.currentTarget));
$('#guide-catalog').addEventListener('click', () => {
  const title = $('#media-title');
  if (title.getClientRects().length) title.focus();
  else focusCard(point ? '#place-title' : '#region-title', point ? '#place-panel' : '#region-panel');
});
$('#guide-route').addEventListener('click', () => openRoute(point));
$('#close-guide')?.addEventListener('click', closeGuide);
$('#nav-experts').addEventListener('click', () => expertsDialog.showModal());
$('#zoom-in').addEventListener('click', () => setZoom(mapLevel + 1));
$('#zoom-out').addEventListener('click', () => setZoom(mapLevel - 1));
$('#zoom-reset').addEventListener('click', () => setZoom(0));
const atlasMap = $('#map');
atlasMap.tabIndex = 0;
atlasMap.setAttribute('role', 'region');
atlasMap.addEventListener('pointerdown', startMapDrag);
atlasMap.addEventListener('pointermove', moveMapDrag);
atlasMap.addEventListener('lostpointercapture', stopMapDrag);
atlasMap.addEventListener('keydown', mapKeys);
for (const image of $$('#map img')) image.draggable = false;
$('#map-scope').addEventListener('click', () => {
  if (ladogaDetail) {
    ladogaDetail = false;
    renderMap();
  } else if (region) mapOverview();
  else focusCard('#region-title', '#region-panel');
});
$('#back-map').addEventListener('click', mapOverview);
$('#close-place')?.addEventListener('click', closePlace);
const startForm = $('#region-start-form');
const startSubmit = startForm?.querySelector('button[type="submit"]');
if (startSubmit) startSubmit.disabled = true;
startForm?.addEventListener('submit', startRegionSearch);
$('#build-route').addEventListener('click', () => openRoute(point));
$('#region-route')?.addEventListener('click', () => openRoute(null));
$('#add-route-point')?.addEventListener('click', () => toggleRoutePoint(region, point, !selectedRoutePoints(region).includes(point.id)));
$('#quick-route').addEventListener('click', () => openRoute(point));
$('#quick-family').addEventListener('click', () => openAccount());
$('#nav-roots').addEventListener('click', () => {
  if (!profile?.ancestorPlace || !atlas) return;
  accountDialog.close();
  startForm.elements.ancestorPlace.value = profile.ancestorPlace;
  startForm.requestSubmit();
});
$('#nav-chronicle').addEventListener('click', showChronicle);
$('#route-chronicle').addEventListener('click', showChronicle);
$('#chronicle-profile').addEventListener('click', () => {
  chronicleDialog.close();
  openAccount();
});
$('#nav-route').addEventListener('click', () => { if (atlas) openRoute(null); });
$('#nav-account').addEventListener('click', () => openAccount());
if (hostedApi) $('#profile-storage').textContent = 'Профиль и маршруты хранятся в семейном кабинете онлайн.';
$('#save-route').addEventListener('click', saveRoute);
$('#print').addEventListener('click', () => window.print());
videoDialog.addEventListener('close', () => {
  $('#video-player video')?.pause();
  $('#video-player').replaceChildren();
});
$('#print-chronicle').addEventListener('click', showChronicle);
$('#logout').addEventListener('click', async () => {
  const button = $('#logout');
  button.disabled = true;
  showError('#account-error', null);
  try {
    await api('logout', {});
    clearSession();
  } catch (error) {
    showError('#account-error', error);
  } finally {
    button.disabled = false;
  }
});
guideForm.addEventListener('submit', askGuide);
guideForm.elements.message.addEventListener('input', event => { if (guideContext) guideDrafts.set(guideContext, event.target.value); });
guideForm.elements.allowCloud.addEventListener('change', () => {
  syncGuideIntro();
  syncGuideStatus();
});
$('#experts-form').addEventListener('submit', showResearchChecklist);
routeForm.addEventListener('submit', buildRoute);
routeForm.addEventListener('change', resetRoute);
authForm.addEventListener('submit', authenticate);
profileForm.addEventListener('submit', updateProfile);

if (location.protocol === 'file:') {
  $('#atlas-status').textContent = 'Чтобы пользоваться картой и семейным кабинетом, откройте сайт онлайн.';
  const published = $('#published-atlas');
  if (published) published.hidden = false;
} else {
  api('atlas').then(data => {
    const oldRegion = data.region ? {id: 'leningrad-oblast', ...data.region} : null;
    atlas = {
      ...data,
      regions: data.regions?.length ? data.regions : oldRegion ? [oldRegion] : [],
      points: data.points.map(place => ({...place, regionId: place.regionId || oldRegion?.id})),
    };
    if (!atlas.regions.length) throw new Error('Нет регионов в каталоге.');
    addRussiaMarkers();
    selectRegion(null);
    $('#atlas-status').hidden = true;
    $('#atlas-grid').hidden = false;
    if (startSubmit) startSubmit.disabled = false;
    if (accountDialog.open) renderAccount();
    if (activeRoutes().length) $('#quick-route-summary').textContent = activeRoutes()[0].title;
  }).catch(() => { $('#atlas-status').textContent = 'Карта не загрузилась. Обновите страницу и попробуйте ещё раз.'; });
  const initialSessionToken = sessionToken;
  api('profile').then(data => {
    if (!data.profile || profile || sessionToken !== initialSessionToken) return;
    profile = data.profile;
    syncGuideStatus();
    if (accountDialog.open) renderAccount();
    if (activeRoutes().length) $('#quick-route-summary').textContent = activeRoutes()[0].title;
  }).catch(() => {});
}
