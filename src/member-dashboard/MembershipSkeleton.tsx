import React from "react";

export function MembershipSkeleton() {
  return <div className="animate-pulse space-y-6" aria-label="Loading membership details" aria-busy="true">
    <div><div className="h-8 w-52 rounded-lg bg-slate-200" /><div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100" /></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]"><div className="h-[292px] rounded-2xl bg-slate-900 p-6"><div className="h-5 w-36 rounded bg-slate-700" /><div className="mt-16 h-8 w-64 rounded bg-slate-700" /><div className="mt-3 h-5 w-44 rounded bg-slate-800" /></div><div className="h-[292px] rounded-2xl border border-slate-200 bg-white p-6"><div className="h-4 w-32 rounded bg-slate-200" /><div className="mt-12 h-7 w-44 rounded bg-slate-200" /><div className="mt-8 h-2 rounded bg-slate-100" /></div></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]"><div className="h-56 rounded-2xl border border-slate-200 bg-white" /><div className="h-56 rounded-2xl border border-slate-200 bg-white" /></div>
    <div className="h-48 rounded-2xl border border-slate-200 bg-white" />
  </div>;
}
