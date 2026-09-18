import React from "react";
import { CircleHelp, Waves } from "lucide-react";

export function BatchEmptyState({ onSupport }: { onSupport: () => void }) {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-8 sm:py-14">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-100"><Waves className="h-5 w-5" /></span>
    <h2 className="mt-5 text-lg font-semibold text-slate-950">No batch assigned yet</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Your assigned swimming batch will appear here once it is confirmed.</p>
    <button type="button" onClick={onSupport} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"><CircleHelp className="h-4 w-4" />Contact support</button>
  </section>;
}
