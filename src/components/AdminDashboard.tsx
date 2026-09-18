import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, IndianRupee, Users, Award, TrendingUp, Cpu, 
  Plus, Trash2, CheckCircle, ShieldCheck, Database, RefreshCw,
  Search, Filter, ChevronRight, X, AlertTriangle, Eye, UserPlus, 
  Calendar, Check, CircleAlert, Activity, LayoutDashboard, Sliders, ClipboardCheck, Clock,
  LogOut, Menu, Bell, MessageSquare, BarChart3, FileText
} from "lucide-react";
import { formatCurrency } from "../utils/formatter";

import { AcademyId, Coach } from "../types";
import { swimCoaches, cricketCoaches } from "../data";
import { HomeTab } from "./HomeTab";
import { BatchesTab } from "./BatchesTab";
import { RenewalsTab } from "./RenewalsTab";
import { ReportsTab } from "./ReportsTab";
import { ActivityTab } from "./ActivityTab";
import { PaymentsTab } from "./PaymentsTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { SettingsTab } from "./SettingsTab";
import { NotificationDrawer } from "./NotificationDrawer";
import { CalendarTab } from "./CalendarTab";
import { CommunicationTab } from "./CommunicationTab";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { CommandPaletteModal } from "./CommandPaletteModal";
import { QuickActionsFab } from "./QuickActionsFab";
import { RegisterPage } from "./RegisterPage";
import { DailyClosingReportModal } from "./DailyClosingReportModal";






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

interface AdminDashboardProps {
  academyId: AcademyId;
  userName: string;
  userRole?: string;
  onLogout?: () => void;
  userSession?: any;
  onProfileUpdated?: (updatedUser: { name: string; email: string; phoneNumber: string; avatar: string }) => void;
}

