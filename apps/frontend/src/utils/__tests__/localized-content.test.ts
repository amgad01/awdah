import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLocalizedContent } from '../localized-content';

describe('loadLocalizedContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to English when localized content is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/data/faq-en.json')) {
        return new Response(JSON.stringify([{ id: 'en', title: 'English' }]), { status: 200 });
      }

      if (url.includes('/data/faq-fr.json')) {
        return new Response('Not found', { status: 404 });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadLocalizedContent('faq', 'fr', { baseUrl: '/' });

    expect(result).toEqual([{ id: 'en', title: 'English' }]);
  });

  it('merges partial localized content over English fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes('/data/about-en.json')) {
        return new Response(
          JSON.stringify({
            title: 'English title',
            nested: { a: 'one', b: 'two' },
            list: [
              { name: 'one', text: 'alpha' },
              { name: 'two', text: 'beta' },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes('/data/about-fr.json')) {
        return new Response(
          JSON.stringify({
            title: 'Titre français',
            nested: { a: 'un' },
            list: [{ name: 'un' }],
          }),
          { status: 200 },
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadLocalizedContent('about', 'fr', { baseUrl: '/' });

    expect(result).toEqual({
      title: 'Titre français',
      nested: { a: 'un', b: 'two' },
      list: [
        { name: 'un', text: 'alpha' },
        { name: 'two', text: 'beta' },
      ],
    });
  });
});
