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
    location: { hash: '#books' }, window: { addEventListener() {}, scrollTo() {}, confirm() { return true; } },
    localStorage: { getItem: key => store[key] || null, setItem(key, value) { if (fail) throw Error('저장 실패'); store[key] = value; } },
    FormData: class { constructor(form) { return form.data; } },
    crypto: require('node:crypto').webcrypto, setInterval() {}, setTimeout() {}, Date, console, URLSearchParams, URL
  };
  vm.createContext(context);
  vm.runInContext(['richtext.js', 'card-stats.js', 'features.js', 'management.js', 'app.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'), context);
  return { app, context, nodes, run: code => vm.runInContext(code, context), fire(type, event) { for (const handler of listeners[type] || []) handler(event); } };
}
const submit = (env, id, fields, book, card) => env.fire('submit', { preventDefault() {}, target: { id, dataset: { book, card }, data: new Map(Object.entries(fields)) } });
const click = (env, action, book, card) => env.fire('click', { target: { closest: selector => selector === '[data-action]' ? { dataset: { action, book, card } } : null } });
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

// 이전 저장 형식의 사용자 카드와 레벨을 보존한 채 전체 카드 저장으로 전환합니다.
const snapshot = JSON.stringify(store);
store['chagok-study-preview-v1'] = JSON.stringify({ spring: { levels: [4, 1, 3, 4, 5, 2], customCards: [{ type: '질문 & 답변', question: '이전 질문', answer: '이전 답', explanation: '', level: 2, custom: true }] } });
env = setup();
assert.equal(env.run('books[0].cards.length'), 6);
assert.equal(env.run('books[0].cards[0].level'), 4);
assert.equal(env.run('books[0].cards[5].level'), 2);
const seedId = env.run('books[0].cards[0].id');
const legacyId = env.run('books[0].cards[5].id');
const editFields = { questionType: '선다형', question: '수정된 질문', choice0: '첫째', choice1: '둘째', choice2: '셋째', choice3: '넷째', correct: '1', explanation: '수정 해설' };
submit(env, 'edit-form', editFields, 'spring', seedId);
assert.equal(env.run('books[0].cards[0].level'), 4);
env = setup();
assert.equal(env.run('books[0].cards.length'), 6);
assert.equal(env.run('books[0].cards[0].answer'), '둘째');
assert.equal(env.run('books[0].cards[5].id'), legacyId);
submit(env, 'edit-form', { ...editFields, choice1: '첫째' }, 'spring', seedId);
assert(env.nodes.get('#form-error').textContent.includes('서로 다르게'));
assert.equal(env.run('books[0].cards[0].answer'), '둘째');

// 학습 중 수정은 진행 위치와 기존 평가를 보존하고 질문과 타이머만 재시작합니다.
click(env, 'start', 'spring');
env.context.location.hash = '#study/spring';
env.run('session.revealed = true; session.selected = 1; session.resumeRemaining = 1234; editContext = { book: books[0], cardId: books[0].cards[0].id, session };');
submit(env, 'edit-form', { questionType: '질문 & 답변', question: '다시 수정', cardAnswer: '새 답' }, 'spring', seedId);
assert.equal(env.context.location.hash, 'study/spring');
assert.equal(env.run('session.index'), 0);
assert.equal(env.run('session.revealed'), false);
assert.equal(env.run('session.selected'), null);
assert.equal(env.run('session.resumeRemaining'), undefined);
assert.equal(env.run('books[0].cards[0].options'), undefined);
assert.equal(env.run('studyHistory.length'), 0);
env.context.location.hash = '#study/spring';
click(env, 'reset-card', 'spring', seedId);
assert.equal(env.run('books[0].cards[0].level'), 1);
assert.equal(env.run('session.index'), 0);
assert.equal(env.run('studyHistory.length'), 0);

