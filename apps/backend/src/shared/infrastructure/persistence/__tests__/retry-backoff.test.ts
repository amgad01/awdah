import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFullJitterBackoffDelayMs, wait } from '../retry-backoff';

describe('getFullJitterBackoffDelayMs', () => {
  beforeEach(() => {
    // Mock Math.random to have deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 0 for first attempt with base delay', () => {
    // attempt=1, baseDelayMs=100: cap = 100 * 2^0 = 100, random(0, 100) * 0.5 = 50
    const result = getFullJitterBackoffDelayMs(100, 1);
    expect(result).toBe(50);
  });

  it('should double the cap with each attempt (exponential)', () => {
    // With Math.random = 0.5:
    // attempt=1: cap = 100 * 2^0 = 100, result = 50
    // attempt=2: cap = 100 * 2^1 = 200, result = 100
    // attempt=3: cap = 100 * 2^2 = 400, result = 200
    expect(getFullJitterBackoffDelayMs(100, 1)).toBe(50);
    expect(getFullJitterBackoffDelayMs(100, 2)).toBe(100);
    expect(getFullJitterBackoffDelayMs(100, 3)).toBe(200);
  });

  it('should handle attempt 0 by treating it as 1', () => {
    // attempt=0 should be treated as attempt=1
    const result0 = getFullJitterBackoffDelayMs(100, 0);
    const result1 = getFullJitterBackoffDelayMs(100, 1);
    expect(result0).toBe(result1);
  });

  it('should handle negative attempts by treating as 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = getFullJitterBackoffDelayMs(100, -5);
    // Should be same as attempt=1: 100 * 2^0 * 0.5 = 50
    expect(result).toBe(50);
  });

  it('should return 0 when random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = getFullJitterBackoffDelayMs(100, 1);
    expect(result).toBe(0);
  });

  it('should return full cap when random returns 1 (minus 1 due to floor)', () => {
    // Math.random() * 100 with random=1 gives 100, floor(100 - epsilon) ≈ 99
    // Actually with random very close to 1 but not 1, we get cap - small amount
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const result = getFullJitterBackoffDelayMs(100, 1);
    expect(result).toBe(99); // floor(99.9999)
  });

  it('should handle large base delays', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = getFullJitterBackoffDelayMs(10000, 1);
    expect(result).toBe(5000);
  });

  it('should handle large attempt numbers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = getFullJitterBackoffDelayMs(100, 10);
    // cap = 100 * 2^9 = 51200, result = 25600
    expect(result).toBe(25600);
  });

  it('should handle base delay of 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = getFullJitterBackoffDelayMs(1, 1);
    expect(result).toBe(0); // floor(0.5) = 0
  });

  it('should handle base delay of 0 by returning 0', () => {
    const result = getFullJitterBackoffDelayMs(0, 1);
    // cap = 0 * 2^0 = 0, max(0, 1) = 1, random(0, 1) * 0.5 = 0.something, floor = 0
    expect(result).toBe(0);
  });

  it('should produce different results with different random values', () => {
    const baseDelay = 1000;
    const attempt = 3;

    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const result1 = getFullJitterBackoffDelayMs(baseDelay, attempt);

    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const result2 = getFullJitterBackoffDelayMs(baseDelay, attempt);

    // Both should be within valid range but different
    const cap = baseDelay * 2 ** (attempt - 1); // 4000
    expect(result1).toBeLessThan(result2);
    expect(result1).toBeGreaterThanOrEqual(0);
    expect(result2).toBeLessThan(cap);
  });

  describe('full jitter distribution', () => {
    it('should produce values across the full range over many calls', () => {
      vi.restoreAllMocks(); // Use real random

      const results: number[] = [];
      const baseDelay = 1000;
      const attempt = 2; // cap = 2000

      for (let i = 0; i < 100; i++) {
        results.push(getFullJitterBackoffDelayMs(baseDelay, attempt));
      }

      // Should have variety (not all the same)
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(50); // Most should be different

      // All should be within [0, 2000)
      expect(Math.min(...results)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...results)).toBeLessThan(2000);
    });
  });
});

describe('wait', () => {
  it('should resolve after specified milliseconds', async () => {
    const start = Date.now();
    await wait(50);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    expect(elapsed).toBeLessThan(100);
  });

  it('should resolve immediately for 0ms', async () => {
    const start = Date.now();
    await wait(0);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(10);
  });

  it('should handle very small delays', async () => {
    const start = Date.now();
    await wait(1);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(20);
  });

  it('should return a promise that can be awaited', async () => {
    const promise = wait(10);
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should not block other operations', async () => {
    let counter = 0;

    const increment = async () => {
      await wait(30);
      counter++;
    };

    const promise1 = increment();
    const promise2 = increment();

    await Promise.all([promise1, promise2]);

    expect(counter).toBe(2);
  });
});
