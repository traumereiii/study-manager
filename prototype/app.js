const books = [
  { id: 'spring', name: 'Spring Security', desc: '차근차근 이해하는 웹 보안', icon: '⌘', color: '#eaf1e2', ink: '#648346', cards: [
    { type: '질문 & 답변', question: '인증과 인가의 차이는 무엇인가요?', answer: '인증은 누구인지 확인하고, 인가는 어떤 자원에 접근할 수 있는지 확인합니다.', explanation: '인증은 사용자의 신원을, 인가는 해당 사용자의 접근 권한을 확인하는 과정입니다.', level: 2 },
    { type: '빈칸 채우기', question: '사용자의 인증 정보를 담는 객체는\n______입니다.', answer: 'Authentication', explanation: 'Authentication 객체는 사용자 정보, 자격 증명, 권한 등의 인증 관련 정보를 표현합니다.', level: 1 },
    { type: '선다형', question: '사용자의 비밀번호를 안전하게 저장하기 위한 방법은?', options: ['평문으로 저장', '복호화 가능한 암호화만 사용', '적응형 단방향 해시 사용', 'Base64로 인코딩'], correct: 2, answer: '적응형 단방향 해시 사용', explanation: 'bcrypt와 같은 적응형 단방향 해시를 사용합니다. 단순 인코딩은 비밀번호 보호 방법이 아닙니다.', level: 3 },
    { type: '질문 & 답변', question: 'CSRF 공격은 무엇인가요?', answer: '인증된 사용자가 의도하지 않은 요청을 서버에 보내도록 유도하는 공격입니다.', explanation: '예를 들어 로그인한 브라우저가 공격자가 만든 페이지를 통해 상태 변경 요청을 보내도록 유도할 수 있습니다.', level: 4 },
    { type: '질문 & 답변', question: '최소 권한 원칙은 무엇인가요?', answer: '사용자나 시스템에 작업 수행에 꼭 필요한 최소한의 권한만 부여하는 원칙입니다.', explanation: '불필요한 접근 권한을 줄이면 계정 탈취나 실수로 인한 피해 범위를 제한할 수 있습니다.', level: 5 }
  ] },
  { id: 'circuit', name: '회로이론', desc: '기초부터 쌓는 회로의 원리', icon: 'ϟ', color: '#fcf0dd', ink: '#ba934b', cards: [
    { type: '질문 & 답변', question: '다음 회로에서 저항에 흐르는 전류는?', image: true, answer: '2 A', explanation: '옴의 법칙 I = V / R에 따라 10 V ÷ 5 Ω = 2 A입니다.', level: 1 },
    { type: '빈칸 채우기', question: '저항을 직렬로 연결하면 합성 저항은\n각 저항의 ______입니다.', answer: '합', explanation: '직렬 회로에서는 모든 저항에 같은 전류가 흐르며, 합성 저항은 R₁ + R₂ + …입니다.', level: 2 },
    { type: '선다형', question: '전기 저항의 단위는 무엇인가요?', options: ['볼트 (V)', '암페어 (A)', '옴 (Ω)', '와트 (W)'], correct: 2, answer: '옴 (Ω)', explanation: '볼트는 전압, 암페어는 전류, 와트는 전력의 단위입니다.', level: 4 }
  ] },
  { id: 'network', name: '컴퓨터 네트워크', desc: '연결의 원리를 이해하는 시간', icon: '⊞', color: '#eaeef8', ink: '#7d88b5', cards: [
    { type: '빈칸 채우기', question: 'TCP는 ______ 프로토콜입니다.', answer: '연결 지향형', explanation: 'TCP는 통신 전에 연결을 설정하고, 순서와 신뢰성을 보장하는 데이터 전송을 제공합니다.', level: 2 },
    { type: '선다형', question: '도메인 이름을 IP 주소로 변환하는 시스템은?', options: ['HTTP', 'DNS', 'FTP', 'SMTP'], correct: 1, answer: 'DNS', explanation: 'DNS는 사람이 읽기 쉬운 도메인 이름을 IP 주소 등의 정보에 대응시킵니다.', level: 3 },
    { type: '질문 & 답변', question: 'IP 주소와 포트 번호는 각각 무엇을 식별하나요?', answer: 'IP 주소는 네트워크상의 인터페이스를, 포트 번호는 해당 호스트의 통신 종단점을 구분합니다.', explanation: 'IP 주소로 목적지에 도달한 뒤 포트 번호를 통해 해당 서비스로 데이터를 전달합니다.', level: 1 },
    { type: '질문 & 답변', question: 'HTTPS에서 TLS는 어떤 역할을 하나요?', answer: '통신 내용을 암호화하고 데이터의 무결성과 서버의 신원을 확인합니다.', explanation: 'TLS를 통해 전송 중 도청이나 데이터 변조의 위험을 줄일 수 있습니다.', level: 5 }
  ] }
];

