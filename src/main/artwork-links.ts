import slides from '../renderer/history/slides.json';

// The renderer may only open the exact curator-reviewed museum and rights pages.
// Keeping this decision in the main process prevents arbitrary protocol launches.
const sourceLinks = new Set(slides.flatMap(slide => [slide.sourceUrl, slide.rightsUrl]));

export function isArtworkSource(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('https://') && sourceLinks.has(value);
}
