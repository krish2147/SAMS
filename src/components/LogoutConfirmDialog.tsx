import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

// "Log out? Are you sure?" shown before anyone is signed out.
export function LogoutConfirmDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-5 bg-black/60 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-desc"
            className="w-full max-w-[380px] rounded-[28px] bg-[#232323] border border-white/10 p-6 sm:p-7 shadow-2xl text-left"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-title" className="text-[26px] font-semibold tracking-tight text-white">Log out</h2>
            <p id="logout-desc" className="mt-2 text-[17px] text-stone-300">Are you sure you want to log out?</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="h-12 rounded-full border border-white/20 text-white text-base font-semibold hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-logout"
                onClick={onConfirm}
                className="h-12 rounded-full bg-[#d23c3c] text-white text-base font-semibold hover:bg-[#c03434] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 cursor-pointer"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
