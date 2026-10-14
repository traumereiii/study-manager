// 카드를 보고 있는 시간만 누적하고 편집·다른 화면·백그라운드 시간은 제외합니다.
function pauseCardClock(now = Date.now()) {
  if (session?.cardClock?.runningSince != null) {
    session.cardClock.elapsedMs += Math.max(0, now - session.cardClock.runningSince);
    session.cardClock.runningSince = null;
  }
}

function resumeCardClock(now = Date.now()) {
  const card = session?.book.cards[session.index];
  if (!card) return;
  if (session.cardClock?.cardId !== card.id) session.cardClock = { cardId: card.id, elapsedMs: 0, runningSince: null };
  if (!document.hidden && session.cardClock.runningSince == null) session.cardClock.runningSince = now;
}

function currentCardDuration(now = Date.now()) {
  if (!session?.cardClock) return 0;
  const clock = session.cardClock;
  return Math.max(0, Math.round(clock.elapsedMs + (clock.runningSince == null ? 0 : now - clock.runningSince)));
}

function formatStudyTime(ms) {
  if (ms == null) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}분 ${seconds % 60}초` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function getCardStats(bookId, cardId) {
  const entries = studyHistory.filter(item => item.bookId === bookId && item.cardId === cardId);
  const timed = entries.filter(item => Number.isFinite(item.durationMs) && item.durationMs >= 0);
  const totalMs = timed.reduce((sum, item) => sum + item.durationMs, 0);
  const known = entries.filter(item => item.known).length;
  return { entries, total: entries.length, known, unknown: entries.length - known, ratio: entries.length ? Math.round(known / entries.length * 100) : null,
    totalMs: timed.length ? totalMs : null, averageMs: timed.length ? totalMs / timed.length : null, last: entries.at(-1), timedCount: timed.length };
}

function cardStatsSummary(book, card) {
  const stats = getCardStats(book.id, card.id);
  return `<div class="card-stats-summary"><span>학습 <strong>${stats.total}회</strong></span><span>누적 시간 <strong>${formatStudyTime(stats.totalMs)}</strong></span><span>알아요 <strong>${stats.ratio == null ? '—' : stats.ratio + '%'}</strong></span><button type="button" class="link-button" data-action="card-stats" data-book="${book.id}" data-card="${card.id}">카드 통계 보기 →</button></div>`;
}

function openCardStats(book, card, opener) {
  closeCardStats();
  const stats = getCardStats(book.id, card.id);
  const timeOf = value => formatStudyTime(Number.isFinite(value) ? value : null);
  const modal = document.createElement('div');
  modal.id = 'card-stats-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="card-stats-title" tabindex="-1">
    <div class="modal-head"><div><div class="eyebrow">CARD STATISTICS</div><h2 id="card-stats-title">카드 학습 통계</h2><p class="panel-caption">${escapeHtml(book.name)} · ${card.type} · Level ${card.level}</p></div><button type="button" class="secondary" data-action="close-card-stats">닫기</button></div>
    <div class="markdown-body card-stat-question">${renderMarkdown(card.question, card.assets)}</div>
    <div class="stats-summary card-stat-grid">${[['학습 횟수', stats.total + '회'], ['알아요 비율', stats.ratio == null ? '—' : stats.ratio + '%'], ['누적 학습 시간', formatStudyTime(stats.totalMs)], ['평균 학습 시간', formatStudyTime(stats.averageMs)]].map(([label, value]) => `<section class="panel"><p class="panel-caption">${label}</p><strong class="card-stat-value">${value}</strong></section>`).join('')}</div>
    <h3>학습 이력</h3><p class="panel-caption">알아요 ${stats.known}회 · 몰라요 ${stats.unknown}회 · 마지막 학습 ${stats.last ? escapeHtml(stats.last.date) : '아직 없음'}</p>
    ${stats.total ? `<div class="table-scroll history-scroll"><table><thead><tr><th scope="col">학습 시각</th><th scope="col">정답 확인까지</th><th scope="col">평가까지 총 시간</th><th scope="col">평가</th><th scope="col">평가 후 레벨</th></tr></thead><tbody>${stats.entries.slice().reverse().map(entry => `<tr><td>${escapeHtml(entry.at ? new Date(entry.at).toLocaleString('ko-KR') : entry.date)}</td><td>${timeOf(entry.revealMs)}</td><td>${timeOf(entry.durationMs)}</td><td>${entry.known ? '알아요' : '몰라요'}</td><td>${Number.isInteger(entry.levelAfter) ? 'Lv. ' + entry.levelAfter : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty-note">아직 이 카드의 학습 기록이 없어요. 학습 화면에서 평가하면 기록됩니다.</p>'}
    <p class="field-help">편집·다른 화면·백그라운드 시간은 제외합니다. 기능 추가 이전 기록에는 시간이 없습니다.</p></div>`;
  modal._opener = opener;
  document.body.append(modal);
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest?.('[data-action="close-card-stats"]')) closeCardStats(); });
  modal.querySelector('.modal')?.focus();
}

function closeCardStats() {
  const modal = document.querySelector('#card-stats-modal');
  if (!modal) return;
  const opener = modal._opener;
  modal.remove();
  if (opener?.isConnected) opener.focus();
}

function startCardStatistics() {
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCardStats(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseCardClock();
    else if (location.hash.startsWith('#study/')) resumeCardClock();
  });
}
