type RequestInterceptor = (config: RequestInit & { url: string }) => RequestInit & { url: string };
type ResponseInterceptor = (response: Response) => Response;

interface ApiClientConfig {
  baseUrl: string;
  retryLimit?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  debug?: boolean;
}

const DEFAULT_RETRY_LIMIT = 1;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RETRY_MAX_DELAY_MS = 4000;

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function getRetryDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const capped = Math.min(baseDelay * 2 ** attempt, maxDelay);
  return Math.floor(Math.random() * capped);
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly retryLimit: number;
  private readonly retryBaseDelayMs: number;
  private readonly retryMaxDelayMs: number;
  private readonly debug: boolean;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.retryLimit = config.retryLimit ?? DEFAULT_RETRY_LIMIT;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.retryMaxDelayMs = config.retryMaxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS;
    this.debug = config.debug ?? false;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let config: RequestInit & { url: string } = { ...init, url };

    for (const interceptor of this.requestInterceptors) {
      config = interceptor(config);
    }

    const { url: finalUrl, ...fetchInit } = config;
    const startTime = Date.now();

    if (this.debug) {
      // Strip query params to avoid logging sensitive tokens
      const safeUrl = finalUrl.split('?')[0];
      console.debug(`[ApiClient] ${fetchInit.method ?? 'GET'} ${safeUrl}`);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryLimit; attempt++) {
      try {
        let response = await globalThis.fetch(finalUrl, fetchInit);

        for (const interceptor of this.responseInterceptors) {
          response = interceptor(response);
        }

        if (this.debug) {
          const elapsed = Date.now() - startTime;
          console.debug(
            `[ApiClient] ${response.status} ${finalUrl} (${elapsed}ms, attempt ${attempt + 1})`,
          );
        }

        if (isRetryable(response.status) && attempt < this.retryLimit) {
          const delay = getRetryDelay(attempt, this.retryBaseDelayMs, this.retryMaxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.retryLimit) {
          const delay = getRetryDelay(attempt, this.retryBaseDelayMs, this.retryMaxDelayMs);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }
}

let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL || '',
      debug: import.meta.env.DEV,
    });
  }
  return clientInstance;
}

/** Test-only: replace the singleton with a custom instance. */
export function _setApiClient(client: ApiClient | null): void {
  clientInstance = client;
}
