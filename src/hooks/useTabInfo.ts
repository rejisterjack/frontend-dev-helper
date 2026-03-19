/**
 * useTabInfo Hook
 * 
 * A custom React hook for getting information about the current tab.
 */

import { useState, useEffect, useCallback } from 'react';

interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
}

export function useTabInfo() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTabInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      setTabInfo({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTabInfo();

    // Listen for tab changes
    const handleTabChange = () => fetchTabInfo();
    
    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
    };
  }, [fetchTabInfo]);

  return { tabInfo, isLoading, error, refetch: fetchTabInfo };
}
