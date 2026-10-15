import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ShieldAlert, Smartphone, Lock, Eye, EyeOff, BellRing, ChevronRight,
  ArrowLeft, LogIn, BriefcaseBusiness, ShieldCheck, Waves, UserRound, User
} from "lucide-react";
import { AcademyId, UserRole, UserSession } from "../types";
import { MIN_PASSWORD_LENGTH } from "../utils/password";
import { CHARACTER_AVATARS } from "../utils/avatars";

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
  const [rememberMe, setRememberMe] = useState(false);
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
  const otpBoxRefs = useRef<Array<HTMLInputElement | null>>([]);

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
  const isStaffLogin = selectedRole !== "parent" && selectedRole !== "member";

  // Colours for the two academy themes (light swim / dark green).
  const ui = isSwim
    ? {
        card: "bg-white text-slate-900",
        title: "text-slate-900",
        muted: "text-slate-500",
        label: "text-sm font-semibold text-slate-700",
        divider: "bg-slate-100",
        badge: "bg-sky-50 text-sky-600",
        iconBtn: "bg-slate-100 text-slate-600 hover:bg-slate-200",
        ghost: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
        option: "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-sm",
        field: "bg-white border-slate-300 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/15 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15",
        input: "text-slate-900 placeholder:text-slate-400",
        icon: "text-slate-400",
        prefix: "text-slate-700 border-slate-200",
        primary: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800",
        link: "text-sky-600",
        check: "accent-sky-600",
      }
    : {
        card: "bg-[#06261a] text-emerald-50 border border-emerald-400/15",
        title: "text-white",
        muted: "text-emerald-100/60",
        label: "text-sm font-semibold text-emerald-50/90",
        divider: "bg-emerald-400/10",
        badge: "bg-amber-400/15 text-amber-300",
        iconBtn: "bg-white/5 text-emerald-100 hover:bg-white/10",
        ghost: "text-emerald-100/70 hover:text-white hover:bg-white/5",
        option: "bg-white/[0.03] border-emerald-400/15 hover:border-amber-300/50 hover:bg-white/[0.06]",
        field: "bg-emerald-950/60 border-emerald-400/20 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/15 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15",
        input: "text-emerald-50 placeholder:text-emerald-200/35",
        icon: "text-emerald-200/50",
        prefix: "text-emerald-50 border-emerald-400/20",
        primary: "bg-amber-400 text-slate-950 hover:bg-amber-300",
        link: "text-amber-300",
        check: "accent-amber-400",
      };

  const rememberBox = (suffix: string) => (
    <label htmlFor={`login-remember-${suffix}`} className="flex items-start gap-3 cursor-pointer select-none">
      <input
        id={`login-remember-${suffix}`}
        type="checkbox"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        className={`mt-0.5 h-[18px] w-[18px] shrink-0 rounded cursor-pointer ${ui.check}`}
      />
      <span className="text-sm leading-snug">
        <span className={`font-medium ${ui.title}`}>Keep me logged in</span>
        <span className={`block text-xs mt-0.5 ${ui.muted}`}>Don't tick this on a shared computer.</span>
      </span>
    </label>
  );
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
        setAuthError("Enter your 10-digit mobile number.");
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
        batchTiming: preferredSlot,
        startDate: new Date().toISOString().split("T")[0],
        coachRequired: "No",
        fullName: fullName.trim(),
        gender: registerGender,
        dateOfBirth: new Date(Date.now() - parseInt(registerAge) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        age: registerAge,
        mobileNo: "+91 " + phoneNumber.replace(/\D/g, ""),
        emergencyName: emergencyName.trim(),
        emergencyMobile: emergencyPhone.trim(),
        // Address, email, blood group, height, weight and the medical declaration are left
        // blank rather than guessed. This form does not ask for them, and the previous
        // defaults asserted things on the member's behalf - including "no medical condition"
        // and a blood group - which staff could later read as though the member had stated them.
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
        setSmsNotification(`We sent a ${OTP_LENGTH}-digit code to +91 ${phoneNumber}.`);
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
          setAuthError("Please enter a valid email address.");
          return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          setAuthError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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
                ? CHARACTER_AVATARS[5] 
                : CHARACTER_AVATARS[8],
              receptionist: CHARACTER_AVATARS[6],
              staff: CHARACTER_AVATARS[6],
              admin: CHARACTER_AVATARS[4],
              super_admin: CHARACTER_AVATARS[7]
            };
            onLoginSuccess({
              id: data.staff.id,
              name: data.staff.name,
              role: data.staff.role,
              academyId: data.staff.academyId,
              email: data.staff.email,
              avatar: avatarMap[data.staff.role] || CHARACTER_AVATARS[4],
              phoneNumber: data.staff.phoneNumber || "",
              token: data.staff.token || ""
            });
            onClose();
          })
          .catch((err) => {
            setIsVerifying(false);
            setAuthError(err.message || "Couldn't create the account. Please try again.");
          });
      } else {
        const identifier = email.trim();
        const isEmail = identifier.includes("@");
        if (!isEmail && identifier.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").length !== 10) {
          setAuthError("Enter your email, or your 10-digit mobile number.");
          return;
        }
        if (!password) {
          setAuthError("Enter your password.");
          return;
        }

        setIsVerifying(true);
        fetch("/api/members/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            rememberMe,
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
                ? CHARACTER_AVATARS[5] 
                : CHARACTER_AVATARS[8],
              receptionist: CHARACTER_AVATARS[6],
              staff: CHARACTER_AVATARS[6],
              admin: CHARACTER_AVATARS[4],
              super_admin: CHARACTER_AVATARS[7]
            };
            onLoginSuccess({
              id: data.staff.id,
              name: data.staff.name,
              role: data.staff.role,
              academyId: data.staff.academyId,
              email: data.staff.email,
              avatar: data.staff.photoUrl || avatarMap[data.staff.role] || CHARACTER_AVATARS[4],
              phoneNumber: data.staff.phoneNumber || "",
              token: data.token || "",
              rememberMe
            });
            onClose();
          })
          .catch((err) => {
            setIsVerifying(false);
            setAuthError(err.message || "Wrong email or password. Please try again.");
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
      setSmsNotification(`We sent a new code to +91 ${phoneNumber}.`);
    })
    .catch((err) => {
      setIsVerifying(false);
      setAuthError(err.message || "Failed to re-send verification code. Please check your network connection.");
    });
  };

  const OTP_LENGTH = 6;

  // Individual OTP box handlers: typing a digit advances focus, backspace on an
  // empty box moves back, and pasting a full code fills every box at once.
  const handleOtpBoxChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const next = otpCode.split("");
    while (next.length < OTP_LENGTH) next.push("");
    next[index] = digit;
    setOtpCode(next.join("").slice(0, OTP_LENGTH));
    if (digit && index < OTP_LENGTH - 1) {
      otpBoxRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpBoxKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // On an empty box, backspace clears the previous box and moves focus there in one
    // deterministic step (preventDefault avoids the browser also applying its own default
    // backspace action to whichever box ends up focused after the .focus() call).
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      e.preventDefault();
      const next = otpCode.split("");
      next[index - 1] = "";
      setOtpCode(next.join(""));
      otpBoxRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setOtpCode(pasted);
    otpBoxRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
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
      body: JSON.stringify({ phoneNumber: finalMobile, role: selectedRole, otpCode, rememberMe })
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
        // The server only signs in an existing, active member. Anything else is an error, never a
        // reason to create a record (this used to register one with an invented address,
        // emergency contact, blood group, height and weight).
        throw new Error("No active membership was found for this number. Please contact the academy.");
      }

      onLoginSuccess({
        id: `usr_client_${Math.random().toString(36).substr(2, 4)}`,
        name: `${finalName} (${displayRoleName})`,
        role: selectedRole,
        academyId,
        phoneNumber,
        avatar: selectedRole === "parent" 
          ? CHARACTER_AVATARS[0] 
          : CHARACTER_AVATARS[0],
        token: data.token || "",
        rememberMe
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
                <span className="text-xs font-semibold text-sky-300">Messages</span>
                <span className="text-[9px] opacity-40">just now</span>
              </div>
              <p className="text-xs font-semibold leading-relaxed mt-1 text-slate-100">{smsNotification}</p>
              <button
                id="btn-login-close-sms-ok"
                onClick={() => setSmsNotification(null)}
                className="mt-2 text-[10px] font-bold text-amber-400 hover:underline uppercase tracking-wide cursor-pointer block"
              >
                OK
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

      {/* Atmospheric backdrop photo, dimmed, with a warm spotlight glow behind the card */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${isSwim
            ? "https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1600"
            : "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1600"})`
        }}
      />
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />
      <div className={`absolute top-[-15%] left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full blur-[130px] pointer-events-none ${
        isSwim ? "bg-sky-300/25" : "bg-amber-300/20"
      }`} />

      {/* Login card */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
        className={`relative w-full max-w-[420px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[28px] shadow-2xl z-20 ${ui.card}`}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3 mb-5">
            {step === "role" ? (
              <span className={`text-xs font-semibold ${ui.muted}`}>{isSwim ? "Baroda Swim Front" : "Academy portal"}</span>
            ) : (
              <button
                type="button"
                id="btn-login-header-back"
                onClick={() => { setAuthError(null); setStep(step === "otp" ? "auth" : "role"); }}
                className={`-ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${ui.ghost}`}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              id="btn-login-close"
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer ${ui.iconBtn}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${ui.badge}`}>
              {step === "role" && <LogIn className="h-5 w-5" />}
              {step === "auth" && (isStaffLogin ? <BriefcaseBusiness className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />)}
              {step === "otp" && <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="login-title" className={`text-[22px] leading-tight font-bold tracking-tight ${ui.title}`}>
                {step === "role" && "Welcome back"}
                {step === "auth" && (isStaffLogin ? "Staff login" : "Member login")}
                {step === "otp" && "Enter your code"}
              </h2>
              <p className={`text-sm mt-0.5 ${ui.muted}`}>
                {step === "role" && "Choose how you want to sign in."}
                {step === "auth" && (isStaffLogin ? "For admins, reception staff and coaches." : "We'll text a code to your mobile.")}
                {step === "otp" && <>Sent to <span className={`font-semibold ${ui.title}`}>+91 {phoneNumber}</span></>}
              </p>
            </div>
          </div>
        </div>

        <div className={`h-px mx-6 sm:mx-8 ${ui.divider}`} />

        {/* Body */}
        <div className="px-6 py-6 sm:px-8 sm:pb-8">

          {authError && (
            <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-medium leading-snug">{authError}</p>
            </div>
          )}

          {/* STEP 1: CHOOSE ROLE */}
          {step === "role" && (
            <div className="flex flex-col gap-3">
              {[
                { id: "btn-role-member", role: "member" as UserRole, icon: <Waves className="h-5 w-5" />, title: "Member", text: "Sign in with your mobile number and a one-time code." },
                { id: "btn-role-admin", role: "admin" as UserRole, icon: <BriefcaseBusiness className="h-5 w-5" />, title: "Staff, coach or admin", text: "Sign in with your email or mobile and password." },
              ].map((opt) => (
                <button
                  key={opt.id}
                  id={opt.id}
                  type="button"
                  onClick={() => handleRoleSelect(opt.role)}
                  className={`group w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${ui.option}`}
                >
                  <span className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${ui.badge}`}>{opt.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-semibold ${ui.title}`}>{opt.title}</span>
                    <span className={`block text-xs mt-0.5 leading-snug ${ui.muted}`}>{opt.text}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${ui.muted}`} />
                </button>
              ))}
              {onOpenRegister && (
                <p className={`text-sm text-center mt-3 ${ui.muted}`}>
                  New here?{" "}
                  <button type="button" onClick={onOpenRegister} className={`font-semibold cursor-pointer hover:underline ${ui.link}`}>
                    Register as a member
                  </button>
                </p>
              )}
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
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-90" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className={`w-full py-3.5 pl-12 pr-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                          isSwim
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400"
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider opacity-60">Mobile Number *</label>
                    <div className={`flex items-center rounded-full border overflow-hidden transition-all ${
                      isSwim
                        ? "bg-white/90 border-white/80 focus-within:border-sky-400"
                        : "bg-emerald-950/50 border-emerald-400/20 focus-within:border-amber-400"
                    }`}>
                      <span className={`shrink-0 text-sm font-bold pl-4 pr-3 py-3.5 ${
                        isSwim ? "text-slate-900" : "text-emerald-100"
                      }`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setPhoneNumber(clean);
                        }}
                        placeholder="XXXXX XXXXX"
                        className={`flex-1 min-w-0 py-3.5 pr-4 bg-transparent border-0 text-sm font-medium focus:outline-none ${
                          isSwim
                          ? "text-slate-900 placeholder-slate-600"
                          : "text-emerald-50 placeholder-emerald-300/50"
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
                        className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                          isSwim
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400"
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
                        }`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider opacity-60">Gender</label>
                      <select
                        value={registerGender}
                        onChange={(e) => setRegisterGender(e.target.value)}
                        className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                          isSwim
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400"
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
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
                      className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                        isSwim 
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400" 
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
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
                      className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                        isSwim 
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400" 
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
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
                        className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                          isSwim
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400"
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
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
                        className={`w-full py-3.5 px-4 rounded-full border text-sm font-medium focus:outline-none transition-all ${
                          isSwim
                          ? "bg-white/75 backdrop-blur-md border-white/80 text-slate-900 placeholder-slate-600 focus:bg-white/90 focus:border-sky-400"
                          : "bg-emerald-950/30 backdrop-blur-md border-emerald-400/20 text-emerald-50 placeholder-emerald-300/50 focus:bg-emerald-950/40 focus:border-amber-400"
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
                  className={`flex-grow py-3.5 rounded-full text-xs uppercase tracking-wider font-semibold border transition-all cursor-pointer ${
                    isSwim ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-emerald-800 text-emerald-100"
                  }`}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className={`flex-grow py-3.5 rounded-full text-xs uppercase tracking-wider font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
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

          {/* STEP 2B: MEMBER MOBILE LOGIN */}
          {step === "auth" && (selectedRole === "parent" || (selectedRole === "member" && !isRegistering)) && (
            <form onSubmit={handleAuthSubmit} noValidate className="flex flex-col gap-5 text-left">
              <div className="flex flex-col gap-2">
                <label htmlFor="member-login-phone" className={ui.label}>
                  Mobile number <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className={`flex items-center rounded-2xl border overflow-hidden transition-colors ${ui.field}`}>
                  <span className={`shrink-0 pl-4 pr-3 text-[15px] font-semibold border-r ${ui.prefix}`}>+91</span>
                  <input
                    id="member-login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    className={`flex-1 min-w-0 h-12 px-3 bg-transparent border-0 text-[15px] font-medium focus:outline-none ${ui.input}`}
                    required
                  />
                </div>
                <p className={`text-xs ${ui.muted}`}>Use the number you registered with.</p>
              </div>

              <button
                type="submit"
                id="btn-login-submit-client"
                className={`w-full h-12 rounded-2xl text-[15px] font-semibold transition-all shadow-sm cursor-pointer ${ui.primary}`}
              >
                Send code
              </button>

              {onOpenRegister && (
                <p className={`text-sm text-center ${ui.muted}`}>
                  Not a member yet?{" "}
                  <button type="button" onClick={() => { setAuthError(null); onOpenRegister(); }} className={`font-semibold cursor-pointer hover:underline ${ui.link}`}>
                    Register
                  </button>
                </p>
              )}
            </form>
          )}

          {/* STEP 2: STAFF LOGIN */}
          {step === "auth" && isStaffLogin && (
            <form onSubmit={handleAuthSubmit} noValidate className="flex flex-col gap-5 text-left">
              <div className="flex flex-col gap-2">
                <label htmlFor="staff-login-id" className={ui.label}>
                  Email or mobile number <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className={`relative rounded-2xl border transition-colors ${ui.field}`}>
                  <UserRound className={`absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] pointer-events-none ${ui.icon}`} />
                  <input
                    id="staff-login-id"
                    type="text"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or 10-digit mobile"
                    className={`w-full h-12 pl-11 pr-4 bg-transparent rounded-2xl text-[15px] font-medium focus:outline-none ${ui.input}`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="staff-login-password" className={ui.label}>
                  Password <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className={`relative rounded-2xl border transition-colors ${ui.field}`}>
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] pointer-events-none ${ui.icon}`} />
                  <input
                    id="staff-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={`w-full h-12 pl-11 pr-12 bg-transparent rounded-2xl text-[15px] font-medium focus:outline-none ${ui.input}`}
                    required
                  />
                  <button
                    type="button"
                    id="btn-login-toggle-pw"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer ${ui.ghost}`}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {rememberBox("staff")}

              <button
                type="submit"
                id="btn-login-submit-staff"
                disabled={isVerifying}
                className={`w-full h-12 rounded-2xl text-[15px] font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 ${ui.primary}`}
              >
                {isVerifying ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Log in"
                )}
              </button>

              <p className={`text-xs text-center ${ui.muted}`}>Forgot your password? Ask the academy admin to reset it.</p>
            </form>
          )}

          {/* STEP 3: OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5 items-stretch">
              <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpBoxRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    maxLength={1}
                    value={otpCode[i] || ""}
                    onChange={(e) => handleOtpBoxChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpBoxKeyDown(i, e)}
                    disabled={isVerifying}
                    className={`h-14 w-11 sm:w-12 rounded-2xl border text-center text-xl font-bold focus:outline-none transition-colors ${ui.field} ${ui.input}`}
                  />
                ))}
              </div>

              <div className="text-sm text-center">
                {countdown > 0 ? (
                  <span className={ui.muted}>
                    Didn't get it? Resend in <strong className={ui.title}>0:{String(countdown).padStart(2, "0")}</strong>
                  </span>
                ) : (
                  <button type="button" onClick={handleResendOTP} disabled={isVerifying} className={`font-semibold cursor-pointer hover:underline ${ui.link}`}>
                    Resend code
                  </button>
                )}
              </div>

              {rememberBox("otp")}

              <button
                type="submit"
                id="btn-login-submit-otp"
                disabled={isVerifying || otpCode.length !== OTP_LENGTH}
                className={`w-full h-12 rounded-2xl text-[15px] font-semibold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${ui.primary}`}
              >
                {isVerifying ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Verify and continue"
                )}
              </button>

              <button
                type="button"
                id="btn-login-back-to-phone"
                onClick={() => setStep("auth")}
                className={`text-sm font-semibold cursor-pointer hover:underline ${ui.link}`}
              >
                Use a different number
              </button>
            </form>
          )}

        </div>
      </motion.div>
    </div>
  );
}
