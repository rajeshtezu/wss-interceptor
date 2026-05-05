import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('[Panel] Initializing React app...');

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[Panel] React app mounted');
} else {
  console.error('[Panel] Root element not found');
}
