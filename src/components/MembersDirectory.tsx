import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Download,
  ArrowRightLeft, Eye, Filter, Mail, MapPin, Phone, RefreshCw, Search, UserRound, UsersRound, X,
  AlertTriangle, Trash2
} from "lucide-react";
import type { AcademyId } from "../types";
import type { MemberPresentationStatus } from "../utils/member-presentation";
import { buildMemberDirectoryParams, MEMBER_DIRECTORY_PAGE_SIZE } from "../utils/member-directory";

type DirectoryMember = {
  id: number;
  membershipNo: string;
  applicationNumber?: string;
  fullName: string;
  photoUrl?: string | null;
  mobileNo: string;
  email?: string | null;
  age?: number;
  typeOfMembership?: string;
  planDurationMonths?: number | null;
  batchName?: string | null;
  batchStartTime?: string | null;
  batchEndTime?: string | null;
  membership_end_date?: string | null;
  daysRemaining?: number | null;
  presentationStatus: MemberPresentationStatus | "Archived";
  membership_status?: string;
  payment_status?: string;
  deletedAt?: string | null;
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type Tab = "overview" | "payments" | "communication" | "activity";

const statusStyles: Record<MemberPresentationStatus | "Archived", string> = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Pending Payment": "border-amber-200 bg-amber-50 text-amber-700",
  "Expiring Soon": "border-orange-200 bg-orange-50 text-orange-700",
  Expired: "border-rose-200 bg-rose-50 text-rose-700",
  Inactive: "border-slate-200 bg-slate-100 text-slate-600",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Archived: "border-slate-400 bg-slate-800 text-white"
};

function sessionToken() {
  try { return JSON.parse(localStorage.getItem("sams_session") || "{}")?.token || ""; } catch { return ""; }
}

function authHeaders(): HeadersInit {
  const token = sessionToken();
  return token ? { "x-session-token": token } : {};
}

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function durationLabel(months?: number | null) {
  if (!months) return "Duration not configured";
  if (months === 12) return "Annual";
  return `${months} month${months === 1 ? "" : "s"}`;
}

