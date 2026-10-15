import React, { useEffect, useState } from "react";
import { Download, RefreshCw, Share, X } from "lucide-react";

// Offers "Install app" (adds SAMS to the home screen / desktop like a normal app) and tells
// people when a newer release is live so they can switch to it with one tap.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "sams_install_dismissed_at";
const DISMISS_FOR_MS = 3 * 24 * 60 * 60 * 1000;
const UPDATE_CHECK_MS = 5 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const recentlyDismissed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_FOR_MS;
  } catch {
    return false;
  }
};

// The built page loads one hashed script (/assets/index-<hash>.js). A different hash on the
// server means a new release has been deployed.
const scriptHashIn = (html: string) => html.match(/\/assets\/index-[\w-]+\.js/)?.[0] || null;
const currentScriptHash = () => {
  const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return el ? scriptHashIn(el.getAttribute("src") || "") : null;
};

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(recentlyDismissed);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of Chrome's mini bar
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iPhone/iPad Safari has no install button for websites; explain the Share menu instead.
    if (isIos()) setShowIosHint(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const running = currentScriptHash();
    if (!import.meta.env.PROD || !running) return;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/", { cache: "no-store" });
        const latest = scriptHashIn(await res.text());
        if (latest && latest !== running) setUpdateReady(true);
      } catch { /* offline: try again later */ }
    };
    const timer = window.setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => null);
    setInstallEvent(null);
  };

  const card = "fixed z-[70] left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-4 flex items-start gap-3 select-none";

  if (updateReady) {
    return (
      <div role="status" className={card}>
        <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">A new version of SAMS is ready</p>
          <p className="text-xs text-slate-500 mt-0.5">Save anything you're typing, then update.</p>
          <button
            id="btn-app-update"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 cursor-pointer"
          >
            Update now
          </button>
        </div>
        <button aria-label="Later" onClick={() => setUpdateReady(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (hidden || (!installEvent && !showIosHint)) return null;

  return (
    <div role="dialog" aria-label="Install SAMS" className={card}>
      <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Install the SAMS app</p>
        {installEvent ? (
          <>
            <p className="text-xs text-slate-500 mt-0.5">Open it from your home screen like any app. It updates itself.</p>
            <div className="mt-3 flex gap-2">
              <button
                id="btn-app-install"
                onClick={install}
                className="px-4 py-2 rounded-full bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Install
              </button>
              <button onClick={dismiss} className="px-3 py-2 rounded-full text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">
                Not now
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Tap <Share className="inline h-3.5 w-3.5 -mt-0.5" aria-label="Share" /> in Safari, then choose <b>Add to Home Screen</b>.
          </p>
        )}
      </div>
      <button aria-label="Close" onClick={dismiss} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
