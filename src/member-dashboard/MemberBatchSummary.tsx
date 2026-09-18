import React from "react";
import { ArrowRight, Clock3, Waves } from "lucide-react";
import { formatBatchTime, type MemberDashboardData } from "./member-overview-data";

export function MemberBatchSummary({ data, onViewBatch }: { data: MemberDashboardData; onViewBatch: () => void }) {
  const { batch } = data;
  const timing = batch?.startTime && batch?.endTime ? `${formatBatchTime(batch.startTime)} – ${formatBatchTime(batch.endTime)}` : null;
  return <section aria-labelledby="my-batch-title" className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-cyan-700">Assignment</p><h2 id="my-batch-title" className="mt-1 text-lg font-semibold text-slate-950">My batch</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Waves className="h-5 w-5" /></span></div>
    {batch ? <><p className="mt-7 text-xl font-semibold tracking-[-0.015em] text-slate-950">{batch.name}</p>{timing && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4 text-slate-400" />{timing}</p>}<button type="button" onClick={onViewBatch} className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">View batch details<ArrowRight className="h-4 w-4" /></button></> : <div className="mt-7 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">No batch assigned yet.</p><p className="mt-1 text-sm leading-5 text-slate-500">Your batch information will appear once an assignment is confirmed.</p></div>}
  </section>;
}
