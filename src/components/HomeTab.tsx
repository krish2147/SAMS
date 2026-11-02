import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronRight, Clock3, IndianRupee, LoaderCircle, MessageCircle, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";

// Staff home for every role. Admins and reception get a to-do list (applications to approve,
// approved members who haven't paid with a one-tap reminder, memberships ending soon); admins also
// see today's collections; coaches see their batches with the swimmers in each. Everyone sees
// today's pool sessions and what's coming up on the calendar. All figures are live.

interface HomeTabProps {
  members: any[];
  userRole?: string;
  userName?: string;
  getSessionToken?: () => string;
  onNavigate: (tabId: string) => void;
  onOpenAddMember: () => void;
  onSendPaymentLink?: (membershipNo: string, mobileNo?: string) => Promise<void> | void;
  // Older props still passed by the dashboard; not used here.
  [key: string]: any;
}

const todayIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const daysUntil = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null;
  const [ty, tm, td] = todayIndia().split("-").map(Number);
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
};
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const toMinutes = (t: string) => { const m = String(t || "").trim().toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/); if (!m) return 9999; let h = Number(m[1]) % (m[3] ? 12 : 24); if (m[3] === "PM") h += 12; return h * 60 + Number(m[2]); };
const shortTime = (t: string) => String(t || "").replace(/^0(\d)/, "$1");
const greeting = () => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }).format(new Date())); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const dateLabel = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); };

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4"><h3 className="text-base font-bold text-ink-950">{title}</h3>{action}</div>
      {children}
    </section>
  );
}

