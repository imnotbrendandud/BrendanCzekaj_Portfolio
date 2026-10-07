import { useEffect, useState } from 'react';

/** A boolean remembered in localStorage. A convenience only, so failures are ignored. */
export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(false);
  useEffect(() => {
    try {
      setValue(localStorage.getItem(key) === '1');
    } catch {}
  }, [key]);
  const set = (next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {}
  };
  return [value, set];
}
