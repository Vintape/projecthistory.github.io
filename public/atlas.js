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
const markerButtons = [];
const emptyContent = {
  story: 'Для этой точки пока нет отдельной истории.',
  film: 'Для этой точки пока нет видео.',
  character: 'Для этой точки пока нет персонажей.',
};

let atlas;
let point;
let mode = 'adult';
let contentType = 'story';
let profile = null;
let routePoint = null;
let guidePointId = null;
let routePayload = null;
let routeOrigin;
let authMode = 'login';
let returnToRoute = false;
let mapLevel = 0;
let localMap = false;

const russiaPlaces = [
  ['Карелия', 23, 29.5], ['Ленинградская область', 17.5, 35.8],
  ['Архангельск', 30, 36.8], ['Москва', 15.3, 48.4],
  ['Марий Эл', 27.5, 48.1], ['Чувашия', 26.3, 51.5], ['Удмуртия', 29.4, 54.5],
  ['Башкортостан', 28.4, 59.8], ['Калмыкия', 14.9, 67], ['Дербент', 10.5, 81.7],
  ['Сургут', 41.5, 53], ['Тюмень', 41.5, 57.7], ['Новосибирск', 40.8, 69.4],
  ['Красноярск', 51.6, 62.1], ['Иркутск', 59.7, 73.8], ['Якутск', 67.8, 48],
  ['Петропавловск-Камчатский', 89.1, 48.1], ['Южно-Сахалинск', 88.5, 71.7], ['Владивосток', 84.8, 90.5],
];

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

async function api(path, data) {
  const response = await fetch(`/api/${path}`, data === undefined ? {} : {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(16000),
  });
  const json = await response.json();
  if (!response.ok) {
    const error = new Error(json.error || 'Запрос не выполнен.');
    error.status = response.status;
    throw error;
  }
  return json;
}

function showError(id, error) {
  const target = $(id);
  target.hidden = !error;
  target.textContent = error ? error instanceof TypeError ? 'Связь прервалась. Попробуйте ещё раз.' : error.message : '';
}

function setMode(nextMode) {
  if (mode !== nextMode) {
    guideMessages.replaceChildren();
  }
  mode = nextMode;
  for (const control of $$('[data-mode]')) control.setAttribute('aria-pressed', String(control.dataset.mode === mode));
  document.body.dataset.audience = mode;
  if (point) {
    renderPoint();
    syncGuide();
  }
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
    details.append(create('p', entry[mode]));
    if (entry.type === 'film') details.append(filmControl(entry));
    else details.append(externalLink(entry.source.title, entry.source.url));
    if (entry.relatedSource) {
      const related = create('p');
      related.append(externalLink(entry.relatedSource.title, entry.relatedSource.url));
      details.append(related);
    }
    return details;
  }));
}

function renderPoint() {
  $('#place-locality').textContent = atlas.region.name;
  $('#place-title').textContent = point.title;
  $('#place-description').textContent = point[mode];
  $('#place-source').href = point.source.url;
  $('#place-source').textContent = `Источник · ${point.source.title}`;
  const image = $('#place-image');
  $('#place-photo').hidden = !point.photo;
  const caption = $('#photo-caption');
  if (point.photo) {
    image.src = `/assets/${point.photo.file}`;
    image.alt = point.photo.alt;
    caption.replaceChildren(externalLink(point.photo.credit, '/assets/ladoga-credits.md'));
    caption.hidden = false;
  }
  for (const button of markerButtons) {
    const selected = point.id === button.dataset.point;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-selected', selected);
  }
  renderContent();
  renderMedia();
}

function selectPoint(selected, moveFocus = false) {
  point = selected;
  contentType = selected.content[0]?.type ?? 'story';
  renderPoint();
  syncGuide();
  if (moveFocus) {
    $('#place-title').focus({preventScroll: true});
    $('#place-panel').scrollIntoView({block: 'nearest'});
  }
}

