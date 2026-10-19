import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, CheckCircle2, Clock, Send, Eye, Search, AlertCircle, 
  LogOut, ShieldAlert, Phone, User, Calendar, CreditCard,
  MapPin, Plus, Check, RefreshCw, X, FileText, Bell, CheckCircle, Heart, QrCode, Maximize2,
  LayoutDashboard, UserPlus, Menu, Sliders
} from "lucide-react";
import { AcademyId } from "../types";
import { QrScannerModal } from "./QrScannerModal";
import { DigitalMembershipCard } from "./DigitalMembershipCard";
import { EmergencyMemberModal } from "./EmergencyMemberModal";
import { MemberTimelineModal } from "./MemberTimelineModal";
import { DailyClosingReportModal } from "./DailyClosingReportModal";
import { NotificationDrawer, SysNotification } from "./NotificationDrawer";
import { sessionStore } from "../utils/sessionStore";
import { useStaffNotifications } from "../utils/useStaffNotifications";
import { NotificationCountBadge } from "./NotificationCountBadge";
import { mobileDigits } from "../utils/phone";
import { SideMenuDrawer } from "./SideMenuDrawer";
import { SettingsTab } from "./SettingsTab";
import { RegisterPage } from "./RegisterPage";
import { useRememberedState } from "../utils/useRememberedState";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

// Attendance is not tracked: reception looks members up (search or QR) to see their status.
// Reception has the same layout as the coach and admin dashboards: a sidebar on computers, and on
// phones a bottom bar plus the side menu. Each page is one front-desk job.
type ReceptionSection = "home" | "find" | "register" | "approvals" | "payments" | "settings";
const RECEPTION_PAGES: Array<{ id: ReceptionSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "find", label: "Find a member", icon: Search },
  { id: "register", label: "Register a member", icon: UserPlus },
  { id: "approvals", label: "Approvals", icon: Clock },
  { id: "payments", label: "Pending payments", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Sliders }
];

interface ReceptionistDashboardProps {
  academyId: AcademyId;
  userName: string;
  onLogout?: () => void;
}

