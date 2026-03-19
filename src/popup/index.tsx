import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';

// ============================================
// FrontendDevHelper - Popup Entry Point
// ============================================

const container = document.getElementById('popup-root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
} else {
  console.error('Popup root element not found');
}