function renderMedia() {
  const categories = [
    ['film', 'Фильмы', '▸', 'Смотреть'],
    ['story', 'Сказки и мифы', '▤', 'Читать'],
    ['character', 'Персонажи', '✦', 'Узнать больше'],
  ];
  $('#media-cards').replaceChildren(...categories.map(([type, heading, symbol, action]) => {
    const card = create('article', undefined, `media-card media-${type}`);
    const title = create('h2', heading);
    card.append(title);
    const entry = contentForMode(type)[0];
    if (!entry) {
      card.append(create('p', emptyContent[type], 'content-empty'));
      return card;
    }
    const cover = create('div', undefined, 'media-art');
    if (entry.image) {
      const img = create('img');
      img.src = `/assets/${entry.image}`;
      img.alt = 'Иллюстрация Виктора Васнецова к балладе об Олеге';
      cover.append(img);
    } else {
      cover.setAttribute('aria-hidden', 'true');
      cover.append(create('span', symbol), create('strong', entry.title));
    }
    const copy = create('div', undefined, 'media-copy');
    copy.append(create('h3', entry.title), create('p', entry.kind || point.locality), type === 'film' ? filmControl(entry, action) : externalLink(action, entry.source.url));
    card.append(cover, copy);
    return card;
  }));
}

function contentForMode(type) {
  return point.content.filter(entry => entry.type === type && (mode === 'adult' || (entry.minAge ?? 0) < 12));
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
  const scale = String(1 + mapLevel * 0.25);
  $('#overview-layer').style.scale = scale;
  $('#local-map').style.scale = scale;
  $('#zoom-in').disabled = mapLevel === 2;
  $('#zoom-out').disabled = mapLevel === 0;
}

function setMapScope(showLocal) {
  localMap = showLocal;
  $('#overview-map').hidden = showLocal;
  $('#local-map').hidden = !showLocal;
  $('#place-list').hidden = !showLocal;
  $('#back-map').hidden = !showLocal;
  $('#map-note').hidden = true;
  $('#map-scope').textContent = showLocal ? 'Карта России' : 'Точки Старой Ладоги';
  $('#map').setAttribute('aria-label', showLocal ? 'Схема Старой Ладоги' : 'Иллюстрированная карта России');
  setZoom(0);
}

function addRussiaMarkers() {
  const markers = $('#russia-markers');
  for (const [name, x, y] of russiaPlaces) {
    const active = name === atlas.region.name;
    const marker = create('button', undefined, `russia-marker${active ? ' russia-marker-active' : ''}`);
    marker.type = 'button';
    marker.setAttribute('aria-label', active ? `${name} — открыть Старую Ладогу` : name);
    if (active) marker.append(create('span', name, 'russia-region-label'));
    marker.title = name;
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.addEventListener('click', () => {
      if (active) {
        selectPoint(atlas.points[0]);
        setMapScope(true);
        $('#map-scope').focus({preventScroll: true});
      } else {
        const note = $('#map-note');
        note.textContent = `${name} пока без материалов. Сейчас в атласе доступна Старая Ладога.`;
        note.hidden = false;
      }
    });
    markers.append(marker);
  }
}

function addMarkers() {
  const markers = $('#markers');
  const list = $('#place-list');
  // Approximate positions on the local schematic.
  const west = 32.275;
  const east = 32.332;
  const south = 59.986;
  const north = 60.019;
  for (const selected of atlas.points) {
    const marker = create('button', undefined, `map-marker marker-${selected.id}`);
    const pin = create('span', undefined, 'marker-pin');
    pin.setAttribute('aria-hidden', 'true');
    marker.append(pin, create('span', selected.mapLabel || selected.title, 'marker-label'));
    marker.style.left = `${100 * (selected.lon - west) / (east - west)}%`;
    marker.style.top = `${100 * (north - selected.lat) / (north - south)}%`;
    const fallback = create('button', selected.mapLabel || selected.title);
    for (const control of [marker, fallback]) {
      control.type = 'button';
      control.dataset.point = selected.id;
      control.setAttribute('aria-controls', 'place-panel');
      control.addEventListener('click', () => selectPoint(selected, matchMedia('(max-width: 800px)').matches));
      markerButtons.push(control);
    }
    markers.append(marker);
    list.append(fallback);
  }
}

