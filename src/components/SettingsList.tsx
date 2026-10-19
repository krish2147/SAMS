import React from "react";
import { ChevronRight } from "lucide-react";

// The grouped rows used by Settings and the member Profile/Security pages, so they all look
// like one phone settings app.

export function SettingsTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-6 text-center font-display text-2xl font-bold tracking-tight text-slate-900">{children}</h1>;
}

export function SettingsGroup({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      {heading && <h2 className="mb-2 px-4 text-sm font-semibold text-slate-500">{heading}</h2>}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100">{children}</div>
    </section>
  );
}

/** A tappable row when onClick is given (with a chevron), otherwise a read-only row whose text wraps. */
export function SettingsRow({ icon: Icon, title, subtitle, onClick, danger = false }: {
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: React.ReactNode; onClick?: () => void; danger?: boolean; key?: React.Key;
}) {
  const body = (
    <>
      <Icon className={`h-6 w-6 shrink-0 ${danger ? "text-rose-500" : "text-slate-700"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px]">{title}</span>
        {subtitle && <span className={`block text-sm text-slate-500 ${onClick ? "truncate" : "mt-0.5 leading-6 break-words"}`}>{subtitle}</span>}
      </span>
      {onClick && !danger && <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />}
    </>
  );
  const base = `flex min-h-[64px] w-full items-center gap-4 px-4 py-3 text-left ${danger ? "text-rose-600" : "text-slate-900"}`;
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} hover:bg-slate-50 cursor-pointer`}>{body}</button>
  ) : (
    <div className={base}>{body}</div>
  );
}
