import { useCallback, useEffect, useState } from "react";

// The member's messages from the academy, with per-member read state from the server.
// Checks for new ones every minute and whenever the app comes back to the foreground.

export interface MemberMessage {
  id: number;
  title: string;
  message: string;
  type?: string | null;
  createdAt?: string | null;
  isRead: boolean;
}

const POLL_MS = 60 * 1000;

export function useMemberNotifications() {
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/member/notifications", { credentials: "same-origin" });
      if (!response.ok) throw new Error("notifications unavailable");
      const rows = await response.json();
      setMessages((Array.isArray(rows) ? rows : []).map((n: any) => ({
        id: Number(n.id),
        title: String(n.title || "Message from the academy"),
        message: String(n.message || ""),
        type: n.type ?? null,
        createdAt: n.created_at ?? n.createdAt ?? null,
        isRead: Boolean(n.isRead)
      })));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  const markRead = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    setMessages((list) => list.map((m) => (ids.includes(m.id) ? { ...m, isRead: true } : m)));
    try {
      await fetch("/api/member/notifications/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
    } catch { /* stays read on screen; the next check will show the server's answer */ }
  }, []);

  const unread = messages.filter((m) => !m.isRead);
  return { messages, unread, unreadCount: unread.length, loading, error, refresh, markRead };
}

export function messageTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}
