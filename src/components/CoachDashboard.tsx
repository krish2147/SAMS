import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, XCircle, Sparkles, UserCheck, TrendingUp, 
  Send, Users, Award, Calendar, AlertCircle, LogOut,
  Clock, Plus, Shield, Phone, Lock, ChevronRight, Bell,
  Activity, Star, Filter, Search, RefreshCw, MessageSquare,
  User, Mail, ShieldAlert, Check, Loader2, BookOpen, Menu,
  LayoutDashboard, Sliders
} from "lucide-react";
import { AcademyId, UserSession } from "../types";
import { NotificationDrawer } from "./NotificationDrawer";

interface CoachDashboardProps {
  academyId: AcademyId;
  userName: string;
  onLogout?: () => void;
  userSession?: UserSession;
}

export function CoachDashboard({ academyId, userName, onLogout, userSession }: CoachDashboardProps) {
  const isSwim = academyId === "swim";
  
  // Theme styling declarations
  const themeAccent = isSwim ? "sky" : "emerald";
  const bgHeader = isSwim ? "from-slate-900 via-indigo-950 to-slate-900" : "from-slate-900 via-emerald-950 to-slate-900";
  const textAccent = isSwim ? "text-sky-500" : "text-emerald-500";
  const textAccentDark = isSwim ? "text-sky-600" : "text-emerald-700";
  const bgAccent = isSwim ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  const borderAccent = isSwim ? "border-sky-100 focus:border-sky-500 focus:ring-sky-200" : "border-emerald-100 focus:border-emerald-500 focus:ring-emerald-200";
  const btnPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white";
  const btnPrimaryAccent = isSwim ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-950";

  // Adaptive Styles mirroring AdminDashboard
  const bgCard = isSwim ? "bg-white border-slate-100 shadow-md text-slate-800" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100";
  const bgSubCard = isSwim ? "bg-slate-50 border border-slate-100" : "bg-emerald-900/10 border border-emerald-900/30";
  const badgeTheme = isSwim ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-amber-400/10 text-amber-300 border-amber-400/20";
  const buttonPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-amber-400 hover:bg-amber-500 text-slate-950";
  const textTitle = isSwim ? "text-slate-900" : "text-white font-serif";
  const borderTab = isSwim ? "border-slate-100" : "border-emerald-900/30";
  const inputStyle = `w-full p-3 text-xs rounded-xl focus:outline-none border font-semibold ${
    isSwim 
      ? "bg-white border-slate-200 text-slate-900 focus:border-sky-400" 
      : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:border-amber-400"
  }`;

  // Navigation state
  const [activeTab, setActiveTab] = useState<"home" | "batches" | "members" | "attendance" | "schedule" | "notifications" | "profile">("home");
  const [mobileMenuDrawerOpen, setMobileMenuDrawerOpen] = useState(false);
  const [notificationsDrawerOpen, setNotificationsDrawerOpen] = useState(false);

  // API Token resolver
  const getSessionToken = () => {
    if (userSession?.token) return userSession.token;
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) {
        return JSON.parse(saved)?.token || "";
      }
    } catch (e) {
      console.error(e);
    }
    return "";
  };

  // Profile data sync
  const [sessionUser, setSessionUser] = useState<any>(() => {
    if (userSession) return userSession;
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: userName || "Coach", role: "coach", email: "coach@sams.com", phoneNumber: "+91 99887 76655", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" };
  });

  // DB Data States
  const [batches, setBatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMembersInTodayBatches: 0, membersPresentToday: 0, membersAbsentToday: 0 });
  
  // Loading & Operations states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter state
  const [memberSearch, setMemberSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");

  // Performance Notes Editing state
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [performanceRemarks, setPerformanceRemarks] = useState("");
  const [isSavingRemarks, setIsSavingRemarks] = useState(false);

  // Profile Settings form state
  const [profileName, setProfileName] = useState(sessionUser?.name || "");
  const [profileEmail, setProfileEmail] = useState(sessionUser?.email || "");
  const [profilePhone, setProfilePhone] = useState(sessionUser?.phoneNumber || sessionUser?.phone || "");
  const [photoUrl, setPhotoUrl] = useState(sessionUser?.avatar || sessionUser?.photoUrl || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Settings form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Pre-loaded preset avatar lists
  const AVATAR_PRESETS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
  ];

  // Primary Data Fetch Function
  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setApiError(null);

      const token = getSessionToken();
      const headers: any = {
        "Content-Type": "application/json",
        ...(token ? { "x-session-token": token } : {})
      };

      const response = await fetch("/api/coach/dashboard-data", { headers });
      
      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.error("JSON parsing error:", jsonErr);
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          setApiError("SESSION_EXPIRED");
          return;
        }
        const errMsg = (data && data.error) || `HTTP error ${response.status}`;
        throw new Error(errMsg);
      }

      if (!data) {
        throw new Error("Received empty or non-JSON response from server. SAMS may be compiling or restarting.");
      }

      if (data.success) {
        setBatches(data.batches || []);
        setMembers(data.members || []);
        setAttendanceLogs(data.attendanceLogs || []);
        setEvents(data.events || []);
        setHolidays(data.holidays || []);
        setNotifications(data.notifications || []);
        setStats(data.stats || { totalMembersInTodayBatches: 0, membersPresentToday: 0, membersAbsentToday: 0 });
      } else {
        throw new Error("Failed to load synchronized dashboard data.");
      }
    } catch (err: any) {
      console.error("Coach dashboard data sync failure:", err);
      setApiError(err.message || "Unable to establish live connection to the database.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [academyId]);

  // Handle Note Save Operation
  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsSavingRemarks(true);
      const token = getSessionToken();
      const response = await fetch(`/api/members/${editingMember.membershipNo}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ remarks: performanceRemarks })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update coaching remarks");
      }

      setSuccessToast(`Successfully updated training notes for ${editingMember.fullName}`);
      setEditingMember(null);
      setPerformanceRemarks("");
      fetchDashboardData(true); // Silent refresh in background

      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingRemarks(false);
    }
  };

  // Handle Profile Update Operation
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      alert("Full Name and Email ID are mandatory fields.");
      return;
    }

    try {
      setIsSavingProfile(true);
      const token = getSessionToken();
      const response = await fetch("/api/staff/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phoneNumber: profilePhone,
          photoUrl: photoUrl
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync profile change with backend.");
      }

      setSuccessToast("Coaching profile updated successfully!");
      
      // Update local storage session
      try {
        const saved = localStorage.getItem("sams_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.name = profileName;
          parsed.email = profileEmail;
          parsed.phone = profilePhone;
          parsed.phoneNumber = profilePhone;
          parsed.photoUrl = photoUrl;
          parsed.avatar = photoUrl;
          localStorage.setItem("sams_session", JSON.stringify(parsed));
          setSessionUser(parsed);
        }
      } catch (e) {}

      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert("Sync error: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update Operation
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      alert("Current account password is required.");
      return;
    }
    if (newPassword.length < 6) {
      alert("New password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    try {
      setIsSavingPassword(true);
      const token = getSessionToken();
      const response = await fetch("/api/staff/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setSuccessToast("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  // Format Date Nicely
  const formatDateStr = (sqlDate: string) => {
    if (!sqlDate) return "";
    try {
      const d = new Date(sqlDate);
      if (isNaN(d.getTime())) return sqlDate;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return sqlDate;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] w-full bg-slate-50 text-slate-800 font-sans text-left overflow-hidden relative">
      
      {/* SUCCESS TOAST MESSAGE */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-emerald-400 px-6 py-4.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md w-full"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="text-xs font-bold text-slate-200">
              {successToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. DESKTOP NAVIGATION SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 h-screen">
        {/* Sidebar Header with Academy Branding */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-cyan-500 text-white h-9 w-9 shadow-md shrink-0">
            <span className="text-base">{isSwim ? "🌊" : "🏏"}</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xs font-black tracking-tight leading-none text-white truncate">
              {isSwim ? "Baroda Swim Front" : "The Cricket Academy"}
            </span>
            <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-sky-400 mt-1 truncate">
              COACH PORTAL
            </span>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 uppercase shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                (sessionUser?.name || userName || "Coach").charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{sessionUser?.name || userName}</div>
              <div className="text-[9.5px] font-mono text-sky-400 uppercase font-semibold truncate tracking-wider">
                Authorized Coach
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {[
            { id: "home", label: "Dashboard", icon: LayoutDashboard },
            { id: "batches", label: "Batches", icon: Clock },
            { id: "members", label: "Members", icon: Users },
            { id: "attendance", label: "Attendance Logs", icon: CheckCircle },
            { id: "schedule", label: "Timeline Schedule", icon: Calendar },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "profile", label: "Settings", icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-coach-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  isActive 
                    ? "bg-sky-600 text-white font-bold shadow-sm" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <button
            id="btn-coach-logout"
            onClick={() => onLogout?.()}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 flex items-center gap-3 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN DASHBOARD AREA */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        
        {/* MOBILE TOP HEADER (Sticky, Premium, Blur) */}
        <header className="md:hidden flex h-14 bg-white/95 border-b border-slate-200/80 justify-between items-center px-4 shrink-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMobileMenuDrawerOpen(true)}
              className="p-1.5 -ml-1 text-slate-500 hover:text-sky-600 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {isSwim ? "🌊" : "🏏"}
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 block tracking-tight">
                {isSwim ? "Baroda Swim Front" : "The Cricket Academy"}
              </span>
              <span className="text-[9px] font-mono text-sky-600 font-bold uppercase tracking-wider block leading-none">COACH PORTAL</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">{sessionUser?.name || userName}</span>
              <span className="text-[9px] font-mono text-sky-600 font-bold uppercase tracking-wider block leading-none">COACH</span>
            </div>

            <button
              onClick={() => setNotificationsDrawerOpen(!notificationsDrawerOpen)}
              className="p-1.5 text-slate-600 hover:text-sky-600 hover:bg-slate-50 rounded-lg relative cursor-pointer"
              title="Notifications"
              id="btn-coach-mobile-bell"
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read && !n.is_read) && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-rose-500 rounded-full border border-white" />
              )}
            </button>
          </div>
        </header>

        {/* 4. MAIN CONTENT CONTAINER (NATIVE SCROLLING CONTAINER) */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-slate-50 relative">
          
          {/* Desktop Header */}
          <header className="hidden md:flex h-16 bg-white border-b border-slate-200/80 px-8 items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                {[
                  { id: "home", label: "Dashboard" },
                  { id: "batches", label: "Batches" },
                  { id: "members", label: "Members" },
                  { id: "attendance", label: "Attendance Logs" },
                  { id: "schedule", label: "Timeline Schedule" },
                  { id: "notifications", label: "Notifications" },
                  { id: "profile", label: "Settings" }
                ].find(t => t.id === activeTab)?.label}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Active Session:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-150 bg-slate-50/50">
                  <span className="text-xs font-black text-slate-800">{sessionUser?.name || userName}</span>
                  <span className="text-[9px] font-mono bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">
                    COACH
                  </span>
                </div>
              </div>

              <button
                onClick={() => setNotificationsDrawerOpen(!notificationsDrawerOpen)}
                className="p-2 text-slate-600 hover:text-sky-600 hover:bg-slate-50 rounded-xl relative border border-slate-200 bg-white shadow-2xs transition-colors cursor-pointer"
                title="System Alerts & Class Updates"
                id="btn-coach-desktop-bell"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some(n => !n.read && !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-white" />
                )}
              </button>

              <button
                onClick={() => fetchDashboardData(true)}
                className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-50 rounded-xl relative border border-slate-150 bg-white shadow-xs transition-colors"
                title="Sync Database"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </header>

          {/* Content View with clean custom padding */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)] md:pb-8 scroll-smooth overscroll-behavior-y-contain text-slate-800">
            
            {/* DATABASE FAILURE STATE OR LOADER */}
            {isLoading ? (
              <div className="py-24 text-center space-y-4">
                <Loader2 className={`h-10 w-10 animate-spin mx-auto text-${themeAccent}-500`} />
                <p className="text-sm text-slate-500 font-bold">Synchronizing encrypted database records...</p>
              </div>
            ) : apiError ? (
              <div className="max-w-2xl mx-auto bg-white border border-rose-150 rounded-3xl p-8 shadow-md text-center space-y-6">
                <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {apiError === "SESSION_EXPIRED" ? "Session Expired" : "Database Connection Interrupted"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {apiError === "SESSION_EXPIRED" 
                      ? "Your secure coaching session has expired or is invalid. Please log in again to sync swimmer rosters and attendance sheets." 
                      : apiError}
                  </p>
                </div>
                {apiError === "SESSION_EXPIRED" && onLogout ? (
                  <button 
                    onClick={onLogout}
                    className={`px-6 py-3 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer ${btnPrimary}`}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log in Again</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => fetchDashboardData()}
                    className={`px-6 py-3 rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer ${btnPrimary}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-establish Secure Link</span>
                  </button>
                )}
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8"
              >
              
              {/* TAB 1: HOME PANEL */}
              {activeTab === "home" && (
                <div className="space-y-8">
                  {/* METRIC COUNTERS ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants} className={`rounded-3xl p-6 flex items-center gap-4.5 border ${bgCard}`}>
                      <div className={`p-4 rounded-2xl ${bgAccent} shrink-0`}>
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase block">Total Members in My Batches</span>
                        <span className={`text-2xl font-black mt-0.5 block ${isSwim ? "text-slate-900" : "text-white"}`}>{stats.totalMembersInTodayBatches}</span>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className={`rounded-3xl p-6 flex items-center gap-4.5 border ${bgCard}`}>
                      <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase block">Members Present Today</span>
                        <span className={`text-2xl font-black mt-0.5 block ${isSwim ? "text-slate-900" : "text-white"}`}>{stats.membersPresentToday}</span>
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className={`rounded-3xl p-6 flex items-center gap-4.5 border ${bgCard}`}>
                      <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold tracking-widest opacity-60 uppercase block">Members Absent Today</span>
                        <span className={`text-2xl font-black mt-0.5 block ${isSwim ? "text-slate-900" : "text-white"}`}>{stats.membersAbsentToday}</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* MAIN SPLIT COLUMNS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT AREA: TODAY'S BATCHES (COACH SPECIFIC) */}
                    <div className="lg:col-span-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>Today's Batches List</h3>
                          <p className="text-xs text-slate-500">Live filling status and real-time attendance ratios.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {batches.length === 0 ? (
                          <div className={`rounded-3xl p-8 text-center text-sm border ${bgCard}`}>
                            No batches scheduled in the system today.
                          </div>
                        ) : (
                          batches.map((batch) => {
                            const fillingRatio = batch.capacity > 0 ? (batch.current_strength / batch.capacity) * 100 : 0;
                            return (
                              <motion.div 
                                key={batch.id} 
                                variants={itemVariants}
                                className={`rounded-3xl p-6 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border ${bgCard}`}
                              >
                                <div className="space-y-1.5 flex-1 w-full">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-black">{batch.batch_name}</h4>
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${badgeTheme}`}>
                                      <Clock className="h-3 w-3" />
                                      {batch.start_time} - {batch.end_time}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4 pt-1 text-xs">
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold opacity-60">Members</span>
                                      <span className="font-extrabold">{batch.current_strength} Assigned</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold opacity-60">Present / Absent</span>
                                      <span className="font-extrabold text-emerald-500">{batch.presentCount} present • <span className="opacity-80">{batch.absentCount} absent</span></span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold opacity-60">Filling Status</span>
                                      <span className="font-extrabold">{batch.capacity - batch.current_strength} seats remaining</span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-current/10 h-2 rounded-full overflow-hidden mt-3">
                                    <div 
                                      className={`h-full rounded-full bg-${themeAccent}-500`}
                                      style={{ width: `${Math.min(100, fillingRatio)}%` }}
                                    />
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    setBatchFilter(batch.id);
                                    setActiveTab("members");
                                  }}
                                  className="px-4 py-2.5 rounded-xl border border-current/10 hover:bg-current/10 text-xs font-bold cursor-pointer text-current flex items-center gap-1 shrink-0 bg-current/5 transition-all"
                                >
                                  <span>View Members</span>
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* RIGHT AREA: UPCOMING EVENTS & ANNOUNCEMENTS */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* EVENTS BLOCK */}
                      <div className={`rounded-3xl p-6 space-y-4 border ${bgCard}`}>
                        <div className="flex items-center justify-between pb-3 border-b border-current/10">
                          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            <span>Upcoming Events</span>
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {events.slice(0, 3).map((ev) => (
                            <div key={ev.id} className={`p-3 rounded-2xl space-y-1 ${bgSubCard}`}>
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-xs font-bold block leading-tight">{ev.title}</span>
                              </div>
                              <p className="text-[10px] opacity-75 leading-snug">{ev.description}</p>
                              <span className="text-[9px] font-mono opacity-60 block pt-0.5">{formatDateStr(ev.event_date)}</span>
                            </div>
                          ))}
                          {events.length === 0 && (
                            <p className="text-xs opacity-60 text-center py-4">No events scheduled.</p>
                          )}
                        </div>
                      </div>

                      {/* ANNOUNCEMENTS BLOCK */}
                      <div className={`rounded-3xl p-6 space-y-4 border ${bgCard}`}>
                        <div className="flex items-center justify-between pb-3 border-b border-current/10">
                          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <Bell className="h-4 w-4 text-amber-500" />
                            <span>Academy Announcements</span>
                          </h4>
                        </div>

                        <div className="space-y-3.5">
                          {notifications.filter(n => n.type === "announcement" || n.type === "general").slice(0, 3).map((ann) => (
                            <div key={ann.id} className="text-xs space-y-1 border-b border-current/10 pb-3 last:border-0 last:pb-0">
                              <p className="font-medium leading-relaxed">{ann.title || ann.message}</p>
                              <span className="text-[9px] opacity-60 font-mono block">{formatDateStr(ann.created_at)}</span>
                            </div>
                          ))}
                          {notifications.filter(n => n.type === "announcement" || n.type === "general").length === 0 && (
                            <p className="text-xs opacity-60 text-center py-4">No announcements posted.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MY BATCHES */}
              {activeTab === "batches" && (
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>Active Batches Console</h3>
                    <p className="text-xs text-slate-500">Overview of all batches under the academy scope. Admin edits are view-only here.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {batches.map((batch) => {
                      const fillingPct = batch.capacity > 0 ? Math.round((batch.current_strength / batch.capacity) * 100) : 0;
                      return (
                        <motion.div 
                          key={batch.id} 
                          variants={itemVariants}
                          className={`rounded-3xl p-6 transition-all space-y-4 border ${bgCard}`}
                        >
                          <div className="space-y-1">
                            <h4 className="text-sm font-black">{batch.batch_name}</h4>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block uppercase font-mono border ${badgeTheme}`}>
                              {batch.start_time} - {batch.end_time}
                            </span>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-current/10">
                            <div className="flex justify-between text-xs">
                              <span className="opacity-65 font-medium">Assigned Athletes:</span>
                              <span className="font-extrabold">{batch.current_strength} / {batch.capacity}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="opacity-65 font-medium">Available Capacity:</span>
                              <span className="font-extrabold">{batch.available_seats} seats</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="opacity-65 font-medium">Lobby Attendance Ratio:</span>
                              <span className="font-extrabold text-emerald-500">{batch.presentCount} present today</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[10px] font-extrabold opacity-60 uppercase">
                              <span>Filling percentage</span>
                              <span>{fillingPct}%</span>
                            </div>
                            <div className="w-full bg-current/10 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full bg-${themeAccent}-500`}
                                style={{ width: `${Math.min(100, fillingPct)}%` }}
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setBatchFilter(batch.id);
                                setActiveTab("members");
                              }}
                              className="w-full py-2.5 rounded-xl border border-current/10 hover:bg-current/10 text-xs font-bold text-current transition-all cursor-pointer flex items-center justify-center gap-1 bg-current/5"
                            >
                              <span>Inspect Member Roster</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: MEMBER LIST (RESTRICTED FIELD CONTROLS) */}
              {activeTab === "members" && (
                <div className="space-y-6">
                  
                  {/* SEARCH AND BATCH FILTER BAR */}
                  <div className={`rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border ${bgCard}`}>
                    <div className="flex-1 max-w-md relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-55" />
                      <input 
                        type="text" 
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search assigned athletes by name or ID..."
                        className={`w-full pl-10 pr-4 py-3 text-xs focus:outline-none rounded-xl font-medium border ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400 focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
                        }`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wider hidden sm:inline">Filter Batch:</span>
                      <button 
                        onClick={() => setBatchFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          batchFilter === "all" 
                            ? isSwim
                              ? `bg-slate-900 border-slate-900 text-white`
                              : `bg-amber-400 border-amber-400 text-slate-950`
                            : isSwim
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              : "bg-emerald-900/15 border-emerald-900/30 text-emerald-300 hover:bg-emerald-900/30"
                        }`}
                      >
                        All Batches
                      </button>
                      {batches.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBatchFilter(b.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            batchFilter === b.id 
                              ? isSwim
                                ? `bg-slate-900 border-slate-900 text-white`
                                : `bg-amber-400 border-amber-400 text-slate-950`
                              : isSwim
                                ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                : "bg-emerald-900/15 border-emerald-900/30 text-emerald-300 hover:bg-emerald-900/30"
                          }`}
                        >
                          {b.batch_name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RESTRICTED CONTROLS WARNING BANNER */}
                  <div className={`border rounded-2xl p-4.5 flex gap-3 ${
                    isSwim 
                      ? "bg-amber-500/5 border-amber-500/10 text-amber-700" 
                      : "bg-amber-400/5 border-amber-400/20 text-amber-300"
                  }`}>
                    <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
                    <div className="text-xs leading-normal">
                      <span className="font-extrabold block mb-0.5">RESTRICTED INSTRUCTOR ACCESS MODE</span>
                      Coaches can only view members assigned to their respective academy lanes. Administrative features (Deleting members, payments editing, registrations approval, or membership plan changes) are restricted to Head Administration roles.
                    </div>
                  </div>

                  {/* MEMBERS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const filtered = members.filter((m) => {
                        const matchesSearch = m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                              m.membershipNo.toLowerCase().includes(memberSearch.toLowerCase());
                        const matchesBatch = batchFilter === "all" || m.selected_batch_id === batchFilter;
                        return matchesSearch && matchesBatch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className={`col-span-2 py-16 text-center text-sm border ${bgCard}`}>
                            No matching registered members found assigned to these lanes.
                          </div>
                        );
                      }

                      return filtered.map((member) => (
                        <motion.div 
                          key={member.id} 
                          variants={itemVariants}
                          className={`rounded-3xl p-5 transition-all flex flex-col md:flex-row gap-5 border ${bgCard}`}
                        >
                          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border border-current/10 bg-current/5 shadow-sm shrink-0 mx-auto md:mx-0">
                            <img 
                              src={member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                              alt={member.fullName} 
                              className="h-full w-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="space-y-3.5 flex-1 w-full">
                            <div className="space-y-1 text-center md:text-left">
                              <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                                <h4 className="text-sm font-black">{member.fullName}</h4>
                                <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full inline-block md:inline uppercase ${
                                  member.membership_status === "Active" 
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                }`}>
                                  {member.membership_status}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono opacity-60 font-bold">
                                {member.membershipNo} • Age: {member.age} • Gender: {member.gender || "Not Specified"}
                              </div>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${isSwim ? "text-indigo-600" : "text-amber-300"}`}>
                                Batch: {member.batchName}
                              </div>
                            </div>

                            {/* REMARKS DISPLAY */}
                            <div className={`p-3 rounded-2xl space-y-1.5 ${bgSubCard}`}>
                              <span className="text-[9px] font-mono uppercase font-bold opacity-60 tracking-wider block">COACHING REMARKS & NOTES</span>
                              <p className="text-xs italic">
                                {member.remarks ? `"${member.remarks}"` : "No special training comments recorded. Log comments below."}
                              </p>
                            </div>

                            {/* UPDATE ACTION */}
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingMember(member);
                                  setPerformanceRemarks(member.remarks || "");
                                }}
                                className={`px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${buttonPrimary}`}
                              >
                                <span>Modify Training Notes</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* MODAL / BOTTOM SHEET FOR PERFORMANCE REMARKS */}
              {editingMember && (
                <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 border ${
                      isSwim ? "bg-white border-slate-200 text-slate-800" : "bg-emerald-950 border-emerald-900 text-emerald-100"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-black uppercase tracking-wide ${isSwim ? "text-slate-900" : "text-white"}`}>Athlete Coaching File</h4>
                        <button onClick={() => setEditingMember(null)} className={`font-black text-sm ${isSwim ? "text-slate-400 hover:text-slate-800" : "text-emerald-400 hover:text-white"}`}>✕</button>
                      </div>
                      <p className="text-xs opacity-75 font-medium">Update biometric performance feedback remarks for {editingMember.fullName}.</p>
                    </div>

                    <form onSubmit={handleSaveNotes} className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase opacity-60 font-extrabold tracking-wider">Remarks / Notes Content</label>
                        <textarea 
                          value={performanceRemarks}
                          onChange={(e) => setPerformanceRemarks(e.target.value)}
                          placeholder="E.g., Needs breathing practice, level 3 intermediate stroke correction required..."
                          rows={4}
                          className={`w-full p-4 text-xs focus:outline-none rounded-xl font-medium border ${
                            isSwim 
                              ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                              : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                          }`}
                          required
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setEditingMember(null)}
                          className={`flex-1 py-3 font-bold text-xs rounded-xl transition-all cursor-pointer text-center ${
                            isSwim 
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                              : "bg-emerald-900/40 hover:bg-emerald-900 text-emerald-300"
                          }`}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={isSavingRemarks}
                          className={`flex-1 py-3 ${btnPrimary} font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5`}
                        >
                          {isSavingRemarks ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Save Notes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              {/* TAB 4: ATTENDANCE (VIEW-ONLY TIMELINE LOG) */}
              {activeTab === "attendance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>Attendance Logs Register</h3>
                    <p className="text-xs text-slate-500">Live view-only logs of recent SAMS lobby check-ins. Updates are automatically synced via reception barcode scanner.</p>
                  </div>

                  <div className={`rounded-3xl p-6 border ${bgCard} space-y-6`}>
                    <div className="flex justify-between items-center pb-4 border-b border-current/10">
                      <span className="text-xs font-black uppercase tracking-wider">Historical Check-in Feed</span>
                    </div>

                    <div className="space-y-3">
                      {attendanceLogs.length === 0 ? (
                        <p className="text-xs opacity-60 text-center py-8">No attendance logs available in the database.</p>
                      ) : (
                        attendanceLogs.slice(0, 20).map((log) => (
                          <div key={log.id} className={`p-4 rounded-2xl flex justify-between items-center text-xs border border-current/5 ${bgSubCard}`}>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                                ✓
                              </div>
                              <div>
                                <span className="font-extrabold block">{log.fullName}</span>
                                <span className="text-[10px] opacity-60 font-mono">Member ID: {log.membershipNo}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold block">{formatDateStr(log.date)}</span>
                              <span className="text-[10px] opacity-60 font-mono uppercase">{log.time || "Lobby CheckIn"}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TIMELINE SCHEDULE */}
              {activeTab === "schedule" && (
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>Timeline Schedule & Holidays</h3>
                    <p className="text-xs text-slate-500">Check batch training slots, active holidays, and tournament events on SAMS master calendar.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* BATCH SLOTS LIST */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className={`rounded-3xl p-6 border ${bgCard} space-y-4`}>
                        <span className="text-xs font-black uppercase tracking-wider block">Training Slots</span>
                        <div className="space-y-3">
                          {batches.map((batch, index) => (
                            <div key={batch.id} className={`p-4 rounded-2xl flex justify-between items-center text-xs border border-current/5 ${bgSubCard}`}>
                              <div className="space-y-0.5">
                                <span className="font-extrabold block">{batch.batch_name}</span>
                                <span className="text-[10px] opacity-60 font-medium">Capacity: {batch.capacity} members</span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-${themeAccent}-500/10 text-${themeAccent}-600 uppercase`}>
                                {batch.start_time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* HOLIDAYS AND SHUTDOWNS */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className={`rounded-3xl p-6 border ${bgCard} space-y-4`}>
                        <span className="text-xs font-black uppercase tracking-wider block">Academy Holidays & Shutdowns</span>
                        <div className="space-y-3">
                          {holidays.map((hol) => (
                            <div key={hol.id} className={`p-4 border rounded-2xl text-xs space-y-1 ${
                              isSwim 
                                ? "bg-amber-500/5 border-amber-500/10 text-amber-700" 
                                : "bg-amber-400/5 border-amber-400/20 text-amber-300"
                            }`}>
                              <div className="flex justify-between font-bold">
                                <span>{hol.name}</span>
                                <span className="font-mono">{formatDateStr(hol.holiday_date)}</span>
                              </div>
                              {hol.description && <p className="text-[10px] opacity-80 leading-normal">{hol.description}</p>}
                            </div>
                          ))}
                          {holidays.length === 0 && (
                            <p className="text-xs opacity-60 text-center py-6">No scheduled holidays.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 6: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>Active System Notifications</h3>
                    <p className="text-xs text-slate-500">Live alert logs, batch updates, registrations feed, and administrative memos.</p>
                  </div>

                  <div className={`rounded-3xl p-6 border ${bgCard} space-y-4`}>
                    <div className="space-y-3">
                      {notifications.length === 0 ? (
                        <p className="text-xs opacity-60 text-center py-8">No notifications received.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-4 border border-current/5 rounded-2xl flex items-start gap-3.5 text-xs transition-all ${bgSubCard}`}>
                            <div className="p-2 bg-current/10 rounded-xl shrink-0">
                              <Bell className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-extrabold block">{notif.title}</span>
                              <p className="opacity-80 leading-normal">{notif.message}</p>
                              <span className="text-[9px] opacity-60 font-mono block pt-1">{formatDateStr(notif.created_at || notif.date)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: PROFILE SETTINGS */}
              {activeTab === "profile" && (
                <div className="space-y-8">
                  <div>
                    <h3 className={`text-lg font-black tracking-tight ${textTitle}`}>My Coaching Profile</h3>
                    <p className="text-xs text-slate-500">Manage your profile photo, phone number, and account access password securely.</p>
                  </div>

                  {/* SPLIT FOR PROFILE INFO AND SECURITY */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT AREA: PROFILE DETAILS */}
                    <div className={`lg:col-span-8 rounded-3xl p-6 border ${bgCard} space-y-6`}>
                      <div className="flex items-center gap-2 pb-3 border-b border-current/10">
                        <User className="h-5 w-5 text-indigo-500" />
                        <h4 className={`text-sm font-black uppercase tracking-wider ${isSwim ? "text-slate-900" : "text-white"}`}>Coaching Credentials</h4>
                      </div>

                      {/* PHOTO UPLOADER */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold tracking-wider">Profile Avatar Preset</label>
                        <div className="flex gap-4 items-center">
                          <div className="h-16 w-16 rounded-2xl overflow-hidden border border-current/10 bg-current/5 shrink-0">
                            <img src={photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} alt="Preview avatar" className="h-full w-full object-cover" />
                          </div>
                          
                          <div className="flex gap-2">
                            {AVATAR_PRESETS.map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPhotoUrl(preset)}
                                className={`h-10 w-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                  photoUrl === preset 
                                    ? `border-${themeAccent}-500 ring-2 ring-${themeAccent}-300`
                                    : "border-transparent opacity-60 hover:opacity-100"
                                }`}
                              >
                                <img src={preset} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">Full Name</label>
                          <input 
                            type="text" 
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">Email Address</label>
                          <input 
                            type="email" 
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">Contact Number</label>
                          <input 
                            type="text" 
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                          />
                        </div>

                        <div className="md:col-span-2 pt-2">
                          <button 
                            type="submit" 
                            disabled={isSavingProfile}
                            className={`px-6 py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${btnPrimary}`}
                          >
                            {isSavingProfile ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Updating Profile...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Save Profile Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* RIGHT AREA: ACCOUNT SECURITY */}
                    <div className={`lg:col-span-4 rounded-3xl p-6 border ${bgCard} space-y-6`}>
                      <div className="flex items-center gap-2 pb-3 border-b border-current/10">
                        <Lock className="h-5 w-5 text-rose-500" />
                        <h4 className={`text-sm font-black uppercase tracking-wider ${isSwim ? "text-slate-900" : "text-white"}`}>Account Security</h4>
                      </div>

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">Current Password</label>
                          <input 
                            type="password" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">New Password</label>
                          <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase opacity-65 font-extrabold">Confirm New Password</label>
                          <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full p-3.5 text-xs focus:outline-none rounded-xl font-bold border ${
                              isSwim 
                                ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-1 focus:ring-sky-400" 
                                : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:ring-1 focus:ring-amber-400"
                            }`}
                            required
                          />
                        </div>

                        <div className="pt-2">
                          <button 
                            type="submit" 
                            disabled={isSavingPassword}
                            className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white`}
                          >
                            {isSavingPassword ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Updating Password...</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5" />
                                <span>Update Account Password</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                </div>
              )}

            </motion.div>
          )}

          </div>
        </div>
      </div>

      {/* 3. MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom)] pt-1 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        
        {/* Home */}
        <button
          onClick={() => {
            setActiveTab("home");
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "home" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Batches */}
        <button
          onClick={() => {
            setActiveTab("batches");
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "batches" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Batches</span>
        </button>

        {/* Members */}
        <button
          onClick={() => {
            setActiveTab("members");
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "members" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Members</span>
        </button>

        {/* Schedule */}
        <button
          onClick={() => {
            setActiveTab("schedule");
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "schedule" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Schedule</span>
        </button>

        {/* Menu (Drawer button) */}
        <button
          onClick={() => {
            setMobileMenuDrawerOpen(!mobileMenuDrawerOpen);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Menu</span>
        </button>

      </nav>

      {/* MOBILE DRAWER: SLIDE-UP MENU */}
      <AnimatePresence>
        {mobileMenuDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`relative w-full rounded-t-3xl shadow-2xl border-t z-10 p-5 pb-8 flex flex-col max-h-[85vh] text-left ${
                isSwim ? "bg-white border-slate-200" : "bg-emerald-950 border-emerald-900 text-emerald-100"
              }`}
            >
              {/* Drag handle */}
              <div className={`w-12 h-1 rounded-full mx-auto mb-5 shrink-0 ${isSwim ? "bg-slate-200" : "bg-emerald-900"}`} />
              
              <div className="flex items-center justify-between mb-4 px-2">
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isSwim ? "text-slate-900" : "text-white"}`}>All Modules Desk</h3>
                  <p className="text-[10px] opacity-75 mt-0.5">Access {isSwim ? "Baroda Swim Front" : "The Cricket Academy"} coach controls</p>
                </div>
                <button 
                  onClick={() => setMobileMenuDrawerOpen(false)}
                  className={`p-1.5 rounded-full ${isSwim ? "bg-slate-100 text-slate-500 hover:text-slate-800" : "bg-emerald-900/40 text-emerald-300 hover:text-white"} cursor-pointer`}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs Grid */}
              <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] py-2 px-1">
                {[
                  { id: "home", label: "Dashboard", icon: LayoutDashboard },
                  { id: "batches", label: "Batches", icon: Clock },
                  { id: "members", label: "Members", icon: Users },
                  { id: "attendance", label: "Attendance Logs", icon: CheckCircle },
                  { id: "schedule", label: "Timeline Schedule", icon: Calendar },
                  { id: "notifications", label: "Notifications", icon: Bell },
                  { id: "profile", label: "Settings", icon: Sliders }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setMobileMenuDrawerOpen(false);
                      }}
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                        isActive 
                          ? isSwim
                            ? "bg-sky-50 border-sky-200 text-sky-600 font-bold shadow-xs" 
                            : "bg-emerald-900 border-emerald-800 text-amber-300 font-bold shadow-xs"
                          : isSwim
                            ? "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100/55"
                            : "border-emerald-900/30 bg-emerald-950/20 text-emerald-100/70 hover:bg-emerald-900/20"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold tracking-tight truncate w-full">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer footer logout */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuDrawerOpen(false);
                    onLogout?.();
                  }}
                  className="w-full py-3.5 rounded-xl bg-red-50 hover:bg-red-100/50 text-red-600 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out of System</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Side Panel Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsDrawerOpen}
        onClose={() => setNotificationsDrawerOpen(false)}
        notifications={notifications.map((n, idx) => ({
          id: n.id || idx + 1,
          text: n.text || n.message || "Coach Alert",
          time: n.time || "Today",
          read: Boolean(n.read || n.is_read),
          type: n.type || "class",
          title: n.title || "Coach Update"
        }))}
        onMarkRead={(id) => {
          setNotifications(prev => prev.map((n, idx) => (n.id || idx + 1) === id ? { ...n, read: true, is_read: true } : n));
        }}
        onMarkAllRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
        }}
        onDelete={(id) => {
          setNotifications(prev => prev.filter((n, idx) => (n.id || idx + 1) !== id));
        }}
        onClearAll={() => {
          setNotifications([]);
        }}
      />

    </div>
  );
}
