import React, { useMemo, useState } from "react";
import { FilterMenu } from "./FilterMenu";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowLeftRight, Check, CheckCircle2, ChevronRight, IndianRupee, LoaderCircle, MessageCircle, NotebookPen, Pause, Pencil, Phone, Play, RefreshCw,
  Search, Trash2, UserPlus, Users, X
} from "lucide-react";

// The member directory shared by admins, the front desk and coaches. Everyone sees the same list
// and member details; what they can do from the details sheet depends on their role:
// coaches look and keep notes; the front desk also approves, records cash, sends payment links,
// changes batches, edits details and pauses memberships; only admins can delete a member.

interface MembersTabProps {
  members: any[];
  getSessionToken: () => string;
  canManage: boolean;
  canDelete: boolean;
  onApprove: (membershipNo: string) => Promise<void> | void;
  onReject: (membershipNo: string) => void;
  onSendPaymentLink: (membershipNo: string, mobileNo?: string) => Promise<void> | void;
  onDelete: (membershipNo: string) => void;
  onRegister: () => void;
  onRenew: () => void;
  onChanged: () => void;
}

type Filter = "all" | "active" | "soon" | "ended" | "paused" | "approval" | "payment" | "rejected";
type SheetMode = "view" | "batch" | "edit" | "pause";

