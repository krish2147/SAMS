import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { FESTIVALS } from "../member-dashboard/festivals";

// The academy calendar, shared with members: events and pool closures are stored on the server
// (/api/admin/calendar), so what an admin adds here is what members see in their app. Admins add,
// edit, cancel and delete; reception and coaches view. Festivals are shown for reference only.

interface CalendarTabProps {
  isSwim?: boolean;
  userRole?: string;
  getSessionToken?: () => string;
}

type Kind = "event" | "closure";
interface Item {
  kind: Kind; id: number; title: string; date: string; endDate: string; startTime?: string; endTime?: string;
  location?: string; description?: string; status: string; applicableTo: string; batchIds: string[]; raw: any;
}

const ymd = (v: any) => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v); return isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};
const ids = (v: any): string[] => { try { const p = JSON.parse(String(v || "[]")); return Array.isArray(p) ? p.map(String) : []; } catch { return []; } };
const time12 = (t?: string) => { const m = String(t || "").match(/^(\d{1,2}):(\d{2})/); if (!m) return ""; const h = Number(m[1]); return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`; };
const niceDate = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); };
const todayIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

function toItems(data: any): Item[] {
  const events = (data?.events || []).map((e: any): Item => ({
    kind: "event", id: Number(e.id), title: e.title, date: ymd(e.event_date), endDate: ymd(e.event_date), startTime: e.start_time, endTime: e.end_time,
    location: e.location || "", description: e.description || "", status: e.status || "Published", applicableTo: e.applicable_to || "All Members", batchIds: ids(e.applicable_batch_ids), raw: e
  }));
  const closures = (data?.holidays || []).map((h: any): Item => ({
    kind: "closure", id: Number(h.id), title: h.name, date: ymd(h.holiday_date), endDate: ymd(h.end_date || h.holiday_date),
    description: h.announcement_message || h.description || "", status: h.status || "Active", applicableTo: h.applicable_to || "All Members", batchIds: ids(h.applicable_batch_ids), raw: h
  }));
  return [...events, ...closures].filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date));
}

export function CalendarTab({ userRole = "admin", getSessionToken }: CalendarTabProps) {
  const canEdit = userRole === "admin" || userRole === "super_admin";
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => { const t = todayIndia(); return t.slice(0, 7); });
  const [selectedDay, setSelectedDay] = useState("");
  const [form, setForm] = useState<null | { kind: Kind; item?: Item }>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const today = todayIndia();

  const headers = useCallback((json = false): Record<string, string> => {
    const token = getSessionToken?.() || "";
    return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { "x-session-token": token } : {}) };
  }, [getSessionToken]);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/calendar?limit=200", { credentials: "same-origin", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The calendar could not be loaded.");
      setItems(toItems(data));
    } catch (e: any) { setItems([]); setError(e.message || "The calendar could not be loaded."); }
  }, [headers]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { fetch("/api/batches").then((r) => (r.ok ? r.json() : [])).then((b) => setBatches(Array.isArray(b) ? b : [])).catch(() => setBatches([])); }, []);

  // Month grid
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const shiftMonth = (delta: number) => { const d = new Date(y, m - 1 + delta, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); setSelectedDay(""); };

  const live = (items || []).filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
  const on = (day: string, list: Item[]) => list.filter((i) => i.date <= day && day <= i.endDate);
  const festivalsOn = (day: string) => FESTIVALS.filter((f) => f.date <= day && day <= (f.endDate || f.date));
  const monthItems = useMemo(() => (items || []).filter((i) => i.date.slice(0, 7) <= month && i.endDate.slice(0, 7) >= month), [items, month]);
  const listed = selectedDay ? (items || []).filter((i) => i.date <= selectedDay && selectedDay <= i.endDate) : monthItems;
  const monthName = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">Calendar</h2>
          <p className="mt-1 text-sm text-ink-600">Events and pool closures. Members see these in their app.{canEdit ? "" : " Only admins can add or change them."}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ kind: "closure" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50 cursor-pointer"><Plus className="h-4 w-4" />Pool closure</button>
            <button type="button" onClick={() => setForm({ kind: "event" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white hover:bg-ink-800 cursor-pointer"><Plus className="h-4 w-4" />Event</button>
          </div>
        )}
      </header>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink-950">{monthName}</h3>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => { setMonth(today.slice(0, 7)); setSelectedDay(""); }} className="min-h-10 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50 cursor-pointer">Today</button>
              <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 hover:bg-ink-50 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-400">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d}>{d}</span>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`b${i}`} />;
              const closed = on(day, live.filter((x) => x.kind === "closure")).length > 0;
              const ev = on(day, live.filter((x) => x.kind === "event")).length > 0;
              const fest = festivalsOn(day).length > 0;
              const sel = selectedDay === day;
              return (
                <button key={day} type="button" onClick={() => setSelectedDay(sel ? "" : day)} aria-pressed={sel}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm cursor-pointer ${sel ? "bg-ink-950 text-white" : closed ? "bg-rose-50 text-rose-700" : day === today ? "ring-2 ring-aqua-400 text-ink-950" : "text-ink-800 hover:bg-ink-50"}`}>
                  <span className="font-semibold">{Number(day.slice(8))}</span>
                  <span className="mt-0.5 flex h-1.5 gap-0.5">{ev && <span className="h-1.5 w-1.5 rounded-full bg-aqua-500" />}{fest && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rose-100 ring-1 ring-rose-300" />Pool closed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-aqua-500" />Event</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Festival</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-base font-bold text-ink-950">{selectedDay ? niceDate(selectedDay) : `This month`}</h3>
            {selectedDay && <button type="button" onClick={() => setSelectedDay("")} className="text-sm font-semibold text-aqua-600 cursor-pointer">Show month</button>}
          </div>
          {items === null ? (
            <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading…</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {(selectedDay ? festivalsOn(selectedDay) : FESTIVALS.filter((f) => f.date.slice(0, 7) === month)).map((f) => (
                <li key={`f-${f.name}-${f.date}`} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-20 shrink-0 text-xs text-ink-500">{niceDate(f.date).slice(0, -5)}</span>
                  <span className="flex-1 text-ink-700">{f.name}</span><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Festival</span>
                </li>
              ))}
              {listed.map((i) => (
                <li key={`${i.kind}-${i.id}`}>
                  <button type="button" disabled={!canEdit} onClick={() => setForm({ kind: i.kind, item: i })} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-ink-50 disabled:cursor-default disabled:hover:bg-transparent cursor-pointer">
                    <span className="w-20 shrink-0 pt-0.5 text-xs text-ink-500">{niceDate(i.date).slice(0, -5)}{i.endDate !== i.date ? ` – ${Number(i.endDate.slice(8))}` : ""}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${i.status === "Cancelled" ? "text-ink-400 line-through" : "text-ink-950"}`}>{i.title}</span>
                      <span className="block text-xs text-ink-500">
                        {i.kind === "event" ? [time12(i.startTime) && `${time12(i.startTime)} – ${time12(i.endTime)}`, i.location].filter(Boolean).join(" · ") : "Pool closed"}
                        {i.applicableTo === "Selected Batches" ? " · Some batches" : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${i.status === "Cancelled" ? "bg-ink-50 text-ink-500" : i.status === "Draft" ? "bg-slate-100 text-slate-600" : i.kind === "closure" ? "bg-rose-50 text-rose-700" : "bg-aqua-400/10 text-aqua-600"}`}>
                      {i.status === "Cancelled" ? "Cancelled" : i.status === "Draft" ? "Draft" : i.kind === "closure" ? "Closure" : "Event"}
                    </span>
                  </button>
                </li>
              ))}
              {listed.length === 0 && (selectedDay ? festivalsOn(selectedDay) : FESTIVALS.filter((f) => f.date.slice(0, 7) === month)).length === 0 && (
                <li className="px-5 py-10 text-center"><CalendarDays className="mx-auto h-6 w-6 text-ink-300" /><p className="mt-2 text-sm text-ink-500">Nothing on {selectedDay ? "this day" : "the calendar this month"}.</p></li>
              )}
            </ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {form && <ItemForm kind={form.kind} item={form.item} batches={batches} headers={headers} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load(); }} />}
      </AnimatePresence>
    </div>
  );
}

