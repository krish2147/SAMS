import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, ChevronRight, Clock3, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Users, X } from "lucide-react";

// Batch Management: the academy's real batches from the database, with live active-member counts.
// Everyone on the team can see batches and who is in them; only admins create, edit or delete.

export interface OperationalBatchCard { id: number; batchName: string; startTime: string; endTime: string; capacity: number; status: "OPEN" | "CLOSED"; activeMemberCount: number; availableSeats: number; }

interface Props {
  isSwim: boolean;
  getSessionToken: () => string;
  /** Members of this academy, to list who is in each batch. */
  members?: any[];
  /** Admins can create, edit and delete batches; everyone else only views. */
  canManage?: boolean;
}

type FormState = { batchName: string; startTime: string; endTime: string; capacity: string; status: "OPEN" | "CLOSED" };

function displayTime(value: string) {
  if (!value) return "Not set";
  if (/\b(?:AM|PM)\b/i.test(value)) return value.replace(/^0(\d):/, "$1:");
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
function inputTime(value: string) {
  const raw = String(value || "").trim().toUpperCase();
  const twelve = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
  if (twelve) { const hour = Number(twelve[1]) % 12 + (twelve[3] === "PM" ? 12 : 0); return `${String(hour).padStart(2, "0")}:${twelve[2]}`; }
  const full = raw.match(/^(\d{1,2}):(\d{2})/);
  return full ? `${full[1].padStart(2, "0")}:${full[2]}` : "";
}
const sortKey = (batch: OperationalBatchCard) => inputTime(batch.startTime) || "99:99";
function apiError(data: any, fallback: string) { return typeof data?.error === "string" ? data.error : data?.error?.message || fallback; }
function initials(name?: string) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase(); }

function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={label}>
      <motion.button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
        {children}
      </motion.div>
    </div>
  );
}

function SheetHeader({ eyebrow, title, subtitle, onClose }: { eyebrow: string; title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-6 pb-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-500">{eyebrow}</p>
        <h3 className="mt-0.5 truncate text-xl font-bold text-ink-950">{title}</h3>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-700 cursor-pointer"><X className="h-5 w-5" /></button>
    </div>
  );
}