export function ReceptionistDashboard({ academyId, userName, onLogout }: ReceptionistDashboardProps) {
  const isSwim = academyId === "swim";
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Session retrieval
  const [sessionUser, setSessionUser] = useState<any>(() => {
    try {
      const saved = sessionStore.get();
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: userName || "Receptionist", role: "receptionist" };
  });

  const getSessionToken = () => {
    try {
      const saved = sessionStore.get();
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.token || "";
      }
    } catch (e) {
      console.error(e);
    }
    return "";
  };

  const displayName = sessionUser?.name || userName || "Reception";
  const photoUrl = sessionUser?.photoUrl || sessionUser?.avatar || "";

  // State Management
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [renewalsList, setRenewalsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // UI Interactions
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [viewingAppMember, setViewingAppMember] = useState<any>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isDigitalCardModalOpen, setIsDigitalCardModalOpen] = useState(false);
  
  // Sprint 3 Modals
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isClosingReportModalOpen, setIsClosingReportModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [rememberedSection, setSection] = useRememberedState<ReceptionSection>("reception.section", "home");
  const section: ReceptionSection = RECEPTION_PAGES.some((p) => p.id === rememberedSection) ? rememberedSection : "home";
  const currentPage = RECEPTION_PAGES.find((p) => p.id === section)!;
  const [menuOpen, setMenuOpen] = useState(false);
  const staffFeed = useStaffNotifications();
  
  // Local persistent state for walk-in inquiries
  const [walkInInquiries, setWalkInInquiries] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("bsf_walk_in_inquiries");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Walk-in Inquiry form state
  const [walkInForm, setWalkInForm] = useState({
    fullName: "",
    mobileNo: "",
    email: "",
    preferredBatch: "Morning - 06:00 AM",
    notes: ""
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const token = getSessionToken();
      const headers = token ? { "x-session-token": token } : {};

      // 1. Fetch Members
      const resMembers = await fetch("/api/members", { headers });
      let membersData: any[] = [];
      if (resMembers.ok) {
        membersData = await resMembers.json().catch(() => []);
        // Keep members belonging to current academy
        const academyMembers = membersData.filter((m: any) => m.academyId === academyId);
        setAllMembers(academyMembers);
      }


      // 3. Fetch Renewals List
      const resRenewals = await fetch("/api/admin/renewals", { headers });
      if (resRenewals.ok) {
        const renewalsData = await resRenewals.json().catch(() => []);
        setRenewalsList(renewalsData);
      }
    } catch (err) {
      console.error("Failed to load receptionist dashboard data:", err);
      showToast("Couldn't load the latest records. Please try again.", "error");
    } finally {
      setIsDataLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [academyId]);

  // Robust expiry date calculator based on plan and registration date
  const getExpiryDate = (member: any) => {
    if (member.endDate) return member.endDate;
    if (!member.registrationDate) return "N/A";
    
    try {
      let regDate: Date;
      if (member.registrationDate.includes("/")) {
        const parts = member.registrationDate.split("/");
        regDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        regDate = new Date(member.registrationDate);
      }
      
      if (isNaN(regDate.getTime())) {
        regDate = new Date(member.created_at || Date.now());
      }
      
      let months = 1;
      const planName = (member.typeOfMembership || "").toLowerCase();
      if (planName.includes("quarterly") || planName.includes("3 month")) {
        months = 3;
      } else if (planName.includes("half") || planName.includes("6 month")) {
        months = 6;
      } else if (planName.includes("yearly") || planName.includes("12 month") || planName.includes("annual")) {
        months = 12;
      }
      
      regDate.setMonth(regDate.getMonth() + months);
      return regDate.toISOString().split("T")[0];
    } catch (e) {
      return "N/A";
    }
  };

  // 1. Compute Card Values strictly using real MySQL records
  const totalApprovedMembers = allMembers.filter(m => m.registration_status === "Approved").length;
  
  
  const pendingApprovals = allMembers.filter(m => m.registration_status === "Pending");
  const pendingApprovalsCount = pendingApprovals.length;
  
  const pendingPayments = allMembers.filter(m => m.registration_status === "Approved" && m.payment_status === "Pending");
  const pendingPaymentsCount = pendingPayments.length;

  const renewalsNext3Days = renewalsList.filter((r: any) => {
    if (r.status !== "Pending") return false;
    try {
      const dueDate = new Date(r.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const next3Days = new Date();
      next3Days.setDate(today.getDate() + 3);
      next3Days.setHours(23, 59, 59, 999);
      
      return dueDate >= today && dueDate <= next3Days;
    } catch (e) {
      return false;
    }
  });
  const renewalsDueCount = renewalsNext3Days.length;

  // 2. Member Search Filter
  const filteredSearchMembers = allMembers.filter(m => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const matchesName = m.fullName && m.fullName.toLowerCase().includes(q);
    const matchesNo = m.membershipNo && m.membershipNo.toLowerCase().includes(q);
    const matchesMobile = m.mobileNo && m.mobileNo.includes(q);
    return matchesName || matchesNo || matchesMobile;
  });

  // Picking a member (from search, a QR scan or Pending payments) brings their card into view.
  useEffect(() => {
    if (section !== "find" || !selectedMember) return;
    const id = window.setTimeout(() => document.getElementById("member-profile-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(id);
  }, [section, selectedMember?.id]);

  // Submit walk-in inquiry to persistent localStorage
  const handleWalkInInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.fullName || !walkInForm.mobileNo) {
      showToast("Name and Mobile Number are required.", "error");
      return;
    }

    const newInquiry = {
      id: "inq_" + Date.now(),
      fullName: walkInForm.fullName,
      mobileNo: `+91 ${walkInForm.mobileNo.slice(0, 5)} ${walkInForm.mobileNo.slice(5)}`,
      email: walkInForm.email || "N/A",
      preferredBatch: walkInForm.preferredBatch,
      notes: walkInForm.notes || "No special comments.",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newInquiry, ...walkInInquiries];
    setWalkInInquiries(updated);
    localStorage.setItem("bsf_walk_in_inquiries", JSON.stringify(updated));

    // Reset Form
    setWalkInForm({
      fullName: "",
      mobileNo: "",
      email: "",
      preferredBatch: "Morning - 06:00 AM",
      notes: ""
    });
    setIsWalkInModalOpen(false);
    showToast("Enquiry saved on this device.");
  };

  // Sends the member's payment link on WhatsApp (the approved payment_link template).
  const [sendingLinkFor, setSendingLinkFor] = useState<number | null>(null);
  const handleSendReminder = async (member: any) => {
    setSendingLinkFor(member.id);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/resend-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
        body: JSON.stringify({ membershipNo: member.membershipNo })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The payment link could not be sent.");
      showToast(data.message || `Payment link sent to ${member.fullName} on WhatsApp.`);
    } catch (err: any) {
      showToast(err.message || "The payment link could not be sent.", "error");
    } finally {
      setSendingLinkFor(null);
    }
  };


  // Access validation (Restrict to reception/staff roles)
  const hasAccess = sessionUser && ["receptionist", "staff", "admin", "super_admin"].includes(sessionUser.role);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-8 text-center animate-in fade-in duration-300" id="receptionist-no-access">
        <div className="p-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full mb-6">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold mb-2">Reception staff only</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          The Baroda Swim Front reception screen is only for front desk staff. Your current role is <strong className="uppercase text-red-500">[{sessionUser?.role || "unknown"}]</strong>.
        </p>
        {onLogout && (
          <button 
            onClick={onLogout} 
            className="mt-6 px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
          >
            Log Out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans" id="receptionist-terminal">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border text-xs font-bold shadow-lg ${
              toast.type === "success" 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-red-500 text-white border-red-400"
            }`}
            id="toast-notification"
          >
            {toast.type === "success" ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. DESKTOP SIDEBAR (same layout as the coach and admin dashboards) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 h-screen sticky top-0">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-9 w-9 rounded-xl object-cover shadow-md shrink-0" />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xs font-black tracking-tight leading-none text-white truncate">Baroda Swim Front</span>
            <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-sky-400 mt-1 truncate">Reception</span>
          </div>
        </div>
        <div className="p-4 border-b border-slate-800 bg-slate-950/20 shrink-0 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 uppercase shrink-0">
            {photoUrl ? <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" /> : displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{displayName}</div>
            <div className="text-[9.5px] font-mono text-sky-400 uppercase font-semibold truncate tracking-wider">Reception</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Reception pages">
          {RECEPTION_PAGES.map((tab) => {
            const Icon = tab.icon;
            const isActive = section === tab.id;
            const badge = tab.id === "approvals" ? pendingApprovalsCount : tab.id === "payments" ? pendingPaymentsCount : 0;
            return (
              <button
                key={tab.id}
                id={`btn-reception-tab-${tab.id}`}
                onClick={() => setSection(tab.id)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                  isActive ? "bg-sky-600 text-white font-bold shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1 text-left">{tab.label}</span>
                {badge > 0 && <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{badge}</span>}
              </button>
            );
          })}
          <div className="pt-4 mt-3 border-t border-slate-800 space-y-1">
            <button onClick={() => setIsClosingReportModalOpen(true)} id="btn-closing-report" className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
              <FileText className="h-4 w-4 shrink-0" /><span>Daily closing report</span>
            </button>
          </div>
        </nav>
        {onLogout && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
            <button id="btn-logout" onClick={onLogout} className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 flex items-center gap-3 transition-colors cursor-pointer">
              <LogOut className="h-4 w-4 shrink-0" /><span>Log out</span>
            </button>
          </div>
        )}
      </aside>

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Phone header: crest and page name; scan and bell on the right. The menu is in the bottom bar. */}
        <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md" id="dashboard-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-8 w-8 rounded-lg object-cover shadow-sm shrink-0" />
            <div className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-slate-500 leading-tight">Baroda Swim Front</span>
              <span className="block truncate text-sm font-black text-slate-900 leading-tight">{currentPage.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsQrScannerOpen(true)} aria-label="Scan member QR" id="btn-scan-qr-header" className="p-2 rounded-lg bg-sky-600 text-white shadow-sm cursor-pointer">
              <QrCode className="h-5 w-5" />
            </button>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications" id="btn-receptionist-bell" className="relative p-2 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer">
              <Bell className="h-5 w-5" />
              <NotificationCountBadge count={staffFeed.unreadCount} />
            </button>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 items-center justify-between border-b border-slate-200/80 bg-white px-8">
          <h1 className="text-xs font-black uppercase tracking-widest text-slate-800">{currentPage.label}</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsQrScannerOpen(true)} className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 cursor-pointer">
              <QrCode className="h-4 w-4" /><span>Scan member QR</span>
            </button>
            <button onClick={fetchDashboardData} disabled={isRefreshing} title="Refresh" aria-label="Refresh" id="btn-refresh-dashboard" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-sky-500" : ""}`} />
            </button>
            <button onClick={() => setNotificationsOpen(!notificationsOpen)} title="Notifications" aria-label="Notifications" className="relative p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Bell className="h-4 w-4" />
              <NotificationCountBadge count={staffFeed.unreadCount} />
            </button>
          </div>
        </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">

        {section === "home" && (
          <>
        {/* Real-time Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5" id="stats-cards-grid">
          
          {/* Card 1: Total Approved Members */}
          <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Members</span>
              <div className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 md:mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{totalApprovedMembers}</h3>
              )}
              <span className="text-[10px] text-emerald-500 font-bold block mt-1">Swimmers Registered</span>
            </div>
          </div>

          {/* Card 3: Pending Approvals */}
          <div role="button" tabIndex={0} onClick={() => setSection("approvals")} onKeyDown={(e) => { if (e.key === "Enter") setSection("approvals"); }} className="cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Pending Approvals</span>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 md:mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{pendingApprovalsCount}</h3>
              )}
              <span className="text-[10px] text-amber-600 font-bold block mt-1">Applications Awaiting</span>
            </div>
          </div>

          {/* Card 4: Pending Payments */}
          <div role="button" tabIndex={0} onClick={() => setSection("payments")} onKeyDown={(e) => { if (e.key === "Enter") setSection("payments"); }} className="cursor-pointer bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Pending Payments</span>
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 md:mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{pendingPaymentsCount}</h3>
              )}
              <span className="text-[10px] text-rose-600 font-bold block mt-1">Awaiting Registration Fees</span>
            </div>
          </div>

          {/* Card 5: Renewals Due (Next 3 Days) */}
          <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Renewals Due (3d)</span>
              <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 md:mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{renewalsDueCount}</h3>
              )}
              <span className="text-[10px] text-purple-600 font-bold block mt-1">Renewals Next 72 Hours</span>
            </div>
          </div>

        </div>

            <div className="space-y-6">
            {/* Quick actions: the front desk's everyday jobs */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="quick-actions-panel">
              <h2 className="text-base font-extrabold text-slate-900 mb-4">Quick actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { id: "qa-scan", label: "Scan member QR", icon: QrCode, tone: "bg-sky-50 text-sky-600", onClick: () => setIsQrScannerOpen(true) },
                  { id: "qa-find", label: "Find a member", icon: Search, tone: "bg-emerald-50 text-emerald-600", onClick: () => { setSection("find"); setTimeout(() => searchInputRef.current?.focus(), 50); } },
                  { id: "qa-register", label: "Register a member", icon: UserPlus, tone: "bg-violet-50 text-violet-600", onClick: () => setSection("register") },
                  { id: "action-walk-in", label: "Note an enquiry", icon: Plus, tone: "bg-amber-50 text-amber-600", onClick: () => setIsWalkInModalOpen(true) },
                  { id: "qa-closing", label: "Closing report", icon: FileText, tone: "bg-slate-100 text-slate-700", onClick: () => setIsClosingReportModalOpen(true) }
                ].map(({ id, label, icon: Icon, tone, onClick }) => (
                  <button key={id} id={id} onClick={onClick} className="flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white p-3.5 text-left text-[13px] font-bold text-slate-800 transition-colors hover:border-sky-200 hover:bg-sky-50/40 cursor-pointer">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" /></span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            </div>
          </>
        )}

        {section === "find" && (
          <div className="max-w-3xl">
            <div className="space-y-6 md:space-y-8" id="left-workspace">
            {/* Quick Member Lookup Panel */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Member lookup</span>
                  <h2 className="text-base font-extrabold text-slate-900 mt-0.5">Find a member</h2>
                </div>
                <button
                  onClick={() => setIsQrScannerOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  id="btn-launch-qr-hub"
                >
                  <QrCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Scan card</span>
                </button>
              </div>

              {/* Robust search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Membership Number, Mobile Number, or Full Name..."
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-sans"
                  id="member-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Dynamic Search Results list */}
              {searchQuery.trim() !== "" && (
                <div className="mt-4 border border-slate-100 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-slate-50 bg-slate-50/50 shadow-inner" id="search-results-list">
                  {filteredSearchMembers.length > 0 ? (
                    filteredSearchMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMember(m);
                          setSearchQuery("");
                        }}
                        className="w-full text-left p-3.5 hover:bg-sky-50/50 transition-colors flex justify-between items-center cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8.5 w-8.5 bg-sky-100 text-sky-600 flex items-center justify-center rounded-lg font-bold text-xs">
                            {m.fullName?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block group-hover:text-sky-600 transition-colors">{m.fullName}</span>
                            <span className="text-[10px] font-semibold text-slate-400 block font-mono">ID: {m.membershipNo} • Phone: {m.mobileNo}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold tracking-wider bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500 uppercase font-mono group-hover:border-sky-200 group-hover:text-sky-600">
                          Select &rarr;
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No matching registered members found.
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] font-semibold text-slate-400 mt-3 leading-relaxed">
                Scan a member's card or search by name, phone or membership number to see their status, plan and expiry.
              </p>
            </div>

            {/* Selected Swimmer details & check-in module */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="member-profile-panel">
              {selectedMember ? (
                <div className="space-y-6">
                  
                  {/* Swimmer main info header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-4">
                      {selectedMember.photoUrl ? (
                        <img
                          src={selectedMember.photoUrl}
                          alt={selectedMember.fullName}
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 rounded-2xl object-cover border border-slate-200 bg-slate-50"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-sky-500 text-white flex items-center justify-center font-black text-xl tracking-tight shadow-md shadow-sky-50">
                          {selectedMember.fullName?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-[9.5px] font-bold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          Swimmer Profile
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-1 uppercase leading-snug">{selectedMember.fullName}</h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-bold font-mono">
                          <span>Card: <strong className="text-slate-700">{selectedMember.membershipNo}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold tracking-wider font-mono px-3 py-1 rounded-full uppercase border ${
                        selectedMember.membership_status === "Active" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        {selectedMember.membership_status}
                      </span>
                      <span className={`text-[10px] font-extrabold tracking-wider font-mono px-3 py-1 rounded-full uppercase border ${
                        selectedMember.payment_status === "Paid" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {selectedMember.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Profile data list */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Membership Plan</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedMember.typeOfMembership || "General Plan"}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Assigned Batch</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedMember.batchTiming || "Unassigned"}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Expiry Date</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{getExpiryDate(selectedMember)}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Mobile</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedMember.mobileNo || "-"}</span>
                    </div>

                  </div>

                  {selectedMember.membership_status !== "Active" && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-semibold text-amber-800">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>This membership is not active{selectedMember.payment_status !== "Paid" ? " and the fee is not paid" : ""}. Collect the payment or check with the admin before letting them swim.</span>
                    </div>
                  )}

                  {/* Operational Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">

                    <button
                      onClick={() => setIsDigitalCardModalOpen(true)}
                      className="px-4 py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer border border-cyan-500/20 flex items-center justify-center gap-1.5"
                      id="btn-profile-qr-card"
                    >
                      <QrCode className="h-4 w-4 text-cyan-600" />
                      <span>Digital QR Card</span>
                    </button>

                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer border border-slate-200/50"
                      id="btn-profile-view"
                    >
                      View Profile Details
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-slate-400" id="empty-selected-member">
                  <User className="h-10 w-10 mx-auto opacity-35 mb-3.5 text-slate-400" />
                  <p className="text-xs font-bold">No Swimmer Selected</p>
                  <p className="text-[11px] font-medium opacity-70 max-w-sm mx-auto mt-1 leading-relaxed">
                    Search above or scan a membership card.
                  </p>
                </div>
              )}
            </div>

            </div>
          </div>
        )}

        {section === "register" && (
          <RegisterPage
            embedded
            walkIn
            academyId={academyId}
            onRegisterSuccess={() => {
              void fetchDashboardData();
              showToast("Member registered.");
              setSection("home");
            }}
            onCancel={() => setSection("home")}
          />
        )}

        {section === "approvals" && (
          <div className="max-w-3xl space-y-6">
            {/* Pending Approvals Queue */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="pending-approvals-panel">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Waiting for approval</span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Pending Approvals</h3>
                </div>
                <span className="text-[10px] font-extrabold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-mono">
                  {pendingApprovalsCount} NEW
                </span>
              </div>

              {isDataLoading ? (
                <div className="py-6 flex justify-center opacity-50">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : pendingApprovals.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {pendingApprovals.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase leading-snug">{m.fullName}</h4>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5 font-mono">{m.mobileNo} • {m.typeOfMembership || "Monthly Plan"}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-slate-200/50 pt-2">
                        <button
                          onClick={() => {
                            setViewingAppMember(m);
                            setIsAppModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer text-center"
                        >
                          View Application
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50/40 rounded-2xl border border-dashed border-slate-100">
                  <FileText className="h-6 w-6 mx-auto text-slate-300 opacity-55 mb-2.5" />
                  <p className="text-xs font-bold text-slate-400">All applications approved</p>
                  <p className="text-[10px] text-slate-400 mt-1">No registration requests currently pending.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {section === "payments" && (
          <div className="max-w-3xl space-y-6">
            {/* Pending Payments Queue */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="pending-payments-panel">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Accounts Receivable</span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Pending Payments</h3>
                </div>
                <span className="text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-mono">
                  {pendingPaymentsCount} UNPAID
                </span>
              </div>

              {isDataLoading ? (
                <div className="py-6 flex justify-center opacity-50">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : pendingPayments.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {pendingPayments.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase leading-snug">{m.fullName}</h4>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5 font-mono">ID: {m.membershipNo} • {m.typeOfMembership || "Monthly Plan"}</span>
                        </div>
                        <span className="text-xs font-black text-rose-500 font-mono">
                          ₹{m.amountPaid || 3500}
                        </span>
                      </div>

                      <div className="flex gap-2 border-t border-slate-200/50 pt-2">
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setSection("find");
                          }}
                          className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer text-center"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => void handleSendReminder(m)}
                          disabled={sendingLinkFor === m.id}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-60"
                        >
                          <Send className="h-3 w-3" />
                          <span>{sendingLinkFor === m.id ? "Sending…" : "Send payment link"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50/40 rounded-2xl border border-dashed border-slate-100">
                  <CreditCard className="h-6 w-6 mx-auto text-slate-300 opacity-55 mb-2.5" />
                  <p className="text-xs font-bold text-slate-400">All fees collected</p>
                  <p className="text-[10px] text-slate-400 mt-1">No approved members currently awaiting fee registration.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {section === "settings" && (
          <SettingsTab
            activeUser={{
              name: displayName,
              role: sessionUser?.role || "receptionist",
              email: sessionUser?.email || "",
              phoneNumber: sessionUser?.phoneNumber || sessionUser?.phone || "",
              avatar: photoUrl
            }}
            onLogout={() => onLogout?.()}
            onProfileUpdated={(updated) => {
              try {
                const saved = sessionStore.get();
                if (saved) {
                  const parsed = JSON.parse(saved);
                  Object.assign(parsed, { name: updated.name, email: updated.email, phone: updated.phoneNumber, phoneNumber: updated.phoneNumber, photoUrl: updated.avatar, avatar: updated.avatar });
                  sessionStore.set(JSON.stringify(parsed));
                  setSessionUser(parsed);
                }
              } catch { /* ignore */ }
            }}
          />
        )}

      </main>
      </div>

      {/* 3. PHONE BOTTOM BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)]" aria-label="Reception pages">
        {([
          { id: "home", label: "Home", icon: LayoutDashboard },
          { id: "find", label: "Find", icon: Search },
          { id: "register", label: "Register", icon: UserPlus },
          { id: "approvals", label: "Approvals", icon: Clock, badge: pendingApprovalsCount }
        ] as const).map((item) => {
          const Icon = item.icon;
          const active = section === item.id && !menuOpen;
          return (
            <button key={item.id} onClick={() => { setSection(item.id); setMenuOpen(false); }} className={`relative flex flex-col items-center justify-center py-1 cursor-pointer ${active ? "text-sky-600 font-bold" : "text-slate-400"}`}>
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] font-medium">{item.label}</span>
              {"badge" in item && item.badge > 0 && <span className="absolute top-1 right-1/2 translate-x-4 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white">{item.badge}</span>}
            </button>
          );
        })}
        <button onClick={() => setMenuOpen(true)} className={`relative flex flex-col items-center justify-center py-1 cursor-pointer ${menuOpen ? "text-sky-600 font-bold" : "text-slate-400"}`}>
          <Menu className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">Menu</span>
          {(pendingPaymentsCount > 0 || staffFeed.unreadCount > 0) && <span className="absolute top-1.5 right-1/2 translate-x-3 h-2 w-2 rounded-full bg-rose-500" />}
        </button>
      </nav>

      {/* PHONE MENU */}
      <SideMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sections={[
          { items: RECEPTION_PAGES.filter((p) => p.id !== "settings").map((p) => ({ ...p, badge: p.id === "approvals" ? pendingApprovalsCount : p.id === "payments" ? pendingPaymentsCount : undefined })) },
          { heading: "Tools", items: [
            { id: "tool-closing", label: "Daily closing report", icon: FileText },
            { id: "tool-notifications", label: "Notifications", icon: Bell, badge: staffFeed.unreadCount }
          ] },
          { heading: "Account", items: [{ id: "settings", label: "Settings", icon: Sliders }] }
        ]}
        activeId={section}
        onSelect={(id) => {
          if (id === "tool-closing") setIsClosingReportModalOpen(true);
          else if (id === "tool-notifications") setNotificationsOpen(true);
          else setSection(id as ReceptionSection);
        }}
        subtitle="Reception"
        user={{ name: displayName, role: "Reception", avatar: photoUrl || undefined }}
        onProfile={() => setSection("settings")}
        onLogout={() => onLogout?.()}
        primaryAction={{ label: "Scan member QR", icon: QrCode, onClick: () => setIsQrScannerOpen(true) }}
      />

      {/* MODAL 1: Swimmer Detailed Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-profile-viewer">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            ></motion.div>
            
            {/* Content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <User className="h-5 w-5 text-sky-500" />
                  <h3 className="text-base font-black text-slate-900 uppercase">Swimmer Details</h3>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Visual Bio section */}
                <div className="flex items-center gap-4.5 bg-sky-50/40 p-4 rounded-2xl border border-sky-100/30">
                  {selectedMember.photoUrl ? (
                    <img
                      src={selectedMember.photoUrl}
                      alt={selectedMember.fullName}
                      referrerPolicy="no-referrer"
                      className="h-20 w-20 rounded-2xl object-cover border border-slate-200 bg-white shadow-xs"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-2xl tracking-tight shadow-md shadow-sky-100">
                      {selectedMember.fullName?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{selectedMember.fullName}</h4>
                    <span className="text-[10px] font-bold font-mono text-slate-400 block mt-1.5 uppercase">MEMBERSHIP NO: <strong className="text-sky-600">{selectedMember.membershipNo}</strong></span>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono mt-0.5">REGISTRATION DATE: {selectedMember.registrationDate || "N/A"}</span>
                  </div>
                </div>

                {/* Sub sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* Personal stats */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Primary Demographics</h5>
                    <div className="space-y-2">
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Gender:</span> <strong className="text-slate-800 uppercase font-mono">{selectedMember.gender || "Not specified"}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Date of Birth:</span> <strong className="text-slate-800 font-mono">{selectedMember.dateOfBirth || "N/A"}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Age:</span> <strong className="text-slate-800 font-mono">{selectedMember.age || "N/A"} Years</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Blood Group:</span> <strong className="text-slate-800 font-mono">{selectedMember.bloodGroup || "Not recorded"}</strong></p>
                    </div>
                  </div>

                  {/* Program enrollment */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Program Details</h5>
                    <div className="space-y-2">
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Academy Branch:</span> <strong className="text-slate-800 uppercase">Swim Academy</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Membership Tier:</span> <strong className="text-slate-800 uppercase font-mono">{selectedMember.typeOfMembership || "Monthly Pro"}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Allotted Slot:</span> <strong className="text-slate-800 uppercase font-mono">{selectedMember.batchTiming || "Morning Sunrise (A)"}</strong></p>
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Payment State:</span> <strong className="text-emerald-600 uppercase font-mono">{selectedMember.payment_status}</strong></p>
                    </div>
                  </div>

                  {/* Safety Emergency contacts */}
                  <div className="space-y-3 md:col-span-2">
                    <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Emergency & Guard Details</h5>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Parent Name</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedMember.parentName || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Parent Mobile</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5 font-mono">{selectedMember.parentMobile || selectedMember.mobileNo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Emergency Guard</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{selectedMember.emergencyName || "N/A"} ({selectedMember.emergencyRelation || "Guardian"})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Emergency Phone</span>
                        <span className="text-xs font-extrabold text-slate-800 block mt-0.5 font-mono">{selectedMember.emergencyPhone || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Medical Details */}
                  <div className="space-y-3 md:col-span-2">
                    <h5 className="font-extrabold text-[11px] text-rose-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-rose-400" /> Medical & Undertaking Record</h5>
                    <div className="p-3.5 rounded-2xl border border-slate-100 bg-rose-50/20">
                      <p className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Has Medical Condition:</span> <strong className="text-slate-800 uppercase font-mono">{selectedMember.hasMedicalCondition || "No"}</strong></p>
                      {selectedMember.medicalDetails && (
                        <p className="mt-2 text-slate-600 leading-relaxed font-semibold bg-white p-2 rounded-xl border border-slate-100">"{selectedMember.medicalDetails}"</p>
                      )}
                    </div>
                  </div>

                  {/* Digital Signature preview if present */}
                  {selectedMember.typedSignature && (
                    <div className="space-y-3 md:col-span-2">
                      <h5 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Signed Digital Indemnity Undertaking</h5>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center font-serif italic text-slate-600 text-lg py-5 select-none pointer-events-none">
                        {selectedMember.typedSignature}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-5 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Register Walk-In Inquiry Modal */}
      <AnimatePresence>
        {isWalkInModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-walk-in-registration">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWalkInModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
            >
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Plus className="h-5 w-5 text-emerald-500" />
                  <div><h3 className="text-base font-black text-slate-900">Note an enquiry</h3><p className="text-[11px] font-medium text-slate-500">For someone asking about joining. Saved on this device only. To enrol them, use Register a member.</p></div>
                </div>
                <button
                  onClick={() => setIsWalkInModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleWalkInInquirySubmit} className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={walkInForm.fullName}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter candidate's full name..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Mobile Number *</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={walkInForm.mobileNo}
                      onChange={(e) => setWalkInForm(prev => ({ ...prev, mobileNo: mobileDigits(e.target.value) }))}
                      placeholder="98765 43210"
                      pattern="[6-9][0-9]{9}"
                      title="Enter the 10-digit mobile number, starting with 6, 7, 8 or 9."
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold tabular-nums focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Email Address</label>
                  <input
                    type="email"
                    value={walkInForm.email}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address (optional)..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Preferred Slot</label>
                  <select
                    value={walkInForm.preferredBatch}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, preferredBatch: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  >
                    <option value="Morning - 06:00 AM">Morning Sunrise (A) - 06:00 AM</option>
                    <option value="Morning - 07:00 AM">Morning Early (B) - 07:00 AM</option>
                    <option value="Evening - 05:00 PM">Evening Junior (C) - 05:00 PM</option>
                    <option value="Evening - 06:15 PM">Evening Elite (D) - 06:15 PM</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Reception Remarks</label>
                  <textarea
                    rows={3}
                    value={walkInForm.notes}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter trial inquiry notes, referral source, etc..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsWalkInModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs uppercase font-extrabold transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs uppercase font-extrabold shadow-md shadow-emerald-50 active:scale-98 transition-all cursor-pointer text-center"
                    id="btn-submit-walk-in"
                  >
                    Save enquiry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Application Viewer for Pending Approvals */}
      <AnimatePresence>
        {isAppModalOpen && viewingAppMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-app-viewer">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAppModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-sky-500" />
                  <h3 className="text-base font-black text-slate-900 uppercase">Swimmer Enrollment Application</h3>
                </div>
                <button
                  onClick={() => setIsAppModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/40 text-amber-800 leading-relaxed">
                  <p className="font-extrabold flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-600" /> Status: Under Review
                  </p>
                  <span>This application has been successfully logged. Front desk staff can view profiles and notify Swimmer Ops Administrators to expedite approvals below.</span>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide">Candidate Bio-Data</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Swimmer Name</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5 uppercase">{viewingAppMember.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Phone Number</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5 font-mono">{viewingAppMember.mobileNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Gender</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5 uppercase">{viewingAppMember.gender || "Not Specified"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Age</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{viewingAppMember.age || "N/A"} Years</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Membership Tier</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{viewingAppMember.typeOfMembership || "General"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Preferred Timing Slot</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{viewingAppMember.batchTiming || "MWF Morning Sunrise"}</span>
                    </div>
                  </div>

                  <h4 className="font-black text-slate-900 border-b border-slate-100 pb-1.5 uppercase tracking-wide mt-2">Emergency & Parent Profiles</h4>
                  
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Parent Name</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5">{viewingAppMember.parentName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Emergency Phone</span>
                      <span className="text-xs font-extrabold text-slate-800 block mt-0.5 font-mono">{viewingAppMember.emergencyPhone || "N/A"}</span>
                    </div>
                  </div>

                  {viewingAppMember.medicalDetails && (
                    <div className="p-3.5 rounded-2xl border border-red-100 bg-red-50/20 text-slate-700">
                      <span className="text-[10px] text-red-500 font-bold block uppercase">Allergies & Medical Declaration</span>
                      <span className="text-xs font-extrabold text-red-950 block mt-0.5 leading-relaxed">"{viewingAppMember.medicalDetails}"</span>
                    </div>
                  )}

                </div>

              </div>

              <div className="p-5 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => setIsAppModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs uppercase font-extrabold transition-all cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        userName={userName}
        onMemberScanned={(membershipNo) => {
          const wanted = membershipNo.trim().toLowerCase();
          const found = allMembers.find((m) =>
            String(m.membershipNo || "").toLowerCase() === wanted || String(m.mobileNo || "") === membershipNo.trim() || String(m.id) === membershipNo.trim()
          );
          if (found) {
            setSelectedMember(found);
            setSection("find");
          } else {
            showToast(`No member found for ${membershipNo || "this card"}.`, "error");
          }
        }}
      />

      {/* Digital Membership Card Modal */}
      <AnimatePresence>
        {isDigitalCardModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-sm font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-cyan-400" /> Digital Membership Pass
                </h3>
                <button
                  onClick={() => setIsDigitalCardModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <DigitalMembershipCard member={selectedMember} />

              <div className="pt-2 text-center">
                <button
                  onClick={() => setIsDigitalCardModalOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Close Pass Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Member Profile Modal */}
      <EmergencyMemberModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        member={selectedMember}
      />

      {/* Member Journey Timeline Modal */}
      <MemberTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        member={selectedMember}
      />

      {/* Daily Closing Report Modal */}
      <DailyClosingReportModal
        isOpen={isClosingReportModalOpen}
        onClose={() => setIsClosingReportModalOpen(false)}
        members={allMembers}
        renewalsList={renewalsList}
      />

      {/* Side Panel Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={staffFeed.notifications}
        onMarkRead={staffFeed.markRead}
        onMarkAllRead={staffFeed.markAllRead}
        onDelete={staffFeed.remove}
        onClearAll={staffFeed.clearAll}
      />

    </div>
  );
}
