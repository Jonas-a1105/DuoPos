import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PowerSyncContext } from '@powersync/react';
import { powerSync, initPowerSync } from './services/powersyncClient';
import App from './App.tsx';
import './index.css';
import { env } from './config/env';

// Inicializar PowerSync en segundo plano
initPowerSync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PowerSyncContext.Provider db={powerSync}>
        <BrowserRouter>
          {PUBLISHABLE_KEY ? (
            <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
              <App />
            </ClerkProvider>
          ) : (
            <App />
          )}
        </BrowserRouter>
      </PowerSyncContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
