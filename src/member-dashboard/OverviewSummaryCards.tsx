import React from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { formatMemberDate, invoiceHref, type MemberDashboardData, type MemberPayment } from "./member-overview-data";

interface OverviewSummaryCardsProps {
  dashboard: MemberDashboardData;
  latestPayment?: MemberPayment | null;
  paymentsLoading: boolean;
  onNavigate: (section: "batch" | "payments") => void;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6 transition-shadow duration-200 hover:shadow-card-hover">
      {children}
    </article>
  );
}

/** Small label above the headline figure, plus the tinted icon chip. */
function CardHeading({ icon: Icon, eyebrow }: { icon: React.ComponentType<{ className?: string }>; eyebrow: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{eyebrow}</p>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600 ring-1 ring-inset ring-aqua-400/20">
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
  );
}

/** The one number or phrase each card exists to communicate. */
function Figure({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p className={`mt-3 font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[26px] ${muted ? "text-ink-400" : "text-ink-950"}`}>
      {children}
    </p>
  );
}

function CardLink({ onClick, href, children }: { onClick?: () => void; href?: string; children: React.ReactNode }) {
  const classes =
    "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-aqua-600 outline-none transition-colors hover:text-aqua-500 focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
      <ArrowUpRight className="h-4 w-4" />
    </button>
  );
}

export function OverviewSummaryCards({ latestPayment, paymentsLoading, onNavigate }: OverviewSummaryCardsProps) {
  const paymentDate = formatMemberDate(latestPayment?.paymentDate);
  const invoiceUrl = invoiceHref(latestPayment);

  return (
    // The membership card above already shows the batch and validity, so Home only adds the latest payment.
    <section aria-label="Latest payment">
      <Card>
        {paymentsLoading ? (
          <div className="animate-pulse">
            <div className="h-3 w-24 rounded bg-ink-100" />
            <div className="mt-4 h-7 w-32 rounded bg-ink-100" />
            <div className="mt-4 h-4 w-40 rounded bg-ink-50" />
            <div className="mt-6 h-5 w-24 rounded bg-ink-50" />
          </div>
        ) : (
          <>
            <CardHeading icon={CreditCard} eyebrow="Latest payment" />
            <Figure muted={!latestPayment}>
              {latestPayment
                ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(latestPayment.amount)
                : "No payments yet"}
            </Figure>
            {latestPayment ? (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-600">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {latestPayment.status}
                </span>
                {paymentDate && <span>{paymentDate}</span>}
              </p>
            ) : (
              <p className="mt-2.5 text-sm leading-6 text-ink-600">Completed payments and invoices will appear here.</p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-x-5 pt-4">
              {invoiceUrl && <CardLink href={invoiceUrl}>View invoice</CardLink>}
              <button
                type="button"
                onClick={() => onNavigate("payments")}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-600 outline-none transition-colors hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2"
              >
                Payment history
              </button>
            </div>
          </>
        )}
      </Card>

    </section>
  );
}
