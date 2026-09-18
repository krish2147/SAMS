import React from "react";

const Pulse: React.FC<{ className: string }> = ({ className }) => <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;

export function CalendarSkeleton() {
  return <div aria-label="Loading calendar and events" aria-busy="true" className="mx-auto max-w-5xl space-y-6"><header><Pulse className="h-8 w-56" /><Pulse className="mt-3 h-4 w-80 max-w-full" /></header><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><Pulse className="h-6 w-40" /><div className="mt-5 grid gap-3 md:grid-cols-2">{[0, 1].map((item) => <Pulse key={item} className="h-48 w-full" />)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><Pulse className="h-6 w-36" /><div className="mt-5 space-y-3"><Pulse className="h-20 w-full" /><Pulse className="h-20 w-full" /></div></section></div>;
}
