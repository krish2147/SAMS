import React, { useMemo, useState } from "react";
import { FilterMenu } from "./FilterMenu";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ChevronRight, IndianRupee, LoaderCircle, RefreshCw, Search, Smartphone, X } from "lucide-react";

// Membership renewals for the front desk and admins. Lists members with a membership period,
// soonest-ending first, and records a cash renewal on the server (POST /api/members/cash-payment
// with paymentType "Renewal"): the plan's renewal fee is charged, the membership is extended from
// its current end date, and the invoice goes out on WhatsApp. Members can also pay online from
// their own app (Renew now).

interface RenewalsTabProps {
  isSwim: boolean;
  members: any[];
  getSessionToken: () => string;
  onRenewed: () => void;
}

type Filter = "all" | "soon" | "ended";

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
function statusOf(days: number | null) {
  if (days === null) return { label: "No dates yet", tone: "bg-ink-50 text-ink-500 ring-ink-200" };
  if (days < 0) return { label: `Ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`, tone: "bg-rose-50 text-rose-700 ring-rose-200" };
  if (days === 0) return { label: "Ends today", tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  if (days <= 30) return { label: `Ends in ${days} day${days === 1 ? "" : "s"}`, tone: "bg-amber-50 text-amber-800 ring-amber-200" };
  return { label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
}

export function RenewalsTab({ members, getSessionToken, onRenewed }: RenewalsTabProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedNo, setSelectedNo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; amount: number; endDate: string; invoiceNo?: string } | null>(null);

  // Members with a membership period (approved and paid at least once), soonest-ending first.
  const rows = useMemo(() => members
    .filter((m) => (m.registration_status || m.status) === "Approved" && m.endDate)
    .map((m) => ({ ...m, daysLeft: daysUntil(m.endDate) }))
    .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)), [members]);

  const counts = {
    all: rows.length,
    soon: rows.filter((r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30).length,
    ended: rows.filter((r) => r.daysLeft !== null && r.daysLeft < 0).length
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "soon" && !(r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30)) return false;
    if (filter === "ended" && !(r.daysLeft !== null && r.daysLeft < 0)) return false;
    if (!q) return true;
    return String(r.fullName || "").toLowerCase().includes(q) || String(r.membershipNo || "").toLowerCase().includes(q) || String(r.mobileNo || "").includes(q);
  });

  const selected = rows.find((r) => r.membershipNo === selectedNo) || null;

  const recordCashRenewal = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/cash-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
        body: JSON.stringify({ membershipNo: selected.membershipNo, paymentType: "Renewal" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The renewal could not be recorded.");
      setDone({ name: selected.fullName, amount: Number(data.amount || 0), endDate: data.membershipEndDate, invoiceNo: data.invoiceNo });
      setSelectedNo(null);
      onRenewed();
    } catch (err: any) {
      setError(err.message || "The renewal could not be recorded.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <header>
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">Membership renewals</h2>
        <p className="mt-1 text-sm text-ink-600">Members whose membership is ending or has ended come first. Record a cash renewal here; members can also pay online from their app.</p>
      </header>

      {done && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{done.name}'s membership is renewed until {formatDate(done.endDate)}.</p>
            <p className="mt-0.5 text-emerald-700">₹{done.amount.toLocaleString("en-IN")} cash recorded{done.invoiceNo ? ` · Invoice ${done.invoiceNo}` : ""}. The invoice is sent on WhatsApp.</p>
          </div>
          <button type="button" onClick={() => setDone(null)} aria-label="Dismiss" className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-ink-100 p-4">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={query} aria-label="Search by name, membership number or phone" onChange={(e) => setQuery(e.target.value)} placeholder="Search renewals"
              className="min-h-11 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900 placeholder-ink-400 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30" />
          </label>
          <FilterMenu label="Filter renewals" value={filter} onChange={setFilter}
            options={([["all", "All renewals"], ["soon", "Ending soon"], ["ended", "Ended"]] as Array<[Filter, string]>).map(([id, label]) => ({ id, label, count: counts[id] }))} />
        </div>
        {filter !== "all" && (
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5 text-sm">
            <span className="text-ink-600">Showing <span className="font-semibold text-ink-900">{({ soon: "Ending soon", ended: "Ended" } as Record<string, string>)[filter]}</span> · {visible.length}</span>
            <button type="button" onClick={() => setFilter("all")} className="font-semibold text-aqua-600 hover:text-aqua-500 cursor-pointer">Clear filter</button>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <RefreshCw className="mx-auto h-6 w-6 text-ink-300" />
            <p className="mt-3 text-sm font-semibold text-ink-800">{rows.length === 0 ? "No memberships to renew yet" : "No members match"}</p>
            <p className="mt-1 text-sm text-ink-500">{rows.length === 0 ? "Members appear here once their first payment is recorded." : "Try another search or filter."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 overflow-hidden rounded-b-2xl">
            {visible.map((m) => {
              const status = statusOf(m.daysLeft);
              return (
                <li key={m.membershipNo}>
                  <button type="button" onClick={() => { setSelectedNo(m.membershipNo); setError(""); }}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-ink-50 cursor-pointer sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-400/10 text-sm font-bold text-aqua-600">
                      {String(m.fullName || "?").trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink-950">{m.fullName}</span>
                      <span className="block truncate text-xs text-ink-500">{m.membershipNo} · {m.typeOfMembership}</span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-xs text-ink-400">Ends</span>
                      <span className="block text-sm font-semibold text-ink-800">{formatDate(m.endDate)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.tone}`}>{status.label}</span>
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-300 sm:block" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Renew sheet: a bottom sheet on phones, a centred dialog on computers. */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Renew ${selected.fullName}`}>
            <motion.button type="button" aria-label="Close" onClick={() => !saving && setSelectedNo(null)} className="absolute inset-0 bg-ink-950/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink-500">Renew membership</p>
                  <h3 className="mt-0.5 text-xl font-bold text-ink-950">{selected.fullName}</h3>
                  <p className="text-sm text-ink-500">{selected.membershipNo}</p>
                </div>
                <button type="button" onClick={() => setSelectedNo(null)} disabled={saving} aria-label="Close" className="rounded-xl p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-700 cursor-pointer"><X className="h-5 w-5" /></button>
              </div>

              <dl className="mt-5 divide-y divide-ink-100 rounded-2xl border border-ink-100 text-sm">
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-ink-500">Plan</dt><dd className="text-right font-semibold text-ink-900">{selected.typeOfMembership}</dd></div>
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-ink-500">Current end date</dt><dd className="font-semibold text-ink-900">{formatDate(selected.endDate)}</dd></div>
                <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-ink-500">Status</dt><dd><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusOf(selected.daysLeft).tone}`}>{statusOf(selected.daysLeft).label}</span></dd></div>
              </dl>

              <p className="mt-4 text-sm leading-6 text-ink-600">
                Collect the plan's renewal fee in cash, then record it. The new period starts {selected.daysLeft !== null && selected.daysLeft >= 0 ? "after the current end date" : "today"}, and the invoice is sent to the member on WhatsApp.
              </p>

              {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

              <button type="button" onClick={() => void recordCashRenewal()} disabled={saving}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-70 cursor-pointer">
                {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}
                {saving ? "Recording…" : "Cash received – renew"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
                <Smartphone className="h-3.5 w-3.5" /> To pay online, the member taps Renew now in their app.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