function Avatar({ member, large = false }: { member: Pick<DirectoryMember, "fullName" | "photoUrl">; large?: boolean }) {
  const size = large ? "h-16 w-16 rounded-2xl text-xl" : "h-10 w-10 rounded-xl text-sm";
  return member.photoUrl ? (
    <img src={member.photoUrl} alt={`${member.fullName} profile`} className={`${size} shrink-0 border border-slate-200 object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center border border-slate-200 bg-slate-100 font-bold text-slate-600`}>
      {String(member.fullName || "M").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status: MemberPresentationStatus | "Archived" }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyles[status] || statusStyles.Inactive}`}>{status}</span>;
}

function DetailItem({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value || "Not recorded"}</dd></div>;
}

export function MembersDirectory({ academyId, userRole }: { academyId: AcademyId; userRole: string }) {
  const [items, setItems] = useState<DirectoryMember[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [planId, setPlanId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<DirectoryMember | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [paymentPage, setPaymentPage] = useState(1);
  const [archiveState, setArchiveState] = useState<"current" | "archived">("current");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, status, planId, batchId, academyId, archiveState]);

  useEffect(() => {
    Promise.all([
      fetch("/api/membership-plans").then(r => r.ok ? r.json() : []),
      fetch("/api/batches").then(r => r.ok ? r.json() : [])
    ]).then(([planRows, batchRows]) => {
      setPlans((Array.isArray(planRows) ? planRows : []).filter((plan: any) => plan.is_active !== 0));
      setBatches((Array.isArray(batchRows) ? batchRows : []).filter((batch: any) => !batch.academy_id || batch.academy_id === academyId));
    }).catch(() => { /* directory remains usable without optional filter metadata */ });
  }, [academyId]);

  useEffect(() => {
    const controller = new AbortController();
    const params = buildMemberDirectoryParams({ page, academyId, search: debouncedSearch, status: status as MemberPresentationStatus | "", planId, batchId, archiveState });
    setLoading(true); setError("");
    fetch(`/api/members?${params}`, { headers: authHeaders(), signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Member directory could not be loaded.");
        return body;
      })
      .then(body => {
        setItems(Array.isArray(body.items) ? body.items : []);
        setPagination({ page: body.page || 1, pageSize: body.pageSize || MEMBER_DIRECTORY_PAGE_SIZE, total: body.total || 0, totalPages: body.totalPages || 1 });
      })
      .catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, debouncedSearch, status, planId, batchId, academyId, archiveState, refreshKey]);

  useEffect(() => {
    const refresh = () => setRefreshKey(key => key + 1);
    window.addEventListener("sams_member_registered", refresh);
    window.addEventListener("sams_member_updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("sams_member_registered", refresh);
      window.removeEventListener("sams_member_updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!selected) { setProfile(null); return; }
    const controller = new AbortController();
    setProfileLoading(true); setProfileError("");
    fetch(`/api/members/profile/${encodeURIComponent(selected.membershipNo)}?paymentPage=${paymentPage}&paymentPageSize=10${archiveState === "archived" ? "&archived=1" : ""}`, {
      headers: authHeaders(), signal: controller.signal
    }).then(async response => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Member profile could not be loaded.");
      return body;
    }).then(setProfile).catch(err => { if (err.name !== "AbortError") setProfileError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [selected, paymentPage, archiveState]);

  const hasFilters = Boolean(search || status || planId || batchId);
  const resetFilters = () => { setSearch(""); setStatus(""); setPlanId(""); setBatchId(""); setPage(1); };
  const openProfile = (member: DirectoryMember) => { setSelected(member); setTab("overview"); setPaymentPage(1); };
  const closeProfile = () => setSelected(null);
  const memberArchived = (result: any) => {
    const membershipNo = selected?.membershipNo;
    if (!membershipNo) return;
    setItems(previous => previous.filter(member => member.membershipNo !== membershipNo));
    setPagination(previous => ({ ...previous, total: Math.max(0, previous.total - 1), totalPages: Math.max(1, Math.ceil(Math.max(0, previous.total - 1) / previous.pageSize)) }));
    if (items.length === 1 && page > 1) setPage(current => current - 1);
    setSelected(null);
    setToast(`${result?.member?.memberName || "Member"} was removed from the active directory. Financial history was retained.`);
    setRefreshKey(key => key + 1);
    window.dispatchEvent(new CustomEvent("sams_member_updated", { detail: { membershipNo, action: "MEMBER_ARCHIVED" } }));
    if (result?.member?.releasedBatchId) window.dispatchEvent(new CustomEvent("sams_batch_assignment_changed", { detail: { membershipNo, batchId: result.member.releasedBatchId } }));
  };

  return <section className="space-y-5" aria-labelledby="members-directory-heading">
    <header className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Membership operations</p><h2 id="members-directory-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Members Directory</h2><p className="mt-1 text-sm text-slate-500">Search and review current membership records.</p></div>
      <div className="flex flex-wrap items-center gap-3">{["admin","super_admin"].includes(userRole)&&<div className="flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={()=>setArchiveState("current")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${archiveState==="current"?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>Current Members</button><button type="button" onClick={()=>setArchiveState("archived")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${archiveState==="archived"?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>Archived Members</button></div>}<span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{pagination.total.toLocaleString("en-IN")} members</span><button type="button" onClick={() => setRefreshKey(k => k + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div>
    </header>
    {toast && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={()=>setToast("")}><X className="h-4 w-4"/></button></div>}

    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_200px_200px_auto]">
        <label className="relative"><span className="sr-only">Search members</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, membership no., mobile or email" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
        <label><span className="sr-only">Status</span><select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700"><option value="">All statuses</option>{Object.keys(statusStyles).filter(value=>value!=="Archived").map(value => <option key={value}>{value}</option>)}</select></label>
        <label><span className="sr-only">Membership plan</span><select value={planId} onChange={e => setPlanId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700"><option value="">All plans</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
        <label><span className="sr-only">Batch</span><select value={batchId} onChange={e => setBatchId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700"><option value="">All batches</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.batch_name}</option>)}</select></label>
        {hasFilters && <button type="button" onClick={resetFilters} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Clear</button>}
      </div>
    </div>

    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
      {error ? <div className="flex flex-col items-center py-16 text-center"><div className="rounded-full bg-rose-50 p-3 text-rose-600"><Filter className="h-5 w-5"/></div><p className="mt-3 font-bold text-slate-900">Directory unavailable</p><p className="mt-1 text-sm text-slate-500">{error}</p><button onClick={() => setRefreshKey(k => k + 1)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Try again</button></div> : loading ? <DirectorySkeleton /> : items.length === 0 ? <div className="flex flex-col items-center py-16 text-center"><UsersRound className="h-9 w-9 text-slate-300"/><p className="mt-3 font-bold text-slate-900">No members found</p><p className="mt-1 text-sm text-slate-500">{hasFilters ? "Try changing the search or filters." : "Member records will appear here."}</p></div> : <>
        <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">{items.map(member => <button type="button" key={member.id} onClick={() => openProfile(member)} aria-label={`Open full profile for ${member.fullName}`} className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_38px_rgba(14,165,233,0.12)] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"><span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400"/><div className="flex items-start gap-3 pt-1"><Avatar member={member}/><div className="min-w-0 flex-1"><p className="truncate text-base font-black !text-slate-950" style={{ color: "#0f172a" }}>{member.fullName || "Unnamed member"}</p><p className="mt-1 text-xs font-bold tracking-wide text-sky-700">{member.membershipNo || member.applicationNumber || "ID not assigned"}</p></div><StatusBadge status={member.presentationStatus}/></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Membership plan</p><p className="mt-1 truncate text-sm font-extrabold !text-slate-900" title={member.typeOfMembership}>{member.typeOfMembership || "No plan assigned"}</p><p className="mt-1 text-xs text-slate-500">{durationLabel(member.planDurationMonths)}</p></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3"><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Batch</dt><dd className="mt-1 truncate text-xs font-bold !text-slate-800">{member.batchName || "Not assigned"}</dd><dd className="mt-0.5 truncate text-[11px] text-slate-500">{member.batchStartTime && member.batchEndTime ? `${member.batchStartTime} – ${member.batchEndTime}` : "No schedule"}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Expiry</dt><dd className="mt-1 text-xs font-bold !text-slate-800">{dateLabel(member.membership_end_date)}</dd><dd className="mt-0.5 text-[11px] text-slate-500">{member.daysRemaining == null ? "Validity not recorded" : member.daysRemaining < 0 ? `${Math.abs(member.daysRemaining)} days overdue` : `${member.daysRemaining} days remaining`}</dd></div><div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Registered mobile</dt><dd className="mt-1 text-xs font-bold !text-slate-800">{member.mobileNo || "Not recorded"}</dd></div></dl><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-semibold text-slate-500">Open registration record</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition group-hover:bg-sky-600 group-hover:text-white"><Eye className="h-4 w-4"/></span></div></button>)}</div>
      </>}
      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Page <strong className="text-slate-800">{pagination.page}</strong> of <strong className="text-slate-800">{pagination.totalPages}</strong> · showing up to {pagination.pageSize}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage(p => p + 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div></footer>
    </div>
    {selected && <MemberProfileDrawer member={selected} profile={profile} loading={profileLoading} error={profileError} tab={tab} onTab={setTab} onClose={closeProfile} paymentPage={paymentPage} onPaymentPage={setPaymentPage} canDelete={["admin","super_admin"].includes(userRole)&&archiveState==="current"} archived={archiveState==="archived"} onArchived={memberArchived} onMoved={(batch)=>{setItems(previous=>previous.map(item=>item.membershipNo===selected.membershipNo?{...item,batchName:batch.batchName,batchStartTime:batch.startTime,batchEndTime:batch.endTime}:item));setSelected(previous=>previous?{...previous,batchName:batch.batchName,batchStartTime:batch.startTime,batchEndTime:batch.endTime}:previous);setRefreshKey(key=>key+1);window.dispatchEvent(new CustomEvent("sams_batch_assignment_changed",{detail:{membershipNo:selected.membershipNo,batchId:batch.id}}));}} />}
  </section>;
}

function DirectorySkeleton() {
  return <div aria-label="Loading members" className="animate-pulse divide-y divide-slate-100">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="flex items-center gap-4 px-5 py-5"><div className="h-10 w-10 rounded-xl bg-slate-200"/><div className="h-4 w-40 rounded bg-slate-200"/><div className="ml-auto h-4 w-28 rounded bg-slate-100"/><div className="h-7 w-20 rounded-full bg-slate-100"/></div>)}</div>;
}

function MemberProfileDrawer({ member, profile, loading, error, tab, onTab, onClose, paymentPage, onPaymentPage,onMoved,canDelete,archived,onArchived }: { member: DirectoryMember; profile: any; loading: boolean; error: string; tab: Tab; onTab: (tab: Tab) => void; onClose: () => void; paymentPage: number; onPaymentPage: (page: number) => void;onMoved:(batch:any)=>void;canDelete:boolean;archived:boolean;onArchived:(result:any)=>void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const[changeBatchOpen,setChangeBatchOpen]=useState(false);
  const[deleteOpen,setDeleteOpen]=useState(false);
  useEffect(() => {
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [member.membershipNo, tab]);
  const personal = profile?.personalDetails || {};
  const lifecycle = profile?.lifecycle || { presentationStatus: member.presentationStatus };
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Registration Details" }, { id: "payments", label: "Payments" },
    { id: "communication", label: "Communication" }, { id: "activity", label: "Activity" }
  ];
  return <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="member-profile-title"><button aria-label="Close member profile" className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose}/><aside className="absolute inset-y-0 right-0 flex w-full max-w-4xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300"><header className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-7"><div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl"/><div className="relative flex items-start gap-4"><Avatar member={member} large/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">{archived?"Archived Member Profile":"Member Profile"}</p><h2 id="member-profile-title" className="mt-1 truncate text-2xl font-black !text-white">{member.fullName || personal.fullName}</h2><div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300"><span>{member.membershipNo}</span><span aria-hidden="true">•</span><span>{member.typeOfMembership || "No plan assigned"}</span>{member.batchName && <><span aria-hidden="true">•</span><span>{member.batchName}</span></>}{archived?<span className="rounded-full border border-slate-500 bg-slate-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-200">Archived</span>:<StatusBadge status={lifecycle.presentationStatus || member.presentationStatus}/>}</div></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close profile" className="rounded-xl border border-white/15 bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5"/></button></div></header><nav className="overflow-x-auto border-b border-slate-200 bg-white px-5 sm:px-7" aria-label="Member profile sections"><div className="flex min-w-max gap-5">{tabs.map(item => <button type="button" key={item.id} onClick={() => onTab(item.id)} className={`border-b-2 py-3 text-sm font-bold ${tab === item.id ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{item.label}</button>)}</div></nav><main ref={contentRef} className="flex-1 overflow-y-auto bg-slate-50/70 p-5 sm:p-7">{loading && !profile ? <DirectorySkeleton/> : error ? <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center"><p className="font-bold text-rose-700">{error}</p></div> : profile ? <>
    {tab === "overview" && <div className="space-y-8"><RegistrationRecord profile={profile} member={member} lifecycle={lifecycle}/>{canDelete&&<DangerZone member={member} onDelete={()=>setDeleteOpen(true)}/>}</div>} 
    {tab === "payments" && <PaymentHistory profile={profile} page={paymentPage} onPage={onPaymentPage}/>} 
    {tab === "communication" && <CommunicationHistory rows={profile.communicationHistory || []} latestPayment={profile.paymentHistory?.[0]}/>} 
    {tab === "activity" && <ActivityHistory profile={profile}/>} 
  </> : null}</main>{profile && <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">{!archived&&<button type="button" onClick={()=>setChangeBatchOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-50"><ArrowRightLeft className="h-4 w-4"/>Change Batch</button>}<button type="button" onClick={() => onTab("payments")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">View Payments</button>{profile.paymentHistory?.[0]?.invoice_url && <a href={profile.paymentHistory[0].invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Download className="h-4 w-4"/>Download Latest Invoice</a>}</footer>}</aside>{changeBatchOpen&&<ChangeBatchModal member={member} profile={profile} onClose={()=>setChangeBatchOpen(false)} onMoved={batch=>{onMoved(batch);setChangeBatchOpen(false);}}/>}{deleteOpen&&<DeleteMemberConfirmation member={member} profile={profile} lifecycle={lifecycle} onClose={()=>setDeleteOpen(false)} onArchived={onArchived}/>}</div>;
}