// 삭제 취소와 실패는 데이터에 영향을 주지 않으며 예시 카드 삭제도 재실행 후 유지됩니다.
env.context.location.hash = '#manage/spring';
env.context.window.confirm = () => false;
click(env, 'delete-card', 'spring', seedId);
assert.equal(env.run('books[0].cards.length'), 6);
env.context.window.confirm = () => true;
click(env, 'delete-card', 'spring', seedId);
env = setup();
assert.equal(env.run('books[0].cards.length'), 5);
assert.equal(env.run('books[0].cards.some(card => card.id === "' + seedId + '")'), false);
const remainingId = env.run('books[0].cards[1].id');
env = setup(true);
const originalCards = env.run('JSON.stringify(books[0].cards)');
submit(env, 'edit-form', editFields, 'spring', remainingId);
assert(env.nodes.get('#form-error').textContent.includes('저장하지 못했습니다'));
click(env, 'reset-card', 'spring', remainingId);
assert(env.nodes.get('#management-error').textContent.includes('저장하지 못했습니다'));
click(env, 'delete-card', 'spring', remainingId);
assert.equal(env.run('JSON.stringify(books[0].cards)'), originalCards);
env = setup();
env.context.location.hash = '#manage/spring';
while (env.run('books[0].cards.length')) click(env, 'delete-card', 'spring', env.run('books[0].cards[0].id'));
env = setup();
assert.equal(env.run('books[0].cards.length'), 0);
env.context.location.hash = '#manage/spring'; env.run('render()');
assert(env.app.innerHTML.includes('아직 등록된 문제가 없어요'));
Object.assign(store, JSON.parse(snapshot));
console.log('PASS: legacy migration, seed edits, validation, study continuation, level reset, deletion, empty persistence, rollback');

// 문제집 수정은 예시·사용자 문제집 모두 지원하며 카드와 통계는 바꾸지 않습니다.
env = setup();
const cardsBeforeBookEdit = env.run('JSON.stringify(books[0].cards)');
submit(env, 'edit-book-form', { name: '  수정된 제목  ', description: '새 소개' }, 'spring');
env = setup();
assert.equal(env.run('books[0].name'), '수정된 제목');
assert.equal(env.run('books[0].desc'), '새 소개');
assert.equal(env.run('JSON.stringify(books[0].cards)'), cardsBeforeBookEdit);
submit(env, 'edit-book-form', { name: '   ', description: '' }, 'spring');
assert(env.nodes.get('#form-error').textContent.includes('1~60자'));
submit(env, 'edit-book-form', { name: '제목', description: '가'.repeat(161) }, 'spring');
assert(env.nodes.get('#form-error').textContent.includes('160자'));
env = setup(true);
submit(env, 'edit-book-form', { name: '실패 제목', description: '' }, 'spring');
assert.equal(env.run('books[0].name'), '수정된 제목');
assert.equal(env.run('books[0].desc'), '새 소개');
env = setup();
submit(env, 'edit-book-form', { name: '사용자 문제집 수정', description: '' }, id);
env = setup();
assert.equal(env.run('books[3].name'), '사용자 문제집 수정');

