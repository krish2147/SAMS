import React from "react";
import { SystemHealthMonitor } from "./SystemHealthMonitor";
import { 
  ShieldCheck, 
  Users, 
  RefreshCw, 
  IndianRupee, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  Database,
  ArrowRight,
  UserPlus
} from "lucide-react";
import { formatCurrency } from "../utils/formatter";

const formatDateToIndian = (dateStr?: string) => {
  if (!dateStr) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {}
  return dateStr;
};

interface HomeTabProps {
  isSwim: boolean;
  members: any[];
  coachesCount: number;
  eventsCount: number;
  events: any[];
  holidays: any[];
  settings: any;
  userRole?: string;
  userName?: string;
  onNavigate: (tabId: string) => void;
  onOpenAddMember: () => void;
}

export function HomeTab({ 
  isSwim, 
  members, 
  coachesCount, 
  eventsCount, 
  events = [], 
  holidays = [], 
  settings, 
  userRole = "admin", 
  userName,
  onNavigate,
  onOpenAddMember
}: HomeTabProps) {
  
  // Normalized user access variables
  const isAdmin = userRole === "super_admin" || userRole === "admin";
  const isCoach = userRole === "coach";
  const isStaff = userRole === "staff" || userRole === "receptionist";

  // Calculations
  const approvedMembers = members.filter(m => m.status === "Approved");
  
  // Pending Approvals
  const pendingApprovalsCount = members.filter(m => {
    const rStatus = (m.registration_status || m.status || "").trim();
    return rStatus === "Pending" || rStatus === "Pending Approval" || rStatus.toLowerCase().includes("pending");
  }).length;

  // Active Members
  const activeMembersCount = approvedMembers.length;

  // Renewals Due (Expired or expiring within 30 days)
  const getMembershipStatus = (endDateStr: string) => {
    if (!endDateStr) return "Unknown";
    const today = new Date();
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays <= 30) return "Expiring Soon";
    return "Active";
  };

  const renewalsDueCount = approvedMembers.filter(m => {
    const status = getMembershipStatus(m.endDate);
    return status === "Expired" || status === "Expiring Soon";
  }).length;

  // Today's Collections (Admin only)
  const todaysCollections = (() => {
    let total = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    members.filter(m => m.status === "Approved" && (m.registrationDate === todayStr || m.dateJoined === todayStr)).forEach(m => {
      const rates: Record<string, number> = { Monthly: 3500, Quarterly: 9000, "Half Yearly": 16000, Yearly: 28000 };
      total += rates[m.typeOfMembership] || 3500;
    });
    return total; 
  })();

  // Quick actions grid
  const quickActions = [
    {
      id: "registrations",
      label: "Approve Members",
      icon: ShieldCheck,
      description: "Approve pending walk-ins & online entries",
      allowed: isAdmin || isStaff,
    },
    {
      id: "members",
      label: "Members Directory",
      icon: Users,
      description: "Search, inspect, or manage active swimmers",
      allowed: true, // Everyone can see member list
    },
    {
      id: "revenue",
      label: "Payments Ledger",
      icon: IndianRupee,
      description: "View gross revenue & transaction logs",
      allowed: isAdmin,
    },
    {
      id: "batches",
      label: "Batch Schedules",
      icon: Calendar,
      description: "Manage morning & evening training slots",
      allowed: true,
    },
    {
      id: "renewals",
      label: "Renewals",
      icon: RefreshCw,
      description: "Renew expired swimmer subscriptions",
      allowed: isAdmin || isStaff,
    },
    {
      id: "events",
      label: "Academy Events",
      icon: Sparkles,
      description: "Track competitions, stroke camps & workshops",
      allowed: true,
    },
    {
      id: "holidays",
      label: "Holidays",
      icon: AlertTriangle,
      description: "Configure pool maintenance days & closures",
      allowed: true,
    },
    {
      id: "reports",
      label: "Reports",
      icon: Database,
      description: "Generate roster & operational stats reports",
      allowed: isAdmin,
    }
  ];

  const visibleActions = quickActions.filter(act => act.allowed);

  // Recent activity calculations from real members array
  const recentActivities = [...members]
    .sort((a, b) => {
      const dateA = a.registrationDate || "";
      const dateB = b.registrationDate || "";
      return dateB.localeCompare(dateA);
    })
    .slice(0, 4);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const displayName = userName?.trim() || (userRole === "super_admin" || userRole === "admin" ? "Admin" : userRole === "coach" ? "Coach" : "Desk Staff");

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto">
      
      {/* 1. HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-slate-850">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_50%)] animate-pulse" />
        <div className="text-left relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
              {isSwim ? "Swim Academy Management" : "Cricket Academy Management"}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
              ● Live System Operational
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            {getGreeting()} {displayName} 👋
          </h2>

          <p className="text-xs text-slate-300 max-w-xl font-normal leading-relaxed">
            Baroda Swim Front Management System is synced with MySQL database.
          </p>

          {/* Today's Tasks Badge Summary */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mr-1">Today's Tasks:</span>
            <div 
              onClick={() => onNavigate("registrations")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer transition-colors"
            >
              <span>• {pendingApprovalsCount} Pending Approvals</span>
            </div>
            <div 
              onClick={() => onNavigate("renewals")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer transition-colors"
            >
              <span>• {renewalsDueCount} Renewals Due</span>
            </div>
            <div 
              onClick={() => onNavigate("revenue")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer transition-colors"
            >
              <span>• ₹{todaysCollections.toLocaleString("en-IN")} Today's Receipts</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex gap-2 w-full md:w-auto shrink-0">
          {isAdmin && (
            <button
              onClick={onOpenAddMember}
              className="w-full md:w-auto px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-sky-500/20 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Walk-in Intake</span>
            </button>
          )}
        </div>
      </div>


      {/* 2. QUICK ACTIONS (Approve, Members, Payments...) */}
      <div>
        <div className="mb-4 text-left">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Fast Access Desk</span>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight mt-0.5">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {visibleActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                id={`quick-action-btn-${act.id}`}
                onClick={() => onNavigate(act.id)}
                className="bg-white border border-slate-100 p-4 md:p-5 rounded-2xl text-left transition-all hover:border-slate-300 hover:shadow-sm active:scale-[0.98] group cursor-pointer focus:outline-none flex flex-col justify-between min-h-[125px]"
              >
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 w-fit group-hover:bg-sky-50 group-hover:border-sky-100 transition-colors">
                  <Icon className="h-5 w-5 text-slate-600 group-hover:text-sky-600 transition-colors" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-3">
                    {act.label}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal mt-1 block">
                    {act.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TODAY'S ALERTS (Pending Approvals, Renewals, Revenue) */}
      <div className="space-y-4">
        <div className="text-left">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Operational Pulses</span>
          <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight mt-0.5">Today's Alerts</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Pending Approvals */}
          <button 
            onClick={() => {
              if (isAdmin || isStaff) onNavigate("registrations");
            }}
            disabled={isCoach}
            className="bg-white border border-slate-100 rounded-2xl p-5 text-left transition-all hover:border-slate-300 active:scale-[0.98] group cursor-pointer focus:outline-none shadow-xs"
          >
            <span className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-400 uppercase block">Pending Approvals</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                {pendingApprovalsCount}
              </span>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <span className="text-[9.5px] md:text-11px text-amber-600 font-semibold block mt-3 pt-2.5 border-t border-slate-50">
              {isCoach ? "View-only mode" : "Requires review →"}
            </span>
          </button>

          {/* Renewals */}
          <button 
            onClick={() => {
              if (isAdmin || isStaff) onNavigate("renewals");
            }}
            disabled={isCoach}
            className="bg-white border border-slate-100 rounded-2xl p-5 text-left transition-all hover:border-slate-300 active:scale-[0.98] group cursor-pointer focus:outline-none shadow-xs"
          >
            <span className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-400 uppercase block">Renewals Due</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl md:text-3xl font-extrabold tracking-tight ${renewalsDueCount > 0 ? "text-rose-500" : "text-slate-800"}`}>
                {renewalsDueCount}
              </span>
              {renewalsDueCount > 0 && <span className="text-[9px] font-bold text-rose-500 font-mono">CRITICAL</span>}
            </div>
            <span className="text-[9.5px] md:text-11px text-rose-500/80 font-semibold block mt-3 pt-2.5 border-t border-slate-50">
              {isCoach ? "Coaches check-only" : "Process renewal →"}
            </span>
          </button>

          {/* Revenue */}
          {isAdmin ? (
            <button 
              onClick={() => onNavigate("revenue")}
              className="bg-white border border-slate-100 rounded-2xl p-5 text-left transition-all hover:border-slate-300 active:scale-[0.98] group cursor-pointer focus:outline-none shadow-xs"
            >
              <span className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-400 uppercase block">Today's Revenue</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  {formatCurrency(todaysCollections)}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 font-mono">INR</span>
              </div>
              <span className="text-[9.5px] md:text-11px text-emerald-600 font-semibold block mt-3 pt-2.5 border-t border-slate-50">
                Audit gross ledger →
              </span>
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-5 text-left shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] md:text-xs font-semibold tracking-wider text-slate-400 uppercase block">Active Swimmers</span>
                <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight block mt-2">
                  {activeMembersCount}
                </span>
              </div>
              <span className="text-[9.5px] md:text-11px text-slate-500 font-medium block mt-3 pt-2.5 border-t border-slate-100">
                Lobby directory is online
              </span>
            </div>
          )}

        </div>
      </div>

      {/* 4. RECENT ACTIVITY */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-left">
        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
          <div>
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">Lobby & Registration Feed</span>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mt-0.5">Recent Activity</h3>
          </div>
          <button 
            onClick={() => onNavigate("activity")}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>View All Activity</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentActivities.map((m, idx) => {
            const isApproved = m.status === "Approved";
            const isRejected = m.status === "Rejected";

            return (
              <div key={m.membershipNo || idx} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    isApproved ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                    isRejected ? "bg-rose-50 text-rose-600 border border-rose-100" :
                    "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}>
                    {isApproved ? "✓" : isRejected ? "✗" : "⏳"}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                      {m.fullName}
                    </h5>
                    <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed mt-0.5">
                      {isApproved ? "Registration verified & biometric token active" : 
                       isRejected ? `Profile registration rejected (Reason: ${m.remarks || "Bad details"})` :
                       "New enrollment submitted & awaiting manager verification"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-slate-400">
                      <span className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                        {m.membershipNo}
                      </span>
                      <span>•</span>
                      <span>{m.typeOfMembership} Plan</span>
                      <span>•</span>
                      <span>{formatDateToIndian(m.registrationDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border tracking-wider ${
                    isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                    isRejected ? "bg-rose-50 text-rose-700 border-rose-200/50" :
                    "bg-amber-50 text-amber-700 border-amber-200/50"
                  }`}>
                    {m.status}
                  </span>
                </div>
              </div>
            );
          })}

          {recentActivities.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <span className="text-sm font-medium">No recent operations recorded</span>
              <p className="text-xs">Incoming walk-ins or online enrollments will stream here in real-time.</p>
            </div>
          )}
        </div>
      </div>

      {/* System Health & API Infrastructure Monitor */}
      <SystemHealthMonitor isSwim={isSwim} />

    </div>
  );
}