function DangerZone({member,onDelete}:{member:DirectoryMember;onDelete:()=>void}){
  return <section className="rounded-[18px] border border-red-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.18em] text-red-600">Danger Zone</p><h3 className="mt-2 text-base font-black text-slate-950">Delete Member</h3><p className="mt-1 max-w-xl text-sm text-slate-500">Remove {member.fullName} from operational SAMS records and immediately revoke their member access.</p></div><button type="button" onClick={onDelete} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4"/>Delete Member</button></div></section>;
}

function DeleteMemberConfirmation({member,profile,lifecycle,onClose,onArchived}:{member:DirectoryMember;profile:any;lifecycle:any;onClose:()=>void;onArchived:(result:any)=>void}){
  const[confirmation,setConfirmation]=useState("");const[acknowledgeActiveMembership,setAcknowledgeActiveMembership]=useState(false);const[error,setError]=useState("");const[deleting,setDeleting]=useState(false);
  const membershipStatus=String(lifecycle.membershipStatus||member.membership_status||member.presentationStatus||"Inactive");
  const paymentStatus=String(lifecycle.paymentStatus||member.payment_status||"Not recorded");
  const selection=profile?.registrationRecord?.membershipSelection||{};
  const isActive=membershipStatus.toLowerCase()==="active";
  useEffect(()=>{const key=(event:KeyboardEvent)=>event.key==="Escape"&&onClose();window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[onClose]);
  const remove=async()=>{if(confirmation!=="DELETE"||(isActive&&!acknowledgeActiveMembership))return;setDeleting(true);setError("");try{const response=await fetch(`/api/members/${encodeURIComponent(member.membershipNo)}`,{method:"DELETE",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({confirmation,acknowledgeActiveMembership})});const body=await response.json().catch(()=>({}));if(!response.ok||!body.success)throw new Error(typeof body.error==="string"?body.error:body.error?.message||"Unable to delete this member.");onArchived(body);}catch(requestError:any){setError(requestError?.message||"Unable to delete this member.");}finally{setDeleting(false);}};
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-member-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertTriangle className="h-5 w-5"/></div><p className="mt-5 text-[11px] font-black uppercase tracking-[.18em] text-red-600">Delete Member</p><h2 id="delete-member-title" className="mt-1 text-xl font-black text-slate-950">Confirm member deletion</h2><dl className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"><DetailItem label="Member Name" value={member.fullName}/><DetailItem label="Membership No." value={member.membershipNo}/><DetailItem label="Membership Status" value={membershipStatus}/><DetailItem label="Plan" value={selection.planName||member.typeOfMembership||"Not assigned"}/><DetailItem label="Batch" value={selection.batchName||member.batchName||"Not assigned"}/><DetailItem label="Payment Status" value={paymentStatus}/></dl><p className={`mt-5 rounded-xl border p-4 text-sm font-semibold leading-6 ${isActive?"border-red-200 bg-red-50 text-red-900":"border-amber-200 bg-amber-50 text-amber-900"}`}>{isActive?"Warning: This member currently has an active membership. Deleting them will immediately revoke their SAMS access and remove them from operational member and batch lists. Historical payment and invoice records will be retained.":"Deleting this member removes them from operational SAMS records. Historical financial records will be retained where required."}</p>{isActive&&<label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-red-200 p-4 text-sm font-semibold text-slate-800"><input type="checkbox" checked={acknowledgeActiveMembership} onChange={event=>{setAcknowledgeActiveMembership(event.target.checked);setError("");}} className="mt-0.5 h-4 w-4 accent-red-600"/><span>I understand this member currently has an active membership.</span></label>}<label className="mt-5 block text-xs font-bold text-slate-700">Type DELETE to confirm<input autoFocus value={confirmation} onChange={event=>{setConfirmation(event.target.value);setError("");}} autoComplete="off" className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-black outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"/></label>{error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}<div className="mt-6 flex gap-3"><button type="button" onClick={onClose} disabled={deleting} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Cancel</button><button type="button" onClick={remove} disabled={deleting||confirmation!=="DELETE"||(isActive&&!acknowledgeActiveMembership)} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45">{deleting?"Deleting…":"Delete Member"}</button></div></section></div>;
}

