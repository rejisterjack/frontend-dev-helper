/**
 * Popup Entry Point
 *
 * The main popup UI for the browser extension.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './Popup';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../assets/css/globals.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Popup />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
