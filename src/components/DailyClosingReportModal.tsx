import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, LoaderCircle, Printer, X } from "lucide-react";

// End-of-day summary for the front desk and admins: the day's payments (cash and online, with
// amounts for admins only), new registrations, renewals and what is still waiting. Payments come
// from the payments ledger (/api/admin/payments); every date is counted in India time.

interface DailyClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  getSessionToken?: () => string;
  /** Money totals are for admins; reception and coaches get the report without them. */
  showRevenue?: boolean;
}

const indiaDate = (value?: string | number | Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};
const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const longDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
};

export function DailyClosingReportModal({ isOpen, onClose, members = [], getSessionToken, showRevenue = true }: DailyClosingReportModalProps) {
  const [reportDate, setReportDate] = useState(() => indiaDate(new Date()));
  const [payments, setPayments] = useState<any[] | null>(null);
  const [paymentsError, setPaymentsError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setReportDate(indiaDate(new Date()));
    let cancelled = false;
    setPayments(null); setPaymentsError(false);
    const token = getSessionToken?.() || "";
    fetch("/api/admin/payments", { credentials: "same-origin", headers: token ? { "x-session-token": token } : {} })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => { if (!cancelled) setPayments(Array.isArray(data?.transactions) ? data.transactions : []); })
      .catch(() => { if (!cancelled) { setPayments([]); setPaymentsError(true); } });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const report = useMemo(() => {
    const paid = (payments || []).filter((p) => p.status === "Paid" && indiaDate(p.paymentDate || p.createdAt) === reportDate);
    const isCash = (p: any) => String(p.paymentMethod || "").toLowerCase() === "cash";
    const sum = (list: any[]) => list.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const cash = paid.filter(isCash);
    const online = paid.filter((p) => !isCash(p));
    const weekEnd = addDays(reportDate, 7);
    return {
      paid,
      total: sum(paid), cashTotal: sum(cash), onlineTotal: sum(online), cashCount: cash.length, onlineCount: online.length,
      renewals: paid.filter((p) => p.paymentType === "Renewal").length,
      registered: members.filter((m) => indiaDate(m.createdAt) === reportDate).length,
      awaitingApproval: members.filter((m) => !["Approved", "Rejected"].includes(m.registration_status || m.status)).length,
      awaitingPayment: members.filter((m) => (m.registration_status || m.status) === "Approved" && !m.endDate).length,
      endingSoon: members.filter((m) => m.endDate && m.endDate >= reportDate && m.endDate <= weekEnd).length
    };
  }, [payments, members, reportDate]);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["Baroda Swim Front - Daily closing report"], ["Date", reportDate], [""], ["Item", "Value"],
      ...(showRevenue ? [["Total collected (Rs)", report.total], ["Cash (Rs)", report.cashTotal], ["Online (Rs)", report.onlineTotal]] : []),
      ["Payments recorded", report.paid.length], ["Renewals", report.renewals], ["New registrations", report.registered],
      ["Awaiting approval", report.awaitingApproval], ["Awaiting payment", report.awaitingPayment], ["Memberships ending in 7 days", report.endingSoon]
    ];
    if (showRevenue && report.paid.length) {
      rows.push([""], ["Member", "Membership no.", "Type", "Method", "Amount (Rs)", "Invoice"]);
      report.paid.forEach((p) => rows.push([p.memberName, p.membershipNo, p.paymentType, p.paymentMethod, p.amount, p.invoiceNo]));
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `BSF-closing-report-${reportDate}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const loading = payments === null;
  const stat = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="rounded-2xl border border-ink-100 p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-950 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Daily closing report">
          <motion.button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink-950/50 print:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white text-left shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-6 pb-5">
              <div>
                <p className="text-sm font-medium text-ink-500">Daily closing report</p>
                <h3 className="mt-0.5 text-xl font-bold text-ink-950">{longDate(reportDate)}</h3>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-700 cursor-pointer print:hidden"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-6 py-3 print:hidden">
              <label className="flex items-center gap-2 text-sm text-ink-600">Date
                <input type="date" value={reportDate} max={indiaDate(new Date())} onChange={(e) => e.target.value && setReportDate(e.target.value)}
                  className="min-h-10 rounded-xl border border-ink-200 px-3 text-sm text-ink-900 outline-none focus:border-aqua-400" />
              </label>
              <span className="flex-1" />
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50 cursor-pointer"><Printer className="h-4 w-4" />Print</button>
              <button type="button" onClick={exportCsv} disabled={loading} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-ink-950 px-3 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-60 cursor-pointer"><Download className="h-4 w-4" />Download CSV</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500"><LoaderCircle className="h-5 w-5 animate-spin" />Loading the day's payments…</div>
              ) : (
                <>
                  {paymentsError && showRevenue && <p role="alert" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">Payments couldn't be loaded, so payment figures are missing.</p>}
                  {showRevenue && (
                    <section className="rounded-2xl bg-ink-950 p-5 text-white">
                      <p className="text-sm text-white/70">Collected</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums">{rupees(report.total)}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-white/60">Cash</p><p className="font-semibold tabular-nums">{rupees(report.cashTotal)} <span className="font-normal text-white/60">· {report.cashCount}</span></p></div>
                        <div><p className="text-white/60">Online</p><p className="font-semibold tabular-nums">{rupees(report.onlineTotal)} <span className="font-normal text-white/60">· {report.onlineCount}</span></p></div>
                      </div>
                    </section>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* Coaches can't read the payments ledger, so payment counts are left out for them. */}
                    {!paymentsError && stat("Payments", report.paid.length, "Recorded this day")}
                    {!paymentsError && stat("Renewals", report.renewals, "Paid this day")}
                    {stat("New registrations", report.registered, "Signed up this day")}
                    {stat("Awaiting approval", report.awaitingApproval, "Right now")}
                    {stat("Awaiting payment", report.awaitingPayment, "Approved, not paid")}
                    {stat("Ending soon", report.endingSoon, "Within 7 days")}
                  </div>
                  {showRevenue && report.paid.length > 0 && (
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Payments</h4>
                      <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
                        {report.paid.map((p) => (
                          <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink-950">{p.memberName}</span><span className="block truncate text-xs text-ink-500">{p.paymentType} · {p.paymentMethod}{p.invoiceNo ? ` · ${p.invoiceNo}` : ""}</span></span>
                            <span className="shrink-0 font-semibold tabular-nums text-ink-950">{rupees(Number(p.amount) || 0)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
