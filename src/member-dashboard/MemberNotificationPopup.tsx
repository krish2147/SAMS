import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { messageTime, type MemberMessage } from "./useMemberNotifications";

// Shows the newest unread message as a card. It keeps coming back (next visit, or when another
// message arrives) until the member opens it; the close button only hides it for now.

interface MemberNotificationPopupProps {
  message: MemberMessage | null;
  moreCount: number;
  onView: () => void;
  onLater: () => void;
}

export function MemberNotificationPopup({ message, moreCount, onView, onLater }: MemberNotificationPopupProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message.id}
          role="alertdialog"
          aria-labelledby="member-popup-title"
          aria-describedby="member-popup-body"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[65] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-[380px]"
        >
          <div className="flex items-start gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-cyan-700">New message from the academy</p>
              <h2 id="member-popup-title" className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-950">{message.title}</h2>
              <p id="member-popup-body" className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600">{message.message}</p>
              {messageTime(message.createdAt) && <p className="mt-1.5 text-xs text-slate-400">{messageTime(message.createdAt)}</p>}
            </div>
            <button type="button" onClick={onLater} aria-label="Remind me later" className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" id="member-popup-view" onClick={onView} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
              {moreCount > 0 ? `View all (${moreCount + 1} new)` : "View message"}
            </button>
            <button type="button" onClick={onLater} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Later</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
