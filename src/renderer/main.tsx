import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { StandaloneTerminalView } from './features/standalone/StandaloneTerminalView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { rendererPerfTracker } from './perfTracker';
import './design/global.css';

const rootElement = document.getElementById('root') as HTMLElement;

if (!window.api) {
  console.error('CRITICAL: window.api is missing! Preload script failed or contextBridge was blocked.');
  rootElement.innerHTML = `
    <div style="width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #0B0D10; color: #F87171; font-family: sans-serif; padding: 24px;">
      <div style="max-width: 500px; background-color: #161A20; border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 8px; padding: 24px;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #E6E8EB;">Electron API Preload Failure</h2>
        <p style="margin: 0; font-size: 14px; color: #A0A6AF;">
          <code>window.api</code> is missing. The preload bridge failed to load or context isolation blocked it.
        </p>
      </div>
    </div>
  `;
} else {
  rendererPerfTracker.mark('rendererFirstPaint');

  const rawSearch = (window.location.search || '').replace(/^\?+/, '');
  const searchParams = new URLSearchParams(rawSearch);
  const isStandalone = searchParams.get('mode') === 'standalone';
  const standaloneSessionId = searchParams.get('sessionId') || '';

  if (isStandalone && standaloneSessionId) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <StandaloneTerminalView sessionId={standaloneSessionId} />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
}
