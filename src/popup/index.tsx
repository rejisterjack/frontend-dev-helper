import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logger } from '../utils/logger';
import { Popup } from './Popup';

// ============================================
// FrontendDevHelper - Popup Entry Point
// ============================================

const container = document.getElementById('popup-root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <Popup />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  logger.error('Popup root element not found');
}
