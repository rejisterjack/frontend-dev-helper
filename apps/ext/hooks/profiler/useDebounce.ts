/**
 * useDebounce — delays updating the output value until after the specified delay.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/hooks/useDebounce.ts.
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
