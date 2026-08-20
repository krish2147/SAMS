import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Activity, Clock, User, Search, Filter, RefreshCw, 
  UserPlus, CheckCircle2, CreditCard, RefreshCw as RenewalIcon, 
  Settings, LogIn, CircleAlert, HelpCircle
} from "lucide-react";

interface ActivityItem {
  id?: number;
  userName: string;
  action: string;
  date_time: string;
  status: string;
  performedBy: string;
}

interface ActivityTabProps {
  getSessionToken: () => string;
}

export function ActivityTab({ getSessionToken }: ActivityTabProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchActivities = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/activities", {
        headers: token ? { "x-session-token": token } : {}
      });
      if (!res.ok) {
        throw new Error("Failed to fetch activity records from database");
      }
      const data = await res.json().catch(() => []);
      if (Array.isArray(data)) {
        setActivities(data);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Unable to connect to database activities service.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Filter and search activities
  const filteredActivities = activities.filter(act => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      act.userName.toLowerCase().includes(query) || 
      act.action.toLowerCase().includes(query) || 
      act.performedBy.toLowerCase().includes(query);

    if (filterType === "All") return matchesSearch;
    if (filterType === "Registrations") return matchesSearch && act.action.toLowerCase().includes("registration");
    if (filterType === "Approvals") return matchesSearch && act.action.toLowerCase().includes("approved");
    if (filterType === "Payments") return matchesSearch && act.action.toLowerCase().includes("payment");
    if (filterType === "Renewals") return matchesSearch && act.action.toLowerCase().includes("renewal");
    if (filterType === "Logins") return matchesSearch && act.action.toLowerCase().includes("login");
    if (filterType === "Updates") return matchesSearch && act.action.toLowerCase().includes("update");
    return matchesSearch;
  });

  const getActivityIcon = (action: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes("registration")) return <UserPlus className="h-5 w-5 text-indigo-500" />;
    if (actLower.includes("approved")) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (actLower.includes("payment")) return <CreditCard className="h-5 w-5 text-amber-500" />;
    if (actLower.includes("renewal")) return <RenewalIcon className="h-5 w-5 text-cyan-500" />;
    if (actLower.includes("update")) return <Settings className="h-5 w-5 text-sky-500" />;
    if (actLower.includes("login")) return <LogIn className="h-5 w-5 text-pink-500" />;
    return <Activity className="h-5 w-5 text-slate-500" />;
  };

  const getStatusBadge = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "success" || lower === "approved" || lower === "paid") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {status}
        </span>
      );
    }
    if (lower === "rejected" || lower === "failed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-250">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-5">
        <div>
          <span className="text-xs font-black tracking-widest text-sky-600 uppercase block mb-1">AUDIT TRAILS</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Recent Activity</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-time chronologic log of all transactions, member operations, logins, and approvals.</p>
        </div>
        
        <button
          onClick={fetchActivities}
          disabled={isRefreshing}
          className="self-start md:self-center inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-2xl shadow-xs text-xs md:text-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh Logs"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-start gap-3">
          <CircleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-bold text-amber-800">Operational Notice</h5>
            <p className="text-xs text-amber-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities by member name, action, or admin..."
            className="w-full bg-slate-50/70 text-slate-800 text-sm pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:bg-white transition-all text-left placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-2 block md:inline">Filter Type:</span>
          {["All", "Registrations", "Approvals", "Payments", "Renewals", "Logins"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterType === type
                  ? "bg-sky-600 border-sky-600 text-white shadow-xs"
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* TIMELINE SECTION */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="h-10 w-10 text-slate-300 mx-auto stroke-1" />
            <p className="text-slate-500 font-medium mt-3">No activity matching the filters was found.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8 py-2">
            {filteredActivities.map((act, index) => (
              <motion.div 
                key={act.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-slate-50/50 rounded-2xl transition-all group"
              >
                {/* Visual Connector Dot */}
                <div className="absolute -left-[35px] md:-left-[43px] top-7 h-8 w-8 rounded-full bg-white border-2 border-slate-100 shadow-xs flex items-center justify-center group-hover:border-sky-500 group-hover:bg-sky-50 transition-all">
                  {getActivityIcon(act.action)}
                </div>

                {/* Left block: activity description */}
                <div className="text-left space-y-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-extrabold text-slate-800">{act.userName}</span>
                    <span className="text-xs text-slate-400 font-mono">({act.performedBy})</span>
                  </div>
                  <p className="text-sm text-slate-600 font-semibold">{act.action}</p>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pt-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{act.date_time}</span>
                  </div>
                </div>

                {/* Right block: status badge & performed detail */}
                <div className="flex items-center gap-3 self-start md:self-center">
                  {getStatusBadge(act.status)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
