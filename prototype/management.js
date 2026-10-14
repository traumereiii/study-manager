// 예시 카드도 수정·삭제할 수 있도록 전체 카드 목록을 저장하고 이전 형식은 그대로 읽습니다.
function validStoredCard(card) {
  return card && typeof card.id === 'string' && /^[\w-]+$/.test(card.id) &&
    ['질문 & 답변', '빈칸 채우기', '선다형'].includes(card.type) &&
    typeof card.question === 'string' && typeof card.answer === 'string' && typeof card.explanation === 'string' &&
    Number.isInteger(card.level) && card.level >= 1 && card.level <= 5 &&
    (card.type !== '선다형' || (Array.isArray(card.options) && card.options.length === 4 &&
      card.options.every(option => typeof option === 'string' && option.trim()) &&
      Number.isInteger(card.correct) && card.correct >= 0 && card.correct < 4));
}

let editContext = null;
let managementNotice = '';
const managementViews = new Map();
const managementPageSize = 10;

function managementPath(book, state = managementViews.get(book.id) || {}) {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.level) params.set('level', String(state.level));
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return `manage/${book.id}${query ? '?' + query : ''}`;
}

function getManagedCards(book, state) {
  const query = String(state.query || '').trim().toLocaleLowerCase();
  const level = Number(state.level);
  const filtered = book.cards.map((card, index) => ({ card, index })).filter(({ card }) =>
    (!level || card.level === level) && (!query || [card.question, card.answer, card.explanation, ...(card.options || [])].some(value => value.toLocaleLowerCase().includes(query))));
  const totalPages = Math.max(1, Math.ceil(filtered.length / managementPageSize));
  const requestedPage = Number(state.page);
  const page = Math.min(totalPages, Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  return { entries: filtered.slice((page - 1) * managementPageSize, page * managementPageSize), total: filtered.length, totalPages, page };
}

function renderManage(book) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = { query: (params.get('q') || '').trim().slice(0, 200), level: /^[1-5]$/.test(params.get('level')) ? Number(params.get('level')) : 0, page: params.get('page') };
  const result = getManagedCards(book, state);
  state.page = result.page;
  managementViews.set(book.id, state);
  const pageLink = (page, label) => `<a class="secondary" href="#${escapeHtml(managementPath(book, { ...state, page }))}" ${page === result.page ? 'aria-current="page"' : ''}>${label}</a>`;
  app.innerHTML = `<a class="back" href="#book/${book.id}">← ${escapeHtml(book.name)}</a>
    <div class="eyebrow">YOUR QUESTION COLLECTION</div>
    <div class="heading-row"><h1>문제 관리</h1><a class="primary" href="#create/${book.id}">＋ 문제 만들기</a></div>
    <p class="subtitle">${escapeHtml(book.name)} · 총 ${book.cards.length}장<br>등록한 문제를 확인하고 내용을 다듬어 보세요.</p>
    <form id="manage-search" class="panel management-filters" data-book="${book.id}" role="search">
      <div class="search-field"><label for="question-search">문제 검색</label><input id="question-search" name="query" type="search" maxlength="200" value="${escapeHtml(state.query)}" placeholder="질문, 정답, 해설, 보기 검색"></div>
      <div class="level-filter"><label for="level-filter">암기 레벨</label><select id="level-filter" name="level"><option value="0">전체 레벨</option>${[1, 2, 3, 4, 5].map(level => `<option value="${level}" ${state.level === level ? 'selected' : ''}>Level ${level}</option>`).join('')}</select></div>
      <button class="secondary" type="submit">검색</button><a class="filter-clear" href="#manage/${book.id}">조건 초기화</a>
    </form>
    <p class="management-result" role="status">${state.level ? `Level ${state.level} · ` : ''}${state.query ? `“${escapeHtml(state.query)}” 검색 결과 · ` : ''}${result.total}장${result.total ? ` · ${(result.page - 1) * managementPageSize + 1}–${Math.min(result.page * managementPageSize, result.total)}번째 표시` : ''}</p>
    <p id="management-status" class="management-status" role="status">${escapeHtml(managementNotice)}</p>
    <p id="management-error" class="form-error" role="alert"></p>
    <div class="question-list">${result.total ? result.entries.map(({ card, index }) => `<article class="panel managed-question">
      <div class="managed-meta"><span>문제 ${index + 1} · ${card.type}</span><span class="pill">Lv. ${card.level}</span></div>
      <div class="markdown-body managed-question-content">${renderMarkdown(card.question, card.assets)}</div>
      ${card.image ? circuitImage : ''}
      <details open><summary>정답과 해설</summary><div class="managed-answer"><strong>정답</strong><div class="markdown-body">${renderMarkdown(card.answer, card.assets)}</div><strong>해설</strong><div class="markdown-body">${renderMarkdown(card.explanation || '등록된 해설이 없습니다.', card.assets)}</div></div></details>
      ${cardStatsSummary(book, card)}
      <div class="management-actions"><a class="secondary" href="#edit/${book.id}/${card.id}">문제 수정</a>
        <button class="secondary level-reset" data-action="reset-card" data-book="${book.id}" data-card="${card.id}" ${card.level === 1 ? 'disabled' : ''}>↺ 암기 레벨 초기화</button>
        <button class="secondary danger-action" data-action="delete-card" data-book="${book.id}" data-card="${card.id}">삭제</button></div>
    </article>`).join('') : `<section class="panel management-empty"><h2>${book.cards.length ? '조건에 맞는 문제가 없어요.' : '아직 등록된 문제가 없어요.'}</h2><p>${book.cards.length ? '검색어 또는 암기 레벨을 바꾸거나 조건을 초기화해 보세요.' : '위의 문제 만들기에서 첫 질문과 정답을 추가해 보세요.'}</p></section>`}</div>
    ${result.total ? `<nav class="pagination" aria-label="문제 목록 페이지">${result.page > 1 ? pageLink(result.page - 1, '← 이전') : '<button class="secondary" disabled>← 이전</button>'}<span>${result.page} / ${result.totalPages} 페이지</span>${result.page < result.totalPages ? pageLink(result.page + 1, '다음 →') : '<button class="secondary" disabled>다음 →</button>'}</nav>` : ''}`;
  managementNotice = '';
}

