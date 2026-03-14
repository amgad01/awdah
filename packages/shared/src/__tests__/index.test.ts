import { describe, it, expect } from 'vitest';
import * as allExports from '../index';

describe('Shared Package Index', () => {
  it('should export all expected members', () => {
    expect(allExports.HijriDate).toBeDefined();
    expect(allExports.AppError).toBeDefined();
    expect(allExports.StatusCodes).toBeDefined();
    expect(allExports.PRAYER_NAMES).toBeDefined();
    expect(allExports.getLocale).toBeDefined();
  });
});
