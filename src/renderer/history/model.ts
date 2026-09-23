export interface HistoryRecord {
  id: string;
  title: string;
  creator: string;
  date: string;
  sortYear: number;
  era: string;
  medium: string;
  museum: string;
  accession: string;
  image: string;
  sourceUrl: string;
  rights: string;
  rightsUrl: string;
  caption: string;
  sourceNote?: string;
}

export const ERAS = [
  { id: 'all', label: 'All periods' },
  { id: 'ancient', label: 'Before 1000' },
  { id: 'medieval', label: '1000–1599' },
  { id: 'early-modern', label: '1600–1799' },
  { id: 'modern', label: '1800 onwards' },
] as const;
export type Era = typeof ERAS[number]['id'];
export function inEra(year: number, era: Era): boolean {
  switch (era) {
    case 'ancient': return year < 1000;
    case 'medieval': return year >= 1000 && year < 1600;
    case 'early-modern': return year >= 1600 && year < 1800;
    case 'modern': return year >= 1800;
    default: return true;
  }
}
export function wrapIndex(index: number, count: number): number {
  return count > 0 ? ((index % count) + count) % count : 0;
}

export interface PlaybackConditions {
  automatic: boolean;
  reduced: boolean;
  hidden: boolean;
  visible: boolean;
  modal: boolean;
  hover: 'none' | 'play' | 'gallery';
  focus: 'none' | 'play' | 'gallery';
  explicitPlay: boolean;
}
export function canRotate(state: PlaybackConditions): boolean {
  return state.automatic && !state.reduced && !state.hidden && state.visible && !state.modal &&
    (state.hover === 'none' || (state.explicitPlay && state.hover === 'play')) &&
    (state.focus === 'none' || (state.explicitPlay && state.focus === 'play'));
}

export const ROTATION_MS = 25_000;
/** One timeout per mounted gallery. Stale callbacks cannot advance a paused/disposed gallery. */
export function createRotationScheduler(allowed: () => boolean, advance: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let disposed = false;
  function sync() {
    clearTimeout(timer);
    timer = undefined;
    const token = ++generation;
    if (disposed || !allowed()) return;
    timer = setTimeout(() => {
      if (disposed || generation !== token || !allowed()) return;
      timer = undefined;
      advance();
      sync();
    }, ROTATION_MS);
  }
  return {
    sync,
    dispose() { disposed = true; ++generation; clearTimeout(timer); timer = undefined; },
  };
}
