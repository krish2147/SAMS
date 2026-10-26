import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Facebook, Instagram, X } from "lucide-react";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

// The academy's own social pages (from their public Instagram and Facebook profiles).
export const ACADEMY_SOCIAL = {
  instagramHandle: "@barodaswimfront",
  instagramUrl: "https://www.instagram.com/barodaswimfront/",
  facebookUrl: "https://www.facebook.com/profile.php?id=100090741057985"
};

// Shown once each time a member signs in (a new browser session), inviting them to follow the
// academy. Closing it, or tapping a link, hides it until their next sign-in.
const SHOWN_KEY = "sams_social_prompt_shown";

function alreadyShown() {
  try { return sessionStorage.getItem(SHOWN_KEY) === "1"; } catch { return false; }
}
function markShown() {
  try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* storage unavailable: show once per page load */ }
}

/** Called on sign-out so the invitation shows again at the next sign-in on this device. */
export function resetSocialPrompt() {
  try { sessionStorage.removeItem(SHOWN_KEY); } catch { /* nothing to reset */ }
}

export function useSocialPrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (alreadyShown()) return;
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, []);
  const close = () => { markShown(); setOpen(false); };
  return { open, close };
}

export function MemberSocialPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="social-popup-title">
          <motion.button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl sm:pb-6"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
            <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-md" />
            <h2 id="social-popup-title" className="mt-4 text-xl font-bold tracking-[-0.01em] text-slate-950">Join us on Instagram and Facebook</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">Follow Baroda Swim Front for batch updates, events, holidays and photos from the pool.</p>

            <div className="mt-5 space-y-2.5">
              <a href={ACADEMY_SOCIAL.instagramUrl} target="_blank" rel="noreferrer" onClick={onClose}
                className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-[15px] font-semibold text-white hover:opacity-95">
                <Instagram className="h-5 w-5" /> Follow {ACADEMY_SOCIAL.instagramHandle}
              </a>
              <a href={ACADEMY_SOCIAL.facebookUrl} target="_blank" rel="noreferrer" onClick={onClose}
                className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1877f2] text-[15px] font-semibold text-white hover:bg-[#166fe0]">
                <Facebook className="h-5 w-5" /> Like us on Facebook
              </a>
              <button type="button" onClick={onClose} className="min-h-11 w-full rounded-2xl text-sm font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer">
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