function syncGuide() {
  if (!point) return;
  if (guidePointId !== point.id) {
    guidePointId = point.id;
    guideMessages.replaceChildren();
  }
  $('#guide-place').textContent = point.title;
  $('#guide-cloud').hidden = mode !== 'adult' || !atlas.cloudAvailable;
  if ($('#guide-cloud').hidden) guideForm.elements.allowCloud.checked = false;
  syncGuideIntro();
  const prompts = (point.questions ?? []).map(item => typeof item === 'string' ? item : item.question).filter(Boolean);
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

function syncGuideIntro() {
  $('#guide-intro').textContent = guideForm.elements.allowCloud.checked
    ? 'ЯндексGPT отвечает по материалам выбранного места и показывает источники.'
    : 'Демонстрационный режим с автоматическим ответом.';
}

function openGuide() {
  if (!point) return;
  guideDialog.scrollIntoView({block: 'nearest'});
  guideForm.elements.message.focus();
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
}

async function askGuide(event) {
  event.preventDefault();
  const submit = guideForm.querySelector('button[type="submit"]');
  if (submit.disabled) return;
  showError('#guide-error', null);
  if ($('#guide-cloud').hidden || !guideForm.elements.allowCloud.checked) {
    sendDemoMessage(event, guideMessages);
    return;
  }

  const input = guideForm.elements.message;
  const message = input.value.trim();
  if (!message) return;
  const questionPoint = guidePointId;
  const status = $('#guide-status');
  submit.disabled = true;
  status.textContent = 'ЯндексGPT готовит ответ…';
  status.hidden = false;
  try {
    const reply = await api('guide', {message, pointId: questionPoint, mode: 'adult', allowCloud: true});
    if (mode === 'adult' && questionPoint === guidePointId) {
      appendChatExchange(guideMessages, message, reply);
      if (input.value.trim() === message) input.value = '';
    }
  } catch (error) {
    if (mode === 'adult' && questionPoint === guidePointId) showError('#guide-error', error);
  } finally {
    submit.disabled = false;
    status.hidden = true;
  }
}

function openRoute(selected) {
  const nextPoint = selected?.id ?? null;
  if (routeOrigin !== nextPoint) {
    $('#route-result').hidden = true;
    $('#route-actions').hidden = true;
    routePayload = null;
  }
  routeOrigin = nextPoint;
  routePoint = selected;
  $('#route-place').textContent = selected ? selected.title : profile?.ancestorPlace ? `География семьи · ${profile.ancestorPlace}` : atlas.region.name;
  showError('#route-error', null);
  routeDialog.showModal();
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
  $('#quick-route-summary').textContent = route.title;
}

function activeRoutes() {
  if (!profile || !atlas) return [];
  const activeStops = new Set(atlas.points.flatMap(place => [place.id, ...place.content.map(item => item.id)]));
  return profile.routes.filter(route => route.stops.length && route.stops.every(stop => activeStops.has(stop.id)));
}

async function buildRoute(event) {
  event.preventDefault();
  const submit = routeForm.querySelector('button[type="submit"]');
  const payload = {...Object.fromEntries(new FormData(routeForm)), mode, pointId: routePoint?.id};
  submit.disabled = true;
  showError('#route-error', null);
  try {
    const route = await api('route', payload);
    if ((payload.pointId ?? null) !== routeOrigin) return;
    routePayload = payload;
    renderRoute(route);
  } catch (error) {
    showError('#route-error', error);
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
  button.disabled = true;
  showError('#route-error', null);
  try {
    const result = await api('routes', routePayload);
    profile = result.profile;
    renderAccount();
    $('#route-status').textContent = 'Маршрут сохранён в семейном кабинете.';
    $('#quick-route-summary').textContent = profile.routes[0].title;
  } catch (error) {
    button.disabled = false;
    showError('#route-error', error);
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
  $('#print-chronicle').hidden = !routes.length;
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
    profile = (await api(authMode, Object.fromEntries(new FormData(authForm)))).profile;
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
  const routes = activeRoutes();
  if (!routes.length) return;
  const notes = $('#chronicle-notes');
  notes.replaceChildren(create('h3', profile.name));
  if (profile.ancestorPlace) notes.append(create('p', `География семьи · ${profile.ancestorPlace}`));
  for (const route of routes) {
    const chapter = create('article');
    chapter.append(create('h4', route.title), create('p', route.overview), routeStops(route));
    notes.append(chapter);
  }
  accountDialog.close();
  chronicleDialog.showModal();
}

for (const control of $$('[data-mode]')) control.addEventListener('click', () => setMode(control.dataset.mode));
for (const control of $$('[data-type]')) control.addEventListener('click', () => { contentType = control.dataset.type; renderContent(); });
for (const control of $$('[data-auth]')) control.addEventListener('click', () => setAuth(control.dataset.auth));
$('#open-guide').addEventListener('click', openGuide);
$('#nav-guide').addEventListener('click', openGuide);
$('#nav-experts').addEventListener('click', () => expertsDialog.showModal());
$('#zoom-in').addEventListener('click', () => setZoom(mapLevel + 1));
$('#zoom-out').addEventListener('click', () => setZoom(mapLevel - 1));
$('#zoom-reset').addEventListener('click', () => setZoom(0));
$('#map-scope').addEventListener('click', () => setMapScope(!localMap));
$('#back-map').addEventListener('click', () => setMapScope(false));
$('#build-route').addEventListener('click', () => openRoute(point));
$('#quick-route').addEventListener('click', () => openRoute(point));
$('#quick-family').addEventListener('click', () => openAccount());
$('#nav-roots').addEventListener('click', () => openAccount());
$('#nav-chronicle').addEventListener('click', () => {
  if (activeRoutes().length) showChronicle();
  else openAccount();
});
$('#nav-route').addEventListener('click', () => { if (atlas) openRoute(null); });
$('#nav-account').addEventListener('click', () => openAccount());
$('#save-route').addEventListener('click', saveRoute);
$('#print').addEventListener('click', () => window.print());
videoDialog.addEventListener('close', () => {
  $('#video-player video')?.pause();
  $('#video-player').replaceChildren();
});
$('#print-chronicle').addEventListener('click', showChronicle);
$('#logout').addEventListener('click', async () => {
  showError('#account-error', null);
  try {
    await api('logout', {});
    profile = null;
    $('#account-status').textContent = '';
    setAuth('login');
    renderAccount();
  } catch (error) {
    showError('#account-error', error);
  }
});
guideForm.addEventListener('submit', askGuide);
guideForm.elements.allowCloud.addEventListener('change', syncGuideIntro);
$('#experts-form').addEventListener('submit', event => sendDemoMessage(event, expertsMessages));
routeForm.addEventListener('submit', buildRoute);
authForm.addEventListener('submit', authenticate);
profileForm.addEventListener('submit', updateProfile);

api('atlas').then(data => {
  atlas = data;
  addRussiaMarkers();
  addMarkers();
  selectPoint(atlas.points[0]);
  setMapScope(false);
  $('#atlas-status').hidden = true;
  $('#atlas-grid').hidden = false;
  if (accountDialog.open) renderAccount();
  if (activeRoutes().length) $('#quick-route-summary').textContent = activeRoutes()[0].title;
}).catch(() => { $('#atlas-status').textContent = 'Карта не загрузилась. Обновите страницу и попробуйте ещё раз.'; });
api('profile').then(data => {
  profile = data.profile;
  if (accountDialog.open) renderAccount();
  if (activeRoutes().length) $('#quick-route-summary').textContent = activeRoutes()[0].title;
}).catch(() => {});
