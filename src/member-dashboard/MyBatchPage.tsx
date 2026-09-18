import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BatchEmptyState } from "./BatchEmptyState";
import { BatchHeroCard } from "./BatchHeroCard";
import { BatchQuickActions } from "./BatchQuickActions";
import { BatchSessionDetails } from "./BatchSessionDetails";
import { BatchSkeleton } from "./BatchSkeleton";
import type { MemberBatchResponse } from "./batch-data";
import type { MemberSection } from "./member-navigation";

export function MyBatchPage({ onNavigate }: { onNavigate: (section: MemberSection) => void }) {
  const [data, setData] = useState<MemberBatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadBatch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/member/batch", { credentials: "same-origin", signal });
      if (!response.ok) throw new Error("batch unavailable");
      const result = await response.json();
      setData({ batch: result?.batch || null });
    } catch (requestError: any) {
      if (requestError?.name !== "AbortError") setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBatch(controller.signal);
    return () => controller.abort();
  }, [loadBatch]);

  if (loading) return <BatchSkeleton />;

  return <div className="mx-auto max-w-5xl space-y-6 lg:space-y-7">
    <header><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">My Batch</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">View your current swimming batch and session details.</p></header>
    {error ? <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-8"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><RefreshCw className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-semibold text-slate-950">We couldn't load your batch details.</h2><p className="mt-1 text-sm text-slate-500">Please try again in a moment.</p><button type="button" onClick={() => void loadBatch()} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">Try again</button></section>
      : data?.batch ? <><BatchHeroCard batch={data.batch} /><BatchSessionDetails batch={data.batch} /><BatchQuickActions onNavigate={onNavigate} /></>
      : <BatchEmptyState onSupport={() => onNavigate("support")} />}
  </div>;
}
