<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import catalogue from '../history/slides.json';
import { canRotate, createRotationScheduler, ERAS, inEra, wrapIndex, type Era, type HistoryRecord } from '../history/model';

const props = defineProps<{ reducedMotion: boolean; paused?: boolean }>();
const emit = defineEmits<{ 'open-source': [url: string] }>();
const records: readonly HistoryRecord[] = catalogue;
const id = useId();
const panel = ref<HTMLElement>();
const caption = ref<HTMLElement>();
const dialog = ref<HTMLDialogElement>();
const playButton = ref<HTMLButtonElement>();
const media = window.matchMedia('(prefers-reduced-motion: reduce)');
const systemReduced = ref(media.matches);
const reduced = computed(() => props.reducedMotion || systemReduced.value);
const automatic = ref(!reduced.value);
const explicitPlay = ref(false);
const hover = ref<'none' | 'play' | 'gallery'>('none');
const focus = ref<'none' | 'play' | 'gallery'>('none');
const visible = ref(false);
const hidden = ref(document.hidden);
const mode = ref<'browse' | 'details' | null>(null);
const era = ref<Era>('all');
const index = ref(Math.max(0, records.findIndex(record => record.id === 'scenes-met-459052')));
const pool = computed(() => records.filter(record => inEra(record.sortYear, era.value)));
const current = computed(() => pool.value[wrapIndex(index.value, pool.value.length)]!);
const rotationAllowed = computed(() => pool.value.length > 1 && canRotate({
  automatic: automatic.value, reduced: reduced.value, hidden: hidden.value,
  visible: visible.value, modal: mode.value !== null || Boolean(props.paused), hover: hover.value,
  focus: focus.value, explicitPlay: explicitPlay.value,
}));
const rotationStatus = computed(() => reduced.value ? 'Reduced motion · paused' :
  !automatic.value ? 'Paused · explore at your pace' : rotationAllowed.value ?
    'Playing · 25 seconds per artwork' : 'Paused while you explore');
const announcement = ref('');
const imageFailed = ref(false);
const assetUrl = (record: HistoryRecord) => `${import.meta.env.BASE_URL}${record.image}`;
const yearLabel = (year: number) => year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
let observer: IntersectionObserver | undefined;
let nextImage: HTMLImageElement | undefined;
let mounted = false;

function pause() { automatic.value = false; explicitPlay.value = false; }
function announceCurrent() { announcement.value = `${current.value.date}. ${current.value.title}`; }
function advance(direction: number, manual = true) {
  index.value = wrapIndex(index.value + direction, pool.value.length);
  if (manual) { pause(); announceCurrent(); }
}
const scheduler = createRotationScheduler(() => mounted && rotationAllowed.value, () => advance(1, false));
watch([rotationAllowed, () => current.value.id], () => scheduler.sync(), { flush: 'sync' });
watch(reduced, value => { if (value) pause(); }, { flush: 'sync' });

