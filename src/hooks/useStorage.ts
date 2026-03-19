/**
 * useStorage Hook
 * 
 * A custom React hook for syncing state with Chrome storage.
 */

import { useState, useEffect, useCallback } from 'react';

interface StorageOptions<T> {
  defaultValue: T;
  storageArea?: 'sync' | 'local';
}

export function useStorage<T>(key: string, options: StorageOptions<T>) {
  const { defaultValue, storageArea = 'sync' } = options;
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value from storage
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const storage = chrome.storage[storageArea];
        const result = await storage.get(key);
        setValue(result[key] ?? defaultValue);
      } catch (error) {
        console.error('Failed to load from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorage();
  }, [key, defaultValue, storageArea]);

  // Listen for storage changes
  useEffect(() => {
    const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setValue(changes[key].newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, [key]);

  // Update storage when value changes
  const updateStorage = useCallback(
    async (newValue: T | ((prev: T) => T)) => {
      const valueToStore = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value) 
        : newValue;
      
      try {
        const storage = chrome.storage[storageArea];
        await storage.set({ [key]: valueToStore });
        setValue(valueToStore);
      } catch (error) {
        console.error('Failed to save to storage:', error);
      }
    },
    [key, value, storageArea]
  );

  return [value, updateStorage, isLoading] as const;
}