function renderEdit(book, card, fromStudy) {
  const active = fromStudy && session?.book === book && session.book.cards[session.index]?.id === card.id;
  if (!editContext || editContext.cardId !== card.id || editContext.book !== book) {
    editContext = { book, cardId: card.id, session: active ? session : null };
    if (active && questionDeadline && !session.revealed) session.resumeRemaining = Math.max(0, questionDeadline - Date.now());
  }
  questionDeadline = null;
  timerToken = '';
  renderCreate(book, card, active ? `study/${book.id}` : managementPath(book));
}

function saveEditedCard(book, cardId, data) {
  const index = book.cards.findIndex(card => card.id === cardId);
  if (index < 0) throw new Error('수정할 문제를 찾을 수 없습니다. 문제 관리로 돌아가 주세요.');
  const previous = book.cards[index];
  const next = { ...createCard(data), id: previous.id, level: previous.level, custom: previous.custom === true };
  if (previous.image) next.image = true;
  book.cards[index] = next;
  const completed = book.completed;
  book.completed = null;
  if (!persist()) {
    book.cards[index] = previous;
    book.completed = completed;
    throw new Error('수정 내용을 저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.');
  }
  return next;
}

function handleManagementSubmit(event) {
  if (event.target.id === 'manage-search') {
    event.preventDefault();
    const book = books.find(item => item.id === event.target.dataset.book);
    if (!book) return;
    const data = new FormData(event.target);
    location.hash = managementPath(book, { query: String(data.get('query') || '').trim().slice(0, 200), level: /^[1-5]$/.test(data.get('level')) ? Number(data.get('level')) : 0, page: 1 });
    return;
  }
  if (event.target.id === 'edit-book-form') {
    event.preventDefault();
    try {
      const book = books.find(item => item.id === event.target.dataset.book);
      if (!book) throw new Error('문제집을 찾을 수 없습니다.');
      saveBookDetails(book, new FormData(event.target));
      managementNotice = '문제집 제목과 한 줄 소개를 수정했습니다.';
      location.hash = `book/${book.id}`;
    } catch (failure) { document.querySelector('#form-error').textContent = failure.message; }
    return;
  }
  if (event.target.id !== 'edit-form') return;
  event.preventDefault();
  const form = event.target;
  try {
    ensureUploadsFinished(form);
    const book = books.find(item => item.id === form.dataset.book);
    if (!book) throw new Error('문제집을 찾을 수 없습니다.');
    saveEditedCard(book, form.dataset.card, new FormData(form));
    const resume = editContext?.session && editContext.session === session && session.book === book && session.book.cards[session.index]?.id === form.dataset.card;
    if (resume) {
      // 수정 폼에서 답을 보았으므로 질문을 다시 표시하고 제한시간을 새로 시작합니다.
      session.revealed = false;
      session.selected = null;
      session.timedOut = false;
      delete session.resumeRemaining;
      questionDeadline = null;
      timerToken = '';
    }
    managementNotice = '문제를 수정했습니다. 암기 레벨과 이전 학습 기록은 유지됩니다.';
    editContext = null;
    location.hash = resume ? `study/${book.id}` : managementPath(book);
  } catch (failure) {
    document.querySelector('#form-error').textContent = failure.message;
  }
}