function ChangeBatchModal({member,profile,onClose,onMoved}:{member:DirectoryMember;profile:any;onClose:()=>void;onMoved:(batch:any)=>void}){
  const[options,setOptions]=useState<any[]>([]);const[target,setTarget]=useState("");const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState("");
  const selection=profile?.registrationRecord?.membershipSelection||{};const currentId=Number(selection.batchId||0);
  useEffect(()=>{fetch("/api/admin/batches/assignment-options",{headers:authHeaders()}).then(async response=>{const body=await response.json().catch(()=>({}));if(!response.ok||!body.success)throw new Error(typeof body.error==="string"?body.error:body.error?.message||"Unable to load batches.");return body.batches||[];}).then(setOptions).catch(requestError=>setError(requestError.message)).finally(()=>setLoading(false));},[]);
  const move=async()=>{const batchId=Number(target);if(!batchId)return setError("Select a new batch.");setSaving(true);setError("");try{const response=await fetch(`/api/members/change-batch/${encodeURIComponent(member.membershipNo)}`,{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify({batchId})});const body=await response.json().catch(()=>({}));if(!response.ok||!body.success)throw new Error(typeof body.error==="string"?body.error:body.error?.message||"Unable to change batch.");const chosen=options.find(batch=>batch.id===batchId);onMoved(chosen);}catch(requestError:any){setError(requestError.message||"Unable to change batch.");}finally{setSaving(false);}};
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4"><section role="dialog" aria-modal="true" aria-labelledby="change-batch-title" className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-600">Member assignment</p><h2 id="change-batch-title" className="mt-1 text-xl font-black text-slate-950">Change Batch</h2></div><button onClick={onClose} aria-label="Close change batch"><X className="h-5 w-5"/></button></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Current Batch</p><p className="mt-1 font-black text-slate-900">{selection.batchName||member.batchName||"Not assigned"}</p><p className="mt-1 text-xs text-slate-500">{selection.batchStartTime&&selection.batchEndTime?`${selection.batchStartTime} – ${selection.batchEndTime}`:"Time not recorded"}</p></div><label className="mt-5 block text-xs font-bold text-slate-700">New Batch<select value={target} onChange={event=>{setTarget(event.target.value);setError("");}} disabled={loading} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value="">{loading?"Loading…":"Select available batch"}</option>{options.filter(batch=>batch.id!==currentId).map(batch=><option key={batch.id} value={batch.id}>{batch.batchName} · {batch.startTime}–{batch.endTime} · {batch.availableSeats} available</option>)}</select></label>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}<div className="mt-6 flex gap-3"><button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Cancel</button><button onClick={move} disabled={saving||!target} className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?"Moving…":"Confirm Move"}</button></div></section></div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-5 flex items-center gap-2 text-sm font-black text-slate-900">{icon}{title}</h3>{children}</section>; }

