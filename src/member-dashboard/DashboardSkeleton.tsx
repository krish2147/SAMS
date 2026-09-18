import React from "react";

export function DashboardSkeleton() {
  return <div className="animate-pulse space-y-6" aria-label="Loading membership overview" aria-busy="true">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="h-8 w-56 rounded-lg bg-slate-200" /><div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-100" /></div><div className="h-11 w-36 rounded-xl bg-slate-200" /></div>
    <div className="min-h-[244px] rounded-2xl bg-slate-900 p-6"><div className="h-6 w-24 rounded-full bg-slate-700" /><div className="mt-5 h-7 w-60 rounded bg-slate-700" /><div className="mt-3 h-4 w-36 rounded bg-slate-800" /><div className="mt-10 h-2 w-full rounded-full bg-slate-800" /></div>
    <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-[172px] rounded-2xl border border-slate-200 bg-white p-5"><div className="h-3 w-20 rounded bg-slate-200" /><div className="mt-3 h-5 w-32 rounded bg-slate-200" /><div className="mt-7 h-4 w-44 rounded bg-slate-100" /></div>)}</div>
  </div>;
}