// 검색과 레벨 필터를 먼저 적용한 뒤 페이지를 나눕니다.
env.run(`books[0].cards = Array.from({length: 23}, (_, index) => ({ id: 'test-' + index, type: '질문 & 답변', question: '검색 질문 ' + index, answer: index === 0 ? 'ONLY-ANSWER' : '답', explanation: index === 1 ? '해설검색' : '', level: index % 5 + 1 }));`);
assert.equal(env.run('getManagedCards(books[0], {page: 1}).entries.length'), 10);
assert.equal(env.run('getManagedCards(books[0], {page: 3}).entries.length'), 3);
assert.equal(env.run('getManagedCards(books[0], {page: 999}).page'), 3);
assert.equal(env.run('getManagedCards(books[0], {page: -1}).page'), 1);
assert.equal(env.run('getManagedCards(books[0], {query: "only-answer"}).total'), 1);
assert.equal(env.run('getManagedCards(books[0], {query: "해설검색"}).total'), 1);
assert.equal(env.run('getManagedCards(books[0], {query: "검색", level: 1}).total'), 5);
assert.equal(env.run('getManagedCards(books[0], {query: "없음", page: 3}).page'), 1);
env.context.location.hash = '#manage/spring?level=2&q=%EA%B2%80%EC%83%89&page=9';
env.run('render()');
assert.equal(env.run('managementViews.get("spring").page'), 1);
assert.equal(env.run('managementViews.get("spring").level'), 2);
assert.equal(env.run('managementViews.get("spring").query'), '검색');
assert(env.app.innerHTML.includes('Level 2'));
env.context.location.hash = '#book/spring'; env.run('render()');
assert(!env.app.innerHTML.includes('얼마나 기억하고 있는지 확인해 보세요.'));
assert(env.app.innerHTML.includes('#manage/spring?level=1'));
console.log('PASS: book editing persistence and rollback, search, level filters, pagination, detail links');

// 아이콘 선택, 카드별 통계, 이미지 첨부 검증을 확인합니다.
env = setup();
submit(env, 'edit-book-form', { name: '아이콘 문제집', description: '', icon: '∑' }, 'spring');
assert.equal(env.run('books[0].icon'), '∑');
env = setup();
assert.equal(env.run('books[0].icon'), '∑');
assert.throws(() => env.run(`saveBookDetails(books[0], new Map([['name', 'x'], ['icon', '<b>']]))`), /아이콘/);
env.context.location.hash = '#edit-book/spring'; env.run('render()');
assert(env.app.innerHTML.includes('name="icon"'));

env.run(`studyHistory = [{ bookId: 'spring', cardId: 'spring-card-0', date: '2026-01-01', known: true, durationMs: 30000 }, { bookId: 'spring', cardId: 'spring-card-0', date: '2026-01-02', known: false, durationMs: 90000 }];`);
assert.equal(env.run('getCardStats("spring", "spring-card-0").total'), 2);
assert.equal(env.run('getCardStats("spring", "spring-card-0").totalMs'), 120000);
assert.equal(env.run('getCardStats("spring", "spring-card-0").ratio'), 50);
assert.equal(env.run('formatStudyTime(125000)'), '2분 5초');
env.run(`studyHistory[0].revealMs = 12000; document.body.append = node => { globalThis.modalHtml = node.innerHTML; };`);
env.run(`openCardStats(books[0], books[0].cards[0], null)`);
const modalHtml = env.run('globalThis.modalHtml');
assert(modalHtml.includes('카드 학습 통계') && modalHtml.includes('학습 이력') && modalHtml.includes('정답 확인까지'));
assert(modalHtml.includes('12초'));
env.context.location.hash = '#manage/spring'; env.run('render()');
assert(env.app.innerHTML.includes('data-action="card-stats"'));

// 문제집 만들기 아이콘 선택과 연속 문제 만들기
env.context.location.hash = '#new-book'; env.run('render()');
assert(env.app.innerHTML.includes('name="icon"'));
submit(env, 'book-form', { name: '아이콘 신규', description: '', icon: '♫' });
assert.equal(env.run('books[books.length - 1].icon'), '♫');
const newId = env.run('books[books.length - 1].id');
env.context.location.hash = '#create/' + newId; env.run('render()');
const beforeCount = env.run('books[books.length - 1].cards.length');
submit(env, 'create-form', { questionType: '질문 & 답변', question: '연속 1', cardAnswer: '답', explanation: '', assets: '{}' }, newId);
assert.equal(env.context.location.hash, '#create/' + newId);
submit(env, 'create-form', { questionType: '질문 & 답변', question: '연속 2', cardAnswer: '답', explanation: '', assets: '{}' }, newId);
assert.equal(env.run('books[books.length - 1].cards.length'), beforeCount + 2);

