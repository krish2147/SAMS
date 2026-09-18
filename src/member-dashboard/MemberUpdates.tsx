import React from "react";
import { Bell, Check, Info, ShieldAlert } from "lucide-react";
import type { MemberNotification } from "./member-overview-data";

interface MemberUpdatesProps {
  notifications: MemberNotification[];
  onViewAll: () => void;
}

function notificationTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

function NotificationIcon({ type }: { type?: string | null }) {
  const normalized = type?.toLowerCase() || "";
  const Icon = normalized.includes("alert") || normalized.includes("urgent") ? ShieldAlert : Info;
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-4.5 w-4.5" /></span>;
}

export function MemberUpdates({ notifications, onViewAll }: MemberUpdatesProps) {
  return (
    <section aria-labelledby="member-updates-title" className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><h2 id="member-updates-title" className="text-base font-semibold text-slate-950">Important updates</h2><p className="mt-0.5 text-sm text-slate-500">Messages from the academy</p></div>
        {notifications.length > 0 && <button type="button" onClick={onViewAll} className="min-h-11 text-sm font-semibold text-cyan-700 hover:text-cyan-800">View all</button>}
      </div>
      {notifications.length === 0 ? <div className="px-6 py-10 text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Check className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-slate-800">You're all caught up.</p><p className="mt-1 text-sm text-slate-500">No new notifications.</p></div>
      : <div className="divide-y divide-slate-100">{notifications.slice(0, 3).map((notification, index) => <article key={`${notification.createdAt}-${notification.title}-${index}`} className="flex gap-3 px-5 py-4 sm:px-6"><NotificationIcon type={notification.type} /><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><h3 className="text-sm font-semibold leading-5 text-slate-900">{notification.title}</h3>{!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" aria-label="Unread" />}</div><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{notification.message}</p>{notificationTime(notification.createdAt) && <p className="mt-2 text-xs text-slate-400">{notificationTime(notification.createdAt)}</p>}</div></article>)}</div>}
    </section>
  );
}
