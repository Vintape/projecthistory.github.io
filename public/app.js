const form = document.querySelector('#research-form');
const familyFields = document.querySelector('#family-fields');
const cultureInfo = document.querySelector('#culture-info');
const result = document.querySelector('#result');
const error = document.querySelector('#error');
const exampleButton = document.querySelector('#example');
const submitButton = document.querySelector('#submit');
let currentResult;

const example = {
  mode: 'roots',
  surname: 'Ахметовы',
  place: 'Казань',
  clue: 'Прадед ушёл на фронт в 1942 году и пропал без вести.',
  interest: 'history',
  duration: 'weekend',
};

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, url) {
  const node = element('a', text);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function updateMode() {
  const culture = form.elements.mode.value === 'culture';
  familyFields.hidden = culture;
  cultureInfo.hidden = !culture;
  for (const input of familyFields.querySelectorAll('input, textarea')) input.disabled = culture;
  submitButton.textContent = culture ? 'Собрать культурный маршрут' : 'Собрать карту исследования';
}

function render(data, isExample) {
  const culture = data.mode === 'culture';
  document.querySelector('#result-title').textContent = culture ? 'Ваш культурный маршрут' : 'Ваша карта исследования';
  document.querySelector('#result-context').textContent = [data.scope, isExample && 'Вымышленный пример', data.modelUsed && 'Первый шаг подобран моделью'].filter(Boolean).join(' · ');
  document.querySelector('#known-panel').hidden = culture;
  document.querySelector('#steps-title').textContent = culture ? 'С чего начать' : 'Что проверить';
  result.classList.toggle('culture-result', culture);

  const known = element('dl');
  for (const item of data.known) {
    known.append(element('dt', item.label), element('dd', item.value));
  }
  document.querySelector('#known').replaceChildren(data.known.length ? known : element('p', 'Можно начать с разговора с близкими или выбрать один семейный документ.'));

  const steps = data.steps.map(step => {
    const item = element('li');
    item.append(element('strong', step.title), element('p', step.description));
    return item;
  });
  document.querySelector('#steps').replaceChildren(...steps);

  const sources = data.sources.map(source => {
    const item = element('li');
    item.append(link(source.title, source.url), element('p', source.description));
    return item;
  });
  document.querySelector('#sources').replaceChildren(...sources);

  document.querySelector('#route-note').textContent = data.routeNote;
  const days = data.route.map(day => {
    const section = element('section', undefined, 'route-day');
    section.append(element('h4', day.title));
    const places = element('ol', undefined, 'places');
    for (const place of day.places) {
      const item = element('li');
      item.append(element('h5', place.title), element('p', place.address, 'address'), element('p', place.description), link('Подробнее о месте', place.url));
      places.append(item);
    }
    section.append(places);
    return section;
  });
  document.querySelector('#route-days').replaceChildren(...days);
  currentResult = {data, isExample};
  result.hidden = false;
  document.querySelector('#result-title').focus({preventScroll: true});
  result.scrollIntoView({block: 'start'});
}

async function research(fields, isExample = false) {
  error.hidden = true;
  submitButton.disabled = true;
  exampleButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(fields),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Research request failed');
    render(await response.json(), isExample);
  } catch {
    error.textContent = 'Не удалось собрать карту. Попробуйте ещё раз.';
    error.hidden = false;
    error.scrollIntoView({block: 'nearest'});
  } finally {
    submitButton.disabled = false;
    exampleButton.disabled = false;
    submitButton.removeAttribute('aria-busy');
  }
}

function downloadResearch() {
  const {data, isExample} = currentResult;
  const lines = ['Первоисточник · ' + data.scope, isExample ? 'Вымышленный пример' : '', ''];
  if (data.mode === 'roots') {
    lines.push('Со слов семьи', ...data.known.map(item => `${item.label}: ${item.value}`), '');
  }
  lines.push('Следующие шаги', ...data.steps.map((step, index) => `${index + 1}. ${step.title}\n${step.description}`), '', 'Источники');
  for (const source of data.sources) lines.push(`${source.title}\n${source.description}\n${source.url}`);
  lines.push('', 'Маршрут по Татарстану', data.routeNote);
  for (const day of data.route) {
    lines.push('', day.title);
    for (const place of day.places) lines.push(`${place.title} · ${place.address}\n${place.description}\n${place.url}`);
  }
  const file = new Blob([lines.join('\n')], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(file);
  const anchor = element('a');
  anchor.href = url;
  anchor.download = 'Первоисточник — план исследования.txt';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener('change', event => {
  if (event.target.name === 'mode') updateMode();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  research(Object.fromEntries(new FormData(form)));
});
exampleButton.addEventListener('click', () => research(example, true));
document.querySelector('#download').addEventListener('click', downloadResearch);
updateMode();
