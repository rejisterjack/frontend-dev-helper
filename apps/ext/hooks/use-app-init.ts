import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/stores/use-settings-store';
import { useConnectionStore } from '@/stores/use-connection-store';
import { useActiveTab } from '@/hooks/use-active-tab';
import { useMessageListener } from '@/hooks/use-message-listener';
import type { FDHMessage } from '@/lib/messaging/types';

export function useAppInit() {
  const theme = useSettingsStore((s) => s.theme);
  const setTabId = useConnectionStore((s) => s.setTabId);
  const setContentScriptReady = useConnectionStore((s) => s.setContentScriptReady);
  const updateSupportedTools = useConnectionStore((s) => s.updateSupportedTools);

  const activeTab = useActiveTab();

  // Theme setup
  useEffect(() => {
    const resolved = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [theme]);

  // Tab tracking
  useEffect(() => {
    if (activeTab?.id != null) {
      setTabId(activeTab.id);
    }
  }, [activeTab?.id, setTabId]);

  // Message listener for background communication
  const handleMessage = useCallback(
    (message: FDHMessage) => {
      switch (message.type) {
        case 'CONTENT_READY':
          setContentScriptReady(true);
          updateSupportedTools(message.supportedTools);
          break;
        case 'BG_TAB_CONTENT_READY':
          setContentScriptReady(true);
          updateSupportedTools(message.supportedTools);
          break;
      }
    },
    [setContentScriptReady, updateSupportedTools],
  );

  useMessageListener(handleMessage);
}
