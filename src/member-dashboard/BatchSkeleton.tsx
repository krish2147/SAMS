import React from "react";

const Pulse: React.FC<{ className: string }> = ({ className }) => <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;

export function BatchSkeleton() {
  return <div aria-label="Loading batch details" aria-busy="true" className="mx-auto max-w-5xl space-y-6">
    <header><Pulse className="h-8 w-36" /><Pulse className="mt-3 h-4 w-72 max-w-full" /></header>
    <section className="rounded-2xl bg-slate-900 p-5 sm:p-7 lg:p-8"><Pulse className="h-4 w-28 bg-slate-700/80" /><Pulse className="mt-5 h-8 w-56 max-w-full bg-slate-700/80" /><Pulse className="mt-7 h-12 w-64 max-w-full bg-slate-700/80" /></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><Pulse className="h-6 w-36" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3].map((item) => <Pulse key={item} className="h-[82px] w-full" />)}</div></section>
  </div>;
}
