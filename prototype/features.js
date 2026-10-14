// 추가 기능도 기존 학습 데이터와 함께 한 번에 저장합니다.
const defaultSettings = { shortcuts: true, reveal: 'Space', unknown: '1', known: '2', alarm: false, alarmTime: '20:00', timeLimit: 0 };
let settings = { ...defaultSettings };
let studyHistory = [];
let alarmLastDate = '';
let questionDeadline = null;
let timerToken = '';
const keyOptions = ['Space', 'Enter', '1', '2', '3', 'a', 's', 'd', 'j', 'k', 'l'];
const keyLabel = key => key === 'Space' ? '스페이스' : key === 'Enter' ? 'Enter' : key.toUpperCase();
function loadFeatures(data) {
  const meta = data._meta || {};
  const stored = meta.settings || {};
  if (['reveal', 'unknown', 'known'].every(key => keyOptions.includes(stored[key])) && new Set([stored.reveal, stored.unknown, stored.known]).size === 3) {
    settings = { ...defaultSettings, ...stored, shortcuts: stored.shortcuts === true, alarm: stored.alarm === true,
      alarmTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(stored.alarmTime) ? stored.alarmTime : '20:00',
      timeLimit: Number.isInteger(stored.timeLimit) && stored.timeLimit >= 0 && stored.timeLimit <= 600 ? stored.timeLimit : 0 };
  }
  studyHistory = Array.isArray(meta.history) ? meta.history.filter(item => item && typeof item.bookId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.known === 'boolean') : [];
  alarmLastDate = typeof meta.alarmLastDate === 'string' ? meta.alarmLastDate : '';
  if (Array.isArray(meta.books)) {
    for (const item of meta.books) {
      if (!item || typeof item.id !== 'string' || !/^custom-[\w-]+$/.test(item.id) || books.some(book => book.id === item.id) || typeof item.name !== 'string' || !item.name.trim()) continue;
      books.push({ id: item.id, name: item.name, desc: typeof item.desc === 'string' ? item.desc : '', icon: '▤', color: '#eaf1e2', ink: '#648346', custom: true, cards: [] });
    }
  }
}
function featureData() {
  return { settings, history: studyHistory, alarmLastDate, books: books.filter(book => book.custom).map(({ id, name, desc }) => ({ id, name, desc })) };
}
function renderNewBook() {
  app.innerHTML = `<div class="create-shell"><a href="#books" class="back">← 나의 문제집</a><div class="eyebrow">A NEW CHAPTER</div><h1>문제집 만들기</h1><p class="subtitle">배우고 싶은 주제를 담을 새로운 공간을 만들어 보세요.</p><form id="book-form" class="panel create-form"><div class="form-field"><label for="book-name">문제집 이름 <span>필수</span></label><input id="book-name" name="name" maxlength="60" required placeholder="예: 정보처리기사 필기"></div><div class="form-field"><label for="book-desc">한 줄 소개 <span class="optional">선택</span></label><textarea id="book-desc" name="description" maxlength="160" rows="3" placeholder="이 문제집에서 어떤 내용을 공부할까요?"></textarea></div>${iconPicker('▤')}<p class="field-help">빈 문제집을 만든 뒤, 원하는 문제를 직접 추가할 수 있어요.</p><p id="feature-error" class="form-error" role="alert"></p><div class="form-actions"><a class="secondary" href="#books">취소</a><button class="primary" type="submit">문제집 만들기 ＋</button></div></form></div>`;
}
function renderSettings() {
  app.innerHTML = `<div class="create-shell"><div class="eyebrow">MAKE IT YOURS</div><h1>설정</h1><p class="subtitle">내 학습 습관에 맞춰 편안하게 조정해 보세요.</p><form id="settings-form" class="settings-form">
    <section class="panel"><div class="setting-heading"><div><h2>단축키 설정</h2><p class="panel-caption">학습 화면에서 키보드로 카드를 넘겨 보세요.</p></div><label class="toggle"><input type="checkbox" name="shortcuts" ${settings.shortcuts ? 'checked' : ''}> 사용</label></div><div class="shortcut-grid">${[['reveal', '정답 확인'], ['unknown', '몰라요'], ['known', '알아요']].map(([key, label]) => `<div class="form-field"><label for="key-${key}">${label}</label><select id="key-${key}" name="${key}">${keyOptions.map(option => `<option value="${option}" ${settings[key] === option ? 'selected' : ''}>${keyLabel(option)}</option>`).join('')}</select></div>`).join('')}</div><p class="field-help">동작마다 서로 다른 키를 지정해 주세요. 입력 중에는 단축키가 실행되지 않습니다.</p></section>
    <section class="panel"><div class="setting-heading"><div><h2>알람 설정</h2><p class="panel-caption">매일 같은 시간, 학습할 시간을 알려드려요.</p></div><label class="toggle"><input type="checkbox" name="alarm" ${settings.alarm ? 'checked' : ''}> 사용</label></div><div class="form-field"><label for="alarm-time">알림 시간</label><input id="alarm-time" name="alarmTime" type="time" value="${settings.alarmTime}" required></div><p class="field-help">기기 현지 시각 기준으로 하루 한 번 앱 안에 알림이 표시됩니다. 앱을 열어 둔 동안만 작동하며, 백그라운드에서는 늦어질 수 있습니다.</p></section>
    <section class="panel"><h2>문제 제한시간</h2><p class="panel-caption">시간이 지나면 정답을 자동으로 보여드립니다. 평가는 직접 선택해 주세요.</p><div class="form-field time-setting"><label for="time-limit">문제당 시간 (초)</label><input id="time-limit" name="timeLimit" type="number" min="0" max="600" step="1" value="${settings.timeLimit}" required><p class="field-help">0은 시간 제한 없음 · 최대 600초 · 다음 문제부터 적용됩니다.</p></div></section>
    <p id="feature-error" class="form-error" role="alert"></p><p id="settings-status" class="field-help" role="status"></p><div class="form-actions"><button class="secondary" type="button" data-action="reset-settings">기본값으로 설정</button><button class="primary" type="submit">설정 저장하기 ✓</button></div></form></div>`;
}
function getStats() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - 6 + index);
    const key = date.toLocaleDateString('sv-SE');
    const entries = studyHistory.filter(item => item.date === key);
    return { key, label: `${date.getMonth() + 1}/${date.getDate()}`, count: entries.length, known: entries.filter(item => item.known).length };
  });
  return { days, total: studyHistory.length, known: studyHistory.filter(item => item.known).length, activeDays: new Set(studyHistory.map(item => item.date)).size };
}
function renderStats() {
  const stats = getStats();
  const max = Math.max(1, ...stats.days.map(day => day.count));
  app.innerHTML = `<div class="eyebrow">YOUR STEADY PROGRESS</div><h1>학습 통계</h1><p class="subtitle">한 장씩 쌓아 온 학습을 돌아보세요. 반복 평가도 학습 횟수에 포함됩니다.</p>
    <div class="stats-summary">${[['오늘 학습', stats.days[6].count, '회'], ['누적 학습', stats.total, '회'], ['알아요 비율', stats.total ? Math.round(stats.known / stats.total * 100) : 0, '%'], ['학습한 날', stats.activeDays, '일']].map(([label, value, unit]) => `<section class="panel"><p class="panel-caption">${label}</p><div class="total">${value}<span> ${unit}</span></div></section>`).join('')}</div>
    <section class="panel"><div class="section-title chart-heading"><h2>최근 7일 학습</h2><span>평가 횟수 기준</span></div><div class="weekly-chart">${stats.days.map(day => `<div class="chart-column"><strong>${day.count}</strong><div class="chart-track"><div class="chart-bar" style="height:${day.count / max * 100}%"></div></div><span>${day.label}</span></div>`).join('')}</div>${!stats.total ? '<p class="empty-note">아직 학습 기록이 없어요. 문제를 풀고 알아요 / 몰라요를 선택하면 통계가 쌓입니다.</p>' : ''}</section>
    <section class="panel book-stats"><h2>문제집별 학습 현황</h2><div class="table-scroll"><table><thead><tr><th scope="col">문제집</th><th scope="col">카드</th><th scope="col">평가 횟수</th><th scope="col">알아요 비율</th><th scope="col">평균 레벨</th></tr></thead><tbody>${books.map(book => { const entries = studyHistory.filter(item => item.bookId === book.id); return `<tr><th scope="row"><a href="#book/${book.id}">${escapeHtml(book.name)}</a></th><td>${book.cards.length}장</td><td>${entries.length}회</td><td>${entries.length ? Math.round(entries.filter(item => item.known).length / entries.length * 100) + '%' : '—'}</td><td>${book.cards.length ? 'Lv. ' + average(book) : '—'}</td></tr>`; }).join('')}</tbody></table></div><p class="empty-note">통계 기능 추가 이후의 평가부터 집계합니다. 기존 카드의 암기 레벨은 그대로 유지됩니다.</p></section>`;
}
function readSettings(data) {
  const next = { shortcuts: data.has('shortcuts'), alarm: data.has('alarm'), alarmTime: data.get('alarmTime'), timeLimit: Number(data.get('timeLimit')), reveal: data.get('reveal'), unknown: data.get('unknown'), known: data.get('known') };
  if (![next.reveal, next.unknown, next.known].every(key => keyOptions.includes(key)) || new Set([next.reveal, next.unknown, next.known]).size !== 3) throw new Error('단축키는 서로 다른 키로 설정해 주세요.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.alarmTime)) throw new Error('올바른 알림 시간을 입력해 주세요.');
  if (!String(data.get('timeLimit') ?? '').trim() || !Number.isInteger(next.timeLimit) || next.timeLimit < 0 || next.timeLimit > 600) throw new Error('제한시간은 0~600 사이의 정수로 입력해 주세요.');
  return next;
}
function handleFeatureSubmit(event) {
  const form = event.target;
  if (!['book-form', 'settings-form'].includes(form.id)) return;
  event.preventDefault();
  const error = document.querySelector('#feature-error');
  error.textContent = '';
  const data = new FormData(form);
  try {
    if (form.id === 'book-form') {
      const name = String(data.get('name') || '').trim();
      if (!name || name.length > 60) throw new Error('문제집 이름을 1~60자로 입력해 주세요.');
      const icon = data.get('icon') || '▤';
      if (!bookIcons.some(([value]) => value === icon)) throw new Error('아이콘을 목록에서 선택해 주세요.');
      const book = { id: `custom-${crypto.randomUUID()}`, name, desc: String(data.get('description') || '').trim().slice(0, 160), icon, color: '#eaf1e2', ink: '#648346', cards: [], custom: true };
      books.push(book);
      if (!persist()) { books.pop(); throw new Error('저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.'); }
      location.hash = `book/${book.id}`;
    } else {
      const previous = settings;
      settings = readSettings(data);
      if (!persist()) { settings = previous; throw new Error('설정을 저장하지 못했습니다. 브라우저 저장 공간과 설정을 확인해 주세요.'); }
      document.querySelector('#settings-status').textContent = '✓ 설정이 저장되었습니다.';
    }
  } catch (failure) { error.textContent = failure.message; }
}
function updateStudyTools() {
  if (!session || session.index >= session.book.cards.length) return;
  const token = `${session.startedAt}-${session.index}`;
  if (timerToken !== token) {
    timerToken = token;
    questionDeadline = session.resumeRemaining != null ? Date.now() + session.resumeRemaining : settings.timeLimit ? Date.now() + settings.timeLimit * 1000 : null;
    delete session.resumeRemaining;
  }
  const shell = app.querySelector('.study-shell');
  const shortcutText = settings.shortcuts ? `정답 확인 ${keyLabel(settings.reveal)} · 몰라요 ${keyLabel(settings.unknown)} · 알아요 ${keyLabel(settings.known)}` : '단축키 사용 안 함';
  shell.insertAdjacentHTML('beforeend', `<p class="card-live-time">이 카드 학습 시간 <strong id="card-elapsed">${formatStudyTime(currentCardDuration())}</strong></p>`);
  shell.insertAdjacentHTML('beforeend', `<div class="study-tools"><span>${shortcutText}</span><span id="question-timer" role="timer">${session.timedOut ? '시간 종료 · 정답을 확인해 주세요.' : questionDeadline && !session.revealed ? `남은 시간 ${Math.max(0, Math.ceil((questionDeadline - Date.now()) / 1000))}초` : '천천히 학습해 보세요.'}</span></div>`);
}
function tickStudyTimer() {
  if (location.hash.startsWith('#study/') && session) {
    const elapsed = document.querySelector('#card-elapsed');
    if (elapsed) elapsed.textContent = formatStudyTime(currentCardDuration());
  }
  if (!location.hash.startsWith('#study/') || !session || session.revealed || !questionDeadline || session.index >= session.book.cards.length) return;
  const remaining = Math.max(0, Math.ceil((questionDeadline - Date.now()) / 1000));
  const timer = document.querySelector('#question-timer');
  if (timer) timer.textContent = `남은 시간 ${remaining}초`;
  if (!remaining) { session.revealMs = currentCardDuration(); session.revealed = true; session.timedOut = true; renderStudy(); }
}
function checkAlarm() {
  if (!settings.alarm || alarmLastDate === todayKey()) return;
  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (current < settings.alarmTime) return;
  alarmLastDate = todayKey();
  persist();
  document.querySelector('#alarm-banner')?.remove();
  const banner = document.createElement('aside');
  banner.id = 'alarm-banner'; banner.className = 'alarm-banner'; banner.setAttribute('role', 'status');
  banner.innerHTML = '<div><strong>차곡, 오늘의 학습 시간이에요.</strong><p>잠시 시간을 내어 한 장부터 시작해 볼까요?</p></div><a class="primary" href="#books">문제집 보기</a><button type="button" aria-label="알림 닫기">×</button>';
  banner.querySelector('button').addEventListener('click', () => banner.remove());
  banner.querySelector('a').addEventListener('click', () => banner.remove());
  document.body.append(banner);
}
function startFeatures() {
  app.addEventListener('submit', handleFeatureSubmit);
  app.addEventListener('click', event => {
    if (event.target.closest('[data-action="reset-settings"]')) {
      const form = document.querySelector('#settings-form');
      for (const [key, value] of Object.entries(defaultSettings)) {
        const field = form.elements.namedItem(key);
        if (typeof value === 'boolean') field.checked = value; else field.value = value;
      }
      document.querySelector('#settings-status').textContent = '기본값을 불러왔습니다. 설정 저장하기를 눌러 적용해 주세요.';
    }
  });
  document.addEventListener('keydown', event => {
    if (!settings.shortcuts || !location.hash.startsWith('#study/') || !session || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.target.closest('button, a') && [' ', 'Enter'].includes(event.key)) return;
    const key = event.key === ' ' ? 'Space' : event.key.toLowerCase() === 'enter' ? 'Enter' : event.key.toLowerCase();
    const action = ['reveal', 'unknown', 'known'].find(action => settings[action] === key);
    const button = action && app.querySelector(`[data-action="${action}"]`);
    if (button) { event.preventDefault(); button.click(); app.focus(); }
  });
  setInterval(tickStudyTimer, 250);
  setInterval(checkAlarm, 10000);
  checkAlarm();
}
