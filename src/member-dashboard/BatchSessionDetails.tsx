import React from "react";
import { Building2, Clock3, Timer, Waves } from "lucide-react";
import { formatBatchTime } from "./member-overview-data";
import { batchDuration, type MemberBatch } from "./batch-data";

export function BatchSessionDetails({ batch }: { batch: MemberBatch }) {
  const duration = batchDuration(batch.startTime, batch.endTime);
  const details = [
    { label: "Batch", value: batch.name, icon: Waves },
    { label: "Start time", value: formatBatchTime(batch.startTime), icon: Clock3 },
    { label: "End time", value: formatBatchTime(batch.endTime), icon: Clock3 },
    { label: "Duration", value: duration, icon: Timer },
    { label: "Academy", value: batch.academyName, icon: Building2 }
  ].filter((item) => item.value);

  return <section aria-labelledby="session-details-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
    <div><p className="text-xs font-medium text-cyan-700">Your session</p><h2 id="session-details-title" className="mt-1 text-lg font-semibold text-slate-950">Session details</h2></div>
    <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {details.map(({ label, value, icon: Icon }) => <div key={label} className="flex min-h-[82px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500"><Icon className="h-4 w-4" /></span><div className="min-w-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd></div></div>)}
    </dl>
  </section>;
}
