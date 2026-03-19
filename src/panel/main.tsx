/**
 * DevTools Panel Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { DevToolsPanel } from './DevToolsPanel';
import '../assets/css/globals.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DevToolsPanel />
    </React.StrictMode>
  );
}
