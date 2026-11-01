import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, IndianRupee, LoaderCircle, Minus, Plus, UserRound, X } from "lucide-react";

// Guest swims: walk-in visitors without a membership pay by the hour at the counter. The price
// comes from the Guest plans on the rate card (weekday or weekend), and every visit gets an invoice.

interface GuestsTabProps {
  getSessionToken: () => string;
  /** Only admins see the money totals for the day. */
  showTotals: boolean;
}

interface GuestVisit { id: number; guestName: string; mobileNo: string; hours: number; amount: number; paymentMethod: string; invoiceNo: string; createdAt: string; recordedBy: string; }

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function GuestsTab({ getSessionToken, showTotals }: GuestsTabProps) {
  const [rate, setRate] = useState<{ rate: number; weekend: boolean } | null>(null);
  const [rateError, setRateError] = useState("");
  const [visits, setVisits] = useState<GuestVisit[] | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [hours, setHours] = useState(1);
  const [method, setMethod] = useState<"Cash" | "UPI">("Cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<GuestVisit | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const token = getSessionToken();
    return token ? { "x-session-token": token } : {};
  }, [getSessionToken]);

  const load = useCallback(() => {
    fetch("/api/guests/rate", { headers: headers() })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "The guest price could not be loaded."); setRate({ rate: Number(d.rate), weekend: Boolean(d.weekend) }); })
      .catch((e) => setRateError(e.message));
    fetch("/api/guests", { headers: headers() })
      .then((r) => (r.ok ? r.json() : { visits: [] }))
      .then((d) => setVisits(Array.isArray(d.visits) ? d.visits : []))
      .catch(() => setVisits([]));
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter the guest's name.");
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/guests", { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ guestName: name, mobileNo: mobile, hours, paymentMethod: method }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The guest could not be recorded.");
      setDone(data.visit); setName(""); setMobile(""); setHours(1); setMethod("Cash");
      load();
    } catch (err: any) {
      setError(err.message || "The guest could not be recorded.");
    } finally {
      setSaving(false);
    }
  };

  const download = async (visit: GuestVisit) => {
    try {
      const res = await fetch(`/api/guests/${visit.id}/invoice?download=true`, { headers: headers() });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `${visit.invoiceNo}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The invoice could not be downloaded.");
    }
  };

  const total = (visits || []).reduce((acc, v) => acc + v.amount, 0);
  const input = "mt-1.5 min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 outline-none focus:border-aqua-400 focus-visible:ring-2 focus-visible:ring-aqua-400/30";

  return (
    <div className="space-y-6 text-left">
      <header>
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink-950">Guest swims</h2>
        <p className="mt-1 text-sm text-ink-600">Walk-in visitors without a membership, paid by the hour at the counter. Each guest gets an invoice.</p>
      </header>

      {done && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{rupees(done.amount)} {done.paymentMethod === "UPI" ? "by UPI" : "in cash"} recorded for {done.guestName}.</p>
            <p className="mt-0.5">Invoice {done.invoiceNo}. <button type="button" onClick={() => void download(done)} className="font-semibold underline underline-offset-2 cursor-pointer">Download it</button> to print or share.</p>
          </div>
          <button type="button" onClick={() => setDone(null)} aria-label="Dismiss" className="rounded-lg p-1 hover:bg-emerald-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h3 className="text-base font-bold text-ink-950">Record a guest</h3>
          <label className="block text-sm font-medium text-ink-700">Guest's name<input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className={input} placeholder="Full name" /></label>
          <label className="block text-sm font-medium text-ink-700">Mobile (optional)<input value={mobile} onChange={(e) => { setMobile(e.target.value); setError(""); }} inputMode="tel" className={input} placeholder="10-digit number" /></label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-sm font-medium text-ink-700">Hours</span>
              <div className="mt-1.5 flex min-h-11 items-center justify-between rounded-xl border border-ink-200 px-1.5">
                <button type="button" aria-label="Fewer hours" disabled={hours <= 1} onClick={() => setHours((h) => Math.max(1, h - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-50 disabled:opacity-30 cursor-pointer"><Minus className="h-4 w-4" /></button>
                <span className="text-[15px] font-semibold text-ink-950">{hours}</span>
                <button type="button" aria-label="More hours" disabled={hours >= 4} onClick={() => setHours((h) => Math.min(4, h + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-50 disabled:opacity-30 cursor-pointer"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <span className="block text-sm font-medium text-ink-700">Paid by</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(["Cash", "UPI"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)}
                    className={`min-h-11 rounded-xl border text-sm font-semibold cursor-pointer ${method === m ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700 hover:bg-ink-50"}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3">
            <span className="text-sm text-ink-600">{rate ? `${rate.weekend ? "Weekend" : "Weekday"} rate ${rupees(rate.rate)} × ${hours}` : rateError || "Loading price…"}</span>
            <span className="text-lg font-bold text-ink-950 tabular-nums">{rate ? rupees(rate.rate * hours) : "—"}</span>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
          <button disabled={saving || !rate} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 text-[15px] font-semibold text-white hover:bg-ink-800 disabled:opacity-60 cursor-pointer">
            {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <IndianRupee className="h-5 w-5" />}{saving ? "Recording…" : "Payment received – record guest"}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-base font-bold text-ink-950">Today's guests</h3>
            <span className="text-sm text-ink-500">{visits ? `${visits.length}${showTotals ? ` · ${rupees(total)}` : ""}` : ""}</span>
          </div>
          {visits === null ? (
            <p className="flex items-center gap-2 px-5 py-8 text-sm text-ink-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading…</p>
          ) : visits.length === 0 ? (
            <div className="px-6 py-12 text-center"><UserRound className="mx-auto h-6 w-6 text-ink-300" /><p className="mt-3 text-sm text-ink-500">No guests yet today.</p></div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {visits.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-950">{v.guestName}</span>
                    <span className="block truncate text-xs text-ink-500">{v.hours} hour{v.hours === 1 ? "" : "s"} · {v.paymentMethod} · {new Date(v.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                  </span>
                  {showTotals && <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-950">{rupees(v.amount)}</span>}
                  <button type="button" onClick={() => void download(v)} aria-label={`Download invoice ${v.invoiceNo}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-50 hover:text-ink-800 cursor-pointer"><Download className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
