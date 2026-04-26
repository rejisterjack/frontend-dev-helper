/**
 * Popup Entry Point
 *
 * The main popup UI for the browser extension.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import '../assets/css/globals.css';
import { getOrCreatePopupRoot } from './mount-root';
import { Popup } from './Popup';

/** Used by [popup.html](../../popup.html); [index.html](../index.html) uses [index.tsx](./index.tsx). */
ReactDOM.createRoot(getOrCreatePopupRoot()).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Popup />
    </ErrorBoundary>
  </React.StrictMode>
);
