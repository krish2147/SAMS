// Where the signed-in session lives in the browser.
// "Keep me logged in" -> localStorage, which survives closing Chrome.
// Otherwise -> sessionStorage, which survives a reload but is wiped when the browser closes.
const KEY = "sams_session";

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

export const sessionStore = {
  get(): string | null {
    return safe(() => sessionStorage.getItem(KEY), null) ?? safe(() => localStorage.getItem(KEY), null);
  },
  set(value: string, remember?: boolean) {
    // Keep the session in whichever store it already uses, unless the caller says otherwise.
    const persistent = remember ?? safe(() => localStorage.getItem(KEY) !== null, false);
    if (persistent) {
      safe(() => localStorage.setItem(KEY, value), undefined);
      safe(() => sessionStorage.removeItem(KEY), undefined);
    } else {
      safe(() => sessionStorage.setItem(KEY, value), undefined);
      safe(() => localStorage.removeItem(KEY), undefined);
    }
  },
  clear() {
    safe(() => localStorage.removeItem(KEY), undefined);
    safe(() => sessionStorage.removeItem(KEY), undefined);
  },
};
