import React, { useEffect, useRef } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { messageTime, type MemberMessage } from "./useMemberNotifications";
import { SettingsTitle } from "../components/SettingsList";

// All messages from the academy. Opening this page counts as viewing them: the unread ones are
// marked read on the server, but keep their "New" label while the page is open.

interface MemberNotificationsPageProps {
  messages: MemberMessage[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onMarkRead: (ids: number[]) => void;
}

export function MemberNotificationsPage({ messages, loading, error, onRetry, onMarkRead }: MemberNotificationsPageProps) {
  const newOnOpen = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (loading) return;
    const unreadIds = messages.filter((m) => !m.isRead).map((m) => m.id);
    if (newOnOpen.current === null) newOnOpen.current = new Set(unreadIds);
    else unreadIds.forEach((id) => newOnOpen.current!.add(id));
    if (unreadIds.length) onMarkRead(unreadIds);
  }, [loading, messages, onMarkRead]);

  const isNew = (m: MemberMessage) => !m.isRead || Boolean(newOnOpen.current?.has(m.id));

  return (
    <div className="mx-auto max-w-xl pb-6">
      <SettingsTitle>Notifications</SettingsTitle>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl bg-white" />)}</div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">We couldn't load your messages.</p>
          <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Try again</button>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500"><Bell className="h-5 w-5" /></span>
          <p className="mt-4 text-[15px] font-semibold text-slate-900">No messages yet</p>
          <p className="mt-1 text-sm text-slate-500">Messages from the academy will appear here, and pop up when they arrive.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 flex items-center gap-1.5 px-1 text-sm text-slate-500"><CheckCheck className="h-4 w-4" /> All messages are marked as read when you open this page.</p>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100">
            {messages.map((m) => (
              <article key={m.id} className={`flex gap-3 px-4 py-4 ${isNew(m) ? "bg-cyan-50/50" : ""}`}>
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isNew(m) ? "bg-cyan-100 text-cyan-800" : "bg-slate-50 text-slate-500"}`}><Bell className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h2 className="flex-1 text-[15px] font-semibold leading-snug text-slate-950">{m.title}</h2>
                    {isNew(m) && <span className="shrink-0 rounded-full bg-cyan-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{m.message}</p>
                  {messageTime(m.createdAt) && <p className="mt-1.5 text-xs text-slate-400">{messageTime(m.createdAt)}</p>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
