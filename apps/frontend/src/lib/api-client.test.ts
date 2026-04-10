// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, _setApiClient } from './api-client';

// Use globalThis.fetch for mocking since ApiClient uses globalThis.fetch
const fetchMock = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  _setApiClient(null);
});

function okResponse(body: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number): Response {
  return new Response('error', { status });
}

describe('ApiClient', () => {
  it('makes a basic GET request with the configured base URL', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ ok: true }));
    const client = new ApiClient({ baseUrl: 'https://api.test' });

    const response = await client.fetch('/v1/health');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/v1/health', expect.any(Object));
  });

  it('retries on 5xx errors up to retryLimit', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(okResponse({ recovered: true }));

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    const response = await client.fetch('/test');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 (rate limit)', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429)).mockResolvedValueOnce(okResponse());

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    const response = await client.fetch('/test');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 4xx client errors (except 408/429)', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400));

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 2,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    const response = await client.fetch('/test');
    expect(response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on network failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(okResponse());

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    const response = await client.fetch('/test');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network error'));

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    await expect(client.fetch('/test')).rejects.toThrow('Network error');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the last error response when retries are exhausted on 5xx', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503)).mockResolvedValueOnce(errorResponse(503));

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 1,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    const response = await client.fetch('/test');
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fires request interceptors in order', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const client = new ApiClient({ baseUrl: '' });

    client.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...(config.headers as Record<string, string>), 'X-Custom': 'intercepted' },
    }));

    await client.fetch('/test', { headers: {} });
    const calledInit = fetchMock.mock.calls[0]?.[1];
    expect((calledInit?.headers as Record<string, string>)?.['X-Custom']).toBe('intercepted');
  });

  it('fires response interceptors', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ original: true }));
    const client = new ApiClient({ baseUrl: '' });

    const interceptorFn = vi.fn((response: Response) => response);
    client.addResponseInterceptor(interceptorFn);

    await client.fetch('/test');
    expect(interceptorFn).toHaveBeenCalledTimes(1);
  });

  it('logs requests in debug mode', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    const client = new ApiClient({ baseUrl: '', debug: true });
    await client.fetch('/test', { method: 'POST' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[ApiClient] POST /test'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[ApiClient] 200'));
    debugSpy.mockRestore();
  });

  it('does not log when debug is off', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    const client = new ApiClient({ baseUrl: '', debug: false });
    await client.fetch('/test');

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('does not retry aborted requests', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

    const client = new ApiClient({
      baseUrl: '',
      retryLimit: 2,
      retryBaseDelayMs: 1,
      retryMaxDelayMs: 2,
    });

    await expect(client.fetch('/test')).rejects.toThrow('The operation was aborted.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