function renderEditBook(book) {
  app.innerHTML = `<div class="create-shell"><a class="back" href="#book/${book.id}">← ${escapeHtml(book.name)}</a><div class="eyebrow">YOUR LEARNING SPACE</div><h1>문제집 수정</h1><p class="subtitle">제목과 한 줄 소개를 내 학습에 맞게 다듬어 보세요.</p>
    <form id="edit-book-form" class="panel create-form" data-book="${book.id}">
      <div class="form-field"><label for="edit-book-name">문제집 제목 <span>필수</span></label><input id="edit-book-name" name="name" maxlength="60" required value="${escapeHtml(book.name)}"></div>
      <div class="form-field"><label for="edit-book-desc">한 줄 소개 <span class="optional">선택</span></label><textarea id="edit-book-desc" name="description" maxlength="160" rows="3">${escapeHtml(book.desc)}</textarea></div>
      ${iconPicker(book.icon)}
      <p class="field-help">등록된 문제와 암기 레벨, 학습 기록은 그대로 유지됩니다.</p><p id="form-error" class="form-error" role="alert"></p>
      <div class="form-actions"><a class="secondary" href="#book/${book.id}">취소</a><button type="submit" class="primary">문제집 수정 저장</button></div>
    </form></div>`;
}

function saveBookDetails(book, data) {
  const name = String(data.get('name') || '').trim();
  const desc = String(data.get('description') || '').trim();
  const icon = data.get('icon') || book.icon;
  if (!bookIcons.some(([value]) => value === icon)) throw new Error('아이콘을 목록에서 선택해 주세요.');
  if (!name || name.length > 60) throw new Error('문제집 제목은 1~60자로 입력해 주세요.');
  if (desc.length > 160) throw new Error('한 줄 소개는 160자 이하로 입력해 주세요.');
  const previous = { name: book.name, desc: book.desc, icon: book.icon };
  Object.assign(book, { name, desc, icon });
  if (!persist()) {
    Object.assign(book, previous);
    throw new Error('문제집을 저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.');
  }
}

function handleManagementClick(event) {
  const button = event.target.closest('[data-action]');
  if (button?.dataset.action === 'card-stats') {
    const target = books.find(item => item.id === button.dataset.book);
    const targetCard = target?.cards.find(item => item.id === button.dataset.card);
    if (target && targetCard) openCardStats(target, targetCard, button);
    return;
  }
  if (button && ['archive-book', 'unarchive-book'].includes(button.dataset.action)) {
    const target = books.find(item => item.id === button.dataset.book);
    if (!target) return;
    const archiving = button.dataset.action === 'archive-book';
    target.archived = archiving;
    if (!persist()) {
      target.archived = !archiving;
      managementNotice = '';
      app.insertAdjacentHTML('afterbegin', '<p class="form-error" role="alert">문제집 보관 상태를 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.</p>');
      return;
    }
    if (archiving && session?.book === target) session = null;
    managementNotice = archiving ? `'${target.name}' 문제집을 보관했습니다. 보관한 문제집은 목록 아래에서 복원할 수 있습니다.` : `'${target.name}' 문제집을 보관 해제했습니다.`;
    if (archiving) location.hash = 'books'; else render();
    return;
  }
  if (!button || !['reset-card', 'delete-card'].includes(button.dataset.action)) return;
  const book = books.find(item => item.id === button.dataset.book);
  const index = book?.cards.findIndex(card => card.id === button.dataset.card) ?? -1;
  if (index < 0) return;
  const card = book.cards[index];
  const deleting = button.dataset.action === 'delete-card';
  if (deleting && !window.confirm('이 문제를 삭제할까요? 삭제한 문제는 복원할 수 없으며 이전 학습 통계는 유지됩니다.')) return;
  const previousLevel = card.level;
  const completed = book.completed;
  if (deleting) book.cards.splice(index, 1); else card.level = 1;
  book.completed = null;
  if (!persist()) {
    if (deleting) book.cards.splice(index, 0, card); else card.level = previousLevel;
    book.completed = completed;
    document.querySelector('#management-error').textContent = '변경 내용을 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.';
    return;
  }
  if (deleting && session?.book === book) session = null;
  managementNotice = deleting ? '문제를 삭제했습니다. 이전 학습 통계는 유지됩니다.' : '이 문제의 암기 레벨을 Level 1로 초기화했습니다. 이전 학습 통계는 유지됩니다.';
  render();
  app.focus();
}
