import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, CheckCircle2, Clock, Send, Eye, Search, AlertCircle, 
  LogOut, ShieldAlert, Phone, User, Calendar, CreditCard,
  MapPin, Plus, Check, RefreshCw, X, FileText, Bell, CheckCircle, Heart, QrCode, Maximize2
} from "lucide-react";
import { AcademyId } from "../types";
import { QrScannerModal } from "./QrScannerModal";
import { DigitalMembershipCard } from "./DigitalMembershipCard";
import { ReceptionKioskModal } from "./ReceptionKioskModal";
import { EmergencyMemberModal } from "./EmergencyMemberModal";
import { MemberTimelineModal } from "./MemberTimelineModal";
import { DailyClosingReportModal } from "./DailyClosingReportModal";
import { NotificationDrawer, SysNotification } from "./NotificationDrawer";

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
      const saved = localStorage.getItem("sams_session");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: userName || "Receptionist", role: "receptionist" };
  });

  const getSessionToken = () => {
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.token || "";
      }
    } catch (e) {
      console.error(e);
    }
    return "";
  };

  // State Management
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
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
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isClosingReportModalOpen, setIsClosingReportModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SysNotification[]>([
    { id: 101, text: "New member registration pending front-desk review", time: "5m ago", read: false, type: "registration", title: "Member Verification" },
    { id: 102, text: "3 memberships due for quarterly renewal this week", time: "30m ago", read: false, type: "renewal", title: "Expiration Notice" },
    { id: 103, text: "Morning Batch 07:00 AM swum check-ins synchronized", time: "1h ago", read: true, type: "system", title: "Attendance Logged" }
  ]);
  
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

      // 2. Fetch Attendance logs
      const resAttendance = await fetch("/api/attendance", { headers });
      if (resAttendance.ok) {
        const attendanceData = await resAttendance.json().catch(() => []);
        setAttendanceLogs(attendanceData);
      }

      // 3. Fetch Renewals List
      const resRenewals = await fetch("/api/admin/renewals", { headers });
      if (resRenewals.ok) {
        const renewalsData = await resRenewals.json().catch(() => []);
        setRenewalsList(renewalsData);
      }
    } catch (err) {
      console.error("Failed to load receptionist dashboard data:", err);
      showToast("Failed to fetch real-time database records", "error");
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
  
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayCheckIns = attendanceLogs.filter(log => log.date === todayDateStr);
  const todayCheckInsCount = todayCheckIns.length;
  
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

  // Check if selected member is checked in today
  const isAlreadyCheckedIn = selectedMember && todayCheckIns.some(
    log => Number(log.member_id) === Number(selectedMember.id)
  );

  const checkedInLogForSelected = selectedMember && todayCheckIns.find(
    log => Number(log.member_id) === Number(selectedMember.id)
  );

  // Handle Check In request
  const handleCheckIn = async (member: any) => {
    if (!member) return;
    try {
      const token = getSessionToken();
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ memberId: member.id })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`${member.fullName} has been checked in successfully!`, "success");
        // Re-fetch records to update cards and logs instantly
        await fetchDashboardData();
        // Update selected state to reflect ARRIVED
        setSelectedMember(prev => prev && prev.id === member.id ? { ...prev } : prev);
      } else {
        showToast(data.error || "Failed to submit check-in.", "error");
      }
    } catch (err: any) {
      showToast("Network error: " + err.message, "error");
    }
  };

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
      mobileNo: walkInForm.mobileNo,
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
    showToast("Walk-in inquiry logged successfully!");
  };

  // Send Reminder function (staff restricted capability simulation with visual toast/activity log)
  const handleSendReminder = (member: any) => {
    showToast(`Payment reminder dispatched to ${member.fullName}'s parent via SMS & WhatsApp!`);
  };

  // Notify Admin function (staff capability simulation)
  const handleNotifyAdmin = (member: any) => {
    showToast(`Approval escalation alert transmitted to Swimmer Operations Admin for ${member.fullName}!`);
  };

  // Access validation (Restrict to reception/staff roles)
  const hasAccess = sessionUser && ["receptionist", "staff", "admin", "super_admin"].includes(sessionUser.role);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-8 text-center animate-in fade-in duration-300" id="receptionist-no-access">
        <div className="p-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full mb-6">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold mb-2">Restricted Access Terminal</h3>
        <p className="text-sm text-slate-500 max-w-md leading-relaxed">
          The Baroda Swim Front Front Reception Console is restricted to authorized desk staff. Your current role is <strong className="uppercase text-red-500">[{sessionUser?.role || "unknown"}]</strong>.
        </p>
        {onLogout && (
          <button 
            onClick={onLogout} 
            className="mt-6 px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
          >
            Sign Out of Console
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none" id="receptionist-terminal">
      
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

      {/* Dashboard Top Navigation */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-xs" id="dashboard-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-sky-500 text-white flex items-center justify-center rounded-xl font-black tracking-tighter text-lg shadow-md shadow-sky-100">
              BSF
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-950">Baroda Swim Front</h1>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-sky-400 inline-block animate-pulse"></span>
                <span>FRONT DESK OPERATIONS CONSOLE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right hidden md:block">
              <span className="text-[10px] font-bold font-mono text-slate-400 block uppercase">OPERATOR</span>
              <span className="text-sm font-extrabold text-slate-800">{userName || "Receptionist"}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsKioskOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 active:scale-95 cursor-pointer"
                id="btn-launch-kiosk"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="hidden md:inline">Launch Kiosk Mode</span>
              </button>

              <button
                onClick={() => setIsClosingReportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                id="btn-closing-report"
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span className="hidden md:inline">Daily Closing Report</span>
              </button>

              <button
                onClick={() => setIsQrScannerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                id="btn-scan-qr-header"
              >
                <QrCode className="h-4 w-4" />
                <span>Scan Member QR</span>
              </button>

              <button
                onClick={fetchDashboardData}
                disabled={isRefreshing}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-100 relative group"
                title="Refresh Real-time Records"
                id="btn-refresh-dashboard"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-sky-500" : ""}`} />
              </button>

              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer border border-slate-200 relative group shadow-2xs"
                title="Recent System Alerts & Desk Notifications"
                id="btn-receptionist-bell"
              >
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-white" />
                )}
              </button>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl text-xs font-bold border border-red-100 transition-all cursor-pointer"
                  id="btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-8 overflow-y-auto">

        {/* Real-time Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-5" id="stats-cards-grid">
          
          {/* Card 1: Total Approved Members */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Members</span>
              <div className="p-2 bg-sky-50 text-sky-500 rounded-xl">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{totalApprovedMembers}</h3>
              )}
              <span className="text-[10px] text-emerald-500 font-bold block mt-1">Swimmers Registered</span>
            </div>
          </div>

          {/* Card 2: Checked In Today */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Checked In Today</span>
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{todayCheckInsCount}</h3>
              )}
              <span className="text-[10px] text-slate-400 font-bold block mt-1">Swimmers Checked In</span>
            </div>
          </div>

          {/* Card 3: Pending Approvals */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Pending Approvals</span>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{pendingApprovalsCount}</h3>
              )}
              <span className="text-[10px] text-amber-600 font-bold block mt-1">Applications Awaiting</span>
            </div>
          </div>

          {/* Card 4: Pending Payments */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Pending Payments</span>
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{pendingPaymentsCount}</h3>
              )}
              <span className="text-[10px] text-rose-600 font-bold block mt-1">Awaiting Registration Fees</span>
            </div>
          </div>

          {/* Card 5: Renewals Due (Next 3 Days) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-0.5 duration-200 col-span-2 lg:col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Renewals Due (3d)</span>
              <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              {isDataLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ) : (
                <h3 className="text-2xl font-black text-slate-900 leading-none">{renewalsDueCount}</h3>
              )}
              <span className="text-[10px] text-purple-600 font-bold block mt-1">Renewals Next 72 Hours</span>
            </div>
          </div>

        </div>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* LEFT SIDE WORKSPACE: Member Search, Verification Profile & Check-In */}
          <div className="lg:col-span-7 space-y-6 md:space-y-8" id="left-workspace">
            
            {/* Quick Member Lookup Panel */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Verification Hub</span>
                  <h2 className="text-base font-extrabold text-slate-900 mt-0.5">Quick Member Search</h2>
                </div>
                <button
                  onClick={() => setIsQrScannerOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  id="btn-launch-qr-hub"
                >
                  <QrCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Launch QR Scanner</span>
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
                Scan or input Swimmer credentials above. Once selected, their profile details, health checks, and quick Check-In controls will render below.
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
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Today's Attendance</span>
                      <span className={`text-xs font-extrabold block mt-0.5 ${isAlreadyCheckedIn ? "text-emerald-500" : "text-amber-500"}`}>
                        {isAlreadyCheckedIn ? `Checked In (${checkedInLogForSelected?.time || "Arrived"})` : "Not Checked In Today"}
                      </span>
                    </div>

                  </div>

                  {/* Operational Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => handleCheckIn(selectedMember)}
                      disabled={isAlreadyCheckedIn}
                      className={`flex-1 py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isAlreadyCheckedIn 
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-not-allowed" 
                          : "bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-100 active:scale-98"
                      }`}
                      id="btn-profile-checkin"
                    >
                      {isAlreadyCheckedIn ? <Check className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      <span>{isAlreadyCheckedIn ? "Already Checked In Today" : "Check In Swimmer"}</span>
                    </button>

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
                    Type a query in the verification hub search bar above to look up, verify credentials, and trigger lobby check-ins.
                  </p>
                </div>
              )}
            </div>

            {/* Today's Check-Ins Live List */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4" id="today-checkins-panel">
              <div className="flex justify-between items-center pb-2">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Real-Time Registry</span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Today's Check-Ins</h3>
                </div>
                <span className="text-[10px] font-extrabold bg-sky-50 text-sky-600 border border-sky-100 px-3 py-1 rounded-full font-mono">
                  {todayCheckInsCount} ARRIVALS
                </span>
              </div>

              {isDataLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 opacity-55">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-xs font-medium">Synchronizing live attendance log...</span>
                </div>
              ) : todayCheckIns.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                        <th className="p-3">Time</th>
                        <th className="p-3">Swimmer Name</th>
                        <th className="p-3">Membership Number</th>
                        <th className="p-3">Allotted Slot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todayCheckIns.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-black text-sky-600">{log.time}</td>
                          <td className="p-3 font-extrabold text-slate-800">{log.fullName}</td>
                          <td className="p-3 font-mono text-slate-500">{log.membershipNo}</td>
                          <td className="p-3 font-semibold text-slate-600">{log.allottedTiming || "Morning Sunrise"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-400 opacity-40 mb-3" />
                  <p className="text-xs font-extrabold text-slate-500">Live check-in queue is empty</p>
                  <p className="text-[10px] text-slate-400 mt-1">No swimmers have marked lobby arrival yet today.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE WORKSPACE: Quick Actions, Approvals & Payments */}
          <div className="lg:col-span-5 space-y-6 md:space-y-8" id="right-workspace">
            
            {/* Quick Actions Panel */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="quick-actions-panel">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Operations Shortcuts</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5 mb-4">Quick Workflows</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <button
                  onClick={() => searchInputRef.current?.focus()}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/50 text-left flex items-center justify-between transition-colors cursor-pointer text-xs font-extrabold"
                  id="action-search"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-sky-500" />
                    <span>Search Member</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">FOC</span>
                </button>

                <button
                  onClick={() => setIsWalkInModalOpen(true)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/50 text-left flex items-center justify-between transition-colors cursor-pointer text-xs font-extrabold"
                  id="action-walk-in"
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span>Register Walk-In Inquiry</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">NEW</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("today-checkins-panel");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/50 text-left flex items-center justify-between transition-colors cursor-pointer text-xs font-extrabold"
                  id="action-view-attendance"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <span>View Today's Attendance</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">LIVE</span>
                </button>
              </div>
            </div>

            {/* Pending Approvals Queue */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm" id="pending-approvals-panel">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">Verification pipeline</span>
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
                        <button
                          onClick={() => handleNotifyAdmin(m)}
                          className="py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Bell className="h-3 w-3" />
                          <span>Notify Admin</span>
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
                            // Scroll to profile panel
                            const el = document.getElementById("member-profile-panel");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer text-center"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleSendReminder(m)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-extrabold uppercase transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Send className="h-3 w-3" />
                          <span>Remind Parent</span>
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

        </div>

      </main>

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
                  <h3 className="text-base font-black text-slate-900 uppercase">Swimmer Audit Dossier</h3>
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
                      <p className="flex justify-between"><span className="text-slate-400 font-bold">Blood Group:</span> <strong className="text-slate-800 font-mono">{selectedMember.bloodGroup || "O+"}</strong></p>
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
                  Close Dossier
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
                  <h3 className="text-base font-black text-slate-900 uppercase">Register Walk-In Inquiry</h3>
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
                  <input
                    type="tel"
                    required
                    value={walkInForm.mobileNo}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, mobileNo: e.target.value }))}
                    placeholder="Enter contact mobile number..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  />
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
                    Register Lead
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
                    <Clock className="h-4 w-4 text-amber-600" /> Status: Under Operational Review
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
                <button
                  onClick={() => {
                    handleNotifyAdmin(viewingAppMember);
                    setIsAppModalOpen(false);
                  }}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs uppercase font-extrabold shadow-md transition-all cursor-pointer text-center"
                >
                  Notify Operations Admin
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
        onCheckInSuccess={(data) => {
          showToast(`Access Granted! ${data.fullName || "Swimmer"} checked in successfully.`, "success");
          fetchDashboardData();
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

      {/* Reception Kiosk Mode Modal */}
      <ReceptionKioskModal
        isOpen={isKioskOpen}
        onClose={() => setIsKioskOpen(false)}
        members={allMembers}
        attendanceLogs={attendanceLogs}
        onCheckInMember={async (member) => {
          try {
            const token = getSessionToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) headers["x-session-token"] = token;

            const res = await fetch("/api/attendance", {
              method: "POST",
              headers,
              body: JSON.stringify({
                membershipNo: member.membershipNo,
                staffId: sessionUser.id || "STAFF-01"
              })
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              fetchDashboardData();
              return { success: true, message: "Attendance recorded", checkInTime: data.time || new Date().toLocaleTimeString() };
            } else {
              return { success: false, message: data.error || "Failed to record attendance" };
            }
          } catch (err: any) {
            return { success: false, message: err.message || "Network error" };
          }
        }}
      />

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
        attendanceLogs={attendanceLogs}
        renewalsList={renewalsList}
      />

      {/* Side Panel Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={(id) => {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        }}
        onMarkAllRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }}
        onDelete={(id) => {
          setNotifications(prev => prev.filter(n => n.id !== id));
        }}
        onClearAll={() => {
          setNotifications([]);
        }}
      />

    </div>
  );
}