function preloadNext() {
  imageFailed.value = false;
  nextImage = new Image();
  nextImage.decoding = 'async';
  nextImage.src = assetUrl(pool.value[wrapIndex(index.value + 1, pool.value.length)]!);
}
watch(() => current.value.id, () => {
  if (!mounted) return;
  if (caption.value) caption.value.scrollTop = 0;
  preloadNext();
});
function togglePlayback() {
  if (reduced.value) return;
  automatic.value = !automatic.value;
  explicitPlay.value = automatic.value;
  reconcileFocus();
}
function chooseEra(event: Event) {
  era.value = (event.target as HTMLSelectElement).value as Era;
  index.value = 0; pause(); announceCurrent();
}
function choosePosition(event: Event) {
  index.value = wrapIndex(Number((event.target as HTMLInputElement).value) - 1, pool.value.length);
  pause(); announceCurrent();
}
function chooseRecord(record: HistoryRecord) {
  era.value = 'all'; index.value = records.findIndex(item => item.id === record.id);
  pause(); dialog.value?.close(); announceCurrent();
}
function reconcileFocus() {
  if (!mounted) return;
  const active = document.activeElement;
  focus.value = active === playButton.value ? 'play' : panel.value?.contains(active) ? 'gallery' : 'none';
  if (focus.value === 'gallery') explicitPlay.value = false;
}
function onFocusOut() { queueMicrotask(reconcileFocus); }
function onPointerOver(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  hover.value = playButton.value?.contains(event.target as Node) ? 'play' : 'gallery';
  if (hover.value === 'gallery') explicitPlay.value = false;
}
function onPointerLeave() { hover.value = 'none'; explicitPlay.value = false; }
function onKey(event: KeyboardEvent) {
  if (mode.value || event.altKey || event.ctrlKey || event.metaKey ||
    (event.target as HTMLElement).matches('input, select, textarea, [contenteditable]')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); event.stopPropagation(); advance(event.key === 'ArrowRight' ? 1 : -1);
  }
}
async function openDialog(kind: 'browse' | 'details') {
  if (kind === 'browse') pause();
  mode.value = kind;
  explicitPlay.value = false;
  await nextTick();
  if (mounted && dialog.value && !dialog.value.open) dialog.value.showModal();
}
function onDialogClose() { mode.value = null; queueMicrotask(reconcileFocus); }
function onBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const bounds = dialog.value.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.value.close();
}
function onVisibility() { hidden.value = document.hidden; }
function onMotion(event: MediaQueryListEvent) { systemReduced.value = event.matches; }
onMounted(() => {
  mounted = true;
  observer = new IntersectionObserver(entries => {
    visible.value = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.15);
  }, { threshold: [0, 0.15] });
  if (panel.value) observer.observe(panel.value);
  document.addEventListener('visibilitychange', onVisibility);
  media.addEventListener('change', onMotion);
  preloadNext();
  scheduler.sync();
});
onBeforeUnmount(() => {
  mounted = false; scheduler.dispose(); observer?.disconnect();
  document.removeEventListener('visibilitychange', onVisibility);
  media.removeEventListener('change', onMotion);
  dialog.value?.close(); nextImage = undefined;
});
</script>

