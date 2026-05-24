import React from 'react';
import ReactDOM from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import DevToolsApp from './DevToolsApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <DevToolsApp />
    </TooltipProvider>
  </React.StrictMode>,
);
