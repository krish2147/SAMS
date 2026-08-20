import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Calendar, Clock, CheckCircle, Award, 
  MapPin, UserCheck, CreditCard, Download, 
  Printer, Edit2, ShieldAlert, X, AlertCircle, 
  LogOut, Home, Bell, Phone, HelpCircle, FileText, 
  ChevronRight, RefreshCw, Info, Check, Mail, 
  MessageSquare, Key, Settings, ChevronDown, ChevronUp, Map, Shield
} from "lucide-react";
import { AcademyId } from "../types";
import { EditProfileModal } from "./EditProfileModal";
import { DigitalMembershipCard } from "./DigitalMembershipCard";
import { NotificationDrawer } from "./NotificationDrawer";
import { jsPDF } from "jspdf";

const formatDateToIndian = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // Match standard ISO dates YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

interface MemberDashboardProps {
  academyId: AcademyId;
  userName: string;
  onLogout?: () => void;
}

export function MemberDashboard({ academyId, userName, onLogout }: MemberDashboardProps) {
  const isSwim = academyId === "swim";
  
  // Navigation active tab spanning all 12 modules
  const [activeTab, setActiveTab] = useState<
    "home" | "membership" | "attendance" | "payments" | "events" | "profile" | "notifications" | "support" | "settings"
  >("home");
  
  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Notification category checkboxes
  const [alertChannels, setAlertChannels] = useState({
    attendance: true,
    renewals: true,
    tournaments: true,
    holidays: true,
    adminAnnouncements: true,
  });

  // Loaders and error states
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [renewalStatusLoading, setRenewalStatusLoading] = useState(true);
  
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [renewalStatusError, setRenewalStatusError] = useState<string | null>(null);
  
  // Database API states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [holidaysData, setHolidaysData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [notificationsData, setNotificationsData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [membershipDetails, setMembershipDetails] = useState<any>(null);
  const [renewalStatus, setRenewalStatus] = useState<any>(null);
  
  // Profile update and billing controls
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewalSuccessMsg, setRenewalSuccessMsg] = useState<string | null>(null);
  const [notificationsDrawerOpen, setNotificationsDrawerOpen] = useState(false);

  // Fetch Dashboard Summary
  const fetchDashboard = () => {
    setDashboardLoading(true);
    setDashboardError(null);
    fetch("/api/member/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch dashboard summaries.");
        }
        return res.json();
      })
      .then((data) => {
        setDashboardData(data);
        setDashboardLoading(false);
      })
      .catch((err) => {
        setDashboardError(err.message);
        setDashboardLoading(false);
      });
  };

  // Fetch Member Profile
  const fetchProfile = () => {
    setProfileLoading(true);
    setProfileError(null);
    fetch("/api/member/profile")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to retrieve member profile specs.");
        }
        return res.json();
      })
      .then((data) => {
        setProfileData(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        setProfileError(err.message);
        setProfileLoading(false);
      });
  };

  // Fetch Events & Holidays
  const fetchEventsAndHolidays = () => {
    setEventsLoading(true);
    setEventsError(null);
    
    Promise.all([
      fetch("/api/member/events").then(res => res.ok ? res.json() : []).catch(() => []),
      fetch("/api/member/holidays").then(res => res.ok ? res.json() : []).catch(() => [])
    ])
    .then(([events, holidays]) => {
      setEventsData(Array.isArray(events) ? events : []);
      setHolidaysData(Array.isArray(holidays) ? holidays : []);
      setEventsLoading(false);
    })
    .catch((err) => {
      setEventsError("Unable to fetch upcoming calendar activities.");
      setEventsLoading(false);
    });
  };

  // Fetch Payment Logs
  const fetchPayments = () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    fetch("/api/member/payments")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to download invoices history.");
        }
        return res.json();
      })
      .then((data) => {
        setPaymentsData(data.payments || []);
        setPaymentsLoading(false);
      })
      .catch((err) => {
        setPaymentsError(err.message);
        setPaymentsLoading(false);
      });
  };

  // Fetch Past payment history
  const fetchPaymentHistory = () => {
    fetch("/api/member/payment-history")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load payment history");
        return res.json();
      })
      .then((data) => {
        setPaymentHistory(data || []);
      })
      .catch((err) => console.error(err));
  };

  // Fetch Notifications List
  const fetchNotifications = () => {
    setNotificationsLoading(true);
    fetch("/api/member/notifications")
      .then(res => res.ok ? res.json() : [])
      .then((data) => {
        setNotificationsData(Array.isArray(data) ? data : []);
        setNotificationsLoading(false);
      })
      .catch(() => {
        setNotificationsLoading(false);
      });
  };

  // Fetch Attendance Log Metrics
  const fetchAttendance = () => {
    setAttendanceLoading(true);
    fetch("/api/member/attendance")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to retrieve attendance logs.");
        return res.json();
      })
      .then((data) => {
        setAttendanceData(data);
        setAttendanceLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setAttendanceLoading(false);
      });
  };

  // Fetch Membership benefits and dates
  const fetchMembership = () => {
    setMembershipLoading(true);
    setMembershipError(null);
    fetch("/api/member/membership")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch membership summaries.");
        }
        return res.json();
      })
      .then((data) => {
        setMembershipDetails(data);
        setMembershipLoading(false);
      })
      .catch((err) => {
        setMembershipError(err.message);
        setMembershipLoading(false);
      });
  };

  // Fetch Renewal status limits
  const fetchRenewalStatus = () => {
    setRenewalStatusLoading(true);
    setRenewalStatusError(null);
    fetch("/api/member/renewal-status")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to extract renewal limits.");
        }
        return res.json();
      })
      .then((data) => {
        setRenewalStatus(data);
        setRenewalStatusLoading(false);
      })
      .catch((err) => {
        setRenewalStatusError(err.message);
        setRenewalStatusLoading(false);
      });
  };

  // Handle renewal post request
  const handleRenewMembership = async () => {
    if (!renewalStatus) return;
    setRenewing(true);
    setRenewalSuccessMsg(null);
    try {
      const response = await fetch("/api/member/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: renewalStatus.renewalPrice })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Renewal transaction processing failed.");
      }
      setRenewalSuccessMsg(`Success! Membership extended. Transaction ID: ${result.transactionId}`);
      
      // Refresh all related states instantly
      fetchMembership();
      fetchPaymentHistory();
      fetchRenewalStatus();
      fetchDashboard();
      fetchProfile();
      fetchPayments();
      fetchAttendance();
      
      setTimeout(() => setRenewalSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRenewing(false);
    }
  };

  // Handle profile update
  const handleSaveModalProfile = async (updatedDetails: any) => {
    try {
      const response = await fetch("/api/members/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipNo: updatedDetails.membershipNo,
          mobileNo: updatedDetails.mobileNo,
          photoUrl: updatedDetails.photoUrl,
          emergencyName: updatedDetails.emergencyName,
          emergencyPhone: updatedDetails.emergencyPhone || updatedDetails.emergencyMobile,
          emergencyRelation: updatedDetails.emergencyRelation,
          addressLine1: updatedDetails.addressLine1,
          addressLine2: updatedDetails.addressLine2,
          city: updatedDetails.city,
          state: updatedDetails.state,
          pincode: updatedDetails.pincode,
          parentName: updatedDetails.parentName,
          parentMobile: updatedDetails.parentMobile,
          parentRelation: updatedDetails.parentRelation,
          hasMedicalCondition: updatedDetails.hasMedicalCondition,
          medicalDetails: updatedDetails.medicalDetails,
          bloodGroup: updatedDetails.bloodGroup
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update profile details.");
      }
      
      setSaveSuccess(true);
      fetchProfile();
      fetchDashboard();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Change Password Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/staff/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }
      
      setPasswordSuccess("Your secure login password has been updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Could not change password. Please check your credentials.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // PREMIUM DIGITAL CARD PDF EXPORT GENERATOR
  const handleDownloadCardPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, 54] // Standard credit card: 85mm height x 54mm width
    });

    // 1. Dark Theme Premium Background
    doc.setFillColor(15, 23, 42); // slate-900 / dark premium navy
    doc.rect(0, 0, 54, 85, "F");

    // 2. High Contrast Golden-Accent Border Frame
    doc.setDrawColor(56, 189, 248); // sky-400 cyan
    doc.setLineWidth(0.8);
    doc.rect(2, 2, 50, 81);

    // 3. Header Title & Brand
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("BARODA SWIM FRONT", 27, 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(186, 230, 253); // sky-200 cyan
    doc.text("OFFICIAL ACCESS PASSPORT", 27, 11, { align: "center" });

    // 4. Portrait photo container box
    doc.setDrawColor(255, 255, 255);
    doc.setFillColor(30, 41, 59); // slate-800 background
    doc.rect(17, 15, 20, 20, "FD");

    // Drawing initials inside photo box for robust CORS error protection
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const firstInitial = (profileData?.fullName || userName || "M").charAt(0);
    doc.text(firstInitial, 27, 27, { align: "center" });

    // 5. Member Identification Details
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(profileData?.fullName || userName, 27, 39, { align: "center" });

    doc.setFont("helvetica", "mono");
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`ID: ${profileData?.membershipNo || "MEM-0824"}`, 27, 43, { align: "center" });

    // Elegant separator line
    doc.setDrawColor(51, 65, 85); // slate-700
    doc.setLineWidth(0.2);
    doc.line(6, 46, 48, 46);

    // 6. Access details grid layout
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("PLAN", 6, 51);
    doc.text("ASSIGNED BATCH", 6, 58);
    doc.text("VALID UNTIL", 6, 65);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(membershipDetails?.summary?.planName || dashboardData?.membership?.planName || "Quarterly Access", 6, 54);
    doc.text(profileData?.batch_name || dashboardData?.todayBatch?.batchName || "Morning Sunset Batch", 6, 61);
    doc.text(formatDateToIndian(membershipDetails?.summary?.expiryDate || dashboardData?.membership?.expiryDate), 6, 68);

    // 7. QR Code representation square (Offline & fully scalable)
    doc.setFillColor(255, 255, 255);
    doc.rect(34, 50, 14, 14, "F");
    
    // Draw micro matrix details inside QR block for ultra-fidelity
    doc.setFillColor(0, 0, 0);
    doc.rect(35, 51, 4, 4, "F");
    doc.rect(43, 51, 4, 4, "F");
    doc.rect(35, 59, 4, 4, "F");
    doc.rect(41, 56, 2, 2, "F");
    doc.rect(38, 54, 1.5, 1.5, "F");

    // 8. Security seal & Footer stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text("SECURE SAMS CO.", 27, 76, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("VALID AT BARODA SWIM PORTAL", 27, 80, { align: "center" });

    doc.save(`BSF-CARD-${profileData?.membershipNo || "PASSPORT"}.pdf`);
  };

  // FAQs Array for support panel
  const FAQS = [
    {
      q: "What are the standard operational hours for swimming?",
      a: "Our academy operates on two batches: Morning Session from 6:00 AM – 9:00 AM, and Evening Session from 4:00 PM – 9:00 PM. Access is strictly granted during your designated batch times."
    },
    {
      q: "Can I change my designated swim training batch?",
      a: "Batch shifts require approval from our administration head desk. You can request a batch modification by contacting our support hotline or visiting the reception desk directly."
    },
    {
      q: "How early can I renew my quarterly pass?",
      a: "Pass extensions open exactly 15 days prior to your plan expiration. The renewal button in your dashboard will unlock automatically, enabling instant UPI/Credit Card online renewals."
    },
    {
      q: "Are lock cabinets and changing facilities free?",
      a: "Yes, standard security lockers and warm-shower locker rooms are completely complimentary and included in all membership plans."
    }
  ];

  // Load all backend tables on mount
  useEffect(() => {
    fetchDashboard();
    fetchProfile();
    fetchEventsAndHolidays();
    fetchPayments();
    fetchNotifications();
    fetchMembership();
    fetchPaymentHistory();
    fetchRenewalStatus();
    fetchAttendance();
  }, [academyId]);

  // Styling Variables
  const activeBg = "bg-sky-50 text-sky-600 border border-sky-100";
  const bgCard = "bg-white border-slate-100 shadow-sm";

  return (
    <div className="pb-24 sm:pb-12 text-slate-800">
      {/* 1. Header Banner Panel */}
      <div className={`mb-8 p-6 md:p-8 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border-sky-100/60`}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden border bg-sky-500/10 border-sky-200 shadow-sm shrink-0">
              {profileData?.photoUrl ? (
                <img src={profileData.photoUrl} alt={userName} className="h-full w-full object-cover referrer-policy='no-referrer'" />
              ) : (
                <span className="text-2xl font-black text-sky-500">
                  {userName.charAt(0)}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>
          
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold border border-sky-200">
                Swim Front Pass
              </span>
              {profileData?.membershipNo && (
                <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">ID: {profileData.membershipNo}</span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1 text-slate-900">
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
                const memberName = profileData?.fullName || userName.replace(" (Member)", "").trim();
                return `${greeting}, ${memberName} 👋`;
              })()}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Verified Active SAMS Member Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto self-stretch md:self-auto justify-end">
          <button
            onClick={() => setNotificationsDrawerOpen(!notificationsDrawerOpen)}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-xs relative"
            title="System Alerts & Broadcaster Notifications"
            id="btn-member-bell"
          >
            <Bell className="h-4 w-4 text-sky-500" />
            <span>Alerts</span>
            {notificationsData.some(n => !n.is_read) && (
              <span className="h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Edit2 className="h-4 w-4 text-sky-500" />
            <span>Edit Profile</span>
          </button>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-3 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile/Save success indicators */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-3"
          >
            <CheckCircle className="h-5 w-5 text-emerald-600 animate-bounce" />
            <span>Profile metrics saved and synchronized live in the database ledger.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Responsive Dashboard grid layout (Left Sidebar Nav, Right content) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar (Desktop only) */}
        <div className="hidden lg:block lg:col-span-3 space-y-2 text-left bg-white p-4 border border-slate-100 rounded-3xl shadow-xs">
          <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-400 font-black block pl-3 pb-2 border-b border-slate-50">
            DASHBOARD INDEX
          </span>
          {[
            { id: "home", label: "Home Base", icon: Home },
            { id: "membership", label: "My Membership Card", icon: Shield },
            { id: "attendance", label: "Attendance Logs", icon: Clock },
            { id: "payments", label: "Receipts & Fees", icon: CreditCard },
            { id: "events", label: "Tournaments & Galas", icon: Calendar },
            { id: "profile", label: "Athlete Passport", icon: UserCheck },
            { id: "notifications", label: "SAMS Broadcaster", icon: Bell, badge: notificationsData.filter(n => !n.is_read).length },
            { id: "support", label: "Help & support desk", icon: HelpCircle },
            { id: "settings", label: "Access & Security", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full py-3 px-4 rounded-xl flex items-center justify-between text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  isActive ? activeBg : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-sky-500" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Main Tab content container */}
        <div className="lg:col-span-9 space-y-8">
          <AnimatePresence mode="wait">
            
            {/* TAB: 1. HOME DASHBOARD BASE */}
            {activeTab === "home" && (
              <motion.div
                key="home-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {/* Loader status */}
                {dashboardLoading ? (
                  <div className="space-y-6">
                    <div className="h-32 bg-slate-100 animate-pulse rounded-3xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1,2,3,4].map(n => (
                        <div key={n} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
                      ))}
                    </div>
                  </div>
                ) : dashboardError ? (
                  <div className="p-6 text-center bg-rose-50 border border-rose-100 rounded-3xl">
                    <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                    <h3 className="text-sm font-bold text-rose-800 mt-2">Error Connecting to SAMS</h3>
                    <p className="text-xs text-rose-600 mt-1">{dashboardError}</p>
                  </div>
                ) : (
                  <>
                    {/* Welcome Info & Summary Grid cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col justify-between`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">MEMBERSHIP STATUS</span>
                        <div>
                          <span className="text-base font-black text-emerald-600 mt-2 block">
                            {dashboardData?.membership?.status || "Inactive"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">Lanes Unlocked</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col justify-between`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">DAYS REMAINING</span>
                        <div>
                          <span className="text-2xl font-black text-slate-900 mt-2 block">
                            {dashboardData?.membership?.daysRemaining || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">Days to expiration</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col justify-between`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">ATTENDANCE (MONTH)</span>
                        <div>
                          <span className="text-2xl font-black text-sky-500 mt-2 block">
                            {attendanceData?.monthlyAttendance || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">Sessions swum</span>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col justify-between`}>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">NEXT BATCH TIME</span>
                        <div>
                          <span className="text-xs font-extrabold text-slate-700 mt-2 block leading-snug">
                            {dashboardData?.todayBatch?.batchTime || "N/A"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-1 truncate">
                            {dashboardData?.todayBatch?.batchName || "N/A"}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Main banner for batch correction & checkins */}
                    <div className={`p-6 rounded-3xl border ${bgCard} bg-gradient-to-r from-sky-50/50 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-sky-600">TODAY'S ATTENDANCE STATUS</span>
                        <h3 className="text-lg font-black text-slate-900">
                          {attendanceData?.todayStatus || "Absent / Not Checked In"}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Secure entry check-ins are verified at the lobby reception gate using your barcode badge pass.
                        </p>
                      </div>
                      
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shrink-0 text-center flex flex-col items-center">
                        <span className="text-[9px] font-mono text-slate-400 block uppercase">COACH DECK ASSIGNED</span>
                        <span className="text-xs font-black text-slate-700 mt-1 block">
                          {dashboardData?.todayBatch?.coachName || "Coach Sanjay Mehta"}
                        </span>
                      </div>
                    </div>

                    {/* Quick overview of latest Event & Holidays */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Upcoming Tournament */}
                      <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <h4 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">NEXT TOURNAMENT</h4>
                          <Award className="h-4 w-4 text-sky-500" />
                        </div>
                        {dashboardData?.upcomingEvent ? (
                          <div className="space-y-2">
                            <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                              {formatDateToIndian(dashboardData.upcomingEvent.event_date)}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 pt-1">{dashboardData.upcomingEvent.title}</h4>
                            <p className="text-xs text-slate-500 truncate">{dashboardData.upcomingEvent.description}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3">No swimming tournaments listed currently.</p>
                        )}
                      </div>

                      {/* Next Holiday banner */}
                      <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                          <h4 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">ACADEMY HOLIDAY</h4>
                          <Calendar className="h-4 w-4 text-amber-500" />
                        </div>
                        {dashboardData?.upcomingHoliday ? (
                          <div className="space-y-2">
                            <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                              {formatDateToIndian(dashboardData.upcomingHoliday.holiday_date)}
                            </span>
                            <h4 className="text-sm font-black text-slate-800 pt-1">{dashboardData.upcomingHoliday.name}</h4>
                            <p className="text-xs text-slate-500">The pool operations close entirely for scheduled cleaning.</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3">No pool holiday cancellations listed.</p>
                        )}
                      </div>

                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TAB: 2. PREMIUM DIGITAL MEMBERSHIP CARD */}
            {activeTab === "membership" && (
              <motion.div
                key="membership-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {membershipLoading ? (
                  <div className="h-80 bg-slate-100 animate-pulse rounded-3xl" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    
                    {/* Visual Card Block */}
                    <div className="md:col-span-5 flex flex-col items-center">
                      <DigitalMembershipCard
                        member={{
                          id: profileData?.id,
                          membershipNo: profileData?.membershipNo || "BSF-2026-0001",
                          fullName: profileData?.fullName || userName,
                          photoUrl: profileData?.photoUrl,
                          typeOfMembership: membershipDetails?.summary?.planName || profileData?.typeOfMembership || "Quarterly Access",
                          allottedTiming: membershipDetails?.summary?.batchTiming || profileData?.allottedTiming || "Morning Batch (06:00 AM)",
                          batchName: membershipDetails?.summary?.batchName,
                          planName: membershipDetails?.summary?.planName,
                          membership_status: profileData?.membership_status || "Active",
                          registration_status: profileData?.registration_status || "Approved",
                          payment_status: profileData?.payment_status || "Paid",
                          endDate: formatDateToIndian(membershipDetails?.summary?.endDate || profileData?.endDate)
                        }}
                      />

                      <button
                        onClick={handleDownloadCardPDF}
                        className="w-full max-w-md mt-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-sky-500/15 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Premium Pass PDF</span>
                      </button>
                    </div>

                    {/* Plan benefits/limits list */}
                    <div className="md:col-span-7 space-y-6">
                      
                      {/* Renewal Info Card */}
                      <div className={`p-6 rounded-3xl border ${bgCard} relative overflow-hidden flex flex-col justify-between`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-mono tracking-widest text-slate-400 uppercase">MEMBERSHIP ACTIVE EXTENSION</h4>
                            <RefreshCw className={`h-4 w-4 text-sky-500 ${renewing ? "animate-spin" : ""}`} />
                          </div>

                          {renewalStatus?.isAvailable ? (
                            <div className="space-y-4">
                              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold leading-relaxed">
                                {renewalStatus?.message}
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Renewing extends your slot in your designated batch and preserves your active coaching assignment details seamlessly.
                              </p>
                              
                              <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                                <div>
                                  <span className="text-[9px] font-mono text-slate-400 block uppercase">RENEWAL PRICE</span>
                                  <span className="text-lg font-black text-slate-800">{formatCurrency(renewalStatus?.renewalPrice)}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 italic">for {renewalStatus?.planName}</span>
                              </div>
                              
                              <button
                                onClick={handleRenewMembership}
                                disabled={renewing}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                              >
                                {renewing ? "Authorizing Extension..." : "Renew Membership Now"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 text-slate-600 text-xs font-medium leading-relaxed">
                                {renewalStatus?.message}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                Under SAMS Academy Policy, early renewal permissions become active exactly **15 days** prior to your current plan expiration.
                              </p>
                              <button
                                disabled
                                className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl text-xs font-black cursor-not-allowed border border-slate-200"
                              >
                                Early Renewal Locked
                              </button>
                            </div>
                          )}
                          
                          {renewalSuccessMsg && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold mt-2">
                              {renewalSuccessMsg}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Benefits Included Card */}
                      <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                        <div className="flex items-center gap-3">
                          <Award className="h-5 w-5 text-sky-500" />
                          <h3 className="text-base font-black text-slate-800 tracking-tight">Membership Benefits Included</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {membershipDetails?.benefits?.map((benefit: string, idx: number) => (
                            <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex gap-3 items-start">
                              <div className="h-5 w-5 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3 w-3" />
                              </div>
                              <span className="text-xs text-slate-600 font-medium leading-relaxed">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: 3. ATTENDANCE HISTORY LOGS */}
            {activeTab === "attendance" && (
              <motion.div
                key="attendance-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {attendanceLoading ? (
                  <div className="space-y-4">
                    <div className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
                    <div className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
                  </div>
                ) : (
                  <>
                    {/* Top attendance metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className={`p-5 rounded-3xl border ${bgCard} space-y-1`}>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">ATTENDANCE RATIO</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800">{attendanceData?.attendancePercentage || 0}%</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Calculated over recommended session caps</p>
                      </div>

                      <div className={`p-5 rounded-3xl border ${bgCard} space-y-1`}>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">MONTHLY TOTAL</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-sky-500">{attendanceData?.monthlyAttendance || 0}</span>
                          <span className="text-xs font-bold text-slate-400">sessions</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Current calendar month tally</p>
                      </div>

                      <div className={`p-5 rounded-3xl border ${bgCard} space-y-1`}>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">TODAY'S LEDGER</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-black text-emerald-600 truncate block">
                            {attendanceData?.todayStatus?.includes("Checked-In") ? "Checked In" : "Absent"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{attendanceData?.todayStatus || "Gate check-in pending"}</p>
                      </div>

                    </div>

                    {/* Attendance History log list */}
                    <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                        <h3 className="text-base font-black text-slate-900 tracking-tight">Attendance Logs (Latest Check-Ins)</h3>
                        <Clock className="h-4.5 w-4.5 text-sky-500" />
                      </div>
                      
                      {attendanceData?.attendanceHistory?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider">
                                <th className="pb-3 font-semibold">CHECK-IN DATE</th>
                                <th className="pb-3 font-semibold">CHECK-IN TIME</th>
                                <th className="pb-3 font-semibold text-right">ENTRY STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceData.attendanceHistory.map((log: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="py-4 font-mono font-medium text-slate-600">
                                    {formatDateToIndian(log.date)}
                                  </td>
                                  <td className="py-4 font-mono font-bold text-slate-800">
                                    {log.time} AM
                                  </td>
                                  <td className="py-4 text-right">
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                      Present
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 space-y-2">
                          <Info className="h-8 w-8 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-400">No attendance checks recorded in SAMS.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TAB: 4. PAYMENTS & INVOICES */}
            {activeTab === "payments" && (
              <motion.div
                key="payments-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {paymentsLoading ? (
                  <div className="space-y-4">
                    <div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                    <div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                  </div>
                ) : (
                  <>
                    {/* Fee summary blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className={`p-4 rounded-2xl border ${bgCard}`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">REGISTRATION CHARGE</span>
                        <span className="text-lg font-black text-slate-800 block mt-2">Rs. 1,500</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block mt-2">Paid</span>
                      </div>

                      <div className={`p-4 rounded-2xl border ${bgCard}`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">MEMBERSHIP QUARTERLY</span>
                        <span className="text-lg font-black text-slate-800 block mt-2">Rs. 2,500</span>
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg inline-block mt-2">Active</span>
                      </div>

                      <div className={`p-4 rounded-2xl border ${bgCard}`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">NEXT RENEWAL MANDATE</span>
                        <span className="text-xs font-black text-slate-800 block mt-2.5 truncate">
                          {formatDateToIndian(membershipDetails?.summary?.expiryDate || dashboardData?.membership?.expiryDate)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-2 block font-medium">Standard extensions applicable</span>
                      </div>

                    </div>

                    {/* Receipt print list */}
                    <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                        <h3 className="text-base font-black text-slate-900 tracking-tight">Receipts & Payment History</h3>
                        <CreditCard className="h-4.5 w-4.5 text-sky-500" />
                      </div>

                      {paymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider">
                                <th className="pb-3 font-semibold">PAYMENT DATE</th>
                                <th className="pb-3 font-semibold">SUBSCRIPTION</th>
                                <th className="pb-3 font-semibold">TXN ID</th>
                                <th className="pb-3 font-semibold">AMOUNT</th>
                                <th className="pb-3 font-semibold">STATUS</th>
                                <th className="pb-3 font-semibold text-right">RECEIPT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentHistory.map((p, idx) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="py-4 font-mono font-medium text-slate-600">
                                    {formatDateToIndian(p.paymentDate)}
                                  </td>
                                  <td className="py-4 font-black text-slate-800">
                                    {p.plan_name || "Quarterly Access Pass"}
                                  </td>
                                  <td className="py-4 font-mono text-[10px] text-slate-400">
                                    {p.transactionId || "pay_ren_MOCK"}
                                  </td>
                                  <td className="py-4 font-black text-slate-900">
                                    {formatCurrency(p.amount)}
                                  </td>
                                  <td className="py-4">
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                      {p.paymentStatus || "Paid"}
                                    </span>
                                  </td>
                                  <td className="py-4 text-right">
                                    <button
                                      onClick={() => setSelectedReceipt(p)}
                                      className="text-[10px] font-bold text-sky-500 hover:underline cursor-pointer"
                                    >
                                      View Slip
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 space-y-2">
                          <Info className="h-8 w-8 text-slate-300 mx-auto" />
                          <p className="text-xs text-slate-400">No payment records detected in SAMS.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TAB: 5. EVENTS & HOLIDAYS */}
            {activeTab === "events" && (
              <motion.div
                key="events-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {eventsLoading ? (
                  <div className="space-y-4">
                    <div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                    <div className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                  </div>
                ) : (
                  <>
                    <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                      <h3 className="text-base font-black tracking-tight text-slate-900">Academy Tournaments & Galas</h3>
                      
                      {eventsData.length > 0 ? (
                        <div className="space-y-3">
                          {eventsData.map((ev) => (
                            <div key={ev.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-800">{ev.title}</h4>
                                <p className="text-xs text-slate-500">{ev.description}</p>
                                <span className="text-[10px] font-mono text-sky-500 font-bold block pt-1 uppercase">
                                  Venue: {ev.location || "Olympic Deck lane 1"}
                                </span>
                              </div>
                              <div className="flex flex-row md:flex-col items-end gap-2 shrink-0">
                                <span className="text-xs font-mono font-extrabold bg-sky-500/10 text-sky-600 px-3 py-1 rounded-full">
                                  {formatDateToIndian(ev.event_date)}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  🕒 {ev.start_time?.slice(0, 5) || "09:00"} AM
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-4 text-center">No active championships listed.</p>
                      )}
                    </div>

                    <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                      <h3 className="text-base font-black tracking-tight text-slate-900">Scheduled Holidays List</h3>
                      
                      {holidaysData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {holidaysData.map((h) => (
                            <div key={h.id} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200/40 text-left flex justify-between items-center">
                              <div>
                                <span className="text-xs font-black text-slate-800 block">{h.name}</span>
                                <span className="text-[10px] text-slate-400 mt-1 block">Full Facility Shutdown</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg shrink-0">
                                {formatDateToIndian(h.holiday_date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-4 text-center">No holiday closures listed.</p>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TAB: 6. ATHLETE PROFILE SPECIFICATIONS */}
            {activeTab === "profile" && (
              <motion.div
                key="profile-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-6`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black tracking-tight text-slate-900">Athlete Passport</h3>
                      <p className="text-xs text-slate-400">Verified membership ledger records.</p>
                    </div>
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  {profileLoading ? (
                    <div className="space-y-4">
                      <div className="h-6 bg-slate-100 animate-pulse rounded" />
                      <div className="h-6 bg-slate-100 animate-pulse rounded" />
                    </div>
                  ) : (
                    <div className="space-y-6 text-slate-700">
                      
                      {/* Section 1: Demographics */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">1. DEMOGRAPHICS</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">FULL NAME</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.fullName}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">GENDER</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800 capitalize">{profileData?.gender}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">DATE OF BIRTH</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{formatDateToIndian(profileData?.dateOfBirth)}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">BLOOD GROUP</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.bloodGroup || "O+"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Contact Channels */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">2. CONTACT CHANNELS</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">PRIMARY MOBILE</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.mobileNo}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">EMAIL ADDRESS</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.email || "N/A"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl col-span-1 md:col-span-3">
                            <span className="text-[9px] text-slate-400 uppercase">RESIDENTIAL ADDRESS</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">
                              {profileData?.addressLine1 ? (
                                <>
                                  {profileData.addressLine1}
                                  {profileData.addressLine2 ? `, ${profileData.addressLine2}` : ""}
                                  {`, ${profileData.city || "Vadodara"}, ${profileData.state || "Gujarat"} - ${profileData.pincode || ""}`}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No address registered. Click Edit to update.</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Guardian Details */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">3. GUARDIAN DETAILS</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">GUARDIAN NAME</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.parentName || "N/A"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">GUARDIAN MOBILE</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.parentMobile || "N/A"}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">RELATION</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">{profileData?.parentRelation || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Emergencies & Medical */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">4. EMERGENCIES & MEDICAL PROFILE</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">EMERGENCY CONTACT LIFELINE</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">
                              {profileData?.emergencyName || "N/A"} ({profileData?.emergencyPhone || "N/A"})
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase">MEDICAL CONDITIONS</span>
                            <span className="text-xs font-bold block mt-1 text-slate-800">
                              {profileData?.hasMedicalCondition === "Yes" ? profileData.medicalDetails : "Medically Fit / None declared"}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: 7. SAMS BROADCASTER (NOTIFICATIONS) */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">Broadcaster Feed</h3>
                      <p className="text-xs text-slate-400">Updates regarding schedules, payments, and approvals.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full shrink-0">
                      Live
                    </span>
                  </div>

                  {notificationsLoading ? (
                    <div className="space-y-3">
                      <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                      <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                    </div>
                  ) : notificationsData.length > 0 ? (
                    <div className="space-y-3">
                      {/* Sort unread first */}
                      {[...notificationsData].sort((a,b) => a.is_read - b.is_read).map((item) => (
                        <div 
                          key={item.id} 
                          className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${
                            !item.is_read ? "bg-sky-50/40 border-sky-100" : "bg-white border-slate-100"
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl shrink-0 ${
                            !item.is_read ? "bg-sky-500/10 text-sky-500" : "bg-slate-100 text-slate-400"
                          }`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          
                          <div className="space-y-1 flex-1">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className={`text-xs font-bold leading-normal ${!item.is_read ? "text-slate-900" : "text-slate-600"}`}>
                                {item.message}
                              </h4>
                              {!item.is_read && (
                                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                              {formatDateToIndian(item.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-2">
                      <Bell className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400">No academy broadcasts found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: 8. HELP & SUPPORT DESK */}
            {activeTab === "support" && (
              <motion.div
                key="support-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {/* Contact desk details */}
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-6`}>
                  <div className="space-y-2">
                    <h3 className="text-base font-black tracking-tight text-slate-900">Baroda Swim Front Helpdesk</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Facing difficulty checking in, have billing queries, or need to request slot shifts? Touch base with our helpdesk administrators during operational hours.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <Clock className="h-4.5 w-4.5 text-sky-500 mb-2" />
                      <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">OPERATIONAL HOURS</span>
                      <span className="text-xs font-black text-slate-700 block mt-1">Morning: 6:00 AM - 9:00 AM</span>
                      <span className="text-xs font-black text-slate-700 block">Evening: 4:00 PM - 9:00 PM</span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <MapPin className="h-4.5 w-4.5 text-rose-500 mb-2" />
                      <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold">PHYSICAL LOCATION</span>
                      <span className="text-xs font-black text-slate-700 block mt-1">Main Deck Pool, Baroda, IN</span>
                      <a 
                        href="https://maps.google.com/?q=Baroda+Swim+Front" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-sky-500 font-extrabold hover:underline mt-1 inline-block"
                      >
                        Navigate on Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Actions phone/chat/mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <a href="tel:+919901234501" className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center gap-3 hover:bg-sky-50 transition-all text-left shadow-2xs">
                      <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">CALL ACADEMY</span>
                        <span className="text-xs font-black text-slate-700 mt-0.5 block">+91 99012 34501</span>
                      </div>
                    </a>
                    
                    <a href="https://wa.me/919901234501" target="_blank" rel="noopener noreferrer" className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3 hover:bg-emerald-50 transition-all text-left shadow-2xs">
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">WHATSAPP CHAT</span>
                        <span className="text-xs font-black text-slate-700 mt-0.5 block">+91 99012 34501</span>
                      </div>
                    </a>
                    
                    <a href="mailto:support@barodaswimfront.com" className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center gap-3 hover:bg-amber-50 transition-all text-left shadow-2xs">
                      <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">EMAIL OFFICE</span>
                        <span className="text-xs font-black text-slate-700 mt-0.5 block">support@bsf.com</span>
                      </div>
                    </a>
                  </div>
                </div>

                {/* FAQ Accordion */}
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                  <h3 className="text-base font-black tracking-tight text-slate-900">Frequently Asked Questions</h3>
                  
                  <div className="space-y-2">
                    {FAQS.map((faq, idx) => {
                      const isExpanded = expandedFaq === idx;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                            className="w-full p-4 flex justify-between items-center text-left text-xs font-black text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <span>{faq.q}</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-100/60 bg-white"
                              >
                                <p className="p-4 text-xs text-slate-500 leading-relaxed font-medium">
                                  {faq.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: 9. ACCESS & SECURITY (SETTINGS) */}
            {activeTab === "settings" && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 text-left"
              >
                {/* Change Password Panel */}
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">Change Account Password</h3>
                    <p className="text-xs text-slate-400">Secure your SAMS session password.</p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    {passwordError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="h-4.5 w-4.5" />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                        <Check className="h-4.5 w-4.5" />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-sky-400 focus:bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-sky-400 focus:bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:border-sky-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-5 py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-xs transition-colors"
                      >
                        {passwordLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4" />
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Manage Notification categories */}
                <div className={`p-6 rounded-3xl border ${bgCard} space-y-4`}>
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900">Manage Broadcast Subscriptions</h3>
                    <p className="text-xs text-slate-400">Opt-in or opt-out from various alert categories.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: "attendance", label: "Gate Attendance Alerts", desc: "Get real-time notification on barcode gate check-ins." },
                      { key: "renewals", label: "Membership Renewal Warnings", desc: "Receive reminders starting 15 days before pass expiration." },
                      { key: "tournaments", label: "Tournament & Gala Galas", desc: "Announcements regarding upcoming swimming meets." },
                      { key: "holidays", label: "Pool holiday Alerts", desc: "Pool closure warnings due to cleaning or national holidays." },
                      { key: "adminAnnouncements", label: "Administrative Broadcasts", desc: "Urgent announcements from head administration desk." },
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-3.5 p-3.5 hover:bg-slate-50 rounded-2xl cursor-pointer border border-transparent hover:border-slate-100 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={(alertChannels as any)[item.key]}
                          onChange={(e) => setAlertChannels({ ...alertChannels, [item.key]: e.target.checked })}
                          className="h-4 w-4 text-sky-500 border-slate-300 rounded focus:ring-sky-400 shrink-0 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-800 block">{item.label}</span>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5 leading-normal">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* 3. Mobile Navigation Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 block lg:hidden shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-around items-center py-2">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "membership", label: "Card", icon: Shield },
            { id: "attendance", label: "History", icon: Clock },
            { id: "payments", label: "Bills", icon: CreditCard },
            { id: "profile", label: "Passport", icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  isActive ? "text-sky-500 font-extrabold scale-105" : "text-slate-400 hover:text-slate-600 font-semibold"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-sky-500 animate-pulse" : "text-slate-400"}`} />
                <span className="text-[9px] uppercase tracking-wider font-bold">{tab.label}</span>
              </button>
            );
          })}
          
          {/* Settings mobile trigger */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === "settings" ? "text-sky-500 font-extrabold scale-105" : "text-slate-400 hover:text-slate-600 font-semibold"
            }`}
          >
            <Settings className={`h-5 w-5 ${activeTab === "settings" ? "text-sky-500 animate-pulse" : "text-slate-400"}`} />
            <span className="text-[9px] uppercase tracking-wider font-bold">Secure</span>
          </button>
        </div>
      </div>

      {/* Profile Modification overlay modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <EditProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentProfile={profileData}
            onSave={handleSaveModalProfile}
            isSwim={isSwim}
          />
        )}
      </AnimatePresence>

      {/* Printable Receipt Slip Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left border border-slate-100 text-slate-800"
            >
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>

              <div id="printable-receipt" className="space-y-6">
                
                <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-4">
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-800">BARODA SWIM FRONT</h3>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">SAMS RECEIPT LEDGER</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-sky-600 uppercase">OFFICIAL COPY</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">ATHLETE NAME</span>
                    <span className="font-bold text-slate-800 block mt-1">{profileData?.fullName || userName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">MEMBERSHIP NO</span>
                    <span className="font-bold text-slate-800 block mt-1">{profileData?.membershipNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">PAYMENT METHOD</span>
                    <span className="font-bold text-slate-800 block mt-1">{selectedReceipt.paymentMethod || "UPI"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">PAYMENT DATE</span>
                    <span className="font-bold text-slate-800 block mt-1">
                      {formatDateToIndian(selectedReceipt.paymentDate)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{selectedReceipt.plan_name || "Quarterly Access Pass Membership"}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(selectedReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-slate-100 pt-2 font-black">
                    <span>TOTAL AMOUNT PAID</span>
                    <span className="text-sm text-sky-600">{formatCurrency(selectedReceipt.amount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4 text-center">
                  <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
                    This is an electronically generated receipt confirmation. No physical signature is required. Thank you for using BSFMS.
                  </p>
                </div>

              </div>

              <div className="flex justify-end gap-2.5 mt-6 border-t border-slate-50 pt-4">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const printContents = document.getElementById("printable-receipt")?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    if (printContents) {
                      document.body.innerHTML = printContents;
                      window.print();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Drawer Side Panel */}
      <NotificationDrawer
        isOpen={notificationsDrawerOpen}
        onClose={() => setNotificationsDrawerOpen(false)}
        notifications={notificationsData.map((n, idx) => ({
          id: n.id || idx + 1,
          text: n.message || n.text || "System Update",
          time: n.created_at ? new Date(n.created_at).toLocaleDateString("en-IN") : "Recent",
          read: Boolean(n.is_read || n.read),
          type: n.event_key === "ANNOUNCEMENT" ? "announcement" : "class",
          title: n.title || "Broadcaster Notice"
        }))}
        onMarkRead={(id) => {
          setNotificationsData(prev => prev.map((n, idx) => (n.id || idx + 1) === id ? { ...n, is_read: true, read: true } : n));
        }}
        onMarkAllRead={() => {
          setNotificationsData(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
        }}
        onDelete={(id) => {
          setNotificationsData(prev => prev.filter((n, idx) => (n.id || idx + 1) !== id));
        }}
        onClearAll={() => {
          setNotificationsData([]);
        }}
      />

    </div>
  );
}