function BatchForm({ batch, token, onClose, onSaved }: { batch?: OperationalBatchCard; token: string; onClose: () => void; onSaved: (batch: OperationalBatchCard) => void }) {
  const firstInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({ batchName: batch?.batchName || "", startTime: inputTime(batch?.startTime || ""), endTime: inputTime(batch?.endTime || ""), capacity: batch ? String(batch.capacity) : "", status: batch?.status || "OPEN" });
  const [error, setError] = useState("");
  const [overlapWarning, setOverlapWarning] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { firstInput.current?.focus(); }, []);
  const change = (field: keyof FormState, value: string) => { setForm((previous) => ({ ...previous, [field]: value })); setError(""); setOverlapWarning(""); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const capacity = Number(form.capacity);
    if (!form.batchName.trim()) return setError("Enter a batch name.");
    if (!form.startTime || !form.endTime) return setError("Enter a start and end time.");
    if (form.startTime >= form.endTime) return setError("The start time must be before the end time.");
    if (!Number.isInteger(capacity) || capacity <= 0) return setError("Capacity must be a whole number above 0.");
    if (batch && capacity < batch.activeMemberCount) return setError(`Capacity can't be lower than the ${batch.activeMemberCount} active members in this batch.`);
    setSaving(true); setError("");
    try {
      const response = await fetch(batch ? `/api/batches/${batch.id}` : "/api/batches", {
        method: batch ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
        body: JSON.stringify({ ...form, capacity, confirmOverlap:Boolean(overlapWarning) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        if (data.code === "BATCH_TIME_OVERLAP") { setOverlapWarning(apiError(data, "This time overlaps with another batch.")); return; }
        throw new Error(apiError(data, "The batch could not be saved."));
      }
      onSaved(data.batch);
    } catch (requestError: any) {
      setError(requestError?.message || "The batch could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const input = "mt-1.5 min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30";
  return (
    <Sheet label={batch ? "Edit batch" : "Add a batch"} onClose={onClose}>
      <SheetHeader eyebrow="Batch Management" title={batch ? "Edit batch" : "Add a batch"} onClose={onClose} />
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <label className="block text-sm font-medium text-ink-700">Batch name<input ref={firstInput} maxLength={100} value={form.batchName} onChange={(e) => change("batchName", e.target.value)} placeholder="e.g. Morning Batch 1" className={input} required /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink-700">Starts<input type="time" value={form.startTime} onChange={(e) => change("startTime", e.target.value)} className={input} required /></label>
            <label className="block text-sm font-medium text-ink-700">Ends<input type="time" value={form.endTime} onChange={(e) => change("endTime", e.target.value)} className={input} required /></label>
          </div>
          <label className="block text-sm font-medium text-ink-700">Capacity (swimmers)<input type="number" min="1" step="1" inputMode="numeric" value={form.capacity} onChange={(e) => change("capacity", e.target.value)} className={input} required />
            {batch && <span className="mt-1.5 block text-xs text-ink-500">{batch.activeMemberCount} active members are in this batch now.</span>}
          </label>
          <div>
            <span className="block text-sm font-medium text-ink-700">Taking new members?</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["OPEN", "CLOSED"] as const).map((value) => (
                <button key={value} type="button" onClick={() => change("status", value)} aria-pressed={form.status === value}
                  className={`min-h-11 rounded-xl border text-sm font-semibold cursor-pointer ${form.status === value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"}`}>
                  {value === "OPEN" ? "Open" : "Closed"}
                </button>
              ))}
            </div>
          </div>
          {overlapWarning && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900"><p className="font-semibold">{overlapWarning}</p><p className="mt-0.5">Save again if you want both batches at this time.</p></div>}
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-ink-200 text-[15px] font-semibold text-ink-800 hover:bg-ink-50 cursor-pointer">Cancel</button>
          <button disabled={saving} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
            {saving && <LoaderCircle className="h-5 w-5 animate-spin" />}{saving ? "Saving…" : overlapWarning ? "Save anyway" : batch ? "Save changes" : "Add batch"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function DeleteConfirmation({ batch, token, onClose, onDeleted }: { batch: OperationalBatchCard; token: string; onClose: () => void; onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const remove = async () => {
    if (confirmation!=="DELETE") return setError("Type DELETE to confirm.");
    setDeleting(true); setError("");
    try {
      const response = await fetch(`/api/batches/${batch.id}`, { method: "DELETE", headers: token ? { "x-session-token": token } : {} });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(apiError(data, "The batch could not be deleted."));
      onDeleted();
    } catch (requestError: any) {
      setError(requestError?.message || "The batch could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Sheet label={`Delete ${batch.batchName}`} onClose={onClose}>
      <SheetHeader eyebrow="Delete batch" title={batch.batchName} subtitle={`${displayTime(batch.startTime)} – ${displayTime(batch.endTime)}`} onClose={onClose} />
      <div className="space-y-3 p-6">
        <p className="text-sm leading-6 text-ink-600">This removes the batch for good. A batch that still has members can't be deleted; move them to another batch first.</p>
        <label className="block text-sm font-medium text-ink-700">Type DELETE to confirm
          <input autoFocus value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setError(""); }} className="mt-1.5 min-h-11 w-full rounded-xl border border-ink-200 px-3.5 text-[15px] outline-none focus:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-200" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-ink-200 text-[15px] font-semibold text-ink-800 hover:bg-ink-50 cursor-pointer">Keep</button>
        <button type="button" onClick={() => void remove()} disabled={deleting || confirmation !== "DELETE"} className="min-h-12 rounded-2xl bg-rose-600 text-[15px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">{deleting ? "Deleting…" : "Delete batch"}</button>
      </div>
    </Sheet>
  );
}

function memberChip(m: any) {
  const reg = m.registration_status || m.status;
  if (reg === "Rejected") return { label: "Rejected", tone: "bg-ink-50 text-ink-500 ring-ink-200" };
  if (reg !== "Approved") return { label: "Awaiting approval", tone: "bg-sky-50 text-sky-700 ring-sky-200" };
  if (m.membership_status === "Active") return { label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (!m.endDate) return { label: "Awaiting payment", tone: "bg-violet-50 text-violet-700 ring-violet-200" };
  return { label: "Not active", tone: "bg-ink-50 text-ink-500 ring-ink-200" };
}

function BatchDetails({ batch, members, canManage, onClose, onEdit, onDelete }: { batch: OperationalBatchCard; members: any[]; canManage: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const inBatch = members
    .filter((m) => Number(m.selected_batch_id) === batch.id && (m.registration_status || m.status) !== "Rejected")
    .sort((a, b) => Number(b.membership_status === "Active") - Number(a.membership_status === "Active") || String(a.fullName).localeCompare(String(b.fullName)));
  const full = batch.activeMemberCount >= batch.capacity;
  return (
    <Sheet label={batch.batchName} onClose={onClose}>
      <SheetHeader eyebrow="Batch" title={batch.batchName} subtitle={`${displayTime(batch.startTime)} – ${displayTime(batch.endTime)}`} onClose={onClose} />
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[["Capacity", batch.capacity], ["Active", batch.activeMemberCount], ["Seats left", batch.availableSeats]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-ink-100 p-3"><dt className="text-xs text-ink-500">{label}</dt><dd className="mt-0.5 text-xl font-bold text-ink-950">{value}</dd></div>
          ))}
        </dl>
        <p className="text-sm text-ink-600">
          {batch.status === "CLOSED" ? "Closed to new members." : full ? "Full. New members can't choose this batch until a seat frees up." : "Open to new members."}
        </p>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Members ({inBatch.length})</h4>
          {inBatch.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">No members in this batch yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {inBatch.map((m) => {
                const chip = memberChip(m);
                return (
                  <li key={m.membershipNo} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aqua-400/10 text-xs font-bold text-aqua-600">{initials(m.fullName)}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-950">{m.fullName}</span><span className="block truncate text-xs text-ink-500">{m.membershipNo}</span></span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${chip.tone}`}>{chip.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      {canManage && (
        <div className="flex gap-2 border-t border-ink-100 p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          <button type="button" onClick={onDelete} aria-label="Delete batch" className="flex min-h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="h-5 w-5" /></button>
          <button type="button" onClick={onEdit} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 cursor-pointer"><Pencil className="h-4 w-4" />Edit batch</button>
        </div>
      )}
    </Sheet>
  );
}

export function BatchManagementTab({ getSessionToken, members = [], canManage = false }: Props) {
  const [batches, setBatches] = useState<OperationalBatchCard[]>([]);
  const [selected, setSelected] = useState<OperationalBatchCard | null>(null);
  const [formBatch, setFormBatch] = useState<OperationalBatchCard | "create" | null>(null);
  const [deleteBatch, setDeleteBatch] = useState<OperationalBatchCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const getSessionTokenRef = useRef(getSessionToken);
  useEffect(() => { getSessionTokenRef.current = getSessionToken; }, [getSessionToken]);

  const loadBatches = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getSessionTokenRef.current();
      const response = await fetch("/api/admin/batches/operations", { headers: token ? { "x-session-token": token } : {} });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !Array.isArray(data.batches)) throw new Error(apiError(data, "Batches could not be loaded."));
      setBatches([...data.batches].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.id - b.id));
    } catch (requestError: any) {
      setBatches([]); setError(requestError?.message || "Batches could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void loadBatches(); }, [loadBatches]);
  useEffect(() => {
    const refresh = () => void loadBatches();
    window.addEventListener("sams_batch_assignment_changed", refresh);
    return () => window.removeEventListener("sams_batch_assignment_changed", refresh);
  }, [loadBatches]);

  const saved = (batch: OperationalBatchCard) => {
    setBatches((previous) => [...previous.filter((item) => item.id !== batch.id), batch].sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.id - b.id));
    setSelected(null); setToast(formBatch === "create" ? `${batch.batchName} added.` : `${batch.batchName} saved.`); setFormBatch(null);
  };
  const totals = batches.reduce((acc, b) => ({ capacity: acc.capacity + b.capacity, active: acc.active + b.activeMemberCount }), { capacity: 0, active: 0 });

  return (
    <div className="space-y-6 text-left">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">Batches</h2>
          <p className="mt-1 text-sm text-ink-600">Pool times, how full each one is, and who swims in it.{batches.length > 0 && ` ${totals.active} active members across ${totals.capacity} seats.`}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadBatches()} disabled={loading} aria-label="Refresh" className="flex min-h-11 w-11 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 cursor-pointer"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          {canManage && <button type="button" onClick={() => setFormBatch("create")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white hover:bg-ink-800 cursor-pointer"><Plus className="h-4 w-4" />Add a batch</button>}
        </div>
      </header>

      {toast && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" /><span className="flex-1">{toast}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setToast("")} className="rounded-lg p-1 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        {loading && batches.length === 0 ? (
          <div className="space-y-3 p-5" aria-label="Loading batches">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-50" />)}</div>
        ) : error ? (
          <div role="alert" className="px-6 py-12 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
            <p className="mt-3 text-sm font-semibold text-ink-800">Batches could not be loaded</p>
            <p className="mt-1 text-sm text-ink-500">{error}</p>
            <button type="button" onClick={() => void loadBatches()} className="mt-4 min-h-11 rounded-xl bg-ink-950 px-5 text-sm font-semibold text-white cursor-pointer">Try again</button>
          </div>
        ) : batches.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Clock3 className="mx-auto h-6 w-6 text-ink-300" />
            <p className="mt-3 text-sm font-semibold text-ink-800">No batches yet</p>
            <p className="mt-1 text-sm text-ink-500">{canManage ? "Add the academy's first pool time." : "An admin can add pool times here."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {batches.map((batch) => {
              const pct = batch.capacity ? Math.min(100, Math.round((batch.activeMemberCount / batch.capacity) * 100)) : 0;
              const full = batch.activeMemberCount >= batch.capacity;
              const chip = batch.status === "CLOSED" ? { label: "Closed", tone: "bg-ink-50 text-ink-500 ring-ink-200" }
                : full ? { label: "Full", tone: "bg-amber-50 text-amber-800 ring-amber-200" }
                : { label: `${batch.availableSeats} seats left`, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
              return (
                <li key={batch.id}>
                  <button type="button" onClick={() => setSelected(batch)} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ink-50 cursor-pointer sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-400/10 text-aqua-600"><Clock3 className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink-950">{batch.batchName}</span>
                      <span className="block truncate text-xs text-ink-500">{displayTime(batch.startTime)} – {displayTime(batch.endTime)}</span>
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-ink-100"><span className={`block h-full rounded-full ${full ? "bg-amber-400" : "bg-aqua-400"}`} style={{ width: `${pct}%` }} /></span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-500"><Users className="h-3.5 w-3.5" />{batch.activeMemberCount}/{batch.capacity}</span>
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${chip.tone}`}>{chip.label}</span>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-300 sm:block" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {selected && !formBatch && !deleteBatch && (
          <BatchDetails batch={selected} members={members} canManage={canManage} onClose={() => setSelected(null)} onEdit={() => setFormBatch(selected)} onDelete={() => setDeleteBatch(selected)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {formBatch && (
          <BatchForm batch={formBatch === "create" ? undefined : formBatch} token={getSessionToken()} onClose={() => setFormBatch(null)} onSaved={saved} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteBatch && (
          <DeleteConfirmation batch={deleteBatch} token={getSessionToken()} onClose={() => setDeleteBatch(null)}
            onDeleted={() => { setBatches((previous) => previous.filter((item) => item.id !== deleteBatch.id)); setToast(`${deleteBatch.batchName} deleted.`); setDeleteBatch(null); setSelected(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
