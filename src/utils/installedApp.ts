// True when SAMS is running as the installed app (opened from the home screen or desktop icon)
// rather than in a normal browser tab.
export const isInstalledApp = () => {
  try {
    return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  } catch {
    return false;
  }
};
