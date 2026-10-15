import { useEffect, useState } from "react";

// useState that survives a page reload (but not closing the browser), so a reload brings
// people back to the screen they were on instead of the first tab.
const PREFIX = "sams_view:";

export function useRememberedState<T extends string | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(PREFIX + key);
      if (saved !== null) return JSON.parse(saved) as T;
    } catch { /* storage blocked or bad JSON: use the default */ }
    return initial;
  });

  useEffect(() => {
    try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);

  return [value, setValue] as const;
}

// Forget every remembered screen, e.g. when someone logs in or out.
export function clearRememberedViews() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(PREFIX)) sessionStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