const DAY = 86_400_000;
function daysUntil(dateStr?: string | null) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const end = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / DAY);
}
function formatDate(dateStr?: string | null) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "Not set";
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function initials(name?: string) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// One status per member, from registration, payment and membership dates.
function stageOf(m: any): { key: Exclude<Filter, "all">; label: string; tone: string } {
  const reg = m.registration_status || m.status || "Pending";
  if (reg === "Rejected") return { key: "rejected", label: "Rejected", tone: "bg-ink-50 text-ink-500 ring-ink-200" };
  if (reg !== "Approved") return { key: "approval", label: "Awaiting approval", tone: "bg-sky-50 text-sky-700 ring-sky-200" };
  const days = daysUntil(m.endDate);
  if (days === null) return { key: "payment", label: "Awaiting payment", tone: "bg-violet-50 text-violet-700 ring-violet-200" };
  if (m.membership_status === "Suspended") return { key: "paused", label: m.pauseUntil ? `Paused until ${formatDate(m.pauseUntil)}` : "Paused", tone: "bg-slate-100 text-slate-700 ring-slate-300" };
  if (days < 0) return { key: "ended", label: `Ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`, tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (days <= 30) return { key: "soon", label: days === 0 ? "Ends today" : `Ends in ${days} day${days === 1 ? "" : "s"}`, tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  return { key: "active", label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
}

const FILTERS: Array<[Filter, string]> = [
  ["all", "All members"], ["active", "Active"], ["soon", "Ending soon"], ["ended", "Ended"], ["paused", "Paused"],
  ["approval", "Awaiting approval"], ["payment", "Awaiting payment"], ["rejected", "Rejected"]
];

function Avatar({ member, size }: { member: any; size: "sm" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  if (member.photoUrl) {
    return <img src={member.photoUrl} alt="" className={`${box} shrink-0 rounded-full object-cover ring-1 ring-ink-100`} />;
  }
  return <span className={`${box} flex shrink-0 items-center justify-center rounded-full bg-aqua-400/10 font-bold text-aqua-600`}>{initials(member.fullName)}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink-900 break-words">{children}</dd>
    </div>
  );
}

export function MembersTab({
  members, getSessionToken, canManage, canDelete,
  onApprove, onReject, onSendPaymentLink, onDelete, onRegister, onRenew, onChanged
}: MembersTabProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "approve" | "link" | "cash" | "save">("");
  const [mode, setMode] = useState<SheetMode>("view");
  const [batches, setBatches] = useState<any[] | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [pauseUntil, setPauseUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const rows = useMemo(() => members.map((m) => ({ ...m, stage: stageOf(m) })), [members]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, active: 0, soon: 0, ended: 0, paused: 0, approval: 0, payment: 0, rejected: 0 };
    rows.forEach((r) => {
      c[r.stage.key] += 1;
      if (r.stage.key !== "rejected") c.all += 1;
    });
    return c;
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "all" ? r.stage.key === "rejected" : r.stage.key !== filter) return false;
    if (!q) return true;
    return String(r.fullName || "").toLowerCase().includes(q)
      || String(r.membershipNo || "").toLowerCase().includes(q)
      || String(r.mobileNo || "").replace(/\s/g, "").includes(q.replace(/\s/g, ""));
  });

  const selected = rows.find((r) => r.membershipNo === selectedNo) || null;

  const open = (no: string) => {
    const m = rows.find((r) => r.membershipNo === no);
    setSelectedNo(no); setError(""); setConfirmDelete(false); setMode("view");
    setNotes(m?.coachNotes || ""); setNotesSaved(false);
  };
  const close = () => { if (!busy) { setSelectedNo(null); setConfirmDelete(false); setMode("view"); } };
  const back = () => { setMode("view"); setError(""); };

  // One request helper for the sheet's actions: sends the session token and reports errors inline.
  const send = async (url: string, method: string, body: any, success: string) => {
    setBusy("save"); setError("");
    try {
      const token = getSessionToken();
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "That didn't work. Please try again.");
      setDone(success); setMode("view"); setBatches(null); onChanged();
      return data;
    } catch (err: any) {
      setError(err.message || "That didn't work. Please try again.");
      return null;
    } finally {
      setBusy("");
    }
  };

  const openBatchPicker = () => {
    setMode("batch"); setError("");
    if (batches === null) {
      fetch("/api/batches").then((r) => (r.ok ? r.json() : [])).then((list) => setBatches(Array.isArray(list) ? list : [])).catch(() => setBatches([]));
    }
  };
  const openEdit = () => {
    if (!selected) return;
    setForm({
      fullName: selected.fullName || "", mobileNo: selected.mobileNo || "", email: selected.email || "",
      addressLine1: selected.addressLine1 || "", city: selected.city || "", pincode: selected.pincode || "",
      emergencyName: selected.emergencyName || "", emergencyRelation: selected.emergencyRelation || "",
      emergencyPhone: selected.emergencyPhone || selected.emergencyMobile || "",
      bloodGroup: selected.bloodGroup || "", medicalDetails: selected.hasMedicalCondition === "Yes" ? (selected.medicalDetails || "") : ""
    });
    setMode("edit"); setError("");
  };
  const saveNotes = async () => {
    if (!selected) return;
    setBusy("save"); setError(""); setNotesSaved(false);
    try {
      const token = getSessionToken();
      const res = await fetch(`/api/members/${encodeURIComponent(selected.membershipNo)}/coach-notes`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) }, body: JSON.stringify({ notes }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The notes could not be saved.");
      setNotesSaved(true); onChanged();
    } catch (err: any) {
      setError(err.message || "The notes could not be saved.");
    } finally {
      setBusy("");
    }
  };

  const run = async (kind: "approve" | "link", fn: () => Promise<void> | void) => {
    setBusy(kind);
    try { await fn(); } finally { setBusy(""); }
  };

  const recordCashPayment = async () => {
    if (!selected) return;
    setBusy("cash");
    setError("");
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/cash-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
        body: JSON.stringify({ membershipNo: selected.membershipNo, paymentType: "Registration" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The payment could not be recorded.");
      setDone(`₹${Number(data.amount || 0).toLocaleString("en-IN")} cash recorded for ${selected.fullName}. Membership runs until ${formatDate(data.membershipEndDate)}${data.invoiceNo ? ` · Invoice ${data.invoiceNo}` : ""}. The invoice is sent on WhatsApp.`);
      setSelectedNo(null);
      onChanged();
    } catch (err: any) {
      setError(err.message || "The payment could not be recorded.");
    } finally {
      setBusy("");
    }
  };

  const phone = String(selected?.mobileNo || "").replace(/[^\d+]/g, "");
  const waNumber = String(selected?.whatsappNumber || selected?.mobileNo || "").replace(/\D/g, "");
  const medical = selected
    ? selected.hasMedicalCondition === "Yes" ? (selected.medicalDetails || "Yes") : selected.hasMedicalCondition === "No" ? "None declared" : "Not recorded"
    : "";

  const field = "mt-1 min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30";
  const footer = "border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

  // The batch picker, edit form and pause form open inside the member sheet, with a Back link.
  const renderMode = () => {
    if (!selected) return null;
    const backLink = <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm font-semibold text-aqua-600 hover:text-aqua-500 cursor-pointer"><ArrowLeft className="h-4 w-4" />Back</button>;
    const errorBox = error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>;

    if (mode === "batch") {
      return (
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {backLink}
          <h4 className="text-base font-bold text-ink-950">Move to another batch</h4>
          <p className="text-sm text-ink-600">Now in: <span className="font-semibold text-ink-900">{selected.batchName || "No batch"}</span></p>
          {batches === null ? (
            <p className="flex items-center gap-2 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading batches…</p>
          ) : (
            <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {batches.map((b) => {
                const current = Number(selected.selected_batch_id) === Number(b.id);
                const left = Number(b.remaining_seats ?? Math.max(0, Number(b.capacity) - Number(b.current_strength || 0)));
                const unavailable = b.status === "CLOSED" || left <= 0;
                return (
                  <li key={b.id}>
                    <button type="button" disabled={current || unavailable || !!busy}
                      onClick={() => void send(`/api/members/change-batch/${encodeURIComponent(selected.membershipNo)}`, "POST", { batchId: b.id }, `${selected.fullName} moved to ${b.batch_name}.`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-950">{b.batch_name}</span><span className="block text-xs text-ink-500">{b.start_time} – {b.end_time}</span></span>
                      <span className="shrink-0 text-xs font-semibold text-ink-500">{current ? "Current" : b.status === "CLOSED" ? "Closed" : left <= 0 ? "Full" : `${left} seats left`}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {errorBox}
        </div>
      );
    }

    if (mode === "pause") {
      return (
        <>
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {backLink}
            <h4 className="text-base font-bold text-ink-950">Pause membership</h4>
            <p className="text-sm leading-6 text-ink-600">For medical leave or travel. {selected.fullName} keeps their batch seat, and when the pause ends their end date ({formatDate(selected.endDate)}) moves back by the number of paused days.</p>
            <label className="block text-sm font-medium text-ink-700">Coming back on (optional)
              <input type="date" min={today} value={pauseUntil} onChange={(e) => setPauseUntil(e.target.value)} className={field} />
              <span className="mt-1 block text-xs text-ink-500">If you set a date, the membership resumes on its own that day. Otherwise tap Resume when they're back.</span>
            </label>
            {errorBox}
          </div>
          <div className={footer}>
            <button type="button" disabled={!!busy} onClick={() => void send(`/api/members/${encodeURIComponent(selected.membershipNo)}/pause`, "POST", { pauseUntil: pauseUntil || null }, `${selected.fullName}'s membership is paused${pauseUntil ? ` until ${formatDate(pauseUntil)}` : ""}.`)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
              {busy === "save" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Pause className="h-5 w-5" />}Pause membership
            </button>
          </div>
        </>
      );
    }

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
    return (
      <>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {backLink}
          <h4 className="text-base font-bold text-ink-950">Edit details</h4>
          <label className="block text-sm font-medium text-ink-700">Full name<input value={form.fullName || ""} onChange={set("fullName")} className={field} /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink-700">Mobile<input inputMode="tel" value={form.mobileNo || ""} onChange={set("mobileNo")} className={field} /><span className="mt-1 block text-xs font-normal text-ink-500">The member signs in with this number.</span></label>
            <label className="block text-sm font-medium text-ink-700">Email<input type="email" value={form.email || ""} onChange={set("email")} className={field} /></label>
          </div>
          <label className="block text-sm font-medium text-ink-700">Address<input value={form.addressLine1 || ""} onChange={set("addressLine1")} className={field} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink-700">City<input value={form.city || ""} onChange={set("city")} className={field} /></label>
            <label className="block text-sm font-medium text-ink-700">PIN code<input inputMode="numeric" value={form.pincode || ""} onChange={set("pincode")} className={field} /></label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink-700">Emergency contact<input value={form.emergencyName || ""} onChange={set("emergencyName")} className={field} /></label>
            <label className="block text-sm font-medium text-ink-700">Their phone<input inputMode="tel" value={form.emergencyPhone || ""} onChange={set("emergencyPhone")} className={field} /></label>
          </div>
          <label className="block text-sm font-medium text-ink-700">Relationship<input value={form.emergencyRelation || ""} onChange={set("emergencyRelation")} placeholder="e.g. Father" className={field} /></label>
          <label className="block text-sm font-medium text-ink-700">Blood group
            <select value={form.bloodGroup || ""} onChange={set("bloodGroup")} className={field}>
              <option value="">Not known</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink-700">Medical conditions
            <textarea rows={2} value={form.medicalDetails || ""} onChange={set("medicalDetails")} placeholder="Leave empty if none" className={`${field} py-2.5`} />
          </label>
          {errorBox}
        </div>
        <div className={footer}>
          <button type="button" disabled={!!busy} onClick={() => void send(`/api/members/${encodeURIComponent(selected.membershipNo)}/details`, "PUT", form, `${form.fullName || selected.fullName}'s details are saved.`)}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
            {busy === "save" && <LoaderCircle className="h-5 w-5 animate-spin" />}Save details
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">Members</h2>
          <p className="mt-1 text-sm text-ink-600">Everyone registered at the academy. Tap a member to see their details{canManage ? " and what's next for them" : ""}.</p>
        </div>
        {canManage && (
          <button type="button" onClick={onRegister}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white hover:bg-ink-800 cursor-pointer">
            <UserPlus className="h-4 w-4" /> Register a member
          </button>
        )}
      </header>

      {done && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 font-semibold">{done}</p>
          <button type="button" onClick={() => setDone("")} aria-label="Dismiss" className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={query} aria-label="Search by name, membership number or phone" onChange={(e) => setQuery(e.target.value)} placeholder="Search members"
              className="min-h-11 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder-ink-400 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30" />
          </label>
          <FilterMenu label="Filter members" value={filter} onChange={setFilter}
            options={FILTERS.map(([id, label]) => ({ id, label, count: counts[id] }))} />
        </div>
        {filter !== "all" && (
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5 text-sm">
            <span className="text-ink-600">Showing <span className="font-semibold text-ink-900">{FILTERS.find(([id]) => id === filter)?.[1]}</span> · {visible.length}</span>
            <button type="button" onClick={() => setFilter("all")} className="font-semibold text-aqua-600 hover:text-aqua-500 cursor-pointer">Clear filter</button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-6 w-6 text-ink-300" />
            <p className="mt-3 text-sm font-semibold text-ink-800">{members.length === 0 ? "No members yet" : "No members match"}</p>
            <p className="mt-1 text-sm text-ink-500">{members.length === 0 ? "Members appear here once they register." : "Try another search or filter."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-b-2xl">
            {visible.map((m) => (
              <li key={m.membershipNo}>
                <button type="button" onClick={() => open(m.membershipNo)}
                  className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-ink-50 cursor-pointer sm:px-5">
                  <Avatar member={m} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink-950">{m.fullName}</span>
                    <span className="block truncate text-xs text-ink-500">{m.membershipNo}{m.typeOfMembership ? ` · ${m.typeOfMembership}` : ""}</span>
                  </span>
                  <span className="hidden min-w-0 max-w-[14rem] shrink text-right md:block">
                    <span className="block text-xs text-ink-400">Batch</span>
                    <span className="block truncate text-sm font-semibold text-ink-800">{m.batchName || "Not assigned"}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${m.stage.tone}`}>{m.stage.label}</span>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-300 sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Member sheet: a bottom sheet on phones, a centred dialog on computers. */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={selected.fullName}>
            <motion.button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-ink-950/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
              <div className="flex items-start gap-4 border-b border-ink-100 p-6 pb-5">
                <Avatar member={selected} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl font-bold text-ink-950">{selected.fullName}</h3>
                  <p className="text-sm text-ink-500">{selected.membershipNo}</p>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${selected.stage.tone}`}>{selected.stage.label}</span>
                </div>
                <button type="button" onClick={close} disabled={!!busy} aria-label="Close" className="rounded-xl p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-700 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>

              {mode !== "view" ? renderMode() : (<>
              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {(phone || waNumber) && (
                  <div className="grid grid-cols-2 gap-2">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    )}
                    {waNumber && (
                      <a href={`https://wa.me/${waNumber.length === 10 ? `91${waNumber}` : waNumber}`} target="_blank" rel="noreferrer"
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                )}

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Membership</h4>
                  <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                    <Row label="Plan">{selected.typeOfMembership || "Not set"}</Row>
                    <Row label="Batch">{selected.batchName || "Not assigned"}</Row>
                    <Row label="Start date">{formatDate(selected.startDate)}</Row>
                    <Row label="End date">{formatDate(selected.endDate)}</Row>
                  </dl>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Contact</h4>
                  <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                    <Row label="Mobile">{selected.mobileNo || "Not given"}</Row>
                    <Row label="Email">{selected.email || "Not given"}</Row>
                    {selected.parentName && <Row label="Parent">{selected.parentName}</Row>}
                    <Row label="Emergency contact">
                      {selected.emergencyName || "Not given"}
                      {(selected.emergencyPhone || selected.emergencyMobile) && <span className="block font-normal text-ink-500">{selected.emergencyPhone || selected.emergencyMobile}</span>}
                    </Row>
                  </dl>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Health</h4>
                  <dl className="divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                    <Row label="Blood group">{selected.bloodGroup || "Not given"}</Row>
                    <Row label="Medical conditions">{medical}</Row>
                  </dl>
                </section>

                {selected.stage.key === "rejected" && selected.remarks && (
                  <p className="rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-600"><span className="font-semibold text-ink-800">Reason: </span>{selected.remarks}</p>
                )}

                {selected.stage.key === "paused" && selected.pausedOn && (
                  <p className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700">Paused since {formatDate(selected.pausedOn)}{selected.pauseUntil ? `, back on ${formatDate(selected.pauseUntil)}` : ""}. The end date moves back by the paused days when it resumes.</p>
                )}

                {selected.stage.key !== "rejected" && (
                  <section>
                    <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400"><NotebookPen className="h-3.5 w-3.5" />Coach notes</h4>
                    <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }} rows={3} maxLength={2000}
                      placeholder="e.g. Needs work on breathing. Ready for the next level."
                      className="w-full rounded-2xl border border-ink-200 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30" />
                    {notes !== (selected.coachNotes || "") ? (
                      <button type="button" disabled={!!busy} onClick={() => void saveNotes()} className="mt-2 min-h-10 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60 cursor-pointer">{busy === "save" ? "Saving…" : "Save notes"}</button>
                    ) : notesSaved ? <p className="mt-1.5 text-xs font-semibold text-emerald-700">Notes saved.</p> : null}
                  </section>
                )}

                {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
              </div>

              {(canManage || canDelete) && (
                <div className="space-y-2 border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
                  {canManage && selected.stage.key === "approval" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={!!busy} onClick={() => { const no = selected.membershipNo; setSelectedNo(null); onReject(no); }}
                        className="min-h-12 rounded-2xl border border-ink-200 text-[15px] font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60 cursor-pointer">
                        Reject
                      </button>
                      <button type="button" disabled={!!busy} onClick={() => void run("approve", () => onApprove(selected.membershipNo))}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
                        {busy === "approve" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Approve
                      </button>
                    </div>
                  )}
                  {canManage && selected.stage.key === "approval" && (
                    <p className="text-center text-xs text-ink-500">Approving sends the member a payment link on WhatsApp.</p>
                  )}

                  {canManage && selected.stage.key === "payment" && (
                    <>
                      <button type="button" disabled={!!busy} onClick={() => void recordCashPayment()}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
                        {busy === "cash" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
                        {busy === "cash" ? "Recording…" : "Cash received – record payment"}
                      </button>
                      <button type="button" disabled={!!busy} onClick={() => void run("link", () => onSendPaymentLink(selected.membershipNo, selected.mobileNo))}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 text-[15px] font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60 cursor-pointer">
                        {busy === "link" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />} Send payment link again
                      </button>
                    </>
                  )}

                  {canManage && (selected.stage.key === "active" || selected.stage.key === "soon" || selected.stage.key === "ended") && (
                    <button type="button" onClick={() => { setSelectedNo(null); onRenew(); }}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 cursor-pointer">
                      <RefreshCw className="h-5 w-5" /> Renew membership
                    </button>
                  )}

                  {canManage && selected.stage.key !== "rejected" && (
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={openBatchPicker} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-ink-200 px-1 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 cursor-pointer"><ArrowLeftRight className="h-4 w-4" />Change batch</button>
                      <button type="button" onClick={openEdit} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-ink-200 px-1 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 cursor-pointer"><Pencil className="h-4 w-4" />Edit details</button>
                      {selected.stage.key === "paused" ? (
                        <button type="button" disabled={!!busy} onClick={() => void send(`/api/members/${encodeURIComponent(selected.membershipNo)}/resume`, "POST", {}, `${selected.fullName}'s membership is active again.`).then((d) => d && setDone(`${selected.fullName}'s membership is active again. ${d.pausedDays} paused day${d.pausedDays === 1 ? " was" : "s were"} added to the end date.`))}
                          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-200 px-1 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 cursor-pointer"><Play className="h-4 w-4" />Resume</button>
                      ) : (
                        <button type="button" disabled={!["active", "soon"].includes(selected.stage.key)} onClick={() => { setPauseUntil(""); setMode("pause"); setError(""); }}
                          title={["active", "soon"].includes(selected.stage.key) ? "Pause this membership" : "Only an active membership can be paused"}
                          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border border-ink-200 px-1 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40 cursor-pointer"><Pause className="h-4 w-4" />Pause</button>
                      )}
                    </div>
                  )}

                  {canDelete && (confirmDelete ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-sm text-rose-800">Delete {selected.fullName} and their records? This can't be undone.</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 rounded-xl bg-white text-sm font-semibold text-ink-700 ring-1 ring-ink-200 cursor-pointer">Keep</button>
                        <button type="button" onClick={() => { const no = selected.membershipNo; setSelectedNo(null); setConfirmDelete(false); onDelete(no); }}
                          className="min-h-10 rounded-xl bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 cursor-pointer">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(true)}
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer">
                      <Trash2 className="h-4 w-4" /> Delete member
                    </button>
                  ))}
                </div>
              )}
              </>)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
