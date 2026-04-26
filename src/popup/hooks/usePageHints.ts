/**
 * usePageHints — Page hints / recommended tools hook
 *
 * Collects page hints from the active tab and derives
 * a list of recommended tool IDs.
 */

import { useEffect, useState } from 'react';
import type { ToolId } from '../../constants';
import { collectPageHints, recommendedToolsFromHints } from '../../utils/page-hints';

export function usePageHints(): ToolId[] {
  const [recommendedIds, setRecommendedIds] = useState<ToolId[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url?.startsWith('chrome://') || cancelled) return;
      const hints = await collectPageHints(tab.id);
      if (!cancelled) setRecommendedIds(recommendedToolsFromHints(hints));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return recommendedIds;
}
