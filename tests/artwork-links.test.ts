import { describe, expect, it } from 'vitest';
import { isArtworkSource } from '../src/main/artwork-links';
import slides from '../src/renderer/history/slides.json';

describe('museum source link boundary', () => {
  it('allows every reviewed source and rights page', () => {
    for (const slide of slides) {
      expect(isArtworkSource(slide.sourceUrl)).toBe(true);
      expect(isArtworkSource(slide.rightsUrl)).toBe(true);
    }
  });
  it('rejects other pages, altered URLs, and executable protocols', () => {
    for (const value of [null, {}, 5, 'file:///etc/passwd', 'javascript:alert(1)',
      'https://example.com', slides[0]!.sourceUrl + '?redirect=https://example.com',
      slides[0]!.sourceUrl.replace('https:', 'http:'), slides[0]!.sourceUrl + '/other']) {
      expect(isArtworkSource(value)).toBe(false);
    }
  });
});
