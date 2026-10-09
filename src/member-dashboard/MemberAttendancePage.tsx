import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarCheck, CalendarDays, Clock3, RefreshCw, Waves } from "lucide-react";

interface AttendanceEntry {
  date: string;
  time: string;
  status: string;
}

interface AttendanceResponse {
  attendanceHistory: AttendanceEntry[];
  monthlyAttendance: number;
  weeklyAttendance: number;
  totalAttendance: number;
  lastVisit: string | null;
  todayStatus: string;
}

const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });

const formatDay = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
};

const relativeDay = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const days = Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function Stat({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string }) {
  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600 ring-1 ring-inset ring-aqua-400/20">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-ink-950">{value}</p>
      {hint && <p className="mt-2 text-sm text-ink-600">{hint}</p>}
    </article>
  );
}

export function MemberAttendancePage() {
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/member/attendance", { credentials: "same-origin", signal });
      if (!response.ok) throw new Error("attendance unavailable");
      setData(await response.json());
    } catch (requestError: any) {
      if (requestError?.name !== "AbortError") setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-white" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
        <AlertCircle className="mx-auto h-9 w-9 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-ink-950">Attendance could not be loaded</h2>
        <p className="mt-1.5 text-sm leading-6 text-ink-600">Please check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </section>
    );
  }

  const history = data.attendanceHistory || [];
  const checkedInToday = (data.todayStatus || "").toLowerCase().startsWith("checked");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section
        className={`rounded-2xl p-5 shadow-card sm:p-6 ${
          checkedInToday ? "bg-ink-900 text-white" : "border border-ink-100 bg-white"
        }`}
      >
        <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${checkedInToday ? "text-aqua-300" : "text-ink-400"}`}>
          Today
        </p>
        <p className={`mt-2 font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[26px] ${checkedInToday ? "text-white" : "text-ink-950"}`}>
          {checkedInToday ? data.todayStatus : "No check-in recorded yet"}
        </p>
        <p className={`mt-2 text-sm leading-6 ${checkedInToday ? "text-ink-200" : "text-ink-600"}`}>
          {checkedInToday
            ? "Your entry was scanned at the reception gate."
            : "Attendance is recorded when your pass is scanned at the reception gate."}
        </p>
      </section>

      <section aria-label="Attendance summary" className="grid gap-4 sm:grid-cols-3">
        <Stat icon={CalendarCheck} label={`In ${monthName}`} value={data.monthlyAttendance} hint={data.monthlyAttendance === 1 ? "session attended" : "sessions attended"} />
        <Stat icon={CalendarDays} label="This week" value={data.weeklyAttendance} hint={data.weeklyAttendance === 1 ? "session attended" : "sessions attended"} />
        <Stat icon={Waves} label="All time" value={data.totalAttendance} hint={relativeDay(data.lastVisit) ? `Last visit ${relativeDay(data.lastVisit)}` : "No visits recorded yet"} />
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white shadow-card">
        <header className="border-b border-ink-100 px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold text-ink-950">Visit history</h2>
          <p className="mt-1 text-sm text-ink-600">Every recorded entry, most recent first.</p>
        </header>

        {history.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600 ring-1 ring-inset ring-aqua-400/20">
              <CalendarDays className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink-950">No visits recorded yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-ink-600">
              Your visits appear here once your pass is scanned at the gate.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {history.map((entry) => (
              <li key={`${entry.date}-${entry.time}`} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{formatDay(entry.date)}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-600">
                    <Clock3 className="h-3.5 w-3.5 text-ink-400" />
                    {entry.time}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {entry.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Deliberately no percentage. It would need the weekdays each batch runs on, which the
          academy does not record yet, so any figure shown here would be guesswork. */}
      <p className="px-1 text-sm leading-6 text-ink-600">
        Counts reflect entries scanned at the reception gate. If a visit is missing, please mention it at reception.
      </p>
    </div>
  );
}
