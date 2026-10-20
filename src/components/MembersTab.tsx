import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check, CheckCircle2, ChevronRight, IndianRupee, LoaderCircle, MessageCircle, Phone, RefreshCw,
  Search, Trash2, UserPlus, Users, X
} from "lucide-react";

// The member directory shared by admins, the front desk and coaches. Everyone sees the same list
// and member details; what they can do from the details sheet depends on their role:
// coaches only look, the front desk approves, sends payment links and records cash payments,
// and only admins can delete a member.

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

type Filter = "all" | "active" | "soon" | "ended" | "approval" | "payment" | "rejected";

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
  if (days < 0) return { key: "ended", label: `Ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`, tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (days <= 30) return { key: "soon", label: days === 0 ? "Ends today" : `Ends in ${days} day${days === 1 ? "" : "s"}`, tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  return { key: "active", label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
}

const FILTERS: Array<[Filter, string]> = [
  ["all", "All"], ["active", "Active"], ["soon", "Ending soon"], ["ended", "Ended"],
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
  const [busy, setBusy] = useState<"" | "approve" | "link" | "cash">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const rows = useMemo(() => members.map((m) => ({ ...m, stage: stageOf(m) })), [members]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, active: 0, soon: 0, ended: 0, approval: 0, payment: 0, rejected: 0 };
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

  const open = (no: string) => { setSelectedNo(no); setError(""); setConfirmDelete(false); };
  const close = () => { if (!busy) { setSelectedNo(null); setConfirmDelete(false); } };

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
      setDone(`₹${Number(data.amount || 0).toLocaleString("en-IN")} cash recorded for ${selected.fullName}. Membership runs until ${formatDate(data.membershipEndDate)}${data.invoiceNo ? ` · Invoice ${data.invoiceNo}` : ""}.`);
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
          <p className="flex-1 font-semibold">{done} The invoice is sent on WhatsApp.</p>
          <button type="button" onClick={() => setDone("")} aria-label="Dismiss" className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, number or phone"
              className="min-h-11 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder-ink-400 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30" />
          </label>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="Filter members">
            {FILTERS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
                className={`min-h-10 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors cursor-pointer ${filter === id ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"}`}>
                {label} <span className={filter === id ? "text-white/70" : "text-ink-400"}>{counts[id]}</span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-6 w-6 text-ink-300" />
            <p className="mt-3 text-sm font-semibold text-ink-800">{members.length === 0 ? "No members yet" : "No members match"}</p>
            <p className="mt-1 text-sm text-ink-500">{members.length === 0 ? "Members appear here once they register." : "Try another search or filter."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
