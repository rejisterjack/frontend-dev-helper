import React from 'react';
import ReactDOM from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import SidepanelApp from './SidepanelApp.tsx';

// Force dark mode for extension sidepanel
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <SidepanelApp />
    </TooltipProvider>
  </React.StrictMode>,
);
