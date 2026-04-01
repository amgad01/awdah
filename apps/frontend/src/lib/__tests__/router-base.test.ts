import { describe, expect, it } from 'vitest';
import { normalizeRouterBase, resolveRouterBase } from '../router-base';

describe('normalizeRouterBase', () => {
  it('defaults to root when the base path is missing', () => {
    expect(normalizeRouterBase(undefined)).toBe('/');
    expect(normalizeRouterBase('')).toBe('/');
  });

  it('adds the missing leading and trailing slash', () => {
    expect(normalizeRouterBase('awdah')).toBe('/awdah/');
    expect(normalizeRouterBase('/awdah')).toBe('/awdah/');
  });
});

describe('resolveRouterBase', () => {
  it('keeps an explicit non-root configured base path', () => {
    expect(resolveRouterBase({ configuredBasePath: '/docs/' })).toBe('/docs/');
  });

  it('falls back to the GitHub Pages repo base when the current path is under /awdah', () => {
    expect(
      resolveRouterBase({
        configuredBasePath: '/',
        currentPathname: '/awdah/learn',
      }),
    ).toBe('/awdah/');
  });

  it('stays on root when the current path is not under the Pages base path', () => {
    expect(
      resolveRouterBase({
        configuredBasePath: '/',
        currentPathname: '/learn',
      }),
    ).toBe('/');
  });
});
