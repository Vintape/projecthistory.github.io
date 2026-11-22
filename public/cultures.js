const list = document.querySelector('#exhibits');
const detail = document.querySelector('#exhibit');
const catalogStatus = document.querySelector('#catalog-status');
const interestForm = document.querySelector('#interest-form');
const interestStatus = document.querySelector('#interest-status');
const buttons = new Map();
let exhibits;

function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function completed(id) {
  try {
    return localStorage.getItem(`exhibit-completed:${id}`) === 'yes';
  } catch {
    return false;
  }
}

function showExhibit(exhibit) {
  document.querySelector('#exhibit-meta').textContent = `${exhibit.people} · ${exhibit.place}`;
  const title = document.querySelector('#exhibit-title');
  title.textContent = exhibit.title;
  document.querySelector('#exhibit-story').textContent = exhibit.story;
  document.querySelector('#exhibit-source').href = exhibit.source;
  document.querySelector('#quest-question').textContent = exhibit.quest;
  const feedback = document.querySelector('#quest-feedback');
  const solved = completed(exhibit.id);
  feedback.textContent = solved ? `Задание выполнено. ${exhibit.explanation}` : '';
  feedback.className = solved ? 'correct' : '';
  const options = exhibit.options.map(answer => {
    const option = node('button', answer, 'button button-outline');
    option.type = 'button';
    option.addEventListener('click', () => {
      const correct = answer === exhibit.answer;
      feedback.textContent = correct ? `Верно. ${exhibit.explanation}` : 'Попробуйте ещё раз. Подсказка есть в музейной карточке.';
      feedback.className = correct ? 'correct' : 'retry';
      if (!correct) return;
      try {
        localStorage.setItem(`exhibit-completed:${exhibit.id}`, 'yes');
      } catch {
        // The activity also works in browsers that block storage.
      }
      buttons.get(exhibit.id).querySelector('.exhibit-progress').textContent = 'Задание выполнено';
    });
    return option;
  });
  document.querySelector('#quest-options').replaceChildren(...options);
  for (const [id, button] of buttons) button.setAttribute('aria-expanded', String(id === exhibit.id));
  detail.hidden = false;
  title.focus({preventScroll: true});
  detail.scrollIntoView({block: 'start'});
}

async function loadExhibits() {
  const response = await fetch('/api/exhibits');
  if (!response.ok) throw new Error('Catalog request failed');
  exhibits = await response.json();
  for (const exhibit of exhibits) {
    const button = node('button', '', `exhibit-button ${exhibit.id}`);
    button.type = 'button';
    button.setAttribute('aria-controls', 'exhibit');
    button.setAttribute('aria-expanded', 'false');
    button.append(
      node('span', exhibit.people, 'exhibit-people'),
      node('span', exhibit.title, 'exhibit-name'),
      node('span', exhibit.theme, 'exhibit-theme'),
      node('span', completed(exhibit.id) ? 'Задание выполнено' : '', 'exhibit-progress'),
    );
    button.addEventListener('click', () => showExhibit(exhibit));
    buttons.set(exhibit.id, button);
    const item = node('li', '');
    item.append(button);
    list.append(item);
  }
  catalogStatus.textContent = '';
}

interestForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!exhibits) {
    interestStatus.textContent = 'Подождите, пока загрузится коллекция.';
    return;
  }
  const submit = interestForm.querySelector('button');
  submit.disabled = true;
  interestStatus.textContent = '';
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({interest: interestForm.elements.interest.value}),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Recommendation request failed');
    const {id} = await response.json();
    const exhibit = exhibits.find(candidate => candidate.id === id);
    if (exhibit) {
      showExhibit(exhibit);
      interestStatus.textContent = `Подобрали по интересу: ${exhibit.title}.`;
    } else {
      interestStatus.textContent = 'По этой теме пока нет предметов. Можно выбрать из коллекции.';
    }
  } catch {
    interestStatus.textContent = 'Подбор временно недоступен. Выберите предмет в коллекции.';
  } finally {
    submit.disabled = false;
  }
});

loadExhibits().catch(() => {
  catalogStatus.textContent = 'Коллекция не загрузилась. Обновите страницу и попробуйте ещё раз.';
});
