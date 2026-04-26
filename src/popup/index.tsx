import React from 'react';
import { createRoot } from 'react-dom/client';
import '../assets/css/globals.css';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getOrCreatePopupRoot } from './mount-root';
import { Popup } from './Popup';

// ============================================
// FrontendDevHelper - Popup Entry Point
// Must match [index.html](../index.html) id="root" (manifest default_popup).
// ============================================

const container = getOrCreatePopupRoot();
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Popup />
    </ErrorBoundary>
  </React.StrictMode>
);
