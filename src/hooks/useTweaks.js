import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'orion.tweaks.v1';

function loadStored(defaults) {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/**
 * useTweaks — single source of truth for runtime customization
 * (primary color, theme, density, corner radius). Persists to localStorage.
 *
 * Returns [values, setTweak] where setTweak accepts either
 *   setTweak('key', value) or setTweak({ key: value, ... })
 */
export function useTweaks(defaults) {
  const [values, setValues] = useState(() => loadStored(defaults));

  const setTweak = useCallback((keyOrEdits, val) => {
    const edits =
      typeof keyOrEdits === 'object' && keyOrEdits !== null
        ? keyOrEdits
        : { [keyOrEdits]: val };
    setValues((prev) => ({ ...prev, ...edits }));
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      /* ignore quota errors */
    }
  }, [values]);

  return [values, setTweak];
}