// 허용하지 않는 이미지 주소와 형식은 거부합니다.
assert.equal(env.run('safeContentUrl("javascript:alert(1)", true)'), '');
assert.equal(env.run('safeContentUrl("http://example.com/a.png", true)'), '');
assert.equal(env.run('safeContentUrl("asset:img-x", true, { "img-x": "data:image/svg+xml;base64,AAAA" })'), '');
assert.equal(env.run('safeContentUrl("asset:img-x", true, { "img-x": "data:image/png;base64,AAAA" })'), 'data:image/png;base64,AAAA');
assert.throws(() => env.run(`cardAssets(new Map([['assets', '{}']]), ['![a](asset:img-missing)'])`), /첨부 이미지/);
console.log('PASS: book icons, card statistics, image asset validation');

// 문제집 보관과 복원
env = setup();
env.context.location.hash = '#book/spring'; env.run('render()');
click(env, 'archive-book', 'spring');
assert.equal(env.run('books[0].archived'), true);
assert.equal(env.context.location.hash, 'books');
env = setup();
assert.equal(env.run('books[0].archived'), true);
env.context.location.hash = '#books'; env.run('render()');
assert(!env.app.innerHTML.includes('href="#book/spring"'));
env.context.location.hash = '#books?tab=archived'; env.run('render()');
assert(env.app.innerHTML.includes('href="#book/spring"') && env.app.innerHTML.includes('보관함'));
assert.equal(env.run('due(books[0])'), 0);
click(env, 'unarchive-book', 'spring');
env = setup();
assert.equal(env.run('books[0].archived'), false);
console.log('PASS: book archive and restore');

// 문제집 유형(단어·용어·개념)은 선택 사항입니다.
env = setup();
submit(env, 'book-form', { name: '유형 없음', description: '' });
assert.equal(env.run('books[books.length - 1].category'), '');
submit(env, 'book-form', { name: '용어집', description: '', category: '용어' });
assert.equal(env.run('books[books.length - 1].category'), '용어');
env = setup();
assert.equal(env.run('books[books.length - 1].category'), '용어');
const bookCount = env.run('books.length');
submit(env, 'book-form', { name: '잘못', description: '', category: '기타' });
assert.equal(env.run('books.length'), bookCount);
console.log('PASS: optional book category');

// 문제집 삭제 → 삭제된 문제집 탭 → 복원 / 완전 삭제
env = setup();
const countBefore = env.run('books.length');
click(env, 'delete-book', 'network');
assert.equal(env.run('books.find(book => book.id === "network").deleted'), true);
assert.equal(env.context.location.hash, 'books?tab=deleted');
env.context.location.hash = '#books'; env.run('render()');
assert(!env.app.innerHTML.includes('href="#book/network"'));
env.context.location.hash = '#books?tab=deleted'; env.run('render()');
assert(env.app.innerHTML.includes('data-action="purge-book"') && env.app.innerHTML.includes('data-action="restore-book"'));
env = setup();
assert.equal(env.run('books.find(book => book.id === "network").deleted'), true);
click(env, 'restore-book', 'network');
assert.equal(env.run('books.find(book => book.id === "network").deleted'), false);
click(env, 'delete-book', 'network');
env.run(`studyHistory.push({ bookId: 'network', cardId: 'x', date: '2026-01-01', known: true })`);
env.context.window.confirm = () => false;
click(env, 'purge-book', 'network');
assert.equal(env.run('books.length'), countBefore);
env.context.window.confirm = () => true;
click(env, 'purge-book', 'network');
assert.equal(env.run('books.length'), countBefore - 1);
env = setup();
assert.equal(env.run('books.some(book => book.id === "network")'), false);
assert.equal(env.run('studyHistory.some(item => item.bookId === "network")'), false);
console.log('PASS: book delete, restore, permanent delete');