function readableCode(value?: string | null) {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/\b\w/g, character => character.toUpperCase());
}

function RegistrationRecord({ profile, member, lifecycle }: { profile: any; member: DirectoryMember; lifecycle: any }) {
  const record = profile.registrationRecord || {};
  const identity = record.identity || {};
  const contact = record.contact || {};
  const emergency = record.emergencyContact || {};
  const medical = record.medicalDeclaration || {};
  const selection = record.membershipSelection || {};
  const application = record.application || {};
  const address = [contact.address, contact.city, contact.state, contact.pincode].filter(Boolean).join(", ");
  const hasCondition = String(medical.hasMedicalCondition || "No").toLowerCase() === "yes"
    || medical.hasMedicalCondition === true || medical.hasMedicalCondition === 1;
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[20px] border border-sky-100 bg-white shadow-sm"><div className="bg-gradient-to-r from-sky-50 to-cyan-50 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-sky-700">Submitted registration record</p><p className="mt-1 text-sm text-slate-600">These are the details saved from this member’s registration form.</p></div><div className="grid gap-4 p-5 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Application number</p><p className="mt-1 font-black !text-slate-950">{application.applicationNumber || member.applicationNumber || "Not assigned"}</p></div><div><p className="text-xs text-slate-500">Submitted</p><p className="mt-1 font-black !text-slate-950">{dateLabel(application.submittedAt)}</p></div><div><p className="text-xs text-slate-500">Current status</p><div className="mt-1"><StatusBadge status={lifecycle.presentationStatus || member.presentationStatus}/></div></div></div></section>

    <Section title="Personal information" icon={<UserRound className="h-4 w-4"/>}><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><DetailItem wide label="Full name" value={identity.fullName}/><DetailItem label="Date of birth" value={dateLabel(identity.dateOfBirth)}/><DetailItem label="Age" value={identity.age == null ? null : `${identity.age} years`}/><DetailItem label="Gender" value={identity.gender}/><DetailItem label="Blood group" value={identity.bloodGroup}/><DetailItem label="Registered mobile" value={contact.mobileNumber}/><DetailItem wide label="Email" value={contact.email}/><DetailItem wide label="Residential address" value={address}/></dl></Section>

    <Section title="Emergency contact" icon={<Phone className="h-4 w-4"/>}><dl className="grid gap-5 sm:grid-cols-3"><DetailItem label="Contact name" value={emergency.name}/><DetailItem label="Contact number" value={emergency.number}/><DetailItem label="Relationship" value={emergency.relationship}/></dl></Section>

    <Section title="Membership selected in the form" icon={<CalendarDays className="h-4 w-4"/>}><div className="rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300">Selected plan</p><p className="mt-2 text-xl font-black !text-white">{selection.planName || member.typeOfMembership || "No plan stored"}</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Membership type</p><p className="mt-1 font-bold !text-white">{readableCode(selection.membershipType) || "Not recorded"}</p></div><div><p className="text-xs text-slate-400">Schedule</p><p className="mt-1 font-bold !text-white">{readableCode(selection.scheduleVariant) || "Not recorded"}</p></div><div><p className="text-xs text-slate-400">Duration</p><p className="mt-1 font-bold !text-white">{readableCode(selection.durationCode) || durationLabel(selection.durationMonths)}</p></div></div></div><dl className="mt-5 grid gap-5 sm:grid-cols-2"><DetailItem label="Selected batch" value={selection.batchName}/><DetailItem label="Batch time" value={selection.batchStartTime && selection.batchEndTime ? `${selection.batchStartTime} – ${selection.batchEndTime}` : null}/><DetailItem label="Membership start" value={dateLabel(profile.membershipDetails?.startDate)}/><DetailItem label="Membership expiry" value={dateLabel(profile.membershipDetails?.expiryDate)}/></dl><div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-3 text-sm"><span className="text-slate-500">Membership fee</span><strong className="text-right !text-slate-900">{money(selection.membershipFee)}</strong></div><div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-3 text-sm"><span className="text-slate-500">Registration fee</span><strong className="text-right !text-slate-900">{money(selection.registrationFee)}</strong></div><div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-3 text-sm"><span className="text-slate-500">Co-charge</span><strong className="text-right !text-slate-900">{money(selection.coCharge)}</strong></div><div className="grid grid-cols-2 gap-3 bg-sky-50 px-4 py-4"><span className="font-black text-sky-900">Total payable</span><strong className="text-right text-lg !text-sky-900">{money(selection.totalPayable)}</strong></div></div></Section>

    <Section title="Medical declaration" icon={<Clock3 className="h-4 w-4"/>}><dl className="grid gap-5 sm:grid-cols-2"><DetailItem label="Medical condition declared" value={hasCondition ? "Yes" : "No"}/><DetailItem label="Details supplied in form" value={hasCondition ? medical.details : "No medical condition declared"}/></dl></Section>
  </div>;
}

