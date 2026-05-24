import { useCallback } from 'react';
import { useToolsStore } from '@/stores/use-tools-store';
import { sendToBackground } from '@/lib/messaging/senders';

export function useToolToggle() {
  const activateTool = useToolsStore((s) => s.activateTool);
  const deactivateTool = useToolsStore((s) => s.deactivateTool);

  const toggle = useCallback(
    async (toolId: string) => {
      const isActive = useToolsStore.getState().activeTools[toolId]?.active ?? false;

      if (isActive) {
        deactivateTool(toolId);
        await sendToBackground({
          type: 'POPUP_DEACTIVATE_TOOL',
          toolId,
        });
      } else {
        activateTool(toolId);
        await sendToBackground({
          type: 'POPUP_ACTIVATE_TOOL',
          toolId,
        });
      }
    },
    [activateTool, deactivateTool],
  );

  return toggle;
}
