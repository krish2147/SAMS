import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CircleHelp, CreditCard, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import type { MemberSection } from "./member-navigation";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { MemberUpdates } from "./MemberUpdates";
import { MembershipOverviewCard } from "./MembershipOverviewCard";
import { OverviewSummaryCards } from "./OverviewSummaryCards";
import { RecentPayments } from "./RecentPayments";
import { firstName, greetingForHour, receiptHref, type MemberDashboardData, type MemberPayment } from "./member-overview-data";

interface MemberOverviewProps {
  sessionName: string;
  onNavigate: (section: MemberSection) => void;
}

const actions = [
  { id: "membership", label: "Membership", supporting: "Plan and validity", icon: ShieldCheck },
  { id: "payments", label: "Payments", supporting: "Receipts and history", icon: CreditCard },
  { id: "batch", label: "My batch", supporting: "Timing and details", icon: CalendarClock },
  { id: "profile", label: "Edit profile", supporting: "Personal information", icon: UserRound },
  { id: "support", label: "Help & support", supporting: "Get assistance", icon: CircleHelp },
] satisfies Array<{ id: MemberSection; label: string; supporting: string; icon: React.ComponentType<{ className?: string }> }>;

export function MemberOverview({ sessionName, onNavigate }: MemberOverviewProps) {
  const [dashboard, setDashboard] = useState<MemberDashboardData | null>(null);
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [paymentsError, setPaymentsError] = useState(false);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true); setDashboardError(false);
    try {
      const response = await fetch("/api/member/dashboard", { credentials: "same-origin" });
      if (!response.ok) throw new Error("dashboard unavailable");
      setDashboard(await response.json());
    } catch { setDashboardError(true); }
    finally { setDashboardLoading(false); }
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

  useEffect(() => { void loadDashboard(); void loadPayments(); }, [loadDashboard, loadPayments]);

  const latestSuccessfulPayment = useMemo(() => payments.find((payment) => payment.status?.toLowerCase() === "paid") || null, [payments]);
  const greetingName = firstName(dashboard?.member.fullName || sessionName);

  if (dashboardLoading) return <DashboardSkeleton />;
  if (dashboardError || !dashboard) return <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ShieldCheck className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold text-slate-900">We couldn't load your membership information.</h2><p className="mt-1 text-sm text-slate-500">Please try again in a moment.</p><button type="button" onClick={() => void loadDashboard()} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">Try again</button></section>;

  const receiptUrl = receiptHref(latestSuccessfulPayment);

  return <div className="space-y-6 lg:space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">{greetingForHour(new Date().getHours())}, {greetingName}</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">Manage your membership, batch and payments from one place.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onNavigate("membership")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">View membership</button>{receiptUrl && <a href={receiptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><ReceiptText className="h-4 w-4" />View receipt</a>}</div>
    </header>

    <MembershipOverviewCard data={dashboard} onNavigate={onNavigate} />

    <div className="flex flex-col gap-6 lg:gap-7">
      <div className="order-2 lg:order-1"><OverviewSummaryCards dashboard={dashboard} latestPayment={latestSuccessfulPayment} paymentsLoading={paymentsLoading} onNavigate={onNavigate} /></div>
      <section aria-labelledby="quick-actions-title" className="order-1 lg:order-2"><div className="mb-3 flex items-center justify-between"><h2 id="quick-actions-title" className="text-base font-semibold text-slate-950">Quick actions</h2></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{actions.map(({ id, label, supporting, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate(id)} className="group min-h-[86px] rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-cyan-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:min-h-[82px]"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-cyan-50 group-hover:text-cyan-700"><Icon className="h-4.5 w-4.5" /></span><div className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{supporting}</span></div></div></button>)}</div></section>
    </div>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.9fr)]">
      <RecentPayments payments={payments.slice(0, 3)} loading={paymentsLoading} error={paymentsError} onRetry={() => void loadPayments()} onViewAll={() => onNavigate("payments")} />
      <MemberUpdates notifications={dashboard.notifications || []} onViewAll={() => onNavigate("notifications")} />
    </div>
  </div>;
}
