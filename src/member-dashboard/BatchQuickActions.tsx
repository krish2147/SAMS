import React from "react";
import { CircleHelp, CreditCard, ShieldCheck } from "lucide-react";
import type { MemberSection } from "./member-navigation";

const actions = [
  { id: "membership", label: "View membership", icon: ShieldCheck },
  { id: "payments", label: "Payments & receipts", icon: CreditCard },
  { id: "support", label: "Help & support", icon: CircleHelp }
] satisfies Array<{ id: MemberSection; label: string; icon: React.ComponentType<{ className?: string }> }>;

export function BatchQuickActions({ onNavigate }: { onNavigate: (section: MemberSection) => void }) {
  return <section aria-labelledby="batch-actions-title"><h2 id="batch-actions-title" className="text-sm font-semibold text-slate-950">Useful links</h2><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">{actions.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onNavigate(id)} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"><Icon className="h-4 w-4 shrink-0 text-slate-400" />{label}</button>)}</div></section>;
}
