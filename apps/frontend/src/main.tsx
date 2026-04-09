import '@/assets/globals.css';
import { validateEnv } from './lib/validate-env';
import { initializeI18n } from './i18n';
import { registerBrowserMonitoring } from './lib/browser-monitoring';

// Fail loudly at startup if required env vars are missing — avoids silent
// Cognito failures that produce confusing runtime errors.
validateEnv();
registerBrowserMonitoring();

// ... existing main.tsx content
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ErrorBoundary } from './components/error-boundary/error-boundary';
import { AuthProvider } from './hooks/use-auth';
import { ToastProvider } from './hooks/use-toast';
import App from './App';

async function bootstrap(): Promise<void> {
  await initializeI18n();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
