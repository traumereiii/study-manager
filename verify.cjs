// 브라우저 의존 부분을 대체해 저장과 학습 흐름의 회귀를 검증합니다.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const store = {};
function setup(fail = false) {
  const nodes = new Map();
  const listeners = {};
  const element = () => ({ innerHTML: '', textContent: '', classList: { toggle() {} }, focus() {}, setAttribute() {}, removeAttribute() {}, remove() {}, append() {}, addEventListener() {}, insertAdjacentHTML(_, html) { this.innerHTML += html; }, querySelector() { return element(); } });
  const app = element();
  app.addEventListener = (type, handler) => (listeners[type] ||= []).push(handler);
  nodes.set('#app', app);
  const context = {
    document: { querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); }, querySelectorAll: () => [], addEventListener(type, handler) { listeners['document:' + type] = [handler]; }, createElement: element, body: element() },
    location: { hash: '#books' }, window: { addEventListener() {}, scrollTo() {} },
    localStorage: { getItem: key => store[key] || null, setItem(key, value) { if (fail) throw Error('저장 실패'); store[key] = value; } },
    FormData: class { constructor(form) { return form.data; } },
    crypto: require('node:crypto').webcrypto, setInterval() {}, Date, console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('features.js', 'utf8') + '\n' + fs.readFileSync('app.js', 'utf8'), context);
  return { app, context, nodes, run: code => vm.runInContext(code, context), fire(type, event) { for (const handler of listeners[type] || []) handler(event); } };
}
const submit = (env, id, fields, book) => env.fire('submit', { preventDefault() {}, target: { id, dataset: { book }, data: new Map(Object.entries(fields)) } });
const click = (env, action, book) => env.fire('click', { target: { closest: selector => selector === '[data-action]' ? { dataset: { action, book } } : null } });
let env = setup();
assert.equal(env.run('books.length'), 3);
submit(env, 'book-form', { name: '  나의 <학습>  ', description: '새로운 주제' });
assert.equal(env.run('books.length'), 4);
const id = env.run('books[3].id');
env.context.location.hash = '#book/' + id;
env.run('render()');
assert(env.app.innerHTML.includes('&lt;학습&gt;'));
assert(!env.app.innerHTML.includes('NaN'));
assert.equal(env.run('average(books[3])'), '0.0');
click(env, 'start', id);
assert.equal(env.run('session'), null);
for (const type of ['질문 & 답변', '빈칸 채우기', '선다형']) {
  submit(env, 'create-form', { questionType: type, question: '<img onerror=x> ____', cardAnswer: '답', explanation: '<b>설명</b>', choice0: '가', choice1: '나', choice2: '다', choice3: '라', correct: '2' }, id);
}
assert.equal(env.run('books[3].cards.length'), 3);
const validSettings = { shortcuts: 'on', reveal: 'a', unknown: 's', known: 'd', alarmTime: '20:30', timeLimit: '2' };
submit(env, 'settings-form', { ...validSettings, known: 'a' });
assert(env.nodes.get('#feature-error').textContent.includes('서로 다른'));
submit(env, 'settings-form', validSettings);
assert.equal(env.run('settings.timeLimit'), 2);
env = setup();
assert.equal(env.run('books[3].cards.length'), 3);
assert.equal(env.run('settings.reveal'), 'a');
click(env, 'start', id);
env.context.location.hash = '#study/' + id;
env.run('render(); questionDeadline = Date.now() - 1; tickStudyTimer()');
assert.equal(env.run('session.revealed'), true);
assert.equal(env.run('session.timedOut'), true);
assert.equal(env.run('studyHistory.length'), 0);
assert(env.app.innerHTML.includes('&lt;img'));
click(env, 'known');
assert.equal(env.run('studyHistory.length'), 1);
assert.equal(env.run('session.index'), 1);
assert.equal(env.run('session.revealed'), false);
click(env, 'reveal'); click(env, 'unknown');
click(env, 'reveal'); click(env, 'known');
assert.equal(env.run('getStats().total'), 3);
assert.equal(env.run('getStats().known'), 2);
assert.equal(env.run('getStats().days[6].count'), 3);
env = setup();
assert.equal(env.run('getStats().total'), 3);
assert.equal(env.run('books[3].cards[0].level'), 2);
env.run('settings.alarm = true; settings.alarmTime = "00:00"; checkAlarm()');
assert.equal(env.run('alarmLastDate'), env.run('todayKey()'));
for (const route of ['#books', '#new-book', '#settings', '#stats', '#book/' + id, '#create/' + id]) {
  env.context.location.hash = route; env.run('render()'); assert(!env.app.innerHTML.includes('NaN'));
}
env = setup(true);
submit(env, 'book-form', { name: '저장 실패 검증' });
assert.equal(env.run('books.length'), 4);
submit(env, 'settings-form', { ...validSettings, timeLimit: '60' });
assert.equal(env.run('settings.timeLimit'), 2);
const before = env.run('books[3].cards.length');
submit(env, 'create-form', { questionType: '질문 & 답변', question: '질문', cardAnswer: '정답' }, id);
assert.equal(env.run('books[3].cards.length'), before);
console.log('PASS: creation, empty books, persistence, validation, timer, ratings, statistics, alarm, routes, failed-save rollback');