<template>
  <section ref="panel" class="history-gallery" aria-label="Money through time artwork gallery"
    @pointerover="onPointerOver" @pointerleave="onPointerLeave" @focusin="reconcileFocus" @focusout="onFocusOut" @keydown="onKey">
    <header class="history-heading"><div><span class="history-eyebrow">THE COLLECTOR / AN OPEN ARCHIVE</span><h2>Money through time.</h2></div><span class="history-count">{{ String(index + 1).padStart(2, '0') }}<small>/ {{ pool.length }}</small></span></header>
    <figure class="history-artwork">
      <button class="history-image-button" :aria-label="`Open artwork: ${current.title}`" @click="openDialog('details')">
        <img v-if="!imageFailed" :key="current.id" :src="assetUrl(current)" :alt="current.title" decoding="async" @error="imageFailed = true">
        <span v-else class="history-image-error">Image unavailable.<br>Artwork details are still available.</span>
        <span class="history-date">{{ current.date }}</span><span class="history-enlarge" aria-hidden="true">↗</span>
      </button>
      <figcaption ref="caption" class="history-caption">
        <div class="history-caption-meta"><span>{{ current.era }}</span><span>{{ current.medium }}</span></div>
        <button class="history-title" @click="openDialog('details')">{{ current.title }}</button>
        <p>{{ current.caption }}</p>
        <button class="history-source" @click="openDialog('details')"><span>{{ current.museum }}</span><small>{{ current.rights }} · Artwork &amp; source ↗</small></button>
      </figcaption>
    </figure>
    <div class="history-controls">
      <button aria-label="Previous artwork" @click="advance(-1)">←</button>
      <button ref="playButton" class="history-play" :disabled="reduced" :aria-label="automatic && !reduced ? 'Pause artwork rotation' : 'Play artwork rotation'" :aria-pressed="automatic && !reduced" :title="reduced ? 'Automatic rotation is disabled with reduced motion' : undefined" @click="togglePlayback">{{ automatic && !reduced ? 'Ⅱ Pause' : '▷ Play' }}</button>
      <button aria-label="Next artwork" @click="advance(1)">→</button>
      <button class="history-browse" @click="openDialog('browse')">Browse {{ records.length }} works</button>
    </div>
    <div class="history-era-row"><label :for="`${id}-era`">Jump to an era</label><select :id="`${id}-era`" :value="era" @change="chooseEra"><option v-for="period in ERAS" :key="period.id" :value="period.id">{{ period.label }}</option></select></div>
    <label class="history-position-label" :for="`${id}-position`">Position in this period</label>
    <input :id="`${id}-position`" class="history-position" type="range" min="1" :max="pool.length" :value="index + 1" :aria-valuetext="`${current.date}: ${current.title}`" @input="choosePosition">
    <div class="history-timeline"><span>{{ yearLabel(pool[0]!.sortYear) }}</span><span>{{ yearLabel(pool[pool.length - 1]!.sortYear) }}</span></div>
    <p class="history-rotation-note">{{ rotationStatus }}</p>
    <span class="history-sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</span>

    <dialog ref="dialog" class="history-dialog" :aria-labelledby="`${id}-dialog-title`" @close="onDialogClose" @click="onBackdrop">
      <div class="history-dialog-top"><span class="history-eyebrow">{{ mode === 'browse' ? `${records.length} MUSEUM WORKS` : 'ARTWORK & PROVENANCE' }}</span><button class="history-close" autofocus aria-label="Close artwork dialog" @click="dialog?.close()">×</button></div>
      <template v-if="mode === 'browse'">
        <h2 :id="`${id}-dialog-title`">Money through time.</h2><p>Objects and scenes of currency, trade, and exchange. Ordered by approximate date; original museum date ranges are retained.</p>
        <div class="history-list"><button v-for="record in records" :key="record.id" :aria-current="record.id === current.id ? 'true' : undefined" @click="chooseRecord(record)"><span>{{ record.date }}</span><strong>{{ record.title }}</strong><small>{{ record.museum }}</small><i aria-hidden="true">→</i></button></div>
      </template>
      <template v-else-if="mode === 'details'">
        <img class="history-dialog-image" :src="assetUrl(current)" :alt="current.title" decoding="async">
        <h2 :id="`${id}-dialog-title`">{{ current.title }}</h2><p><strong>{{ current.creator }}</strong><br>{{ current.date }} · {{ current.museum }}<br>{{ current.medium }} · {{ current.accession }}</p>
        <p>{{ current.caption }}</p><p v-if="current.sourceNote" class="history-source-note">{{ current.sourceNote }}</p>
        <div class="history-rights"><strong>{{ current.rights }}</strong><p>This exact museum image has verified reuse rights and is bundled with the app. No museum endorsement is implied.</p></div>
        <div class="history-external"><button @click="emit('open-source', current.sourceUrl)">Museum object record ↗</button><button @click="emit('open-source', current.rightsUrl)">Image reuse policy ↗</button></div>
        <p class="history-external-note">These links open your browser. Viewing this gallery makes no museum requests.</p>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.history-gallery{color:#f2ecdb;min-width:0;padding:24px;font-size:12px;--history-muted:#c2c5b4;--history-line:#e7edd32b}
.history-gallery button,.history-gallery select,.history-gallery input{font:inherit}
.history-gallery button{cursor:pointer;color:inherit;background:none;border:0}
.history-gallery button:disabled{opacity:.5;cursor:default}
.history-gallery button:focus-visible,.history-gallery input:focus-visible,.history-gallery select:focus-visible{outline:2px solid #e9ca86;outline-offset:4px}
.history-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:20px}
.history-eyebrow{font-size:8px;font-weight:650;letter-spacing:1.3px;color:var(--history-muted)}
.history-heading h2{font-family:Georgia,serif;font-weight:400;font-size:25px;letter-spacing:-.6px;margin:8px 0 0;line-height:1.2}
.history-count{font-size:23px;font-family:Georgia,serif;white-space:nowrap}.history-count small{font:10px system-ui;color:var(--history-muted);margin-left:5px}
.history-artwork{margin:0}.history-image-button{position:relative;display:block;width:100%;height:294px;padding:12px!important;overflow:hidden;background:#ede9dc!important;border-radius:2px;color:#293d2c!important}
.history-image-button img{width:100%;height:100%;object-fit:contain;display:block}.history-date{position:absolute;left:12px;bottom:12px;background:#f9f5e9ed;padding:7px 9px;font-size:10px}.history-enlarge{position:absolute;right:12px;top:10px;background:#f9f5e9ed;width:25px;height:25px;display:grid;place-items:center}.history-image-error{display:block;line-height:1.6}
.history-caption{height:235px;overflow:auto;scrollbar-width:thin;padding:17px 2px 10px;scrollbar-color:#a4af91 transparent}
.history-caption-meta{display:flex;justify-content:space-between;align-items:start;gap:12px;font-size:9px;color:var(--history-muted)}.history-caption-meta span:last-child{text-align:right;max-width:55%}
.history-title{display:block;padding:0;text-align:left;font-family:Georgia,serif!important;font-size:21px!important;font-weight:400;line-height:1.2;margin:12px 0 9px;overflow-wrap:anywhere}
.history-caption p{font-size:11px;line-height:1.75;color:#dadcca;margin:0 0 14px}
.history-source{padding:0;display:flex;flex-direction:column;align-items:start;gap:5px;font-size:10px!important;text-align:left;line-height:1.4}.history-source small{font-size:9px;color:var(--history-muted)}
.history-controls{display:flex;align-items:center;gap:3px;border-top:1px solid var(--history-line);border-bottom:1px solid var(--history-line);padding:9px 0}.history-controls button{padding:8px 7px;font-size:12px;min-height:34px}.history-controls button:hover{background:#fff1}.history-play{min-width:69px}.history-browse{margin-left:auto;font-size:10px!important;border-left:1px solid var(--history-line)!important;padding-left:12px!important}
.history-era-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:15px 0;color:var(--history-muted);font-size:10px}.history-era-row select{border:1px solid var(--history-line);border-radius:3px;background:#314534;color:#f2ecdb;max-width:145px;padding:7px 8px}
.history-position-label{display:block;font-size:9px;color:var(--history-muted);margin-bottom:7px}.history-position{display:block;width:100%;height:15px;margin:0;accent-color:#d0bb87;cursor:pointer}.history-timeline{display:flex;justify-content:space-between;color:var(--history-muted);font-size:9px;margin-top:7px}.history-rotation-note{font-size:9px;color:var(--history-muted);margin:14px 0 0;line-height:1.5}.history-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.history-dialog{background:#f6f3e9;color:#252c25;border:1px solid #d4d5c7;border-radius:10px;width:min(650px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:25px;box-sizing:border-box;box-shadow:0 24px 90px #0006;--history-muted:#586355;--history-line:#293f2926}
.history-dialog::backdrop{background:#1023119c;backdrop-filter:blur(5px)}.history-dialog-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.history-close{font-size:25px!important;width:35px;height:35px}.history-dialog h2{font-family:Georgia,serif;font-size:29px;font-weight:400;line-height:1.2;letter-spacing:-.5px;margin:20px 0 14px}.history-dialog p{font-size:12px;line-height:1.8;color:#596051;margin:0 0 17px}.history-dialog-image{width:100%;max-height:330px;object-fit:contain;background:#eeecdf;margin-top:20px}.history-source-note{font-size:11px!important}.history-rights{background:#e8ebdc;border:1px solid #d1d8c0;padding:13px;margin:18px 0}.history-rights>strong{font-size:11px}.history-rights p{font-size:11px;margin:5px 0 0}.history-external{display:flex;gap:12px;flex-wrap:wrap}.history-external button{border-bottom:1px solid #717a62;padding:4px 0;font-size:12px}.history-external-note{font-size:10px!important;margin:15px 0 0!important}.history-list{display:grid;gap:0;margin-top:24px}.history-list button{display:grid;grid-template-columns:90px 1fr 20px;column-gap:14px;text-align:left;padding:14px 0;border-top:1px solid #d4d8c8!important}.history-list button:hover,.history-list button[aria-current=true]{background:#e8ebdc}.history-list button>span{grid-row:1/3;font-size:10px;padding:3px 0;color:#616a57}.history-list strong{font-size:12px;font-weight:550;line-height:1.5}.history-list small{font-size:10px;color:#69725c;margin-top:4px}.history-list i{font-style:normal;grid-column:3;grid-row:1/3;align-self:center}
@media(max-width:450px){.history-gallery{padding:20px}.history-heading h2{font-size:24px}.history-image-button{height:260px}.history-caption{height:250px}.history-dialog{padding:20px}.history-list button{grid-template-columns:75px 1fr 15px;gap:8px}.history-browse{padding-left:8px!important}}
</style>
