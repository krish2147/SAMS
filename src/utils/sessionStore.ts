import { isInstalledApp } from "./installedApp";

// Where the signed-in session lives on this device.
// Installed app + "Keep me logged in" -> localStorage, so opening the app again later is still signed in.
// Anything else (including every normal browser tab) -> sessionStorage, which survives a reload but is
// wiped when the app or browser is closed. The browser never reads the app's remembered session, so
// signing in on the website always asks for a login even when the app on the same phone stays signed in.
const KEY = "sams_session";

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export const sessionStore = {
  get(): string | null {
    const current = safe(() => sessionStorage.getItem(KEY), null);
    if (current !== null || !isInstalledApp()) return current;
    return safe(() => localStorage.getItem(KEY), null);
  },
  set(value: string, remember?: boolean) {
    if (!isInstalledApp()) {
      safe(() => sessionStorage.setItem(KEY, value), undefined);
      return;
    }
    // Keep the session in whichever store it already uses, unless the caller says otherwise.
    const persistent = remember ?? safe(() => sessionStorage.getItem(KEY) === null && localStorage.getItem(KEY) !== null, false);
    if (persistent) {
      safe(() => localStorage.setItem(KEY, value), undefined);
      safe(() => sessionStorage.removeItem(KEY), undefined);
    } else {
      safe(() => sessionStorage.setItem(KEY, value), undefined);
      safe(() => localStorage.removeItem(KEY), undefined);
    }
  },
  clear() {
    // Logging out in a browser tab leaves the installed app signed in, and vice versa.
    if (isInstalledApp()) safe(() => localStorage.removeItem(KEY), undefined);
    safe(() => sessionStorage.removeItem(KEY), undefined);
  },
};