function PaymentHistory({ profile, page, onPage }: { profile: any; page: number; onPage: (page: number) => void }) {
  const rows = profile.paymentHistory || []; const paging = profile.paymentPagination || {};
  return <Section title="Payment history" icon={<CircleDollarSign className="h-4 w-4"/>}>{rows.length ? <div className="space-y-3">{rows.map((payment: any) => <article key={payment.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{payment.payment_type || "Payment"}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(payment.payment_date || payment.created_at)} · {payment.payment_method || "Method not recorded"}</p></div><div className="text-right"><p className="font-black text-slate-950">{money(payment.amount)}</p><p className="mt-1 text-xs font-bold text-emerald-700">{payment.payment_status}</p></div></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">{payment.razorpay_payment_id && <span>Transaction {payment.razorpay_payment_id}</span>}{payment.receipt_no && <span>Receipt {payment.receipt_no}</span>}{payment.invoice_no && <span>Invoice {payment.invoice_no}</span>}{payment.invoice_url && <a href={payment.invoice_url} target="_blank" rel="noreferrer" className="font-bold text-sky-700">Download invoice</a>}</div></article>)}<div className="flex items-center justify-between pt-2 text-sm text-slate-500"><span>{paging.total || rows.length} payments</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><button disabled={page >= (paging.totalPages || 1)} onClick={() => onPage(page + 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></div></div> : <EmptySection text="No payments recorded for this member."/>}</Section>;
}

function CommunicationHistory({ rows, latestPayment }: { rows: any[]; latestPayment?: any }) { return <div className="space-y-5">{latestPayment && <Section title="Latest payment delivery" icon={<Mail className="h-4 w-4"/>}><dl className="grid gap-5 sm:grid-cols-2"><DetailItem label="Payment-success WhatsApp" value={latestPayment.payment_success_whatsapp_status}/><DetailItem label="Invoice WhatsApp" value={latestPayment.invoice_whatsapp_status}/></dl></Section>}<Section title="Communication history" icon={<Mail className="h-4 w-4"/>}>{rows.length ? <div className="space-y-3">{rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-4"><div><p className="font-bold text-slate-900">{row.message_title}</p><p className="mt-1 text-xs text-slate-500">{row.event_key} · {dateLabel(row.created_at)}</p></div><span className="text-xs font-bold text-slate-700">{row.status}</span></div><p className="mt-3 text-xs text-slate-500">WhatsApp: {row.channel_whatsapp || "Not attempted"} · SMS: {row.channel_sms || "Not attempted"} · Email: {row.channel_email || "Not attempted"}</p></article>)}</div> : <EmptySection text="No stored communication history."/>}</Section></div>; }

function ActivityHistory({ profile }: { profile: any }) {
  const events = useMemo(() => {
    const result: { key: string; title: string; detail: string; date: string }[] = [];
    const personal = profile.personalDetails || {};
    if (personal.createdAt || personal.registrationDate) result.push({ key: "registration", title: "Registration submitted", detail: personal.membershipNo || personal.applicationNumber || "Member registration", date: personal.createdAt || personal.registrationDate });
    for (const payment of profile.paymentHistory || []) result.push({ key: `payment-${payment.id}`, title: `${payment.payment_type || "Payment"} · ${payment.payment_status}`, detail: `${money(payment.amount)} via ${payment.payment_method || "unrecorded method"}`, date: payment.payment_date || payment.created_at });
    for (const renewal of profile.renewalHistory || []) result.push({ key: `renewal-${renewal.id}`, title: "Membership renewal", detail: renewal.status || "Recorded", date: renewal.renewal_date || renewal.created_at });
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [profile]);
  return <Section title="Member activity" icon={<Clock3 className="h-4 w-4"/>}>{events.length ? <ol className="space-y-4">{events.map(event => <li key={event.key} className="relative border-l-2 border-slate-200 pl-5"><span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-sky-600"/><p className="font-bold text-slate-900">{event.title}</p><p className="mt-1 text-sm text-slate-500">{event.detail}</p><time className="mt-1 block text-xs text-slate-400">{dateLabel(event.date)}</time></li>)}</ol> : <EmptySection text="No supported member activity is stored yet."/>}</Section>;
}

function EmptySection({ text }: { text: string }) { return <div className="py-8 text-center"><MapPin className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-2 text-sm text-slate-500">{text}</p></div>; }
