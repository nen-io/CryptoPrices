import { afterEach, describe, expect, it, vi } from 'vitest';
import { canRotate, createRotationScheduler, inEra, ROTATION_MS, wrapIndex, type PlaybackConditions } from '../src/renderer/history/model';
import catalogue from '../src/renderer/history/slides.json';

const playing: PlaybackConditions = {
  automatic: true, reduced: false, hidden: false, visible: true,
  modal: false, hover: 'none', focus: 'none', explicitPlay: false,
};

describe('gallery playback boundaries', () => {
  it.each([
    { automatic: false }, { reduced: true }, { hidden: true }, { visible: false },
    { modal: true }, { hover: 'gallery' }, { focus: 'gallery' }, { focus: 'play' },
  ] as Partial<PlaybackConditions>[])('pauses for %j', boundary => {
    expect(canRotate({ ...playing, ...boundary })).toBe(false);
  });
  it('allows explicit Play on its hovered/focused control but keeps inspection and reduced motion paused', () => {
    const requested: PlaybackConditions = { ...playing, explicitPlay: true, hover: 'play', focus: 'play' };
    expect(canRotate(requested)).toBe(true);
    expect(canRotate({ ...requested, hover: 'gallery' })).toBe(false);
    expect(canRotate({ ...requested, focus: 'gallery' })).toBe(false);
    expect(canRotate({ ...requested, reduced: true })).toBe(false);
  });
  it('resumes after focus leaves without requiring another focusable control', () => {
    expect(canRotate({ ...playing, focus: 'gallery' })).toBe(false);
    expect(canRotate({ ...playing, focus: 'none' })).toBe(true);
  });
});

describe('rotation lifecycle', () => {
  afterEach(() => vi.useRealTimers());
  it('advances once per 25 seconds, restarts dwell after pause, and disposes permanently', () => {
    vi.useFakeTimers();
    let allowed = true;
    const advance = vi.fn();
    const scheduler = createRotationScheduler(() => allowed, advance);
    scheduler.sync();
    vi.advanceTimersByTime(ROTATION_MS - 1);
    expect(advance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(advance).toHaveBeenCalledTimes(1);
    allowed = false; scheduler.sync();
    vi.advanceTimersByTime(ROTATION_MS * 3);
    expect(advance).toHaveBeenCalledTimes(1);
    allowed = true; scheduler.sync();
    vi.advanceTimersByTime(ROTATION_MS);
    expect(advance).toHaveBeenCalledTimes(2);
    scheduler.dispose(); scheduler.sync();
    vi.advanceTimersByTime(ROTATION_MS * 3);
    expect(advance).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('checks visibility again when a timer fires and never queues duplicate timers', () => {
    vi.useFakeTimers();
    let visible = true;
    const advance = vi.fn();
    const scheduler = createRotationScheduler(() => visible, advance);
    scheduler.sync(); scheduler.sync(); scheduler.sync();
    expect(vi.getTimerCount()).toBe(1);
    visible = false;
    vi.advanceTimersByTime(ROTATION_MS);
    expect(advance).not.toHaveBeenCalled();
    scheduler.dispose();
  });
});

describe('chronological navigation', () => {
  it('partitions boundary years correctly and keeps every production object reachable', () => {
    const periods = ['ancient', 'medieval', 'early-modern', 'modern'] as const;
    for (const year of [-575, 999, 1000, 1599, 1600, 1799, 1800, 1902]) {
      expect(periods.filter(era => inEra(year, era))).toHaveLength(1);
    }
    expect(inEra(1000, 'medieval')).toBe(true);
    expect(inEra(1600, 'early-modern')).toBe(true);
    expect(inEra(1800, 'modern')).toBe(true);
    expect(catalogue).toHaveLength(60);
    for (const era of periods) expect(catalogue.filter(record => inEra(record.sortYear, era)).length).toBeGreaterThan(0);
    expect(periods.flatMap(era => catalogue.filter(record => inEra(record.sortYear, era)))).toHaveLength(60);
  });
  it('wraps back and forward within the filtered pool', () => {
    expect(wrapIndex(-1, 20)).toBe(19);
    expect(wrapIndex(20, 20)).toBe(0);
    expect(wrapIndex(123, 1)).toBe(0);
    expect(wrapIndex(1, 0)).toBe(0);
  });
});