function ItemForm({ kind, item, batches, headers, onClose, onSaved }: { kind: Kind; item?: Item; batches: any[]; headers: (json?: boolean) => Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || "");
  const [date, setDate] = useState(item?.date || todayIndia());
  const [endDate, setEndDate] = useState(item && item.endDate !== item.date ? item.endDate : "");
  const [start, setStart] = useState(String(item?.startTime || "07:00").slice(0, 5));
  const [end, setEnd] = useState(String(item?.endTime || "08:00").slice(0, 5));
  const [location, setLocation] = useState(item?.location || "Main pool");
  const [description, setDescription] = useState(item?.description || "");
  const [audience, setAudience] = useState(item?.applicableTo === "Selected Batches" ? "batches" : "all");
  const [chosen, setChosen] = useState<string[]>(item?.batchIds || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = kind === "event" ? "/api/admin/events" : "/api/admin/holidays";

  const send = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, { method, credentials: "same-origin", headers: headers(Boolean(body)), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "That didn't work. Please try again.");
    return data;
  };

  const save = async () => {
    if (!title.trim()) return setError(kind === "event" ? "Enter a title." : "Enter a reason, for example Diwali or Maintenance.");
    if (kind === "event" && start >= end) return setError("The start time must be before the end time.");
    if (audience === "batches" && chosen.length === 0) return setError("Choose at least one batch.");
    setBusy(true); setError("");
    const target = { applicable_to: audience === "batches" ? "Selected Batches" : "All Members", applicable_batch_ids: audience === "batches" ? chosen : [] };
    const body = kind === "event"
      ? { title: title.trim(), event_date: date, start_time: `${start}:00`, end_time: `${end}:00`, location, description, event_type: "Event", status: "Published", ...target }
      : { name: title.trim(), holiday_date: date, end_date: endDate || null, announcement_message: description, description, status: "Active", facility_closed: true, ...target };
    try {
      await send(item ? `${base}/${item.id}` : base, item ? "PUT" : "POST", body);
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!item) return;
    setBusy(true); setError("");
    try {
      // The server only deletes cancelled items, so cancel first.
      if (item.status !== "Cancelled") await send(`${base}/${item.id}`, "PUT", kind === "event" ? { status: "Cancelled" } : { status: "Cancelled" });
      await send(`${base}/${item.id}`, "DELETE");
      onSaved();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const field = "mt-1.5 min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30";
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={kind === "event" ? "Event" : "Pool closure"}>
      <motion.button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
        <div className="flex items-start justify-between border-b border-ink-100 p-6 pb-4">
          <div><p className="text-sm text-ink-500">{item ? "Edit" : "Add"}</p><h3 className="text-xl font-bold text-ink-950">{kind === "event" ? "Event" : "Pool closure"}</h3></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-ink-400 hover:bg-ink-50 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <label className="block text-sm font-medium text-ink-700">{kind === "event" ? "Title" : "Reason"}<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "event" ? "e.g. Diwali Splash Gala" : "e.g. Diwali, pool maintenance"} className={field} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink-700">{kind === "event" ? "Date" : "From"}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
            {kind === "closure" ? (
              <label className="block text-sm font-medium text-ink-700">Until (optional)<input type="date" min={date} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} /></label>
            ) : (
              <label className="block text-sm font-medium text-ink-700">Place<input value={location} onChange={(e) => setLocation(e.target.value)} className={field} /></label>
            )}
          </div>
          {kind === "event" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-ink-700">Starts<input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} /></label>
              <label className="block text-sm font-medium text-ink-700">Ends<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></label>
            </div>
          )}
          <label className="block text-sm font-medium text-ink-700">{kind === "event" ? "Details" : "Message to members"}<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} py-2.5`} /></label>
          <div>
            <span className="block text-sm font-medium text-ink-700">Who is it for?</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[["all", "All members"], ["batches", "Some batches"]].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={audience === v} onClick={() => setAudience(v)} className={`min-h-11 rounded-xl border text-sm font-semibold cursor-pointer ${audience === v ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>{l}</button>
              ))}
            </div>
            {audience === "batches" && (
              <div className="mt-2 space-y-1.5">
                {batches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2.5 rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-800">
                    <input type="checkbox" checked={chosen.includes(String(b.id))} onChange={(e) => setChosen((c) => e.target.checked ? [...c, String(b.id)] : c.filter((x) => x !== String(b.id)))} className="h-4 w-4 accent-ink-900" />
                    {b.batch_name}
                  </label>
                ))}
              </div>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          {item && <button type="button" disabled={busy} onClick={() => void remove()} aria-label="Delete" className="flex min-h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="h-5 w-5" /></button>}
          <button type="button" disabled={busy} onClick={() => void save()} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
            {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}{item ? "Save" : kind === "event" ? "Add event" : "Add closure"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

