import { useCallback, useEffect, useRef, useState } from "react";
import type { SysNotification } from "../components/NotificationDrawer";
import { sessionStore } from "./sessionStore";

const POLL_MS = 60 * 1000;

function authHeaders(): Record<string, string> {
  try {
    const token = JSON.parse(sessionStore.get() || "{}")?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(diff)) return "";
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Shows the unread count on the installed app's icon (Chrome/Edge/Android, installed iOS apps).
function setAppIconBadge(count: number) {
  const nav = navigator as any;
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch?.(() => {});
    else nav.clearAppBadge?.()?.catch?.(() => {});
  } catch { /* not supported */ }
}

// The staff bell feed: real registrations, payments, renewals and class updates from the
// server, with read/cleared state saved per account. Refreshes every minute and on focus.
export function useStaffNotifications() {
  const [notifications, setNotifications] = useState<SysNotification[]>([]);
  const latest = useRef<SysNotification[]>([]);
  latest.current = notifications;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/notifications", { headers: authHeaders(), credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications((data.notifications || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        text: n.text,
        type: n.type,
        read: Boolean(n.read),
        time: relativeTime(n.createdAt),
      })));
    } catch { /* offline: keep what we have */ }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  useEffect(() => { setAppIconBadge(unreadCount); }, [unreadCount]);
  useEffect(() => () => setAppIconBadge(0), []);

  const send = (path: "read" | "dismiss", keys: (string | number)[]) => {
    if (keys.length === 0) return;
    fetch(`/api/staff/notifications/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "same-origin",
      body: JSON.stringify({ keys: keys.map(String) }),
    }).catch(() => {});
  };

  return {
    notifications,
    unreadCount,
    refresh: load,
    markRead: (id: string | number) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      send("read", [id]);
    },
    markAllRead: () => {
      send("read", latest.current.filter((n) => !n.read).map((n) => n.id));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    },
    remove: (id: string | number) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      send("dismiss", [id]);
    },
    clearAll: () => {
      send("dismiss", latest.current.map((n) => n.id));
      setNotifications([]);
    },
  };
}
