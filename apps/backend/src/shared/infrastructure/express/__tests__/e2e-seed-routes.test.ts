import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Express } from 'express';
import { registerE2eSeedRoutes } from '../e2e-seed-routes';

describe('E2E Seed Routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not register routes when ENABLE_E2E_SEED is not set', () => {
    delete process.env.ENABLE_E2E_SEED;
    const mockPost = vi.fn();
    const mockApp = { post: mockPost } as unknown as Express;

    registerE2eSeedRoutes(mockApp);

    expect(mockPost).not.toHaveBeenCalled();
  });

  it('registers the seed route when ENABLE_E2E_SEED is true', () => {
    process.env.ENABLE_E2E_SEED = 'true';
    const mockPost = vi.fn();
    const mockApp = { post: mockPost } as unknown as Express;

    registerE2eSeedRoutes(mockApp);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/v1/e2e/seed', expect.any(Function));
  });
});
