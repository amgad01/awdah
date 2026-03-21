import './i18n';
import '@/assets/globals.css';
import { validateEnv } from './lib/validate-env';

// Fail loudly at startup if required env vars are missing — avoids silent
// Cognito failures that produce confusing runtime errors.
validateEnv();

// ... existing main.tsx content
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ErrorBoundary } from './components/error-boundary/error-boundary';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
