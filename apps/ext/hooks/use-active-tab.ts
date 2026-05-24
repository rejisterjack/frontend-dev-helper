import { useEffect, useState } from 'react';

interface TabInfo {
  id: number;
  url: string;
  title: string;
}

export function useActiveTab() {
  const [tab, setTab] = useState<TabInfo | null>(null);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      if (activeTab?.id) {
        setTab({
          id: activeTab.id,
          url: activeTab.url ?? '',
          title: activeTab.title ?? '',
        });
      }
    });
  }, []);

  return tab;
}