// 생성한 문제와 학습 결과는 현재 브라우저에만 보관합니다.
const storageKey = 'chagok-study-preview-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { saved = {}; }
loadFeatures(saved);
for (const book of books) {
  const data = saved[book.id];
  if (!data || typeof data !== 'object') continue;
  if (typeof data.name === 'string' && data.name.trim() && data.name.length <= 60) book.name = data.name;
  if (typeof data.desc === 'string' && data.desc.length <= 160) book.desc = data.desc;
  if (bookIcons.some(([icon]) => icon === data.icon)) book.icon = data.icon;
  const hasFullCards = Array.isArray(data.cards);
  if (hasFullCards) {
    book.cards = data.cards.filter(validStoredCard).map(card => ({ ...card }));
  } else if (Array.isArray(data.customCards)) {
    for (const card of data.customCards) {
      if (!card || !['질문 & 답변', '빈칸 채우기', '선다형'].includes(card.type) ||
          typeof card.question !== 'string' || typeof card.answer !== 'string' ||
          typeof card.explanation !== 'string') continue;
      if (card.type === '선다형' && (!Array.isArray(card.options) || card.options.length !== 4 ||
          !card.options.every(option => typeof option === 'string' && option.trim()) ||
          !Number.isInteger(card.correct) || card.correct < 0 || card.correct > 3)) continue;
      book.cards.push({ type: card.type, question: card.question, answer: card.answer,
        explanation: card.explanation, ...(card.type === '선다형' ? { options: card.options, correct: card.correct } : {}),
        level: 1, custom: true });
    }
  }
  book.cards.forEach((card, index) => {
    const level = hasFullCards ? card.level : data.levels?.[index];
    if (Number.isInteger(level) && level >= 1 && level <= 5) card.level = level;
  });
  book.archived = data.archived === true;
  book.deleted = data.deleted === true;
  book.category = bookCategories.includes(data.category) ? data.category : '';
  book.lastStudy = typeof data.lastStudy === 'string' ? data.lastStudy : null;
  book.completed = typeof data.completed === 'string' ? data.completed : null;
}
for (const book of books) {
  book.cards.forEach((card, index) => { card.id ||= `${book.id}-card-${index}`; });
}
const app = document.querySelector('#app');
let session = null;
let savedBookId = null;
let storageAvailable = true;
const todayKey = () => new Date().toLocaleDateString('sv-SE');
const due = book => book.archived || book.deleted || book.completed === todayKey() ? 0 : book.cards.length;
const activeBooks = () => books.filter(book => !book.archived && !book.deleted);
const average = book => (book.cards.reduce((sum, card) => sum + card.level, 0) / (book.cards.length || 1)).toFixed(1);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const bookIcon = book => `<span class="book-icon" style="--book-bg:${book.color};--book-ink:${book.ink}">${book.icon}</span>`;
function persist() {
  const data = Object.fromEntries(books.map(book => [book.id, { name: book.name, desc: book.desc, icon: book.icon, cards: book.cards, lastStudy: book.lastStudy, completed: book.completed, archived: book.archived === true, deleted: book.deleted === true, category: book.category || '' }]));
  data._meta = featureData();
  try { localStorage.setItem(storageKey, JSON.stringify(data)); storageAvailable = true; return true; }
  catch { storageAvailable = false; return false; }
}
function renderList() {
  const totalDue = books.reduce((sum, book) => sum + due(book), 0);
  const archivedBooks = books.filter(book => book.archived && !book.deleted);
  const deletedBooks = books.filter(book => book.deleted);
  const tab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab');
  const showArchived = tab === 'archived';
  const showDeleted = tab === 'deleted';
  const visibleBooks = showDeleted ? deletedBooks : showArchived ? archivedBooks : activeBooks();
  const deletedCard = book => `<article class="book-card deleted-card"><div class="book-top">${bookIcon(book)}<span class="pill">삭제됨</span></div><h3>${escapeHtml(book.name)}</h3><p class="book-desc">${escapeHtml(book.desc)}</p><p class="field-help">카드 ${book.cards.length}장 · 완전 삭제하면 복구할 수 없어요.</p><div class="management-actions"><button class="secondary" data-action="restore-book" data-book="${book.id}">복원</button><button class="secondary danger-action" data-action="purge-book" data-book="${book.id}">완전 삭제</button></div></article>`;
  const bookCard = book => `<a class="book-card" href="#book/${book.id}" aria-label="${escapeHtml(book.name)} 상세 보기"><div class="book-top">${bookIcon(book)}<span class="pill">${book.archived ? '보관됨' : !book.cards.length ? '첫 문제를 추가해요' : due(book) ? '학습을 기다려요' : '오늘 학습 완료'}</span></div><h3>${escapeHtml(book.name)}</h3>${book.category ? `<span class="category-tag">${book.category}</span>` : ''}<p class="book-desc">${escapeHtml(book.desc)}</p><div class="book-metrics"><div class="metric"><small>전체 카드</small><strong>${book.cards.length}<span>장</span></strong></div><div class="metric accent"><small>오늘 학습</small><strong>${due(book)}<span>장</span></strong></div></div><div class="level-line"><span>평균 암기 레벨</span><strong>Lv. ${average(book)} <span>/ 5</span></strong></div><div class="track"><div style="width:${Number(average(book)) * 20}%"></div></div><div class="card-bottom"><span>최근 학습 <span>${book.lastStudy ? escapeHtml(book.lastStudy.slice(5).replace('-', '/')) : '아직 학습 전'}</span></span><span class="arrow" aria-hidden="true">↗</span></div></a>`;
  app.innerHTML = `<div class="eyebrow">YOUR LEARNING SPACE</div><div class="heading-row"><h1>나의 문제집</h1></div><p class="subtitle">배운 것을 오래 기억하는 가장 좋은 습관, 오늘도 한 장씩 시작해 보세요.</p>
    <section class="hero"><div><div class="hero-tag">A LITTLE EVERY DAY</div><h2>${totalDue ? `오늘, ${totalDue}장의 지식을<br>내 것으로 만들어 볼까요?` : '오늘의 학습을 모두 마쳤어요.<br>꾸준함이 실력이 되고 있어요.'}</h2><p>완벽하지 않아도 괜찮아요. 조금씩 쌓아가면 되니까요.</p></div><div class="hero-art" aria-hidden="true"><div class="art-card one"></div><div class="art-card two"></div><div class="art-card three"><span>✓</span><i></i><i></i></div><span class="spark">✧</span></div></section>
    <div class="book-tabs" role="tablist" aria-label="문제집 보관 상태"><a role="tab" href="#books" aria-selected="${!showArchived && !showDeleted}">학습 중 <span>${activeBooks().length}</span></a><a role="tab" href="#books?tab=archived" aria-selected="${showArchived}">보관함 <span>${archivedBooks.length}</span></a><a role="tab" href="#books?tab=deleted" aria-selected="${showDeleted}">삭제된 문제집 <span>${deletedBooks.length}</span></a></div>
    <div class="book-grid">${visibleBooks.map(showDeleted ? deletedCard : bookCard).join('')}${!visibleBooks.length ? `<p class="empty-note">${showDeleted ? '삭제된 문제집이 없어요.' : showArchived ? '보관한 문제집이 없어요. 문제집 상세 화면에서 보관할 수 있어요.' : '학습 중인 문제집이 없어요. 새 문제집을 만들거나 보관함에서 복원해 보세요.'}</p>` : ''}</div>
    <p class="tip"><span aria-hidden="true">☼</span><span>암기 레벨이 높을수록 더 잘 기억하고 있는 카드예요. 문제집을 선택해 나의 학습 현황을 확인해 보세요.</span></p>`;
}
function renderDetail(book) {
  const counts = [1, 2, 3, 4, 5].map(level => book.cards.filter(card => card.level === level).length);
  const colors = ['#dbe4d3', '#bfd0af', '#9fb98b', '#799c65', '#47754c'];
  app.innerHTML = `<a class="back" href="#books">← 나의 문제집</a><div class="eyebrow">BOOK OVERVIEW</div>
    <div class="heading-row"><div class="title-with-icon">${bookIcon(book)}<h1>${escapeHtml(book.name)}</h1></div></div><p class="subtitle">${book.category ? `<span class="category-tag">${book.category}</span> ` : ''}${escapeHtml(book.desc)}</p>
    <div class="detail-grid"><section class="panel"><h2>암기 현황</h2><p class="panel-caption">레벨을 선택하면 해당 문제를 모아 볼 수 있어요.</p>
      <div class="total">${book.cards.length}<span> 장의 카드</span></div>
      ${counts.map((count, index) => `<a class="level-row level-link" href="#manage/${book.id}?level=${index + 1}" aria-label="Level ${index + 1} 문제 ${count}장 보기"><span>Level ${index + 1}</span><div class="track"><div style="width:${count / (book.cards.length || 1) * 100}%;--bar:${colors[index]}"></div></div><strong>${count}장 <span aria-hidden="true">→</span></strong></a>`).join('')}
      <p class="empty-note">처음 배우는 단계 · Level 1 → 충분히 기억하는 단계 · Level 5</p></section>
      <section class="panel study-plan"><span class="seed" aria-hidden="true">✳</span><h2>오늘의 작은 한 걸음</h2><div class="total">${due(book)}<span> 장 학습 예정</span></div>
      <p class="panel-caption">문제를 읽고 답을 떠올려 보세요.<br>정답을 확인한 뒤, 얼마나 기억했는지<br>솔직하게 평가하면 돼요.</p>
      <button class="primary" data-action="start" data-book="${book.id}">${due(book) ? '학습하기' : '한 번 더 학습하기'} <span>→</span></button><div class="empty-note">카드 ${book.cards.length}장으로 학습을 시작합니다.</div></section></div>`;
}
const circuitImage = `<svg class="circuit" viewBox="0 0 430 170" role="img" aria-label="10볼트 전압원과 5옴 저항이 직렬로 연결된 회로"><g fill="none" stroke="#59724d" stroke-width="2.5"><path d="M90 65 V35 H205 l7 -10 12 20 12 -20 12 20 12 -20 7 10 H340 V135 H90 V105"/><circle cx="90" cy="85" r="20"/><path d="M83 78 H97 M90 71 V85 M84 94 H96"/></g><g fill="#526647" font-family="sans-serif" font-size="15"><text x="25" y="91">10 V</text><text x="218" y="75">5 Ω</text><text x="295" y="100">I = ?</text></g></svg>`;
function renderStudy() {
  const { book, index, revealed } = session;
  resumeCardClock();
  if (index === book.cards.length) {
    app.innerHTML = `<div class="study-shell"><a class="back" href="#book/${book.id}">← ${escapeHtml(book.name)}</a><section class="panel complete"><span class="seed" aria-hidden="true">✳</span><div class="eyebrow">ONE STEP FORWARD</div><h2>오늘도 차곡차곡 쌓았어요!</h2><p>${escapeHtml(book.name)}의 ${book.cards.length}장을 모두 학습했어요.<br>기억이 나지 않은 카드도, 다시 만나면 더 익숙해질 거예요.</p><div class="result-row"><div><strong>${session.known}</strong><span>알아요</span></div><div><strong>${book.cards.length - session.known}</strong><span>몰라요</span></div></div><a class="primary" href="#book/${book.id}">암기 현황 확인하기 →</a><p class="empty-note">${storageAvailable ? '학습 결과가 이 브라우저에 저장되었습니다.' : '브라우저 저장이 제한되어 현재 화면에서만 결과가 유지됩니다.'}</p></section></div>`;
    return;
  }
  const card = book.cards[index];
  app.innerHTML = `<div class="study-shell"><a class="back" href="#book/${book.id}">← 학습 나가기</a><div class="eyebrow">FOCUS ON ONE CARD</div><h1>${escapeHtml(book.name)}</h1>
    <div class="study-meta"><span>한 장씩, 천천히 떠올려 보세요.</span><span><strong>${index + 1}</strong> / ${book.cards.length}</span></div>
    <div class="track" role="progressbar" aria-label="학습 진행률" aria-valuemin="0" aria-valuemax="${book.cards.length}" aria-valuenow="${index}"><div style="width:${index / book.cards.length * 100}%"></div></div>
    <section class="panel question-panel"><div class="question-label">QUESTION ${String(index + 1).padStart(2, '0')}<span>${card.type} · Lv. ${card.level}</span></div>
      <div class="markdown-body study-question">${renderMarkdown(card.question, card.assets)}</div>${card.image ? circuitImage : ''}
      ${card.options ? `<div class="options" role="group" aria-label="답안 선택">${card.options.map((option, optionIndex) => `<label class="option ${revealed && optionIndex === card.correct ? 'correct' : ''}"><input type="radio" name="answer" value="${optionIndex}" ${session.selected === optionIndex ? 'checked' : ''} ${revealed ? 'disabled' : ''}><div class="markdown-body">${renderMarkdown(option, card.assets)}</div>${revealed && optionIndex === card.correct ? '<span aria-label="정답">✓</span>' : ''}</label>`).join('')}</div>` : ''}
      ${revealed ? `<div class="answer"><h3>정답</h3><div class="markdown-body">${renderMarkdown(card.answer, card.assets)}</div><div class="explanation"><strong>해설</strong><div class="markdown-body">${renderMarkdown(card.explanation || '등록된 해설이 없습니다.', card.assets)}</div></div></div>` : '<p class="question-hint">정답을 확인하기 전에, 잠시 생각해 보세요.</p>'}</section>
    <div class="study-actions">${revealed ? '<button class="secondary" data-action="unknown">↻ &nbsp; 몰라요</button><button class="primary" data-action="known">✓ &nbsp; 알아요</button>' : '<button class="primary" data-action="reveal">정답 확인 <span>↓</span></button>'}</div>
    <p class="study-caption">${revealed ? '평가하면 다음 카드로 이동해요.' : '맞혔는지보다, 스스로 기억하고 있는지가 중요해요.'}</p></div>`;
  updateStudyTools();
  app.querySelector('.question-panel').insertAdjacentHTML('beforeend', `<div class="management-actions study-management"><a class="secondary" href="#edit/${book.id}/${card.id}/study">문제 수정</a><button class="secondary level-reset" data-action="reset-card" data-book="${book.id}" data-card="${card.id}" ${card.level === 1 ? 'disabled' : ''}>↺ 암기 레벨 초기화</button><button class="secondary" data-action="card-stats" data-book="${book.id}" data-card="${card.id}">카드 통계</button></div><p class="field-help">초기화하면 이 문제만 Level 1로 돌아갑니다.</p><p id="management-status" class="management-status" role="status"></p><p id="management-error" class="form-error" role="alert"></p>`);
}
function render() {
  const [page, id, cardId, source] = location.hash.slice(1).split('?')[0].split('/');
  const book = books.find(item => item.id === id);
  const editingCard = book?.cards.find(card => card.id === cardId);
  if (page !== 'study') pauseCardClock();
  if (page !== 'study' && page !== 'edit') { questionDeadline = null; timerToken = ''; }
  if (page !== 'edit') editContext = null;
  if (page === 'new-book') renderNewBook();
  else if (page === 'settings') renderSettings();
  else if (page === 'stats') renderStats();
  else if (page === 'manage' && book) renderManage(book);
  else if (page === 'edit-book' && book) renderEditBook(book);
  else if (page === 'edit' && book && editingCard) renderEdit(book, editingCard, source === 'study');
  else if (page === 'edit' && book) renderManage(book);
  else if (page === 'create' && book) renderCreate(book);
  else if (page === 'study' && book && session?.book.id === id) renderStudy();
  else if ((page === 'book' || page === 'study') && book) renderDetail(book);
  else { renderList(); app.querySelector('.heading-row').insertAdjacentHTML('beforeend', '<a class="primary" href="#new-book">＋ 문제집 만들기</a>'); }
  if ((page === 'book' || (page === 'study' && !session)) && book) {
    app.querySelector('.heading-row').insertAdjacentHTML('beforeend', `<div class="management-actions"><a class="secondary" href="#edit-book/${book.id}">문제집 수정</a><a class="secondary" href="#manage/${book.id}">문제 관리</a><a class="secondary" href="#create/${book.id}">＋ 문제 만들기</a><button class="secondary" data-action="${book.archived ? 'unarchive-book' : 'archive-book'}" data-book="${book.id}">${book.archived ? '보관 해제' : '보관하기'}</button><button class="secondary danger-action" data-action="delete-book" data-book="${book.id}">삭제</button></div>`);
  }
  if (book && !book.cards.length && ['book', 'study'].includes(page)) {
    app.querySelector('.study-plan').innerHTML = `<span class="seed" aria-hidden="true">✳</span><h2>첫 문제를 만들어 보세요</h2><p class="panel-caption">아직 카드가 없는 문제집이에요.<br>기억하고 싶은 질문과 정답을 추가해 보세요.</p><a class="primary" href="#create/${book.id}">＋ 첫 문제 만들기</a>`;
  }
  document.querySelector('.nav-count').textContent = activeBooks().length;
  document.querySelectorAll('.nav-item').forEach(link => {
    const active = link.hash === (['settings', 'stats'].includes(page) ? '#' + page : '#books');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (page === 'book' && book?.id === savedBookId) {
    showToast('새 문제가 Level 1로 저장되었습니다. 학습하기에서 확인해 보세요.');
    savedBookId = null;
  }
  if (managementNotice) {
    showToast(managementNotice);
    managementNotice = '';
  }
  document.querySelector('#breadcrumb').innerHTML = `워크스페이스 <span>/</span> <a href="#books">나의 문제집</a>${book ? ` <span>/</span> ${escapeHtml(book.name)}` : ['settings', 'stats', 'new-book'].includes(page) ? ` <span>/</span> ${{settings: '설정', stats: '학습 통계', 'new-book': '문제집 만들기'}[page]}` : ''}`;
}
app.addEventListener('change', event => {
  if (event.target.name === 'questionType') updateQuestionType(event.target.value);
  if (event.target.name === 'answer' && session && !session.revealed) session.selected = Number(event.target.value);
});
function renderCreate(book, editingCard = null, returnPath = `book/${book.id}`) {
  app.innerHTML = `<div class="create-shell"><a class="back" href="#${returnPath}">← ${editingCard ? (returnPath.startsWith('study/') ? '학습으로 돌아가기' : '문제 관리') : escapeHtml(book.name) + ' 나가기'}</a>
    <div class="eyebrow">BUILD YOUR KNOWLEDGE</div><h1>${editingCard ? '문제 수정' : '새 문제 만들기'}</h1>
    <p class="subtitle">${editingCard ? '질문과 정답을 다듬어 보세요. 암기 레벨과 학습 기록은 유지됩니다.' : '기억하고 싶은 내용을 한 장의 카드로 만들어 보세요.'}</p>
    <form id="${editingCard ? 'edit-form' : 'create-form'}" class="panel create-form" data-book="${book.id}" ${editingCard ? `data-card="${editingCard.id}"` : ''}>
      <input type="hidden" name="assets" value="${escapeHtml(JSON.stringify(editingCard?.assets || {}))}">
      <div class="form-book">문제집 <strong>${escapeHtml(book.name)}</strong><span class="pill">${editingCard ? `수정 중 · Level ${editingCard.level}` : '새 카드 · Level 1'}</span></div>
      <fieldset class="type-field"><legend>문제 유형</legend><div class="type-options">
        ${[['질문 & 답변', '질문을 읽고 답 떠올리기'], ['빈칸 채우기', '빠진 단어 기억하기'], ['선다형', '보기에서 정답 고르기']].map(([type, hint], index) => `<label class="type-option"><input type="radio" name="questionType" value="${type}" ${index === 0 ? 'checked' : ''}><strong>${type}</strong><small>${hint}</small></label>`).join('')}
      </div></fieldset>
      <div class="form-field"><label for="question">문제 <span>필수</span></label><textarea id="question" name="question" data-markdown="문제" rows="5" maxlength="20000" required placeholder="예: **인증**과 **인가**의 차이는 무엇인가요?" aria-describedby="question-help"></textarea><p id="question-help" class="field-help">답을 떠올릴 수 있도록 질문을 구체적으로 작성해 주세요.</p></div>
      <fieldset id="choice-fields" class="choice-fields" hidden disabled><legend>보기와 정답 <span>필수</span></legend><p class="field-help">보기 4개를 입력하고, 정답인 보기 하나를 선택해 주세요.</p>
        ${[0, 1, 2, 3].map(index => `<div class="choice-editor"><div class="choice-editor-heading"><input type="radio" name="correct" value="${index}" required aria-label="${index + 1}번 보기를 정답으로 선택"><label for="choice-${index}">${index + 1}번 보기</label></div><textarea id="choice-${index}" name="choice${index}" data-markdown="${index + 1}번 보기" rows="3" maxlength="5000" required placeholder="${index + 1}번 보기"></textarea></div>`).join('')}
      </fieldset>
      <div id="answer-field" class="form-field"><label for="card-answer">정답 <span>필수</span></label><textarea id="card-answer" name="cardAnswer" data-markdown="정답" rows="3" maxlength="20000" required placeholder="정답을 입력해 주세요."></textarea></div>
      <div class="form-field"><label for="explanation">해설 <span class="optional">선택</span></label><textarea id="explanation" name="explanation" data-markdown="해설" rows="4" maxlength="20000" placeholder="이해를 돕는 설명이나 기억할 포인트를 적어 주세요."></textarea></div>
      <p class="field-help">${editingCard ? '수정 내용은 이 브라우저에 저장됩니다. 학습 중 저장하면 같은 문제를 새 제한시간으로 다시 표시합니다.' : '새 문제는 Level 1로 추가되며, 이 브라우저에 저장됩니다.'}</p>
      <p id="form-error" class="form-error" role="alert"></p>
      <div class="form-actions"><a class="secondary" href="#${returnPath}">${editingCard ? '취소' : '나가기'}</a><button type="submit" class="primary">${editingCard ? '수정 저장하기' : '저장하고 계속 만들기 ＋'}</button></div>
    </form></div>`;
  if (editingCard) {
    const form = document.querySelector('#edit-form');
    const fields = { questionType: editingCard.type, question: editingCard.question, cardAnswer: editingCard.answer, explanation: editingCard.explanation };
    if (editingCard.options) {
      editingCard.options.forEach((option, index) => { fields[`choice${index}`] = option; });
      fields.correct = String(editingCard.correct);
    }
    for (const [name, value] of Object.entries(fields)) form.elements.namedItem(name).value = value;
    updateQuestionType(editingCard.type);
    if (editingCard.image) form.insertAdjacentHTML('afterbegin', '<p class="field-help">기존 회로 이미지는 수정 후에도 유지됩니다.</p>');
  }
  mountMarkdownEditors(document.querySelector(editingCard ? '#edit-form' : '#create-form'));
}
function updateQuestionType(type) {
  const multiple = type === '선다형';
  const choices = document.querySelector('#choice-fields');
  choices.hidden = !multiple;
  choices.disabled = !multiple;
  document.querySelector('#answer-field').hidden = multiple;
  document.querySelector('#card-answer').disabled = multiple;
  document.querySelectorAll('#answer-field button, #answer-field input').forEach(control => { control.disabled = multiple; });
  document.querySelector('#question-help').textContent = type === '빈칸 채우기'
    ? '빈칸은 밑줄(______)로 표시해 주세요. 예: TCP는 ______ 프로토콜입니다.'
    : '답을 떠올릴 수 있도록 질문을 구체적으로 작성해 주세요.';
  document.querySelector('#form-error').textContent = '';
}
function createCard(data) {
  const type = data.get('questionType');
  const question = String(data.get('question') || '').trim();
  const explanation = String(data.get('explanation') || '').trim();
  if (!['질문 & 답변', '빈칸 채우기', '선다형'].includes(type)) throw new Error('문제 유형을 선택해 주세요.');
  if (!question || question.length > 20000) throw new Error('문제 내용을 1~20,000자로 입력해 주세요.');
  if (explanation.length > 20000) throw new Error('해설은 20,000자 이하로 입력해 주세요.');
  if (type === '빈칸 채우기' && !/_{2,}/.test(question)) throw new Error('문제의 빈칸을 밑줄 두 개 이상(__)으로 표시해 주세요.');
  const card = { id: `card-${crypto.randomUUID()}`, type, question, explanation, level: 1, custom: true };
  if (type === '선다형') {
    card.options = [0, 1, 2, 3].map(index => String(data.get(`choice${index}`) || '').trim());
    if (card.options.some(option => !option)) throw new Error('보기 4개를 모두 입력해 주세요.');
    if (card.options.some(option => option.length > 5000)) throw new Error('보기는 각각 5,000자 이하로 입력해 주세요.');
    if (new Set(card.options).size !== 4) throw new Error('보기를 서로 다르게 입력해 주세요.');
    if (!['0', '1', '2', '3'].includes(data.get('correct'))) throw new Error('정답인 보기를 선택해 주세요.');
    card.correct = Number(data.get('correct'));
    card.answer = card.options[card.correct];
  } else {
    card.answer = String(data.get('cardAnswer') || '').trim();
    if (!card.answer || card.answer.length > 20000) throw new Error('정답을 1~20,000자로 입력해 주세요.');
  }
  card.assets = cardAssets(data, [card.question, card.answer, card.explanation, ...(card.options || [])]);
  return card;
}
app.addEventListener('submit', event => {
  if (event.target.id !== 'create-form') return;
  event.preventDefault();
  const form = event.target;
  const error = document.querySelector('#form-error');
  try {
    ensureUploadsFinished(form);
    const card = createCard(new FormData(form));
    const book = books.find(item => item.id === form.dataset.book);
    const completed = book.completed;
    book.cards.push(card);
    book.completed = null;
    if (!persist()) {
      book.cards.pop();
      book.completed = completed;
      throw new Error('브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.');
    }
    session = null;
    const count = book.cards.length;
    renderCreate(book);
    showToast(`${count}번째 문제를 Level 1로 저장했습니다. 이어서 다음 문제를 만들어 보세요.`);
    document.querySelector('#question').focus();
    window.scrollTo({ top: 0 });
  } catch (failure) {
    error.textContent = failure.message;
  }
});
app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'start') {
    if (!books.find(book => book.id === button.dataset.book)?.cards.length) return;
    timerToken = ''; questionDeadline = null;
    session = { book: books.find(book => book.id === button.dataset.book), index: 0, known: 0, revealed: false, selected: null, startedAt: Date.now(), timedOut: false };
    if (location.hash === `#study/${session.book.id}`) render();
    else location.hash = `study/${session.book.id}`;
  } else if (action === 'reveal' && session) {
    session.revealMs = currentCardDuration();
    session.revealed = true;
    renderStudy();
    app.focus();
  } else if ((action === 'known' || action === 'unknown') && session?.revealed) {
    const card = session.book.cards[session.index];
    if (!card) return;
    pauseCardClock();
    studyHistory.push({ bookId: session.book.id, cardId: card.id, date: todayKey(), at: new Date().toISOString(), durationMs: currentCardDuration(), revealMs: Number.isFinite(session.revealMs) ? session.revealMs : null, known: action === 'known', levelAfter: Math.max(1, Math.min(5, card.level + (action === 'known' ? 1 : -1))) });
    session.timedOut = false;
    session.revealMs = null;
    // 복습 알고리즘 대신 평가에 따라 레벨을 한 단계 조정하는 시안입니다.
    card.level = Math.max(1, Math.min(5, card.level + (action === 'known' ? 1 : -1)));
    session.known += action === 'known' ? 1 : 0;
    session.index += 1;
    session.revealed = false;
    session.selected = null;
    session.book.lastStudy = todayKey();
    if (session.index === session.book.cards.length) session.book.completed = todayKey();
    persist();
    renderStudy();
    app.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
app.addEventListener('submit', handleManagementSubmit);
app.addEventListener('click', handleManagementClick);
window.addEventListener('hashchange', () => { render(); app.focus(); window.scrollTo(0, 0); });
render();

startFeatures();
startMarkdownEditors();
startCardStatistics();
