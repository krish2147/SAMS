import React from "react";
import { Clock3, Waves } from "lucide-react";
import { formatBatchTime } from "./member-overview-data";
import { presentBatchStatus, type MemberBatch } from "./batch-data";

export function BatchHeroCard({ batch }: { batch: MemberBatch }) {
  const start = formatBatchTime(batch.startTime);
  const end = formatBatchTime(batch.endTime);
  const status = presentBatchStatus(batch.status);

  return <section aria-labelledby="assigned-batch-title" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-[0_14px_34px_rgba(15,23,42,0.14)] sm:p-7 lg:p-8">
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-cyan-400 via-cyan-300 to-transparent" />
    <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-cyan-300"><Waves className="h-4 w-4" /><p className="text-xs font-semibold">Current assignment</p></div>
        <h2 id="assigned-batch-title" className="mt-4 break-words text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{batch.name}</h2>
        {start && end && <div className="mt-6 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200 ring-1 ring-inset ring-white/10"><Clock3 className="h-5 w-5" /></span><div><p className="text-xs text-slate-400">Batch timing</p><p className="mt-0.5 whitespace-nowrap text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{start} <span className="text-slate-500">–</span> {end}</p></div></div>}
      </div>
      {status && <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${status === "Open" ? "bg-emerald-400/10 text-emerald-200 ring-emerald-300/20" : "bg-slate-400/10 text-slate-200 ring-slate-300/20"}`}>{status}</span>}
    </div>
  </section>;
}
