import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import type { MemberSection } from "./member-navigation";
import type { MemberDashboardData, MemberPayment } from "./member-overview-data";
import { MemberDigitalCard } from "./MemberDigitalCard";
import { MemberBatchSummary } from "./MemberBatchSummary";
import { MembershipDetails } from "./MembershipDetails";
import { MembershipDocuments } from "./MembershipDocuments";
import { MembershipSkeleton } from "./MembershipSkeleton";
import { MembershipValidity } from "./MembershipValidity";
import { RenewalPanel } from "./RenewalPanel";
import { downloadMembershipCardPng } from "./download-membership-card";

export function MyMembershipPage({ onNavigate }: { onNavigate: (section: MemberSection) => void }) {
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [membershipError, setMembershipError] = useState(false);
  const [paymentsError, setPaymentsError] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const loadMembership = useCallback(async () => {
    setMembershipLoading(true); setMembershipError(false);
    try {
      const response = await fetch("/api/member/membership", { credentials: "same-origin" });
      if (!response.ok) throw new Error("membership unavailable");
      const result = await response.json();
      if (!result?.member || !result?.membership) throw new Error("invalid membership response");
      setData(result);
    } catch { setMembershipError(true); }
    finally { setMembershipLoading(false); }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true); setPaymentsError(false);
    try {
      const response = await fetch("/api/member/payments", { credentials: "same-origin" });
      if (!response.ok) throw new Error("payments unavailable");
      const result = await response.json();
      setPayments(Array.isArray(result.payments) ? result.payments : []);
    } catch { setPaymentsError(true); }
    finally { setPaymentsLoading(false); }
  }, []);

  useEffect(() => { void loadMembership(); void loadPayments(); }, [loadMembership, loadPayments]);
  const latestSuccessfulPayment = useMemo(() => payments.find((payment) => payment.status?.toLowerCase() === "paid") || null, [payments]);

  const downloadMembershipCard = useCallback(async () => {
    if (!data || downloadingCard) return;
    setDownloadingCard(true);
    setDownloadError(false);
    try {
      await downloadMembershipCardPng(data);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloadingCard(false);
    }
  }, [data, downloadingCard]);

  if (membershipLoading) return <MembershipSkeleton />;
  if (membershipError || !data) return <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ShieldCheck className="h-5 w-5" /></span><h1 className="mt-4 text-lg font-semibold text-slate-900">We couldn't load your membership details.</h1><p className="mt-1 text-sm text-slate-500">Please try again in a moment.</p><button type="button" onClick={() => void loadMembership()} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">Try again</button></section>;

  return <div className="space-y-6 lg:space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">My Membership</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">View your current plan, validity, batch and membership documents.</p></div><button type="button" onClick={() => void downloadMembershipCard()} disabled={downloadingCard} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"><Download className="h-4 w-4" />{downloadingCard ? "Preparing card…" : "Download membership card"}</button></header>
    {downloadError && <p role="alert" className="-mt-3 text-sm text-rose-700">We couldn't download your membership card. Please try again.</p>}
    <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
      <MemberDigitalCard data={data} />
      <MembershipValidity data={data} />
    </div>
    <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
      <MembershipDetails data={data} />
      <MemberBatchSummary data={data} onViewBatch={() => onNavigate("batch")} />
    </div>
    <MembershipDocuments payment={latestSuccessfulPayment} loading={paymentsLoading} error={paymentsError} onRetry={() => void loadPayments()} />
    <RenewalPanel data={data} />
  </div>;
}
