/* Throwaway interaction study. All history records and images are local assets. */
const moneyHistoryRecords = window.MONEY_HISTORY || [];
const historyInterval = 25000;
const historyMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const historyEras = [
  ['all', 'All periods'], ['ancient', 'Before 1000'],
  ['medieval', '1000–1599'], ['early-modern', '1600–1799'], ['modern', '1800 onwards']
];
const historyGalleryState = {
  index: Math.max(0, moneyHistoryRecords.findIndex(record => record.sourceUrl.endsWith('/459052'))),
  era: 'all', automatic: !historyMotionPreference.matches,
  hovering: false, focused: false, visible: true, explicitPlay: false
};
let historyTimer;
let historyObserver;
let observedHistoryGallery;

function historyPool() {
  return moneyHistoryRecords.filter(record => {
    switch (historyGalleryState.era) {
      case 'ancient': return record.sortYear < 1000;
      case 'medieval': return record.sortYear >= 1000 && record.sortYear < 1600;
      case 'early-modern': return record.sortYear >= 1600 && record.sortYear < 1800;
      case 'modern': return record.sortYear >= 1800;
      default: return true;
    }
  });
}
function historyCurrent() { return historyPool()[historyGalleryState.index] || historyPool()[0]; }
function historyYear(year) { return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`; }
function historyReduced() { return state.reduced || historyMotionPreference.matches; }
function historyCanRotate() {
  const playFocused = document.activeElement?.dataset?.action === 'history-play';
  return historyGalleryState.automatic && !historyReduced() && !state.modal &&
    !document.hidden && historyGalleryState.visible && (!historyGalleryState.hovering || historyGalleryState.explicitPlay) &&
    (!historyGalleryState.focused || playFocused) && state.variant === 'D' && state.tab === 'portfolio';
}
function historySchedule() {
  clearTimeout(historyTimer);
  const status = document.getElementById('history-rotation-state');
  if (status) status.textContent = historyReduced() ? 'Reduced motion · paused' :
    !historyGalleryState.automatic ? 'Paused · explore at your pace' :
    historyCanRotate() ? 'Playing · 25 seconds per artwork' : 'Paused while you explore';
  if (historyCanRotate() && historyPool().length > 1) {
    historyTimer = setTimeout(() => historyAdvance(1, false), historyInterval);
  }
}
function historyGallery() {
  const pool = historyPool(), record = historyCurrent();
  if (!record) return '<section class="history-loading">The local history collection is being prepared.</section>';
  const esc = escapeHtml, number = historyGalleryState.index + 1;
  return `<section class="history-gallery-content" aria-label="Money through time artwork gallery">
    <div class="history-heading"><div><span class="eyebrow muted">THE COLLECTOR / AN OPEN ARCHIVE</span><h2>Money through time.</h2></div><span class="history-count">${String(number).padStart(2,'0')}<i>/ ${pool.length}</i></span></div>
    <figure class="history-artwork">
      <button class="history-image-button" data-action="history-info" aria-label="Open artwork: ${esc(record.title)}">
        <img class="history-image" src="${esc(record.image)}" alt="${esc(record.title)}" decoding="async" fetchpriority="high">
        <span class="history-date">${esc(record.date)}</span><span class="history-enlarge">${icon('external')}</span>
      </button>
      <figcaption><div class="history-caption-top"><span>${esc(record.era)}</span><span>${esc(record.medium)}</span></div>
        <h3>${esc(record.title)}</h3><p>${esc(record.caption)}</p>
        <button class="history-source" data-action="history-info">${esc(record.museum)}<span>${esc(record.rights)} · Artwork & source ${icon('external')}</span></button>
      </figcaption>
    </figure>
    <div class="history-controls"><button data-action="history-prev" aria-label="Previous artwork">${icon('left')}</button>
      <button class="history-play" data-action="history-play" aria-label="${historyGalleryState.automatic && !historyReduced() ? 'Pause artwork rotation' : 'Play artwork rotation'}" aria-pressed="${historyGalleryState.automatic && !historyReduced()}" ${historyReduced() ? 'disabled title="Automatic rotation pauses with reduced motion"' : ''}>${historyGalleryState.automatic && !historyReduced() ? '<span aria-hidden="true">Ⅱ</span> Pause' : '<span aria-hidden="true">▷</span> Play'}</button>
      <button data-action="history-next" aria-label="Next artwork">${icon('arrow')}</button><span class="history-control-divider"></span>
      <button class="history-browse" data-action="history-browse">Browse ${moneyHistoryRecords.length} works ${icon('grid')}</button>
    </div>
    <div class="history-era-row"><label for="history-era">Jump to an era</label><select id="history-era">${historyEras.map(([key,label]) => `<option value="${key}" ${historyGalleryState.era===key?'selected':''}>${label}</option>`).join('')}</select></div>
    <label class="history-position-label" for="history-position">Position in this period</label><input id="history-position" class="history-position" type="range" min="1" max="${pool.length}" value="${number}" aria-valuetext="${esc(record.date)}: ${esc(record.title)}">
    <div class="history-timeline-labels"><span>${historyYear(pool[0].sortYear)}</span><span>${historyYear(pool[pool.length-1].sortYear)}</span></div>
    <div class="history-rotation-note"><span id="history-rotation-state"></span><span>Curated chronologically</span></div>
  </section>`;
}
function historyPaint() {
  const host = document.querySelector('.collector-gallery');
  if (!host) return;
  const action = host.contains(document.activeElement) ? document.activeElement?.dataset.action : undefined;
  const focusId = host.contains(document.activeElement) ? document.activeElement?.id : undefined;
  host.innerHTML = historyGallery();
  if (action) host.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});
  if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
  historyGalleryState.focused = host.contains(document.activeElement);
  historySchedule();
  const pool = historyPool(), next = pool[(historyGalleryState.index + 1) % pool.length];
  if (next) { const image = new Image(); image.src = next.image; }
}
function historyAdvance(direction, manual = true) {
  const pool = historyPool();
  if (!pool.length) return;
  historyGalleryState.index = (historyGalleryState.index + direction + pool.length) % pool.length;
  historyPaint();
  if (manual) announce(`${historyCurrent().date} · ${historyCurrent().title}`);
}
function historyObserve() {
  const host = document.querySelector('.collector-gallery');
  if (host !== observedHistoryGallery) {
    historyObserver?.disconnect(); observedHistoryGallery = host;
    historyGalleryState.hovering = false; historyGalleryState.focused = false;
    historyGalleryState.visible = false;
    if (host) {
      historyObserver = new IntersectionObserver(entries => {
        historyGalleryState.visible = entries[0].isIntersecting;
        historySchedule();
      }, {threshold:0.15});
      historyObserver.observe(host);
    }
  }
  historySchedule();
}
function historyInfo() {
  const record = historyCurrent();
  if (!record) return;
  openArtwork({title:record.title,maker:record.creator,date:record.date,museum:record.museum,
    rights:record.rights,url:record.sourceUrl,policy:record.rightsUrl,image:record.image,
    context:record.caption,credit:`${record.medium} · ${record.accession}`});
  historySchedule();
}
function historyBrowse() {
  previousFocus = document.activeElement; state.modal = true;
  historyGalleryState.automatic = false;
  document.getElementById('overlay').innerHTML = `<div class="modal-backdrop"><section class="dialog history-browser" role="dialog" aria-modal="true" aria-labelledby="history-browser-title"><div class="dialog-head"><span class="eyebrow muted">${moneyHistoryRecords.length} MUSEUM WORKS / AN OPEN ARCHIVE</span><button class="icon-button" data-action="close-modal" aria-label="Close history collection">${icon('close')}</button></div><h2 id="history-browser-title">Money through time.</h2><p>Explore objects and scenes of currency, trade, and exchange. Ordered by approximate date; the museum’s original date ranges are retained.</p><div class="history-list">${moneyHistoryRecords.map((record,index)=>`<button data-action="history-select" data-index="${index}"><span>${escapeHtml(record.date)}</span><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.museum)}</small>${icon('arrow')}</button>`).join('')}</div></section></div>`;
  document.querySelector('.history-browser .icon-button').focus(); historySchedule();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action^="history-"]');
  if (!button) { queueMicrotask(historySchedule); return; }
  switch (button.dataset.action) {
    case 'history-prev': historyAdvance(-1); break;
    case 'history-next': historyAdvance(1); break;
    case 'history-play':
      historyGalleryState.automatic = !historyGalleryState.automatic;
      historyGalleryState.explicitPlay = historyGalleryState.automatic;
      historyPaint(); break;
    case 'history-info': historyInfo(); break;
    case 'history-browse': historyBrowse(); break;
    case 'history-select':
      historyGalleryState.era = 'all'; historyGalleryState.index = Number(button.dataset.index);
      closeModal(); historyPaint(); break;
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'history-era') {
    historyGalleryState.era = event.target.value; historyGalleryState.index = 0;
    historyGalleryState.automatic = false; historyPaint();
  }
  if (event.target.id === 'history-position') {
    historyGalleryState.index = Number(event.target.value)-1;
    historyGalleryState.automatic = false; historyPaint();
  }
});
document.addEventListener('pointerover', event => {
  if (event.target.closest('.collector-gallery') && !event.target.closest('[data-action="history-play"]')) historyGalleryState.explicitPlay = false;
  if (event.target.closest('.collector-gallery') && !event.relatedTarget?.closest?.('.collector-gallery')) {
    historyGalleryState.hovering = true; historySchedule();
  }
});
document.addEventListener('pointerout', event => {
  if (event.target.closest('.collector-gallery') && !event.relatedTarget?.closest?.('.collector-gallery')) {
    historyGalleryState.hovering = false; historyGalleryState.explicitPlay = false; historySchedule();
  }
});
document.addEventListener('focusin', event => {
  historyGalleryState.focused = Boolean(event.target.closest('.collector-gallery')); historySchedule();
});
document.addEventListener('focusout', () => queueMicrotask(() => {
  historyGalleryState.focused = Boolean(document.activeElement?.closest('.collector-gallery'));
  historySchedule();
}));
historyMotionPreference.addEventListener('change', () => {
  if (historyMotionPreference.matches) historyGalleryState.automatic = false;
  historyPaint(); historySchedule();
});
document.addEventListener('visibilitychange', historySchedule);
