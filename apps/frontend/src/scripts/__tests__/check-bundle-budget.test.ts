import { describe, expect, it } from 'vitest';
import { resolveDistDir } from '../../../scripts/check-bundle-budget.mjs';

describe('resolveDistDir', () => {
  it('resolves dist/assets relative to the script location', () => {
    const scriptUrl = 'file:///tmp/example/apps/frontend/scripts/check-bundle-budget.mjs';

    expect(resolveDistDir(scriptUrl)).toBe('/tmp/example/apps/frontend/dist/assets');
  });
});