export function AdminDashboard({ academyId, userName, userRole = "admin", onLogout, userSession, onProfileUpdated }: AdminDashboardProps) {
  const isSwim = academyId === "swim";

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

  // User session state
  const [activeUser, setActiveUser] = useState({
    id: userSession?.id || "",
    name: userSession?.name || userName || "Admin",
    role: userSession?.role || userRole || "admin",
    email: userSession?.email || "admin@example.test",
    phoneNumber: userSession?.phoneNumber || "",
    avatar: userSession?.avatar || ""
  });

  useEffect(() => {
    setActiveUser({
      id: userSession?.id || "",
      name: userSession?.name || userName || "Admin",
      role: userSession?.role || userRole || "admin",
      email: userSession?.email || "admin@example.test",
      phoneNumber: userSession?.phoneNumber || "",
      avatar: userSession?.avatar || ""
    });
  }, [userName, userRole, userSession]);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<string>("home");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileMenuDrawerOpen, setMobileMenuDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isClosingReportModalOpen, setIsClosingReportModalOpen] = useState(false);

  // Keyboard shortcut for Command Palette (Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQuickAction = (actionId: string) => {
    if (actionId === "add_member") {
      setActiveTab("register");
    } else if (actionId === "approve_members") {
      setActiveTab("registrations");
    } else if (actionId === "collect_payment") {
      setActiveTab("revenue");
    } else if (actionId === "create_event" || actionId === "events" || actionId === "holidays") {
      setActiveTab("calendar");
    } else if (actionId === "scan_qr") {
      setActiveTab("home");
    }
  };
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 950);
    return () => clearTimeout(timer);
  }, []);
  
  // Coaches Registry
  const [coachesList, setCoachesList] = useState<Coach[]>([]);
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachSpecialty, setNewCoachSpecialty] = useState("");
  const [newCoachBio, setNewCoachBio] = useState("");
  const [coachAlert, setCoachAlert] = useState(false);

  // Members Directory state
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Registration management state
  const [rejectingMemberNo, setRejectingMemberNo] = useState<string | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [registrationSearchQuery, setRegistrationSearchQuery] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<"Pending" | "Approved" | "Rejected" | "All">("Pending");
  
  // Registration Form in modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemName, setNewMemName] = useState("");
  const [newMemPhone, setNewMemPhone] = useState("");
  const [newMemGender, setNewMemGender] = useState("Male");
  const [newMemPlan, setNewMemPlan] = useState("Monthly");
  const [newMemTiming, setNewMemTiming] = useState("07:00 AM - 08:00 AM");
  const [newMemCoach, setNewMemCoach] = useState("No");

  // Daily Attendance Marker
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceTiming, setAttendanceTiming] = useState("07:00 AM - 08:00 AM");
  const [attendanceRecords, setAttendanceRecords] = useState<any>({}); // membershipNo -> "Present" | "Absent" | "Excused"

  // Upcoming Events state
  const [events, setEvents] = useState<any[]>(() => {
    const saved = localStorage.getItem("sams_events");
    return saved ? JSON.parse(saved) : [];
  });
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventType, setNewEventType] = useState("Competition");
  const [newEventTiming, setNewEventTiming] = useState("");
  const [newEventVenue, setNewEventVenue] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");

  // Holidays state
  const [holidays, setHolidays] = useState<any[]>(() => {
    const saved = localStorage.getItem("sams_holidays");
    return saved ? JSON.parse(saved) : [];
  });
  const [newHolidayTitle, setNewHolidayTitle] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayType, setNewHolidayType] = useState("Maintenance");
  const [newHolidayDuration, setNewHolidayDuration] = useState("Full Day");
  const [newHolidayRemarks, setNewHolidayRemarks] = useState("");

  // Settings state
  const [settings, setSettings] = useState<any>(() => {
    const saved = localStorage.getItem("sams_settings");
    return saved ? JSON.parse(saved) : {
      academyName: "Baroda Swim Front",
      facilityType: "Olympic Standard Pool",
      poolLength: "50 Meters",
      numberOfLanes: "8 Lanes",
      waterTempTarget: "27°C",
      phTarget: "7.4",
      chlorineLevel: "1.2 ppm",
      safetyOfficers: "3 Active Lifeguards",
      academyAddress: "Sector 4, Vasna Road, near Alkapuri, Vadodara, Gujarat 390007",
      contactNumber: "+91 99012 34568",
      emergencyContact: "+91 99012 34599"
    };
  });
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Batches state
  const [batches, setBatches] = useState<any[]>([
    { id: "b1", name: "Morning Batch A", timing: "06:00 AM - 07:00 AM", days: "MWF", level: "Beginner", capacity: 25, coach: "Sanjay" },
    { id: "b2", name: "Morning Batch B", timing: "07:00 AM - 08:00 AM", days: "MWF", level: "Intermediate", capacity: 20, coach: "Sanjay" },
    { id: "b3", name: "Morning Batch C", timing: "08:00 AM - 09:00 AM", days: "TTS", level: "Advanced", capacity: 15, coach: "Hetvi" },
    { id: "b4", name: "Evening Batch A", timing: "04:00 PM - 05:00 PM", days: "MWF", level: "Beginner", capacity: 25, coach: "Hetvi" },
    { id: "b5", name: "Evening Batch B", timing: "05:00 PM - 06:00 PM", days: "TTS", level: "Intermediate", capacity: 20, coach: "Sanjay" },
    { id: "b6", name: "Evening Batch C", timing: "06:00 PM - 07:00 PM", days: "TTS", level: "Elite Squad", capacity: 12, coach: "Hetvi" }
  ]);
  const [selectedBatchIdForAttendance, setSelectedBatchIdForAttendance] = useState("b2");
  const [attendanceBatchDate, setAttendanceBatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceSaveAlert, setAttendanceSaveAlert] = useState<string | null>(null);

  // Renewals state
  const [renewalMember, setRenewalMember] = useState<any | null>(null);
  const [renewalTerm, setRenewalTerm] = useState("Monthly");
  const [renewalPaymentMode, setRenewalPaymentMode] = useState("UPI");
  const [renewalSuccessMsg, setRenewalSuccessMsg] = useState<string | null>(null);

  // Reports state
  const [selectedReportType, setSelectedReportType] = useState("roster");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [generatedReportData, setGeneratedReportData] = useState<any | null>(null);

  // System Telemetry logs
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [activeLaneOccupancy, setActiveLaneOccupancy] = useState(42); // percentage

  // Staff Accounts state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"super_admin" | "admin" | "coach" | "receptionist" | "staff">("coach");
  const [staffRoleFilter, setStaffRoleFilter] = useState<"all" | "coaches" | "admins" | "staff">("all");
  const [deleteConfirmStaffId, setDeleteConfirmStaffId] = useState<string | null>(null);
  const [staffAlert, setStaffAlert] = useState<string | null>(null);

  const fetchStaffList = () => {
    setIsStaffLoading(true);
    const token = getSessionToken();
    fetch("/api/staff", {
      headers: token ? { "x-session-token": token } : {}
    })
      .then(res => res.ok ? res.json().catch(() => []) : [])
      .then(data => {
        setStaffList(Array.isArray(data) ? data : []);
        setIsStaffLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch staff", err);
        setStaffList([]);
        setIsStaffLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === "staff") {
      fetchStaffList();
    }
  }, [activeTab]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      setStaffAlert("Please fill in all staff fields.");
      return;
    }
    try {
      const token = getSessionToken();
      const res = await fetch("/api/staff/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
          role: newStaffRole,
          phone: newStaffPhone,
          phoneNumber: newStaffPhone,
          academyId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewStaffName("");
        setNewStaffEmail("");
        setNewStaffPassword("");
        setNewStaffPhone("");
        setStaffAlert("Staff account registered successfully!");
        fetchStaffList();
        setTimeout(() => setStaffAlert(null), 3000);
      } else {
        setStaffAlert(data.error || "Failed to register staff account.");
      }
    } catch (err: any) {
      setStaffAlert("Connection error: " + err.message);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers: token ? { "x-session-token": token } : {}
      });
      if (res.ok) {
        setStaffAlert("Staff account removed successfully.");
        fetchStaffList();
        setTimeout(() => setStaffAlert(null), 3000);
      } else {
        const data = await res.json();
        setStaffAlert(data.error || "Failed to remove staff.");
      }
    } catch (err: any) {
      setStaffAlert("Connection error: " + err.message);
    } finally {
      setDeleteConfirmStaffId(null);
    }
  };

  // Pre-populate members if none exist in localStorage
  const getPrepopulatedMembers = () => {
    return [];
  };

  // Initializers
  useEffect(() => {
    // 1. Coaches
    if (isSwim) {
      setCoachesList([
        { id: "c1", name: "Sanjay", specialty: "Elite Freestyle & Butterfly", rating: 4.9, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300", bio: "Senior Coach with 10+ years experience training competitive swimmers." },
        { id: "c2", name: "Hetvi", specialty: "Stroke Correction & Kids Squad", rating: 4.8, image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300", bio: "Junior Development Specialist. Passionate about building strong foundations." }
      ]);
    } else {
      setCoachesList(cricketCoaches);
    }
    
    // Function to load/refresh members from backend REST API
    const refreshMembersList = () => {
      const token = getSessionToken();
      fetch("/api/members", {
        headers: token ? { "x-session-token": token } : {}
      })
        .then(res => res.ok ? res.json().catch(() => []) : [])
        .then(data => {
          if (Array.isArray(data)) {
            const curAcademy = (academyId || "swim").toLowerCase();
            const filtered = data.filter((m: any) => {
              const mAcademy = (m.academyId || academyId || "swim").toLowerCase();
              return mAcademy === curAcademy;
            });
            setMembers(filtered);
            localStorage.setItem("sams_all_members", JSON.stringify(data));
          }
        })
        .catch(err => {
          console.error("Failed to fetch members from backend", err);
        });
    };

    // 2. Load members initially
    refreshMembersList();

    // Listen for member registration events across tabs
    const handleMemberRegisteredEvent = () => {
      refreshMembersList();
    };
    window.addEventListener("sams_member_registered", handleMemberRegisteredEvent);

    // 3. System Logs
    setSystemLogs([
      { event: "API Gateway handshake stable", time: "00:34:28 (UTC)", type: "info" },
      { event: "SAMS server database relational schema synchronized", time: "00:30:15 (UTC)", type: "sync" },
      { event: "PCI-DSS compliance gate telemetry checked", time: "00:00:01 (UTC)", type: "info" }
    ]);

    return () => {
      window.removeEventListener("sams_member_registered", handleMemberRegisteredEvent);
    };
  }, [academyId, isSwim]);

  // Marking initial records as Present for display
  useEffect(() => {
    const initialRecords: any = {};
    members.forEach(m => {
      initialRecords[m.membershipNo] = "Present";
    });
    setAttendanceRecords(initialRecords);
  }, [members]);

  // Re-fetch members from REST API whenever activeTab changes
  useEffect(() => {
    const token = getSessionToken();
    fetch("/api/members", {
      headers: token ? { "x-session-token": token } : {}
    })
      .then(res => res.ok ? res.json().catch(() => []) : [])
      .then(data => {
        if (Array.isArray(data)) {
          const curAcademy = (academyId || "swim").toLowerCase();
          const filtered = data.filter((m: any) => {
            const mAcademy = (m.academyId || academyId || "swim").toLowerCase();
            return mAcademy === curAcademy;
          });
          setMembers(filtered);
          localStorage.setItem("sams_all_members", JSON.stringify(data));
        }
      })
      .catch(err => console.error("Failed to refresh members on tab switch", err));
  }, [activeTab, academyId]);

  // Add Coach Handler
  const handleAddCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName.trim() || !newCoachSpecialty.trim()) return;

    const newCoach: Coach = {
      id: `c_added_${Date.now()}`,
      name: newCoachName.trim(),
      specialty: newCoachSpecialty.trim(),
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150",
      bio: newCoachBio.trim() || "Elite specialized athletic masterclass coach."
    };

    setCoachesList([...coachesList, newCoach]);
    setNewCoachName("");
    setNewCoachSpecialty("");
    setNewCoachBio("");
    setCoachAlert(true);
    setTimeout(() => setCoachAlert(false), 3000);
  };

  // Remove Coach Handler
  const handleRemoveCoach = (id: string) => {
    setCoachesList(coachesList.filter(c => c.id !== id));
  };

  // Registration approvals and rejections action handlers
  const handleApproveRegistration = async (membershipNo: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/approve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ membershipNo })
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(prev => prev.map(m => m.membershipNo === membershipNo ? {
          ...m,
          status: "Approved",
          paymentStatus: "Pending",
          registration_status: "Approved",
          admin_approval: "Approved",
          payment_status: "Pending",
          login_enabled: false,
          remarks: ""
        } : m));
        if (selectedMember?.membershipNo === membershipNo) {
          setSelectedMember(prev => prev ? {
            ...prev,
            status: "Approved",
            paymentStatus: "Pending",
            registration_status: "Approved",
            admin_approval: "Approved",
            payment_status: "Pending",
            login_enabled: false,
            remarks: ""
          } : null);
        }
        alert(data.message || (data.whatsappStatus === "Delivered"
          ? `Member #${membershipNo} approved and the WhatsApp payment link was sent.`
          : `Member #${membershipNo} approved, but WhatsApp delivery failed.`));
      } else {
        alert(data.error || "Failed to approve registration");
      }
    } catch (err) {
      console.error(err);
      alert("Network error: Could not reach approval server.");
    }
  };
  const handleSendWhatsAppPaymentLink = async (membershipNo: string, mobileNo?: string) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/resend-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ membershipNo, mobileNo })
      });
      const data = await res.json();
      if (res.ok && data.success && data.whatsappStatus === "Delivered") {
        alert(data.message || `WhatsApp payment link sent successfully to ${mobileNo || "the member"}!`);
      } else {
        alert(data.error || data.message || "Failed to dispatch WhatsApp message via MSG91.");
      }
    } catch (err: any) {
      console.error("WhatsApp dispatch error:", err);
      alert(err.message || "Network error while connecting to WhatsApp API gateway.");
    }
  };

  const handleOpenRejectModal = (membershipNo: string) => {
    setRejectingMemberNo(membershipNo);
    setRemarksText("");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingMemberNo) return;
    try {
      const token = getSessionToken();
      const res = await fetch("/api/members/reject", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({ membershipNo: rejectingMemberNo, remarks: remarksText })
      });
      const data = await res.json();
      if (res.ok) {
        setMembers(prev => prev.map(m => m.membershipNo === rejectingMemberNo ? {
          ...m,
          status: "Rejected",
          registration_status: "Rejected",
          admin_approval: "Rejected",
          remarks: remarksText
        } : m));
        if (selectedMember?.membershipNo === rejectingMemberNo) {
          setSelectedMember(prev => prev ? {
            ...prev,
            status: "Rejected",
            registration_status: "Rejected",
            admin_approval: "Rejected",
            remarks: remarksText
          } : null);
        }
        setRejectingMemberNo(null);
        setRemarksText("");
      } else {
        alert(data.error || "Failed to reject registration");
      }
    } catch (err) {
      console.error(err);
      alert("Network error: Could not reach rejection server.");
    }
  };

  // Trigger RFID Gate Reader Scan
  const handleTriggerRFSwipe = () => {
    if (members.length === 0) return;
    setIsRefreshingLogs(true);
    
    setTimeout(() => {
      setIsRefreshingLogs(false);
      // Pick random member
      const randMem = members[Math.floor(Math.random() * members.length)];
      const gates = ["Turnstile Gate A", "Turnstile Gate B", "Locker Entrance 1"];
      const gate = gates[Math.floor(Math.random() * gates.length)];
      
      const newLog = {
        event: `RFID Swipe Successful: ${randMem.fullName} (${randMem.membershipNo}) swiped in at ${gate}`,
        time: new Date().toLocaleTimeString(),
        type: "swipe"
      };

      setSystemLogs(prev => [newLog, ...prev]);
      
      // Slightly fluctuate occupancy
      setActiveLaneOccupancy(prev => {
        const delta = Math.floor(Math.random() * 15) - 7;
        return Math.min(Math.max(prev + delta, 25), 90);
      });
    }, 650);
  };

  // Add Member Manual Entry
  const handleAddMemberManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim() || !newMemPhone.trim()) return;

    const code = isSwim ? "BSF" : "TCA";
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const mNo = `${code}-2026-${randCode}`;

    let finalPhone = newMemPhone.trim();
    const digitsOnly = finalPhone.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      finalPhone = `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      finalPhone = `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`;
    }

    const newM = {
      membershipNo: mNo,
      typeOfMembership: newMemPlan,
      batchSchedule: "MWF",
      batchTiming: newMemTiming,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "2026-08-30",
      coachRequired: newMemCoach,
      fullName: newMemName.trim(),
      gender: newMemGender,
      dateOfBirth: "2000-01-01",
      age: "26",
      addressLine1: "101, SAMS Arcade Center",
      addressLine2: "Alkapuri, Vadodara",
      mobileNo: finalPhone,
      email: `${newMemName.trim().toLowerCase().replace(/\s+/g, ".")}@sams.com`,
      emergencyName: "SAMS Office",
      emergencyPhone: "+91 99999 88888",
      emergencyRelation: "Administrator",
      hasMedicalCondition: "No",
      medicalDetails: "",
      disability: "N/A",
      bloodGroup: "B+",
      height: "175",
      weight: "68",
      relationToUndertaker: "self",
      undertakerParentName: "Parent",
      typedSignature: newMemName.trim(),
      signatureDataUrl: null,
      academyId,
      status: "Approved",
      paymentStatus: "Unpaid",
      registrationDate: new Date().toLocaleDateString()
    };

    fetch("/api/members/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newM)
    })
    .then(res => res.ok ? res.json().catch(() => newM) : newM)
    .then(data => {
      setMembers([data, ...members]);
    })
    .catch(err => {
      console.error("Failed manual register via API", err);
      setMembers([newM, ...members]);
    });

    // Reset Form
    setNewMemName("");
    setNewMemPhone("");
    setShowAddMemberModal(false);
  };

  // Delete Member Handler
  const handleDeleteMember = (membershipNo: string) => {
    handleDeleteMemberBatch([membershipNo]);
  };

  // Delete Member / Batch Delete Handler
  const handleDeleteMemberBatch = async (membershipNos: string[], isAllRejected?: boolean) => {
    setMembers(prev => prev.filter(m => !membershipNos.includes(m.membershipNo)));
    
    const token = getSessionToken();
    try {
      if (isAllRejected) {
        await fetch(`/api/members/delete-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-session-token": token } : {})
          },
          body: JSON.stringify({ deleteAllRejected: true, academyId })
        });
      } else if (membershipNos.length === 1) {
        await fetch(`/api/members/${membershipNos[0]}`, {
          method: "DELETE",
          headers: token ? { "x-session-token": token } : {}
        });
      } else {
        await fetch(`/api/members/delete-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-session-token": token } : {})
          },
          body: JSON.stringify({ membershipNos })
        });
      }
    } catch (err) {
      console.error("Failed to delete member(s) via API", err);
    }

    if (selectedMember && membershipNos.includes(selectedMember.membershipNo)) {
      setSelectedMember(null);
    }
  };

  // Toggle Member Approval Status or Approve Pending Members
  const handleToggleMemberStatus = (membershipNo: string) => {
    let nextStatus = "Approved";
    let isApproveAction = false;

    const matched = members.find(m => m.membershipNo === membershipNo);
    if (!matched) return;

    if (matched.status === "Pending Approval") {
      nextStatus = "Approved";
      isApproveAction = true;
    } else {
      nextStatus = matched.status === "Approved" ? "Suspended" : "Approved";
    }

    const token = getSessionToken();
    fetch("/api/members/approve", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "x-session-token": token } : {})
      },
      body: JSON.stringify({ membershipNo, status: nextStatus })
    })
    .then(res => res.ok ? res.json().catch(() => ({})) : ({}))
    .then((data: any) => {
      if (data && data.success) {
        setMembers(prev => prev.map(m => m.membershipNo === membershipNo ? { ...m, status: nextStatus, paymentStatus: isApproveAction ? "Unpaid" : m.paymentStatus } : m));
      }
    })
    .catch(err => {
      console.error("Failed to approve member via API", err);
      // Client-side fallback
      setMembers(prev => prev.map(m => m.membershipNo === membershipNo ? { ...m, status: nextStatus, paymentStatus: isApproveAction ? "Unpaid" : m.paymentStatus } : m));
    });

    if (selectedMember?.membershipNo === membershipNo) {
      setSelectedMember(prev => {
        if (!prev) return null;
        return { ...prev, status: nextStatus, paymentStatus: isApproveAction ? "Unpaid" : prev.paymentStatus };
      });
    }
  };

  // Handle Attendance status cycle
  const cycleAttendanceStatus = (membershipNo: string) => {
    setAttendanceRecords(prev => {
      const current = prev[membershipNo] || "Present";
      let next = "Present";
      if (current === "Present") next = "Absent";
      else if (current === "Absent") next = "Excused";
      
      return { ...prev, [membershipNo]: next };
    });
  };

  // Real SAMS Renewal action logic
  const handleRenewMember = (membershipNo: string, term: string, paymentMode: string, newEndDate: string) => {
    setMembers(prev => prev.map(m => m.membershipNo === membershipNo ? { 
      ...m, 
      typeOfMembership: term, 
      endDate: newEndDate, 
      status: "Approved", 
      paymentStatus: "Paid" 
    } : m));

    // Async sync to database
    const token = getSessionToken();
    fetch("/api/members/approve", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "x-session-token": token } : {})
      },
      body: JSON.stringify({ membershipNo, status: "Approved" })
    })
    .catch(err => console.error("Failed to sync approved renewal to database", err));
  };

  // Filters search members
  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.membershipNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.mobileNo || "").includes(searchQuery);
    
    const rStatus = m.registration_status || m.status || "Pending";
    const isRejected = rStatus === "Rejected" || m.status === "Rejected" || m.admin_approval === "Rejected";

    const matchesStatus = 
      (statusFilter === "All" && !isRejected) || 
      (statusFilter === "Pending Approval" && (rStatus === "Pending" || rStatus === "Pending Approval") && !isRejected) ||
      (statusFilter === "Approved" && (rStatus === "Approved" || m.status === "Approved")) ||
      (statusFilter === "Suspended" && m.membership_status === "Suspended") ||
      (statusFilter === "Rejected" && isRejected) ||
      (rStatus === statusFilter && !isRejected);

    return matchesSearch && matchesStatus;
  });

  // Financial aggregates
  const calculateAggregateRevenue = () => {
    let sum = 0;
    members.forEach(m => {
      const rate = m.typeOfMembership === "Yearly" ? 18000
                 : m.typeOfMembership === "Half Yearly" ? 10000
                 : m.typeOfMembership === "Quarterly" ? 5500
                 : 2000;
      sum += rate;
    });
    return sum;
  };

  const totalCalculatedRevenue = calculateAggregateRevenue();

  const loggedInSession = (() => {
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { id: "0", name: userName, role: userRole };
  })();
  const currentUserRole = loggedInSession?.role || activeUser.role || "admin";
  const currentUserId = loggedInSession?.id || loggedInSession?.userId;

  // Adaptive Styles
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

  // Normalize userRole based on activeUser
  const normalizedRole = (activeUser.role === "super_admin" || activeUser.role === "admin") 
    ? "admin" 
    : (activeUser.role === "receptionist" || activeUser.role === "staff") 
      ? "staff" 
      : "coach";

  const allTabs = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics Dashboard", icon: BarChart3 },
    { id: "registrations", label: "Member Approvals", icon: ShieldCheck, hideForCoach: true },
    { id: "register", label: "Register New Member", icon: UserPlus, hideForCoach: true },
    { id: "members", label: "Members", icon: Users },
    { id: "activity", label: "Recent Activity", icon: Activity },
    { id: "batches", label: "Batch Management", icon: Clock },
    { id: "renewals", label: "Membership Renewals", icon: RefreshCw, hideForCoach: true },
    { id: "revenue", label: "Payments", icon: IndianRupee, adminOnly: true },
    { id: "communication", label: "Communication Center", icon: MessageSquare, hideForCoach: true },
    { id: "calendar", label: "SAMS Calendar", icon: Calendar },
    { id: "staff", label: "Staff & Coaches", icon: UserPlus },
    { id: "reports", label: "Reports", icon: Database },
    { id: "settings", label: "Settings", icon: Sliders, hideForCoach: true }
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (tab.adminOnly && normalizedRole !== "admin") return false;
    if (tab.hideForCoach && normalizedRole === "coach") return false;
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] w-full bg-slate-50 text-slate-800 font-sans text-left overflow-hidden relative">
      
      {/* 1. DESKTOP NAVIGATION SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0 h-screen">
        {/* Sidebar Header with Academy Branding */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-cyan-500 text-white h-9 w-9 shadow-md shrink-0">
            <span className="text-base">{isSwim ? "🌊" : "🏏"}</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xs font-black tracking-tight leading-none text-white truncate">
              Baroda Swim Front
            </span>
            <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-sky-400 mt-1 truncate">
              SAMS SYSTEM
            </span>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/20 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 uppercase shrink-0">
              {activeUser.avatar ? (
                <img src={activeUser.avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                activeUser.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{activeUser.name}</div>
              <div className="text-[9.5px] font-mono text-sky-400 uppercase font-semibold truncate tracking-wider">
                {activeUser.role.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`btn-admin-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedMember(null);
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
            id="btn-admin-logout"
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
            <div className="h-8 w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {isSwim ? "🌊" : "🏏"}
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 block tracking-tight">Baroda Swim Front</span>
              <span className="text-[9px] font-mono text-sky-600 font-bold uppercase tracking-wider block leading-none">SAMS SYSTEM</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">{activeUser.name}</span>
              <span className="text-[9px] font-mono text-sky-600 font-bold uppercase tracking-wider block leading-none">{activeUser.role.replace("_", " ")}</span>
            </div>

            <button
              id="btn-admin-daily-closing-mobile"
              onClick={() => setIsClosingReportModalOpen(true)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg relative cursor-pointer"
              title="Daily Closing Report"
            >
              <FileText className="h-4.5 w-4.5" />
            </button>

            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-50 rounded-lg relative cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </header>

        {/* 4. MAIN CONTENT CONTAINER (NATIVE SCROLLING CONTAINER) */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-slate-50 relative">
          
          {/* Desktop Header */}
          <header className="hidden md:flex h-16 bg-white border-b border-slate-200/80 px-8 items-center justify-between shrink-0">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest shrink-0">
                {allTabs.find(t => t.id === activeTab)?.label}
              </h2>
              
              {/* Universal Search Bar Trigger */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center justify-between w-full max-w-md px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                id="btn-global-search-header"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="truncate">Search members, payments, coaches...</span>
                </div>
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
                  Ctrl + K
                </kbd>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Active Session:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-150 bg-slate-50/50">
                  <span className="text-xs font-black text-slate-800">{activeUser.name}</span>
                  <span className="text-[9px] font-mono bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">
                    {activeUser.role.replace("_", " ")}
                  </span>
                </div>
              </div>

              <button 
                id="btn-admin-daily-closing-desktop"
                onClick={() => setIsClosingReportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                title="Daily Shift / Day Ending Report"
              >
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>Daily Closing Report</span>
              </button>

              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-50 rounded-xl relative cursor-pointer border border-slate-150 bg-white shadow-xs transition-colors"
                title="System Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white" />
                )}
              </button>
            </div>
          </header>

          {/* Content View with clean custom padding */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-[calc(4rem+env(safe-area-inset-bottom)+1.5rem)] md:pb-8 scroll-smooth overscroll-behavior-y-contain text-slate-800">
            
            {isLoading ? (
              <div className="space-y-8 animate-pulse text-left">
                {/* Top Telemetries cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className={`p-6 rounded-3xl border ${bgCard}`}>
                      <div className={`h-2.5 w-1/2 rounded mb-4 ${isSwim ? "bg-slate-200" : "bg-emerald-900/40"}`} />
                      <div className="flex items-baseline gap-1 mt-4 mb-2">
                      <div className={`h-8 w-1/3 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
                    </div>
                    <div className={`h-2 w-2/3 rounded-md ${isSwim ? "bg-slate-100" : "bg-emerald-900/25"}`} />
                  </div>
                ))}
              </div>

              {/* Custom SVG Charts Section skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1 skeleton */}
                <div className={`p-6 md:p-8 rounded-3xl border ${bgCard} space-y-4`}>
                  <div className={`h-4 w-1/3 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className={`h-36 w-36 rounded-full border-8 ${isSwim ? "border-slate-100/20 bg-transparent" : "border-emerald-900/30 bg-transparent"} flex items-center justify-center shrink-0`}>
                      <div className={`h-16 w-16 rounded-full ${isSwim ? "bg-slate-200" : "bg-emerald-900/20"}`} />
                    </div>
                    <div className="space-y-3 w-full">
                      <div className={`h-6 w-full rounded-lg ${isSwim ? "bg-slate-100" : "bg-emerald-900/15"}`} />
                      <div className={`h-6 w-full rounded-lg ${isSwim ? "bg-slate-100" : "bg-emerald-900/15"}`} />
                      <div className={`h-6 w-full rounded-lg ${isSwim ? "bg-slate-100" : "bg-emerald-900/15"}`} />
                    </div>
                  </div>
                </div>

                {/* Chart 2 skeleton */}
                <div className={`p-6 md:p-8 rounded-3xl border ${bgCard} space-y-5`}>
                  <div className={`h-4 w-1/2 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
                  <div className="space-y-3.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="flex items-center gap-3">
                        <div className={`h-3 w-20 rounded ${isSwim ? "bg-slate-200" : "bg-emerald-900/30"}`} />
                        <div className={`h-6 w-full rounded-lg ${isSwim ? "bg-slate-100" : "bg-emerald-900/15"}`} style={{ width: `${100 - n * 12}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* TAB: DASHBOARD HOME & POOL TELEMETRIES */}
              {activeTab === "home" && (
                <HomeTab
                  isSwim={isSwim}
                  members={members}
                  coachesCount={coachesList.length}
                  eventsCount={events.length}
                  events={events}
                  holidays={holidays}
                  settings={settings}
                  userRole={activeUser.role}
                  userName={activeUser.name}
                  onNavigate={setActiveTab}
                  onOpenAddMember={() => setShowAddMemberModal(true)}
                />
              )}

        {/* TAB: REGISTRATION APPROVALS */}
        {activeTab === "registrations" && (
          <ApprovalsTab
            members={members}
            onApprove={handleApproveRegistration}
            onReject={async (membershipNo, remarks) => {
              const token = getSessionToken();
              const res = await fetch("/api/members/reject", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { "x-session-token": token } : {})
                },
                body: JSON.stringify({ membershipNo, remarks })
              });
              const data = await res.json();
              if (res.ok) {
                setMembers(prev => prev.map(m => m.membershipNo === membershipNo ? {
                  ...m,
                  status: "Rejected",
                  registration_status: "Rejected",
                  admin_approval: "Rejected",
                  remarks: remarks
                } : m));
              } else {
                alert(data.error || "Failed to reject registration");
              }
            }}
            academyId={academyId}
            isSwim={isSwim}
            onDelete={handleDeleteMemberBatch}
          />
        )}

        {/* TAB 2: MEMBER DIRECTORY */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              
              {/* Search and filters bar */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3.5 items-center flex-grow w-full max-w-2xl">
                <div className="relative flex-grow w-full min-w-[200px]">
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 opacity-40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search directory by member name, phone number, or ID..."
                    className={`pl-10 ${inputStyle}`}
                  />
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Filter className="h-4 w-4 opacity-50" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-3 text-xs rounded-xl focus:outline-none border font-semibold bg-current/5 border-current/10 text-current"
                  >
                    <option value="All">All Active & Pending</option>
                    <option value="Pending Approval">Pending Approvals</option>
                    <option value="Approved">Active Members</option>
                    <option value="Suspended">Suspended Members</option>
                    <option value="Rejected">Rejected Applications</option>
                  </select>
                </div>
              </div>

              {/* Add member button */}
              <button
                id="btn-admin-add-member-modal"
                onClick={() => setShowAddMemberModal(true)}
                className={`py-3 px-4.5 rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all whitespace-nowrap shrink-0 ${buttonPrimary}`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Onboard Member</span>
              </button>

            </div>

            {/* Grid Layout: Left is Master table, Right is detailed profile view (if selected) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* Left Side: Table List */}
              <div className={`min-w-0 transition-all duration-300 ${selectedMember ? "col-span-12 lg:col-span-7" : "col-span-12 lg:col-span-12"} rounded-3xl border overflow-hidden ${bgCard}`}>
                <div className="overflow-x-auto w-full hidden md:block">
                  <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                    <thead>
                      <tr className="bg-current/5 border-b border-current/10 font-mono text-[10px] opacity-75 uppercase tracking-wider whitespace-nowrap">
                        <th className="p-4 pl-4.5">Membership ID</th>
                        <th className="p-4">Full Member Name</th>
                        <th className="p-4">Batch schedule</th>
                        <th className="p-4">Mobile</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 pr-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-current/5">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => (
                          <tr key={m.membershipNo} className={`hover:bg-current/5 transition-colors ${selectedMember?.membershipNo === m.membershipNo ? "bg-current/5" : ""}`}>
                            <td className="p-4 pl-4.5 font-mono font-bold text-sky-500 whitespace-nowrap">{m.membershipNo}</td>
                            <td className="p-4">
                              <div className="min-w-[130px]">
                                <span className="font-extrabold block text-slate-900 dark:text-white uppercase truncate">{m.fullName}</span>
                                <span className="text-[10px] opacity-55 block font-mono mt-0.5 whitespace-nowrap">{m.typeOfMembership} • Age: {m.age}</span>
                              </div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="font-semibold">{m.batchSchedule} • {(m.batchTiming || "").split(" ")[0]}</span>
                            </td>
                            <td className="p-4 font-mono opacity-80 whitespace-nowrap">{m.mobileNo}</td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`text-[8.5px] font-bold font-mono px-2.5 py-1 rounded-full uppercase border ${
                                m.status === "Approved" 
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                  : m.status === "Pending Approval"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                    : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="p-4 pr-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <button
                                  id={`btn-view-member-spec-${m.membershipNo}`}
                                  onClick={() => setSelectedMember(m)}
                                  className="p-1.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 cursor-pointer transition-colors"
                                  title="Inspect paper specs folder"
                                >
                                  <Eye className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  id={`btn-toggle-member-${m.membershipNo}`}
                                  onClick={() => handleToggleMemberStatus(m.membershipNo)}
                                  className={`p-1.5 rounded cursor-pointer transition-colors ${
                                    m.status === "Approved" 
                                      ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500" 
                                      : m.status === "Pending Approval"
                                        ? "bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-400 border border-emerald-500/30 animate-bounce"
                                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500"
                                  }`}
                                  title={m.status === "Approved" ? "Suspend member access" : m.status === "Pending Approval" ? "Approve Member & Dispatch WhatsApp Link" : "Re-activate access"}
                                >
                                  <Check className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  id={`btn-reject-member-${m.membershipNo}`}
                                  onClick={() => handleOpenRejectModal(m.membershipNo)}
                                  className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer transition-colors"
                                  title="Reject application / Mark as rejected"
                                >
                                  <X className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  id={`btn-delete-member-${m.membershipNo}`}
                                  onClick={() => handleDeleteMember(m.membershipNo)}
                                  className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer transition-colors"
                                  title="Permanently erase record"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-12 opacity-50 font-light">
                            No matching member ledger directories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Member Cards (Visible only on mobile) */}
                <div className="md:hidden block p-4 space-y-4">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((m) => (
                      <div 
                        key={m.membershipNo}
                        onClick={() => setSelectedMember(m)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                          selectedMember?.membershipNo === m.membershipNo 
                            ? "bg-sky-500/10 border-sky-500/30 shadow-xs" 
                            : isSwim 
                              ? "bg-slate-50 border-slate-200/60 hover:bg-slate-100/50" 
                              : "bg-emerald-900/10 border-emerald-900/30 hover:bg-emerald-900/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white uppercase text-xs">{m.fullName}</h4>
                            <p className="text-[10px] opacity-65 font-mono mt-0.5">{m.typeOfMembership} • ID: {m.membershipNo}</p>
                            <p className="text-[10px] font-semibold text-sky-600 mt-1">{m.batchSchedule} ({(m.batchTiming || "").split(" ")[0]})</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase border ${
                              m.status === "Approved" 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                : m.status === "Pending Approval"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                                  : "bg-red-500/10 text-red-550 border-red-500/20"
                            }`}>
                              {m.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-between items-center border-t border-current/5 pt-2 text-[10px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMemberStatus(m.membershipNo);
                            }}
                            className="px-2.5 py-1 rounded bg-sky-500/15 text-sky-600 text-[9px] font-bold uppercase tracking-wider"
                          >
                            Toggle Status
                          </button>
                          <span className="text-sky-500 font-bold uppercase tracking-wider">Tap to view spec &rarr;</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 opacity-50 text-xs">
                      No matching member records found.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Detailed spec inspection folder (Paper spec sheets) */}
              <AnimatePresence>
                {selectedMember && (
                  <div className="fixed inset-0 z-50 lg:relative lg:inset-auto col-span-12 lg:col-span-5 lg:z-0 flex flex-col justify-end lg:justify-start min-w-0">
                    {/* Backdrop for mobile */}
                    <div className="absolute inset-0 bg-slate-950/60 lg:hidden animate-in fade-in duration-300" onClick={() => setSelectedMember(null)} />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 100 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 100 }}
                      className="relative w-full max-h-[90vh] lg:max-h-[600px] bg-white text-slate-800 rounded-t-3xl lg:rounded-3xl border border-slate-200 text-left space-y-6 overflow-y-auto shadow-2xl lg:shadow-lg p-6 md:p-8"
                    >
                    
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-sky-600 font-extrabold block">Member Spec Sheet</span>
                        <h4 className="text-lg font-black text-slate-950 mt-1 uppercase">{selectedMember.fullName}</h4>
                        <span className="text-[10.5px] font-mono text-sky-600 block mt-0.5">{selectedMember.membershipNo}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedMember(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Member Quick Bio spec block */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="opacity-60 block font-mono text-[8px] uppercase">Plan Details</span>
                        <span className="font-bold text-slate-800">{selectedMember.typeOfMembership} subscription</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="opacity-60 block font-mono text-[8px] uppercase">Batch Schedule</span>
                        <span className="font-bold text-slate-800">{selectedMember.batchSchedule} ({(selectedMember.batchTiming || "").split(" ")[0]})</span>
                      </div>
                    </div>

                    {/* SAMS WhatsApp Dispatch Panel */}
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-mono uppercase tracking-widest font-black text-emerald-700">SAMS WhatsApp Gate Dispatcher</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Send registration updates, approval notifications, and instant secure payment gateway links straight to the user's mobile device via WhatsApp.
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${selectedMember.mobileNo.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(selectedMember.fullName)},%20your%20registration%20for%20${encodeURIComponent(isSwim ? "Baroda Swim Front" : "The Cricket Academy")}%20is%20APPROVED!%20Please%20complete%20your%20membership%20payment%20here:%20${encodeURIComponent(window.location.origin + "?payment_link=" + selectedMember.membershipNo)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          💬 Send Approval & Payment Link
                        </a>
                      </div>
                    </div>

                    {/* Specifications categories */}
                    <div className="space-y-4 text-xs">
                      
                      {/* Specs Block 1: Contact Details */}
                      <div className="space-y-2.5">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">1. Contact Specifications</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">DOB & Age</span>
                            <span className="font-medium">{formatDateToIndian(selectedMember.dateOfBirth)} (Age: {selectedMember.age})</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Gender</span>
                            <span className="font-medium">{selectedMember.gender}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Home Address</span>
                            <span className="font-medium leading-relaxed block">{selectedMember.addressLine1}, {selectedMember.addressLine2 || ""}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Mobile phone</span>
                            <span className="font-bold font-mono">{selectedMember.mobileNo}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Email address</span>
                            <span className="font-mono text-sky-600 font-medium block truncate" title={selectedMember.email}>{selectedMember.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs Block 2: Emergency Relations */}
                      <div className="space-y-2.5">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">2. Guardian & Emergency Contacts</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Guardian Name</span>
                            <span className="font-medium">{selectedMember.parentName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Guardian relation</span>
                            <span className="font-medium">{selectedMember.parentRelation || "N/A"}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Emergency contact</span>
                            <span className="font-bold text-red-500">{selectedMember.emergencyName}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Emergency phone</span>
                            <span className="font-mono font-bold text-red-500">{selectedMember.emergencyPhone || selectedMember.emergencyMobile || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs Block 3: Medical Diagnostics */}
                      <div className="space-y-2.5">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">3. Health Diagnostics</span>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Blood group</span>
                            <span className="font-extrabold text-red-500 font-mono">{selectedMember.bloodGroup}</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Height (cm)</span>
                            <span className="font-medium">{selectedMember.height} cm</span>
                          </div>
                          <div>
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Weight (kg)</span>
                            <span className="font-medium">{selectedMember.weight} kg</span>
                          </div>
                          <div className="col-span-3">
                            <span className="opacity-55 block text-[8px] font-mono uppercase">Disabilities / Medical Illnesses</span>
                            <span className="font-medium text-slate-600 block">{selectedMember.hasMedicalCondition === "Yes" ? selectedMember.medicalDetails : "None / N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Specs Block 4: Electronic Signatures */}
                      <div className="space-y-2.5">
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">4. Contract Undertaking Signature</span>
                        <div className="h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-2 shadow-inner">
                          {selectedMember.signatureDataUrl ? (
                            <img src={selectedMember.signatureDataUrl} alt="Electronic Signature" className="max-h-full object-contain filter invert mix-blend-multiply" />
                          ) : (
                            <span className="font-serif italic text-lg text-slate-800 tracking-widest">{selectedMember.typedSignature || selectedMember.fullName}</span>
                          )}
                        </div>
                      </div>

                      {/* Admin Quick Action Controls */}
                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-extrabold block">Admin Quick Actions</span>
                        <div className="flex flex-wrap gap-2">
                          {(selectedMember.status !== "Approved" && selectedMember.registration_status !== "Approved") && (
                            <button
                              onClick={() => handleApproveRegistration(selectedMember.membershipNo)}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                            >
                              ✓ Approve Member
                            </button>
                          )}
                           {(selectedMember.status === "Approved" || selectedMember.registration_status === "Approved") && (
                            <button
                              onClick={() => handleSendWhatsAppPaymentLink(selectedMember.membershipNo, selectedMember.mobileNo)}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5"
                            >
                              <span>💬 Send WhatsApp Link</span>
                            </button>
                          )}
                          {(selectedMember.status !== "Rejected" && selectedMember.registration_status !== "Rejected") && (
                            <button
                              onClick={() => handleOpenRejectModal(selectedMember.membershipNo)}
                              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                            >
                              ✕ Reject Member
                            </button>
                          )}
                        </div>
                      </div>

                    </div>

                  </motion.div>
                </div>
              )}
              </AnimatePresence>

            </div>

          </div>
        )}

        {/* TAB 3: DAILY ATTENDANCE MARKER SHEET */}
        {activeTab === "attendance" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Header selection panel */}
            <div className={`p-6 rounded-3xl ${bgCard} text-left flex flex-wrap gap-6 items-end`}>
              
              <div className="flex flex-col gap-1.5 flex-grow max-w-xs">
                <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Session Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-grow max-w-xs">
                <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Batch Timing Allotted</label>
                <select
                  value={attendanceTiming}
                  onChange={(e) => setAttendanceTiming(e.target.value)}
                  className={inputStyle}
                >
                  <option value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM (All Age Group)</option>
                  <option value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM (All Age Group)</option>
                  <option value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM (All Age Group)</option>
                  <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM (All Age Group)</option>
                  <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM (All Age Group)</option>
                  <option value="06:00 PM - 07:00 PM">06:00 PM - 07:00 PM (All Age Group)</option>
                  <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM (All Age Group)</option>
                  <option value="08:00 PM - 09:00 PM">08:00 PM - 09:00 PM (Family Batch)</option>
                </select>
              </div>

              <div className="flex-grow text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold inline-block">
                  SAMS Ledger Synchronized
                </span>
              </div>
            </div>

            {/* Attendance checklist sheet */}
            <div className={`p-6 md:p-8 rounded-3xl ${bgCard} text-left`}>
              <h3 className="text-base font-bold mb-4">Batch Member List</h3>
              <p className="text-xs opacity-65 mb-6">Click any member's action pill to cycle their attendance status between Present, Absent, and Excused.</p>

              <div className="space-y-3">
                {members.length > 0 ? (
                  members.map((m) => {
                    const status = attendanceRecords[m.membershipNo] || "Present";
                    return (
                      <div key={m.membershipNo} className="p-4 rounded-2xl bg-current/5 border border-current/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs font-mono uppercase ${
                            isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
                          }`}>
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white uppercase block text-xs">{m.fullName}</span>
                            <span className="text-[10px] opacity-60 font-mono mt-0.5">{m.membershipNo} • Allotted timing: {m.batchTiming}</span>
                          </div>
                        </div>

                        <button
                          id={`btn-cycle-attendance-${m.membershipNo}`}
                          onClick={() => cycleAttendanceStatus(m.membershipNo)}
                          className={`px-4.5 py-1.5 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                            status === "Present" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                            status === "Absent" ? "bg-red-500/10 text-red-500 border-red-500/25" :
                            "bg-slate-500/10 text-slate-400 border-slate-500/25"
                          }`}
                        >
                          {status}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 opacity-50 font-light">
                    No members currently mapped to the active batch.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}



        {/* TAB 5: SYSTEM TELEMETRY & GATE CONTROL */}
        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            
            {/* Left Side: Telemetry details */}
            <div className={`lg:col-span-7 p-6 md:p-8 rounded-3xl border ${bgCard} text-left space-y-6`}>
              <div className="flex justify-between items-center pb-2 border-b border-current/5">
                <div>
                  <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">SYSTEM AUDIT LEDGER</span>
                  <h3 className="text-lg font-bold mt-1">Biometric Entry Gates Status</h3>
                </div>
                <Users className="h-5 w-5 opacity-40" />
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-current/5 border border-current/10">
                  <span className="opacity-55 block font-mono text-[8px] uppercase">Encryption Handshake</span>
                  <span className="font-bold text-emerald-400 block mt-1">AES-256 Valid</span>
                </div>
                <div className="p-4 rounded-xl bg-current/5 border border-current/10">
                  <span className="opacity-55 block font-mono text-[8px] uppercase">SQLite Clusters Connection</span>
                  <span className="font-bold text-emerald-400 block mt-1">Online (Replicated)</span>
                </div>
                <div className="p-4 rounded-xl bg-current/5 border border-current/10">
                  <span className="opacity-55 block font-mono text-[8px] uppercase">Biometric Latency</span>
                  <span className="font-bold text-sky-400 font-mono block mt-1">14 ms Mean</span>
                </div>
              </div>

              {/* Logs display */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-mono uppercase opacity-55 tracking-widest block">Live Biometric swipe logs</span>
                
                <div className="bg-slate-950/20 rounded-2xl border border-current/5 p-5 space-y-3 font-mono text-[10.5px] max-h-[300px] overflow-y-auto">
                  {systemLogs.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 py-1.5 border-b border-white/5 last:border-0">
                      <span className={`text-left ${log.type === "swipe" ? "text-emerald-400 font-semibold" : "text-slate-300"}`}>
                        {log.type === "swipe" ? "⚡" : "●"} {log.event}
                      </span>
                      <span className="opacity-45 shrink-0 text-[9px]">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Biometric controllers */}
            <div className={`lg:col-span-5 p-6 md:p-8 rounded-3xl border ${bgCard} text-left space-y-6`}>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold">Biometric Controller Terminal</h3>
              </div>
              
              <p className="text-xs opacity-65 leading-relaxed font-light">
                This hardware control console triggers active biometric scan pulses. Clicking the swipe trigger below randomly processes a club member arriving at the academy gates and scanning their RFID Card.
              </p>

              <div className="p-4 rounded-2xl bg-current/5 border border-current/10 space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Turnstile Gate 1 State</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE ONLINE</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Turnstile Gate 2 State</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE ONLINE</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Locker RF Biometrics reader</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">LIVE ONLINE</span>
                </div>
              </div>

              <button
                onClick={handleTriggerRFSwipe}
                disabled={isRefreshingLogs}
                className={`w-full py-4 rounded-xl text-xs uppercase tracking-widest font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${buttonPrimary}`}
              >
                <Activity className={`h-4.5 w-4.5 ${isRefreshingLogs ? "animate-spin" : ""}`} />
                <span>Trigger RFID Gate Pass Reader</span>
              </button>
            </div>
          </div>
        )}

         {/* TAB 6: STAFF ACCOUNTS MANAGER */}
        {activeTab === "staff" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300 relative animate-out fade-out">
            
            {/* Custom React Deletion Confirmation Dialog Modal */}
            {deleteConfirmStaffId && (
              <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-left space-y-5 animate-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 font-bold block">CONFIRM ACCOUNT REVOCATION</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">De-authorize SAMS Account?</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Are you absolutely sure you want to permanently remove this credential? The employee will immediately lose access to front desk panels, coaching tools, and active SAMS dashboards. This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmStaffId(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Keep Account
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(deleteConfirmStaffId)}
                      className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Yes, De-authorize
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Left Column: Staff Directory */}
            <div className={`lg:col-span-7 p-6 md:p-8 rounded-3xl border ${bgCard} text-left space-y-6`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">AUTHORITY REGISTRY</span>
                  <h3 className="text-lg font-bold mt-1">Authorized SAMS Staff & Coaches</h3>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-1 bg-current/5 p-1 rounded-xl">
                  {[
                    { id: "all", label: "All" },
                    { id: "coaches", label: "Coaches" },
                    { id: "admins", label: "Admins" },
                    { id: "staff", label: "Staff" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStaffRoleFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-extrabold cursor-pointer transition-all ${
                        staffRoleFilter === f.id
                          ? isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
                          : "hover:bg-current/10"
                      }`}
                    >
                      {f.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {staffAlert && (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400 flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  <span>{staffAlert}</span>
                </div>
              )}

              {isStaffLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-60">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-xs font-mono">Retrieving accounts list...</span>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {staffList.filter((st: any) => {
                    if (staffRoleFilter === "coaches") return st.role === "coach";
                    if (staffRoleFilter === "admins") return st.role === "admin" || st.role === "super_admin";
                    if (staffRoleFilter === "staff") return st.role === "receptionist" || st.role === "staff";
                    return true;
                  }).length > 0 ? (
                    staffList
                      .filter((st: any) => {
                        if (staffRoleFilter === "coaches") return st.role === "coach";
                        if (staffRoleFilter === "admins") return st.role === "admin" || st.role === "super_admin";
                        if (staffRoleFilter === "staff") return st.role === "receptionist" || st.role === "staff";
                        return true;
                      })
                      .map((st: any) => {
                        // Role-based deletion logic:
                        // Super Admin: delete anyone except self.
                        // Admin: delete Staff, Receptionist, Coach. Cannot delete Super Admin, Admin, or self.
                        // Staff/Coach: cannot delete anyone.
                        const canDelete = (currentUserRole === "super_admin" && String(st.id) !== String(currentUserId)) ||
                                          (currentUserRole === "admin" && String(st.id) !== String(currentUserId) && st.role !== "super_admin" && st.role !== "admin");

                        return (
                          <div key={st.id} className="p-4 rounded-2xl bg-current/5 border border-current/10 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm uppercase ${
                                st.role === "admin" || st.role === "super_admin" 
                                  ? "bg-amber-400 text-slate-950" 
                                  : st.role === "coach"
                                    ? "bg-sky-500 text-white"
                                    : "bg-emerald-500 text-white"
                              }`}>
                                {st.name.charAt(0)}
                              </div>
                              <div className="text-left space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold block text-slate-800">{st.name}</span>
                                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                    st.role === "super_admin" ? "bg-red-500/10 text-red-500" :
                                    st.role === "admin" ? "bg-amber-400/10 text-amber-500" :
                                    st.role === "coach" ? "bg-sky-500/10 text-sky-500" : "bg-emerald-500/10 text-emerald-500"
                                  }`}>
                                    {st.role}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] opacity-85 font-mono text-slate-500">
                                  <div>
                                    <span className="font-semibold text-slate-400">Employee ID:</span> <span className="text-sky-600 font-bold">EMP-{(st.role === "admin" || st.role === "super_admin") ? "ADM" : st.role === "coach" ? "COA" : "REC"}-0{st.id?.toString().replace(/\D/g, "") || "9"}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-400">Department:</span> <span className="text-slate-700 font-bold">{(st.role === "admin" || st.role === "super_admin") ? "Board of Directors" : st.role === "coach" ? "Athletics & Training" : "Front Office / Reception"}</span>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <span className="font-semibold text-slate-400">Email:</span> <span className="text-slate-700">{st.email}</span>
                                  </div>
                                  {st.phoneNumber && (
                                    <div className="sm:col-span-2">
                                      <span className="font-semibold text-slate-400">Phone:</span> <span className="text-slate-700">{st.phoneNumber}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {canDelete && (
                              <div className="flex items-center gap-4">
                                <button
                                  id={`btn-admin-remove-staff-${st.id}`}
                                  onClick={() => setDeleteConfirmStaffId(st.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="De-authorize Account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-12 opacity-50 font-light text-xs">
                      No personnel matching this criteria was found in SAMS.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Register Staff Form */}
            <div className={`lg:col-span-5 p-6 md:p-8 rounded-3xl border ${bgCard} text-left`}>
              {(currentUserRole === "super_admin" || currentUserRole === "admin") ? (
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 block">Admin Security Control</span>
                  <h3 className="text-lg font-bold">Register Admin, Coach, or Staff</h3>
                  <p className="text-xs opacity-65 leading-relaxed mb-4">Directly provision secure access credentials for institutional personnel. Public registration is fully locked down.</p>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono uppercase opacity-50">Full Name</label>
                      <input
                        type="text"
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="e.g. Sanjay Kumar"
                        className={inputStyle}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono uppercase opacity-50">Designation / Role</label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as any)}
                        className={inputStyle}
                      >
                        {currentUserRole === "super_admin" && (
                          <>
                            <option value="super_admin">Academy Partner (Super Admin)</option>
                            <option value="admin">Academy Director / Admin</option>
                          </>
                        )}
                        <option value="coach">Professional Coach / Trainer</option>
                        <option value="receptionist">Receptionist / Front Desk Staff</option>
                        <option value="staff">Corporate Office Staff</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono uppercase opacity-50">Phone Number</label>
                      <input
                        type="text"
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className={inputStyle}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono uppercase opacity-50">Corporate Email Address</label>
                      <input
                        type="email"
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="e.g. sanjay@academy.sams"
                        className={inputStyle}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-mono uppercase opacity-50">Secure Password</label>
                      <input
                        type="password"
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-admin-add-staff-submit"
                    className={`w-full py-3.5 rounded-xl text-xs uppercase tracking-widest font-extrabold shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2 ${buttonPrimary}`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Staff Account</span>
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Read-Only Access Terminal</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Your logged-in SAMS account has read-only access. Direct credential provisioning and personnel de-authorization are strictly restricted to Directors and Academy Partners.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB: RECENT ACTIVITY */}
        {activeTab === "activity" && (
          <ActivityTab getSessionToken={getSessionToken} />
        )}

        {/* TAB: BATCH MANAGEMENT */}
        {activeTab === "batches" && (
          <BatchesTab
            isSwim={isSwim}
            members={members}
            batches={batches}
            onNavigate={setActiveTab}
          />
        )}

        {/* TAB: MEMBERSHIP RENEWALS */}
        {activeTab === "renewals" && (
          <RenewalsTab
            isSwim={isSwim}
            members={members}
            onRenew={handleRenewMember}
          />
        )}

        {/* TAB: REPORTS */}
        {activeTab === "reports" && (
          <ReportsTab
            isSwim={isSwim}
            members={members}
            coaches={coachesList}
            userRole={activeUser.role}
          />
        )}

        {/* TAB: EXECUTIVE ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && (
          <AnalyticsDashboard />
        )}

        {/* TAB: REVENUE (ADMIN ONLY) */}
        {(activeTab === "revenue" || activeTab === "payments") && (
          <PaymentsTab getSessionToken={getSessionToken} userRole={activeUser.role} username={activeUser.name} />
        )}

        {/* TAB: COMMUNICATION CENTER */}
        {activeTab === "communication" && (
          <CommunicationTab />
        )}

        {/* TAB: REGISTER NEW MEMBER */}
        {activeTab === "register" && (
          <div className="p-2 md:p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
            <RegisterPage
              academyId={academyId}
              onRegisterSuccess={() => {
                fetch("/api/members")
                  .then(res => res.ok ? res.json().catch(() => []) : [])
                  .then(data => {
                    if (Array.isArray(data)) setMembers(data.filter((m: any) => m.academyId === academyId));
                  });
                setActiveTab("members");
              }}
              onCancel={() => setActiveTab("home")}
            />
          </div>
        )}

        {/* TAB: SAMS UNIFIED CALENDAR / EVENTS / HOLIDAYS */}
        {(activeTab === "calendar" || activeTab === "events" || activeTab === "holidays") && (
          <CalendarTab isSwim={isSwim} userRole={activeUser.role} />
        )}

        {/* TAB: SYSTEM SETTINGS */}
        {activeTab === "settings" && (
          <SettingsTab
            activeUser={activeUser}
            buttonPrimary={buttonPrimary}
            inputStyle={inputStyle}
            onProfileUpdated={(updated) => {
              setActiveUser((prev) => ({
                ...prev,
                name: updated.name,
                email: updated.email,
                phoneNumber: updated.phoneNumber,
                avatar: updated.avatar
              }));
              try {
                const saved = localStorage.getItem("sams_session");
                if (saved) {
                  const parsed = JSON.parse(saved);
                  parsed.name = updated.name;
                  parsed.email = updated.email;
                  parsed.avatar = updated.avatar;
                  parsed.phoneNumber = updated.phoneNumber;
                  localStorage.setItem("sams_session", JSON.stringify(parsed));
                }
              } catch (err) {}
              if (onProfileUpdated) {
                onProfileUpdated(updated);
              }
            }}
          />
        )}
          </>
        )}

      </div>
      
      </div>

      {/* 3. MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex justify-around items-center px-2 pb-[env(safe-area-inset-bottom)] pt-1 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        
        {/* Home */}
        <button
          onClick={() => {
            setActiveTab("home");
            setSelectedMember(null);
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "home" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Members */}
        <button
          onClick={() => {
            setActiveTab("members");
            setSelectedMember(null);
            setMobileMenuDrawerOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "members" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-medium mt-0.5 tracking-tight">Members</span>
        </button>

        {/* Approvals (Admin/Staff) or Batches (Coach) */}
        {normalizedRole !== "coach" ? (
          <button
            onClick={() => {
              setActiveTab("registrations");
              setSelectedMember(null);
              setMobileMenuDrawerOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
              activeTab === "registrations" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5 tracking-tight">Approvals</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setActiveTab("batches");
              setSelectedMember(null);
              setMobileMenuDrawerOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
              activeTab === "batches" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5 tracking-tight">Batches</span>
          </button>
        )}

        {/* Payments (Admin/Staff) or Events (Coach) */}
        {normalizedRole !== "coach" ? (
          <button
            onClick={() => {
              setActiveTab(normalizedRole === "admin" ? "revenue" : "renewals");
              setSelectedMember(null);
              setMobileMenuDrawerOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
              (activeTab === "revenue" || activeTab === "renewals") && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {normalizedRole === "admin" ? <IndianRupee className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
            <span className="text-[10px] font-medium mt-0.5 tracking-tight">
              {normalizedRole === "admin" ? "Payments" : "Renewals"}
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              setActiveTab("calendar");
              setSelectedMember(null);
              setMobileMenuDrawerOpen(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
              activeTab === "calendar" && !mobileMenuDrawerOpen ? "text-sky-600 font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5 tracking-tight">Calendar</span>
          </button>
        )}

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

      {/* POPUP MODAL: REJECTION REMARKS OVERLAY */}
      <AnimatePresence>
        {rejectingMemberNo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
              onClick={() => setRejectingMemberNo(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-md p-6 rounded-3xl shadow-2xl border z-20 text-left bg-white text-slate-800 border-slate-200`}
            >
              <button
                onClick={() => setRejectingMemberNo(null)}
                className="absolute top-6 right-6 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-slate-900 mb-1">Reject Registration Application</h3>
              <p className="text-xs text-slate-500 mb-4">Application Ref: <span className="font-mono font-bold text-slate-700">{rejectingMemberNo}</span></p>

              <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rejection Reason / Remarks (Optional)</label>
                  <textarea
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    placeholder="Enter reason for rejecting this applicant..."
                    className="w-full bg-slate-50 text-slate-800 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 min-h-[90px]"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingMemberNo(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shadow-sm"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: MANUAL ENROLLMENT OVERLAY */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs transition-opacity"
              onClick={() => setShowAddMemberModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-xl p-8 rounded-3xl shadow-2xl border z-20 text-left ${
                isSwim ? "bg-white text-slate-800 border-slate-200" : "bg-emerald-950 border-emerald-900 text-emerald-100"
              }`}
            >
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="absolute top-6 right-6 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-bold mb-2">On-Counter Paper Enrollment Onboarding</h3>
              <p className="text-xs opacity-60 leading-relaxed mb-6">Manually register a walk-in member here to generate their SAMS ID card instantly.</p>

              <form onSubmit={handleAddMemberManual} className="space-y-4 text-xs">
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono uppercase opacity-60 text-[9px]">Member Full Name *</label>
                  <input
                    type="text"
                    value={newMemName}
                    onChange={(e) => setNewMemName(e.target.value)}
                    placeholder="Enter member's full name"
                    className={inputStyle}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono uppercase opacity-60 text-[9px]">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    value={newMemPhone}
                    onChange={(e) => setNewMemPhone(e.target.value)}
                    placeholder="e.g. +91 99887 76655"
                    className={inputStyle}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono uppercase opacity-60 text-[9px]">Gender Allocation *</label>
                    <select
                      value={newMemGender}
                      onChange={(e) => setNewMemGender(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono uppercase opacity-60 text-[9px]">Membership Term *</label>
                    <select
                      value={newMemPlan}
                      onChange={(e) => setNewMemPlan(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="Monthly">MonthlyBasic Subscription</option>
                      <option value="Quarterly">QuarterlyPro Subscription</option>
                      <option value="Yearly">YearlyElite Subscription</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono uppercase opacity-60 text-[9px]">Allotted Session Timing *</label>
                    <select
                      value={newMemTiming}
                      onChange={(e) => setNewMemTiming(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM (All Age Group)</option>
                      <option value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM (All Age Group)</option>
                      <option value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM (All Age Group)</option>
                      <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM (All Age Group)</option>
                      <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM (All Age Group)</option>
                      <option value="06:00 PM - 07:00 PM">06:00 PM - 07:00 PM (All Age Group)</option>
                      <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM (All Age Group)</option>
                      <option value="08:00 PM - 09:00 PM">08:00 PM - 09:00 PM (Family Batch)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono uppercase opacity-60 text-[9px]">Assign Elite Trainer *</label>
                    <select
                      value={newMemCoach}
                      onChange={(e) => setNewMemCoach(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="No">Self-Paced Practice</option>
                      <option value="Yes">Assign Elite Coach</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-emerald-900/20">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-5 py-3 rounded-xl uppercase tracking-wider font-extrabold cursor-pointer hover:bg-slate-100 text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-3 rounded-xl uppercase tracking-wider font-extrabold cursor-pointer shadow-md ${buttonPrimary}`}
                  >
                    Generate SAMS Card
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 z-10 p-5 pb-8 flex flex-col max-h-[85vh] text-left"
            >
              {/* Drag handle */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-5 shrink-0" />
              
              <div className="flex items-center justify-between mb-4 px-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">All Modules Desk</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Access Baroda Swim Front controls</p>
                </div>
                <button 
                  onClick={() => setMobileMenuDrawerOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs Grid */}
              <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] py-2 px-1">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`drawer-tab-btn-${tab.id}`}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSelectedMember(null);
                        setMobileMenuDrawerOpen(false);
                      }}
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                        isActive 
                          ? "bg-sky-50 border-sky-200 text-sky-600 font-bold shadow-xs" 
                          : "border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100/55"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold tracking-tight truncate w-full">{tab.label.replace(" (Admin only)", "")}</span>
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

      {/* SYSTEM NOTIFICATIONS DRAWER */}
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

      {/* Global Command Palette */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSelectedMember(null);
        }}
        onTriggerQuickAction={handleQuickAction}
      />

      {/* Quick Actions Floating Action Button */}
      <QuickActionsFab
        onAction={handleQuickAction}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Daily Closing Report Modal */}
      <DailyClosingReportModal
        isOpen={isClosingReportModalOpen}
        onClose={() => setIsClosingReportModalOpen(false)}
        members={members}
      />

      </div>
    </div>
  );
}
