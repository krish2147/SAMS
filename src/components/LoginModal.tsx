import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, ShieldAlert, Smartphone, Key, Lock, Mail, CheckCircle, 
  Sparkles, Eye, EyeOff, User, BellRing, ChevronRight, Clock 
} from "lucide-react";
import { AcademyId, UserRole, UserSession } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  academyId: AcademyId;
  onLoginSuccess: (session: UserSession) => void;
  onOpenRegister?: () => void;
}

export function LoginModal({ isOpen, onClose, academyId, onLoginSuccess, onOpenRegister }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("member");
  const [step, setStep] = useState<"role" | "auth" | "otp">("role");
  
  // Auth Fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isRegistering, setIsRegistering] = useState(true);
  const [isStaffRegistering, setIsStaffRegistering] = useState(false);
  const [staffRegisterRole, setStaffRegisterRole] = useState<"admin" | "coach" | "receptionist" | "super_admin" | "staff">("admin");

  // New Single-Scroll Registration Form Fields
  const [registerAge, setRegisterAge] = useState("");
  const [registerGender, setRegisterGender] = useState("male");
  const [registerMembership, setRegisterMembership] = useState("Monthly Elite");
  const [preferredSlot, setPreferredSlot] = useState("07:00 AM - 08:00 AM");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  
  // Secure SMS Dispatcher State
  const [smsNotification, setSmsNotification] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("role");
      setPhoneNumber("");
      setOtpCode("");
      setEmail("");
      setPassword("");
      setFullName("");
      setIsRegistering(true);
      setIsStaffRegistering(false);
      setStaffRegisterRole("admin");
      setSmsNotification(null);
      setAuthError(null);
      setCountdown(30);
      setCanResend(false);
      setRegisterAge("");
      setRegisterGender("male");
      setRegisterMembership("Monthly Elite");
      setPreferredSlot("07:00 AM - 08:00 AM");
      setEmergencyName("");
      setEmergencyPhone("");
      setDeclarationAccepted(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isOpen || step !== "otp") {
      setCountdown(30);
      setCanResend(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, step, countdown]);

  if (!isOpen) return null;

  const isSwim = academyId === "swim";
  const accentColor = isSwim ? "sky" : "emerald";

  // Step 1: Select Role
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === "member") {
      setIsRegistering(false);
    } else {
      setIsRegistering(true);
    }
    setStep("auth");
    setAuthError(null);
  };

  // Step 2: Trigger Auth
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (selectedRole === "member" && isRegistering) {
      // Validate full single-scroll registration details
      if (!fullName.trim()) {
        setAuthError("Please specify your full name.");
        return;
      }
      if (!phoneNumber || phoneNumber.replace(/\D/g, "").length !== 10) {
        setAuthError("Please specify a valid 10-digit mobile number.");
        return;
      }
      if (!registerAge || parseInt(registerAge) <= 0) {
        setAuthError("Please specify a valid age.");
        return;
      }
      if (!emergencyName.trim() || !emergencyPhone.trim()) {
        setAuthError("Please provide an emergency contact name and phone number.");
        return;
      }
      if (!declarationAccepted) {
        setAuthError("Please declare that you are physically fit and accept safety terms.");
        return;
      }

      setIsVerifying(true);
      const code = isSwim ? "BSF" : "TCA";
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const membershipNo = `${code}-2026-${randomId}`;

      // Create the registration profile matching RegisterPage.tsx
      const regProfile = {
        membershipNo,
        typeOfMembership: registerMembership === "Monthly Elite" ? "Monthly" : registerMembership === "Quarterly Pro" ? "Quarterly" : "Yearly",
        batchSchedule: "MWF",
        batchTiming: preferredSlot,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        coachRequired: "No",
        fullName: fullName.trim(),
        gender: registerGender,
        dateOfBirth: new Date(Date.now() - parseInt(registerAge) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        age: registerAge,
        addressLine1: "Lobby Self-Onboarding Portal",
        addressLine2: "Vadodara, Gujarat",
        mobileNo: "+91 " + phoneNumber.replace(/\D/g, ""),
        email: `${fullName.trim().toLowerCase().replace(/\s+/g, ".")}@sams.com`,
        emergencyName: emergencyName.trim(),
        emergencyMobile: emergencyPhone.trim(),
        emergencyRelation: "Relative",
        hasMedicalCondition: "No",
        medicalDetails: "",
        disability: "N/A",
        bloodGroup: "O+",
        height: "175",
        weight: "68",
        relationToUndertaker: "self",
        undertakerParentName: "Parent",
        typedSignature: fullName.trim(),
        signatureDataUrl: null,
        academyId,
        status: "Pending",
        paymentStatus: "Pending",
        registrationDate: new Date().toLocaleDateString()
      };

      fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regProfile)
      })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Registration could not be submitted.");
        return data;
      })
      .then(data => {
        setIsVerifying(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sams_member_registered", { detail: data }));
        }
        setSmsNotification("Registration submitted. Admin approval is pending; your payment link will arrive on WhatsApp after approval.");
        setTimeout(onClose, 1800);
      })
      .catch(err => {
        setIsVerifying(false);
        setAuthError(err.message || "Registration could not be submitted. Please try again.");
      });
      return;
    }

    if (selectedRole === "parent" || selectedRole === "member") {
      // Secure backend-driven OTP Dispatcher
      if (!phoneNumber || phoneNumber.replace(/\D/g, "").length !== 10) {
        setAuthError("Please specify a valid 10-digit mobile number.");
        return;
      }
      setIsVerifying(true);
      const finalMobile = "+91 " + phoneNumber.replace(/\D/g, "");

      fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: finalMobile, role: selectedRole })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "A network error occurred. Please try again.");
        }
        return res.json();
      })
      .then((data) => {
        setIsVerifying(false);
        setStep("otp");
        setCountdown(30);
        setCanResend(false);
        setSmsNotification("[SAMS SECURE SMS] Verification code sent successfully. Check your server terminal/console logs.");
      })
      .catch((err) => {
        setIsVerifying(false);
        setAuthError(err.message || "Failed to send verification code. Please check your network connection.");
      });
    } else {
      // Validate staff credentials or register
      if (isStaffRegistering) {
        if (!fullName.trim()) {
          setAuthError("Please provide your full name.");
          return;
        }
        if (!email.includes("@")) {
          setAuthError("Please specify a valid corporate email.");
          return;
        }
        if (password.length < 4) {
          setAuthError("Secure password must be at least 4 characters.");
          return;
        }

        setIsVerifying(true);
        fetch("/api/staff/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            password,
            role: staffRegisterRole,
            academyId
          })
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Registration failed.");
            }
            return res.json().catch(() => ({}));
          })
          .then((data) => {
            setIsVerifying(false);
            const avatarMap: { [key: string]: string } = {
              coach: isSwim 
                ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150" 
                : "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150",
              receptionist: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150",
              staff: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150",
              admin: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
              super_admin: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150"
            };
            onLoginSuccess({
              id: data.staff.id,
              name: data.staff.name,
              role: data.staff.role,
              academyId: data.staff.academyId,
              email: data.staff.email,
              avatar: avatarMap[data.staff.role] || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
              phoneNumber: data.staff.phoneNumber || "",
              token: data.staff.token || ""
            });
            onClose();
          })
          .catch((err) => {
            setIsVerifying(false);
            setAuthError(err.message || "Could not register corporate account.");
          });
      } else {
        if (!email.includes("@")) {
          setAuthError("Please specify a valid institutional email.");
          return;
        }
        if (password.length < 4) {
          setAuthError("Secure password must be at least 4 characters.");
          return;
        }

        setIsVerifying(true);
        fetch("/api/members/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role: "admin" // triggers staff path
          })
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Login failed.");
            }
            return res.json().catch(() => ({}));
          })
          .then((data) => {
            setIsVerifying(false);
            const avatarMap: { [key: string]: string } = {
              coach: isSwim 
                ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150" 
                : "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150",
              receptionist: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150",
              staff: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150",
              admin: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
              super_admin: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150"
            };
            onLoginSuccess({
              id: data.staff.id,
              name: data.staff.name,
              role: data.staff.role,
              academyId: data.staff.academyId,
              email: data.staff.email,
              avatar: data.staff.photoUrl || avatarMap[data.staff.role] || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
              phoneNumber: data.staff.phoneNumber || "",
              token: data.token || ""
            });
            onClose();
          })
          .catch((err) => {
            setIsVerifying(false);
            setAuthError(err.message || "Access Denied: Invalid credentials.");
          });
      }
    }
  };

  const handleResendOTP = () => {
    if (!canResend) return;
    setAuthError(null);
    setIsVerifying(true);
    const finalMobile = "+91 " + phoneNumber.replace(/\D/g, "");

    fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: finalMobile, role: selectedRole })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "A network error occurred. Please try again.");
      }
      return res.json();
    })
    .then((data) => {
      setIsVerifying(false);
      setCountdown(30);
      setCanResend(false);
      setSmsNotification("[SAMS SECURE SMS] Verification code re-sent. Check your server terminal/console logs.");
    })
    .catch((err) => {
      setIsVerifying(false);
      setAuthError(err.message || "Failed to re-send verification code. Please check your network connection.");
    });
  };

  // Step 3: Verify OTP Code
  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!otpCode || otpCode.length !== 6) {
      setAuthError("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    const displayRoleName = selectedRole === "parent" ? "Parent" : "Member";
    const defaultName = selectedRole === "parent" ? "Parent User" : "Member";
    let finalName = isRegistering && fullName.trim() ? fullName.trim() : defaultName;

    const finalMobile = "+91 " + phoneNumber.replace(/\D/g, "");
    
    fetch("/api/members/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: finalMobile, role: selectedRole, otpCode })
    })
    .then(async (res) => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Verification failed. Please check the code and try again.");
      }
      return res.json();
    })
    .then(data => {
      setIsVerifying(false);
      if (data.success && data.member) {
        finalName = data.member.fullName;
        localStorage.setItem("sams_current_member_profile", JSON.stringify(data.member));
      } else {
        // Create a basic member profile on the server if none found
        const code = isSwim ? "BSF" : "TCA";
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const tempProfile = {
          membershipNo: `${code}-2026-${randomId}`,
          typeOfMembership: "Monthly",
          batchSchedule: "MWF",
          batchTiming: "07:00 AM - 08:00 AM",
          startDate: new Date().toISOString().split("T")[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          coachRequired: "No",
          fullName: finalName,
          gender: "male",
          age: "24",
          addressLine1: "Lobby Self-Onboarding Portal",
          addressLine2: "Vadodara, Gujarat",
          mobileNo: finalMobile,
          email: `${finalName.toLowerCase().replace(/\s+/g, ".")}@sams.com`,
          emergencyName: "Emergency Contact",
          emergencyPhone: finalMobile,
          hasMedicalCondition: "No",
          bloodGroup: "O+",
          height: "175",
          weight: "68",
          relationToUndertaker: "self",
          academyId,
          status: "Pending",
          paymentStatus: "Pending",
          registrationDate: new Date().toLocaleDateString()
        };
        localStorage.setItem("sams_current_member_profile", JSON.stringify(tempProfile));
        fetch("/api/members/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tempProfile)
        }).catch(err => console.error("Auto register temp profile failed", err));
      }

      onLoginSuccess({
        id: `usr_client_${Math.random().toString(36).substr(2, 4)}`,
        name: `${finalName} (${displayRoleName})`,
        role: selectedRole,
        academyId,
        phoneNumber,
        avatar: selectedRole === "parent" 
          ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150" 
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150",
        token: data.token || ""
      });
      onClose();
    })
    .catch(err => {
      setIsVerifying(false);
      setAuthError(err.message || "Failed to verify verification code. Please check your network connection.");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic iOS Notification Popup Overlay inside client */}
      <AnimatePresence>
        {smsNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className="fixed top-6 z-[60] max-w-sm w-full bg-slate-900/95 border border-slate-800 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 backdrop-blur-xl"
          >
            <div className="h-10 w-10 shrink-0 bg-amber-400 text-slate-950 rounded-xl flex items-center justify-center font-bold text-lg animate-bounce">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="flex-grow text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono tracking-wider text-amber-300">TELEPHONY NETWORKS</span>
                <span className="text-[9px] opacity-40">just now</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed mt-1 text-slate-100">{smsNotification}</p>
              <button
                id="btn-login-close-sms-ok"
                onClick={() => setSmsNotification(null)}
                className="mt-2 text-[10px] font-bold text-amber-400 hover:underline uppercase tracking-wide cursor-pointer block"
              >
                Dismiss Notice
              </button>
            </div>
            <button
              id="btn-login-close-sms"
              onClick={() => setSmsNotification(null)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dimmed backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Login Card dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ cubicBezier: [0.16, 1, 0.3, 1], duration: 0.6 }}
        className={`relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl z-20 ${
          isSwim 
            ? "bg-white border-sky-100 text-slate-950" 
            : "bg-emerald-950 border-emerald-900/50 text-emerald-100"
        }`}
      >
        {/* Subtle accent border bottom */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${isSwim ? "from-sky-400 to-cyan-400" : "from-emerald-400 to-amber-400"}`} />

        {/* Modal Header */}
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-current/5">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-60">ACADEMY MEMBER PORTAL</span>
            <h2 className={`text-xl font-bold mt-1 ${isSwim ? "text-slate-900" : "text-white font-serif"}`}>
              {step === "role" && "Welcome to the Academy"}
              {step === "auth" && `Sign in as ${selectedRole.toUpperCase()}`}
              {step === "otp" && "Verification Code"}
            </h2>
          </div>
          <button
            id="btn-login-close"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-current/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Contents */}
        <div className="p-6 md:p-8">
          
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-semibold">{authError}</p>
            </div>
          )}

          {/* STEP 1: CHOOSE ROLE */}
          {step === "role" && (
            <div className="flex flex-col gap-4">
              <p className="text-xs opacity-70 leading-relaxed mb-2 font-light">
                Please choose your login portal below to proceed.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {/* Member Card */}
                <button
                  id="btn-role-member"
                  onClick={() => handleRoleSelect("member")}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer hover:border-current/30 hover:shadow-md ${
                    isSwim ? "bg-slate-50 hover:bg-slate-100/80 border-slate-200" : "bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm ${isSwim ? "bg-sky-50 text-sky-600 border border-sky-100" : "bg-emerald-900/40 text-amber-300 border border-emerald-800/40"}`}>
                      🏊
                    </div>
                    <span className="text-sm font-bold">Register or Sign In as a Member</span>
                  </div>
                  <p className="text-[11px] opacity-60 leading-normal font-light">Create a new account or sign in to reserve training slots, view timings, and manage your profile.</p>
                </button>

                {/* Admin Selector */}
                <button
                  id="btn-role-admin"
                  onClick={() => handleRoleSelect("admin")}
                  className={`p-5 rounded-2xl border text-left transition-all cursor-pointer hover:border-current/30 hover:shadow-md ${
                    isSwim ? "bg-slate-50 hover:bg-slate-100/80 border-slate-200" : "bg-emerald-900/20 hover:bg-emerald-900/40 border-emerald-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm ${isSwim ? "bg-sky-50 text-sky-600 border border-sky-100" : "bg-emerald-900/40 text-amber-300 border border-emerald-800/40"}`}>
                      💼
                    </div>
                    <span className="text-sm font-bold">Academy Staff & Admins</span>
                  </div>
                  <p className="text-[11px] opacity-60 leading-normal font-light">Access internal scheduling, member registrations, and check-in logs.</p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2A: SINGLE-SCROLL FULL MEMBER REGISTRATION FORM */}
          {step === "auth" && selectedRole === "member" && isRegistering && (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-left">
              {/* Registration vs Login toggle tab */}
              <div className="flex gap-2 p-1 bg-black/5 rounded-2xl border border-current/10 mb-2">
                <button
                  type="button"
                  id="btn-login-toggle-register"
                  onClick={() => {
                    setIsRegistering(true);
                    setAuthError(null);
                  }}
                  className={`flex-grow py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold cursor-pointer transition-all ${
                    isSwim ? "bg-slate-900 text-white" : "bg-amber-400 text-slate-950"
                  }`}
                >
                  Register New Member
                </button>
                <button
                  type="button"
                  id="btn-login-toggle-login"
                  onClick={() => {
                    setIsRegistering(false);
                    setAuthError(null);
                  }}
                  className="flex-grow py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold opacity-60 hover:opacity-100 text-current cursor-pointer transition-all"
                >
                  Existing Login
                </button>
              </div>

              {/* SECTION 1: Personal Identification */}
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-600 font-bold block mb-2">1. Personal Information</span>
                
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider opacity-60">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Mithil"
                        className={`w-full py-3.5 pl-12 pr-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider opacity-60">Mobile Number *</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 flex items-center gap-1.5 pointer-events-none">
                        <Smartphone className="h-5 w-5 opacity-40" />
                        <span className={`text-sm font-semibold ${isSwim ? "text-slate-500" : "text-emerald-300"}`}>
                          +91
                        </span>
                      </div>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setPhoneNumber(clean);
                        }}
                        placeholder="98765 43210"
                        className={`w-full py-3.5 pl-20 pr-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider opacity-60">Age *</label>
                      <input
                        type="number"
                        value={registerAge}
                        onChange={(e) => setRegisterAge(e.target.value)}
                        placeholder="24"
                        min="5"
                        max="100"
                        className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider opacity-60">Gender</label>
                      <select
                        value={registerGender}
                        onChange={(e) => setRegisterGender(e.target.value)}
                        className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Membership & Scheduling */}
              <div className="border-b border-slate-100 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-600 font-bold block mb-2">2. Membership & Slot Selection</span>
                
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider opacity-60">Select Membership Term</label>
                    <select
                      value={registerMembership}
                      onChange={(e) => setRegisterMembership(e.target.value)}
                      className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                        isSwim 
                          ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                          : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                      }`}
                    >
                      <option value="Monthly Elite">Monthly Elite Plan (1 Month Access)</option>
                      <option value="Quarterly Pro">Quarterly Pro Plan (3 Months Access)</option>
                      <option value="Annual Prestige">Annual Prestige Plan (1 Year Access)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider opacity-60">Preferred Daily 1-Hour Slot</label>
                    <select
                      value={preferredSlot}
                      onChange={(e) => setPreferredSlot(e.target.value)}
                      className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                        isSwim 
                          ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                          : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                      }`}
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
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      * Weekly schedule: Monday to Saturday. Sunday is Closed.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Emergency & Safety */}
              <div className="pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-600 font-bold block mb-2">3. Emergency & Safety Policy</span>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider opacity-60">Contact Name *</label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="Emergency Contact Name"
                        className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider opacity-60">Contact Phone *</label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="Contact Phone Number"
                        className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                          isSwim 
                            ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                            : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Safety Declaration checkbox */}
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100/50 hover:border-sky-200 transition-colors cursor-pointer text-left">
                    <input
                      type="checkbox"
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4 shrink-0 cursor-pointer"
                      required
                    />
                    <span className="text-[11px] opacity-70 leading-relaxed font-light">
                      I declare that I am physically fit for swimming and have no pre-existing respiratory or cardiac conditions. I agree to comply with Baroda Swim Front's 25-meter outdoor pool safety guidelines.
                    </span>
                  </label>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                    isSwim ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-emerald-800 text-emerald-100"
                  }`}
                >
                  Identity Menu
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    isSwim ? "bg-sky-500 text-white hover:opacity-95" : "bg-amber-400 text-slate-950 hover:bg-amber-500"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register & Start Swimming</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2B: SIMPLE MOBILE PHONE LOGIN */}
          {step === "auth" && (selectedRole === "parent" || (selectedRole === "member" && !isRegistering)) && (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5 text-left">
              
              {/* Registration vs Login toggle tab */}
              {selectedRole === "member" && (
                <div className="flex gap-2 p-1 bg-black/5 rounded-2xl border border-current/10 mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRegister) {
                        onOpenRegister();
                      } else {
                        setIsRegistering(true);
                      }
                      setAuthError(null);
                    }}
                    className="flex-grow py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold opacity-60 hover:opacity-100 text-current cursor-pointer transition-all"
                  >
                    Register New Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setAuthError(null);
                    }}
                    className={`flex-grow py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-extrabold cursor-pointer transition-all ${
                      isSwim ? "bg-slate-900 text-white" : "bg-amber-400 text-slate-950"
                    }`}
                  >
                    Existing Login
                  </button>
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider opacity-60">Mobile Telephone Number</label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 flex items-center gap-1.5 pointer-events-none">
                    <Smartphone className="h-5 w-5 opacity-40" />
                    <span className={`text-sm font-semibold ${isSwim ? "text-slate-500" : "text-emerald-300"}`}>
                      +91
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneNumber(clean);
                    }}
                    placeholder="98765 43210"
                    className={`w-full py-4 pl-20 pr-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                      isSwim 
                        ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                        : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                    }`}
                    required
                  />
                </div>
                <span className="text-[10px] opacity-50 leading-relaxed font-light mt-1 block">
                  A secure 4-digit verification code will be sent to your phone.
                </span>
              </div>
 
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  id="btn-login-back-to-roles"
                  onClick={() => setStep("role")}
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                    isSwim ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-emerald-800 text-emerald-100 hover:bg-emerald-900/30"
                  }`}
                >
                  Identity Menu
                </button>
                <button
                  type="submit"
                  id="btn-login-submit-client"
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all shadow-md cursor-pointer ${
                    isSwim ? "bg-sky-500 text-white hover:opacity-95" : "bg-amber-400 text-slate-950 hover:bg-amber-500"
                  }`}
                >
                  Dispatch OTP
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: STAFF SECURE CREDENTIALS AUTH */}
          {step === "auth" && selectedRole !== "parent" && selectedRole !== "member" && (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4 text-left animate-in fade-in duration-300">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider opacity-60">Corporate/Staff Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@academy.sams"
                    className={`w-full py-3.5 pl-12 pr-4 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                      isSwim 
                        ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                        : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider opacity-60">Security Passcode</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-3.5 pl-12 pr-12 rounded-2xl border text-sm font-medium focus:outline-none transition-all ${
                      isSwim 
                        ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                        : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    id="btn-login-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  id="btn-login-back-to-roles-staff"
                  onClick={() => setStep("role")}
                  className={`flex-grow py-3 rounded-2xl text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                    isSwim ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-emerald-800 text-emerald-100 hover:bg-emerald-900/30"
                  }`}
                >
                  Identity Menu
                </button>
                <button
                  type="submit"
                  id="btn-login-submit-staff"
                  disabled={isVerifying}
                  className={`flex-grow py-3 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    isSwim ? "bg-sky-500 text-white hover:opacity-95" : "bg-amber-400 text-slate-950 hover:bg-amber-500"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Access Portal</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION FORM */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-wider opacity-60">Enter the 6-digit verification code</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className={`w-full py-4 pl-12 pr-4 rounded-2xl border text-center text-lg font-black tracking-[0.4em] focus:outline-none transition-all ${
                      isSwim 
                        ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                        : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
                    }`}
                    required
                    disabled={isVerifying}
                  />
                </div>
                <span className="text-[10px] opacity-60 leading-relaxed font-light mt-1 block">
                  We've sent a verification code to your registered mobile number.
                </span>
              </div>

              {/* Timer and Resend Row */}
              <div className="flex items-center justify-between text-xs font-medium px-1">
                <div className="flex items-center gap-1.5 opacity-70">
                  <Clock className="h-4 w-4 animate-pulse" />
                  {countdown > 0 ? (
                    <span>Resend code in <strong className="font-mono">{countdown}s</strong></span>
                  ) : (
                    <span>Didn't receive code?</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResend || isVerifying}
                  className={`text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                    canResend && !isVerifying
                      ? isSwim 
                        ? "text-sky-500 hover:text-sky-600 hover:underline" 
                        : "text-amber-400 hover:text-amber-300 hover:underline"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  Resend Code
                </button>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  id="btn-login-back-to-phone"
                  onClick={() => setStep("auth")}
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-semibold border transition-all ${
                    isSwim ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-emerald-800 text-emerald-100"
                  }`}
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  id="btn-login-submit-otp"
                  disabled={isVerifying}
                  className={`flex-grow py-3.5 rounded-2xl text-xs uppercase tracking-wider font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    isSwim ? "bg-sky-500 text-white hover:opacity-95" : "bg-amber-400 text-slate-950 hover:bg-amber-500"
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm & Enter</span>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