export function HomeTab({ members, userRole = "admin", userName, getSessionToken, onNavigate, onOpenAddMember, onSendPaymentLink }: HomeTabProps) {
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const isCoach = userRole === "coach";
  const isDesk = !isCoach;
  const headers = (): Record<string, string> => { const t = getSessionToken?.() || ""; return t ? { "x-session-token": t } : {}; };

  const [batches, setBatches] = useState<any[] | null>(null);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [collections, setCollections] = useState<number | null>(null);
  const [reminding, setReminding] = useState("");
  const [reminded, setReminded] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/batches/operations", { credentials: "same-origin", headers: headers() })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setBatches(Array.isArray(d?.batches) ? d.batches : [])).catch(() => setBatches([]));
    fetch("/api/admin/calendar?limit=60", { credentials: "same-origin", headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const today = todayIndia();
        const ev = (d?.events || []).filter((e: any) => (e.status || "Published") === "Published").map((e: any) => ({ kind: "Event", title: e.title, date: String(e.event_date).slice(0, 10) }));
        const cl = (d?.holidays || []).filter((h: any) => (h.status || "Active") === "Active").map((h: any) => ({ kind: "Pool closed", title: h.name, date: String(h.holiday_date).slice(0, 10) }));
        setCalendar([...ev, ...cl].filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4));
      }).catch(() => setCalendar([]));
    if (isAdmin) {
      fetch("/api/admin/payments", { credentials: "same-origin", headers: headers() })
        .then((r) => (r.ok ? r.json() : null)).then((d) => { const v = Number(d?.summary?.todaysRevenue); setCollections(Number.isFinite(v) ? v : null); }).catch(() => setCollections(null));
    }
  }, [isAdmin]);

  const reg = (m: any) => m.registration_status || m.status;
  const toApprove = members.filter((m) => reg(m) !== "Approved" && reg(m) !== "Rejected");
  const unpaid = members.filter((m) => reg(m) === "Approved" && !m.endDate);
  const ending = members.filter((m) => m.membership_status === "Active" && (daysUntil(m.endDate) ?? 99) >= 0 && (daysUntil(m.endDate) ?? 99) <= 7);
  const active = members.filter((m) => m.membership_status === "Active").length;

  const sessions = useMemo(() => [...(batches || [])].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)), [batches]);
  const nowMin = (() => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":").map(Number); return p[0] * 60 + p[1]; })();
  const sunday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date()) === "Sun";

  const remind = async (m: any) => {
    if (!onSendPaymentLink) return;
    setReminding(m.membershipNo);
    try { await onSendPaymentLink(m.membershipNo, m.mobileNo); setReminded((r) => [...r, m.membershipNo]); } finally { setReminding(""); }
  };

  return (
    <div className="space-y-6 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}</p>
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">{greeting()}{userName ? `, ${userName.split(/\s+/)[0]}` : ""}</h2>
        </div>
        {isDesk && (
          <button type="button" onClick={onOpenAddMember} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white hover:bg-ink-800 cursor-pointer"><UserPlus className="h-4 w-4" />Register a member</button>
        )}
      </header>

      {/* Key numbers */}
      <div className={`grid gap-3 ${isAdmin ? "grid-cols-2 lg:grid-cols-4" : isCoach ? "grid-cols-2" : "grid-cols-3"}`}>
        {[
          { label: "Active members", value: String(active), icon: Users, tab: "members" },
          ...(isDesk ? [{ label: "To approve", value: String(toApprove.length), icon: ShieldCheck, tab: "registrations" }, { label: "Awaiting payment", value: String(unpaid.length), icon: IndianRupee, tab: "members" }] : [{ label: "Batches", value: batches ? String(batches.length) : "…", icon: Clock3, tab: "batches" }]),
          ...(isAdmin ? [{ label: "Collected today", value: collections === null ? "—" : rupees(collections), icon: IndianRupee, tab: "revenue" }] : [])
        ].map((k) => (
          <button key={k.label} type="button" onClick={() => onNavigate(k.tab)} className="rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card hover:border-ink-200 cursor-pointer">
            <k.icon className="h-5 w-5 text-aqua-600" />
            <p className="mt-3 text-2xl font-bold tabular-nums text-ink-950">{k.value}</p>
            <p className="text-sm text-ink-500">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* To do (desk) or my batches (coach) */}
        {isDesk ? (
          <Card title="To do">
            {toApprove.length + unpaid.length + ending.length === 0 ? (
              <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><CheckCircle2 className="h-5 w-5 text-emerald-500" />All caught up.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {toApprove.length > 0 && (
                  <li><button type="button" onClick={() => onNavigate("registrations")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-ink-50 cursor-pointer">
                    <ShieldCheck className="h-5 w-5 text-sky-600" /><span className="flex-1 text-sm"><b className="text-ink-950">{toApprove.length} application{toApprove.length === 1 ? "" : "s"}</b> <span className="text-ink-600">to approve</span></span><ChevronRight className="h-4 w-4 text-ink-300" />
                  </button></li>
                )}
                {unpaid.slice(0, 6).map((m) => (
                  <li key={m.membershipNo} className="flex items-center gap-3 px-5 py-3">
                    <IndianRupee className="h-5 w-5 shrink-0 text-violet-600" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-950">{m.fullName}</span><span className="block text-xs text-ink-500">Approved, not paid yet</span></span>
                    {onSendPaymentLink && (reminded.includes(m.membershipNo)
                      ? <span className="text-xs font-semibold text-emerald-700">Reminder sent</span>
                      : <button type="button" disabled={!!reminding} onClick={() => void remind(m)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60 cursor-pointer">
                          {reminding === m.membershipNo ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}Remind
                        </button>)}
                  </li>
                ))}
                {unpaid.length > 6 && <li><button type="button" onClick={() => onNavigate("members")} className="w-full px-5 py-3 text-left text-sm font-semibold text-aqua-600 cursor-pointer">+{unpaid.length - 6} more awaiting payment</button></li>}
                {ending.length > 0 && (
                  <li><button type="button" onClick={() => onNavigate("renewals")} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-ink-50 cursor-pointer">
                    <RefreshCw className="h-5 w-5 text-amber-600" /><span className="flex-1 text-sm"><b className="text-ink-950">{ending.length} membership{ending.length === 1 ? "" : "s"}</b> <span className="text-ink-600">ending within 7 days</span></span><ChevronRight className="h-4 w-4 text-ink-300" />
                  </button></li>
                )}
              </ul>
            )}
          </Card>
        ) : (
          <Card title="Batches and swimmers" action={<button type="button" onClick={() => onNavigate("batches")} className="text-sm font-semibold text-aqua-600 cursor-pointer">All batches</button>}>
            {batches === null ? <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading…</p> : (
              <ul className="divide-y divide-ink-100">
                {sessions.map((b) => {
                  const swimmers = members.filter((m) => Number(m.selected_batch_id) === b.id && m.membership_status === "Active");
                  return (
                    <li key={b.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-ink-950">{b.batchName}</span><span className="text-xs text-ink-500">{shortTime(b.startTime)} – {shortTime(b.endTime)} · {swimmers.length} swimmer{swimmers.length === 1 ? "" : "s"}</span></div>
                      {swimmers.length > 0 && <p className="mt-1 text-xs leading-5 text-ink-600">{swimmers.slice(0, 12).map((s) => s.fullName).join(", ")}{swimmers.length > 12 ? ` and ${swimmers.length - 12} more` : ""}</p>}
                    </li>
                  );
                })}
                {sessions.length === 0 && <li className="px-5 py-8 text-sm text-ink-500">No batches yet.</li>}
              </ul>
            )}
          </Card>
        )}

        {/* Today's pool sessions */}
        <Card title="Today at the pool">
          {sunday ? <p className="px-5 py-8 text-sm text-ink-500">The pool is closed on Sundays.</p> : batches === null ? <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading…</p> : (
            <ul className="divide-y divide-ink-100">
              {sessions.filter((b) => b.status === "OPEN" || b.activeMemberCount > 0).map((b) => {
                const start = toMinutes(b.startTime), end = toMinutes(b.endTime);
                const state = nowMin >= start && nowMin < end ? "Now" : nowMin >= end ? "Done" : "";
                return (
                  <li key={b.id} className={`flex items-center gap-3 px-5 py-3 ${state === "Done" ? "opacity-50" : ""}`}>
                    <span className="w-24 shrink-0 text-sm font-semibold tabular-nums text-ink-950">{shortTime(b.startTime)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{b.batchName}</span>
                    <span className="text-xs text-ink-500">{b.activeMemberCount}/{b.capacity}</span>
                    {state === "Now" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Now</span>}
                  </li>
                );
              })}
              {sessions.length === 0 && <li className="px-5 py-8 text-sm text-ink-500">No batches yet.</li>}
            </ul>
          )}
        </Card>

        {/* Coming up */}
        <Card title="Coming up" action={<button type="button" onClick={() => onNavigate("calendar")} className="text-sm font-semibold text-aqua-600 cursor-pointer">Calendar</button>}>
          {calendar.length === 0 ? <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><CalendarDays className="h-5 w-5 text-ink-300" />Nothing scheduled.</p> : (
            <ul className="divide-y divide-ink-100">
              {calendar.map((c, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-24 shrink-0 text-xs text-ink-500">{dateLabel(c.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-950">{c.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.kind === "Pool closed" ? "bg-rose-50 text-rose-700" : "bg-aqua-400/10 text-aqua-600"}`}>{c.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
