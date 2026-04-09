interface BrowserErrorContext {
  componentStack?: string;
  handled?: boolean;
  source: 'error-boundary' | 'window.error' | 'window.unhandledrejection';
}

interface BrowserErrorPayload {
  context: BrowserErrorContext;
  environment: string;
  message: string;
  name: string;
  release: string;
  stack?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

declare global {
  interface WindowEventMap {
    'awdah:browser-error': CustomEvent<BrowserErrorPayload>;
  }
}

const BROWSER_ERROR_EVENT = 'awdah:browser-error';
const MONITORING_ENDPOINT = import.meta.env.VITE_BROWSER_ERROR_ENDPOINT;
const RELEASE = import.meta.env.VITE_APP_VERSION || 'dev';
const ENVIRONMENT = import.meta.env.MODE;

let handlersRegistered = false;

function getBrowserMetadata() {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    url: window.location.href,
    userAgent: window.navigator.userAgent,
  };
}

function normalizeError(error: unknown): Pick<BrowserErrorPayload, 'message' | 'name' | 'stack'> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      name: 'Error',
    };
  }

  return {
    message: 'Unknown browser error',
    name: 'UnknownError',
  };
}

function buildPayload(error: unknown, context: BrowserErrorContext): BrowserErrorPayload {
  return {
    ...normalizeError(error),
    context,
    environment: ENVIRONMENT,
    release: RELEASE,
    timestamp: new Date().toISOString(),
    ...getBrowserMetadata(),
  };
}

function sendPayload(payload: BrowserErrorPayload): void {
  if (!MONITORING_ENDPOINT || typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(MONITORING_ENDPOINT, blob);
    return;
  }

  void fetch(MONITORING_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export function reportBrowserError(error: unknown, context: BrowserErrorContext): void {
  const payload = buildPayload(error, context);

  console.error('[browser-monitoring]', payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BROWSER_ERROR_EVENT, { detail: payload }));
  }

  sendPayload(payload);
}

export function registerBrowserMonitoring(): void {
  if (handlersRegistered || typeof window === 'undefined') {
    return;
  }

  handlersRegistered = true;

  window.addEventListener('error', (event) => {
    reportBrowserError(event.error ?? event.message, {
      source: 'window.error',
      handled: false,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportBrowserError(event.reason, {
      source: 'window.unhandledrejection',
      handled: false,
    });
  });
}
