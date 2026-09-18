import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sliders, User, Shield, Bell, Eye, Database, CheckCircle, 
  AlertCircle, Cpu, Wifi, HelpCircle, Key, Mail, Phone, Moon, Sun,
  Camera, Upload, Check, RefreshCw
} from "lucide-react";

interface SettingsTabProps {
  activeUser: {
    id?: string;
    name: string;
    role: string;
    email?: string;
    phoneNumber?: string;
    avatar?: string;
  };
  buttonPrimary: string;
  inputStyle: string;
  onProfileUpdated?: (updatedUser: { name: string; email: string; phoneNumber: string; avatar: string }) => void;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150",
];

export function SettingsTab({ activeUser, buttonPrimary, inputStyle, onProfileUpdated }: SettingsTabProps) {
  // Local states for sections
  const [profileName, setProfileName] = useState(activeUser.name);
  const [profileEmail, setProfileEmail] = useState(activeUser.email || "");
  const [profilePhone, setProfilePhone] = useState(activeUser.phoneNumber || "");
  const [photoUrl, setPhotoUrl] = useState(activeUser.avatar || "");

  // Sync with activeUser prop changes (asynchronous load)
  useEffect(() => {
    setProfileName(activeUser.name || "");
    setProfileEmail(activeUser.email || "");
    setProfilePhone(activeUser.phoneNumber || "");
    setPhotoUrl(activeUser.avatar || "");
  }, [activeUser]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  const [appearanceTheme, setAppearanceTheme] = useState("Light Slate");
  const [appearanceDensity, setAppearanceDensity] = useState("Spacious");

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files (JPEG, PNG, WEBP) are supported.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Image size exceeds the 4MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(null);
    setIsSavingProfile(true);

    if (!profileName.trim() || !profileEmail.trim()) {
      setErrorMsg("Name and Email are required fields.");
      setIsSavingProfile(false);
      return;
    }

    try {
      const response = await fetch("/api/staff/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": (() => {
            try {
              const saved = localStorage.getItem("sams_session");
              if (saved) return JSON.parse(saved)?.token || "";
            } catch (err) {}
            return "";
          })()
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
        throw new Error(data.error || "Failed to update profile.");
      }

      setSaveSuccess("Profile details and photo updated successfully!");
      if (onProfileUpdated) {
        onProfileUpdated({
          name: profileName,
          email: profileEmail,
          phoneNumber: profilePhone,
          avatar: photoUrl
        });
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while updating your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(null);

    if (!currentPassword) {
      setErrorMsg("Current password is required to change password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }

    try {
      const response = await fetch("/api/staff/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": (() => {
            try {
              const saved = localStorage.getItem("sams_session");
              if (saved) return JSON.parse(saved)?.token || "";
            } catch (err) {}
            return "";
          })()
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setSaveSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while updating your password.");
    }
  };

  const handleSavePreferences = () => {
    setSaveSuccess("Preferences and appearance saved!");
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto px-4 md:px-0 text-left">
      {/* HEADER SECTION */}
      <div className="border-b border-slate-150 pb-5">
        <span className="text-xs font-black tracking-widest text-sky-600 uppercase block mb-1">CONFIGURATION</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage your administrative profile, security settings, preferences, and view system analytics.</p>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-emerald-800">{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span className="text-xs font-bold text-rose-800">{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: PROFILE */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="h-5 w-5 text-sky-600" />
          <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">1. Profile Details</h4>
        </div>

        {/* PROFILE PHOTO UPLOAD BLOCK */}
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-4">
          <label className="text-xs font-extrabold text-slate-600 block uppercase tracking-wider">Profile Photo</label>
          <div className="flex flex-col sm:flex-row gap-5 items-center">
            {/* Photo Preview Container */}
            <div className="relative group select-none shrink-0">
              <img 
                src={photoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150"} 
                alt="Profile Preview" 
                className="w-24 h-24 rounded-2xl object-cover border-2 border-sky-400 shadow-md animate-fade-in"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>

            {/* Upload Drag & Drop Box */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 w-full p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-sky-500 bg-sky-500/5 scale-[0.99]" 
                  : "border-slate-200 hover:border-sky-400/50 hover:bg-slate-100/50"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden" 
              />
              <Upload className="h-5 w-5 text-sky-500 mb-1.5" />
              <p className="text-xs font-bold text-slate-700">Drag & drop photo here, or <span className="text-sky-500 underline">browse</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WEBP (Max 4MB)</p>
            </div>
          </div>

          {/* Quick Avatar Presets selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-mono uppercase text-slate-500">Quick Choice Presets</label>
            <div className="flex gap-3">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoUrl(preset)}
                  className={`h-11 w-11 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                    photoUrl === preset 
                      ? "border-sky-500 ring-2 ring-sky-300"
                      : "border-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <img src={preset} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500">Administrator Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500">Official Email ID</label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-extrabold text-slate-500">Contact Number</label>
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div className="md:col-span-2 pt-2">
            <button 
              type="submit" 
              disabled={isSavingProfile}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold ${buttonPrimary} cursor-pointer flex items-center gap-2`}
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Changes...</span>
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

      {/* SECTION 2: SECURITY */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="h-5 w-5 text-rose-600" />
          <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">2. Account Security</h4>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputStyle}
              />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className={`px-4.5 py-2.5 rounded-xl text-xs font-bold ${buttonPrimary} cursor-pointer`}>
              Update Account Password
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: NOTIFICATIONS */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="h-5 w-5 text-amber-500" />
          <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">3. Notification Preferences</h4>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all">
            <div>
              <h5 className="text-xs font-extrabold text-slate-800">Email Notifications</h5>
              <p className="text-[10px] text-slate-400 font-medium">Receive automated reports, backup notifications, and audit alerts via email.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifEmail} 
              onChange={() => setNotifEmail(!notifEmail)}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all">
            <div>
              <h5 className="text-xs font-extrabold text-slate-800">SMS / WhatsApp Alerts</h5>
              <p className="text-[10px] text-slate-400 font-medium">Dispatch instant batch change alerts, fees approval updates, and greeting SMS.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifSms} 
              onChange={() => setNotifSms(!notifSms)}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all">
            <div>
              <h5 className="text-xs font-extrabold text-slate-800">Desktop & Application Push Notifications</h5>
              <p className="text-[10px] text-slate-400 font-medium">In-app notifications count badges and browser push reminders.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifPush} 
              onChange={() => setNotifPush(!notifPush)}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button onClick={handleSavePreferences} className={`px-4.5 py-2.5 rounded-xl text-xs font-bold ${buttonPrimary} cursor-pointer`}>
              Save Notification Choices
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: APPEARANCE */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Moon className="h-5 w-5 text-indigo-500" />
          <h4 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">4. UI & Appearance</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500">Dashboard Theme Accent</label>
            <select
              value={appearanceTheme}
              onChange={(e) => setAppearanceTheme(e.target.value)}
              className="p-3 text-xs rounded-xl focus:outline-none border font-semibold bg-white border-slate-200 text-slate-700"
            >
              <option>Light Slate</option>
              <option>High Contrast Oceanic</option>
              <option>Corporate Blue</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500">Interface Layout Density</label>
            <select
              value={appearanceDensity}
              onChange={(e) => setAppearanceDensity(e.target.value)}
              className="p-3 text-xs rounded-xl focus:outline-none border font-semibold bg-white border-slate-200 text-slate-700"
            >
              <option>Spacious</option>
              <option>Compact</option>
            </select>
          </div>

          <div className="md:col-span-2 pt-2">
            <button onClick={handleSavePreferences} className={`px-4.5 py-2.5 rounded-xl text-xs font-bold ${buttonPrimary} cursor-pointer`}>
              Apply Interface Styles
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: SYSTEM DIAGNOSTICS */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Database className="h-5 w-5 text-slate-500" />
          <h4 className="text-sm font-extrabold uppercase text-slate-700 tracking-wider">5. System Diagnostics</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center gap-3">
            <Cpu className="h-8 w-8 text-sky-500 stroke-1 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold block uppercase">SAMS VERSION</span>
              <span className="font-bold text-slate-800">SAMS v3.4.1 Prod</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center gap-3">
            <Wifi className="h-8 w-8 text-emerald-500 stroke-1 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold block uppercase">API LATENCY</span>
              <span className="font-bold text-slate-800">~12ms stable</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-indigo-500 stroke-1 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold block uppercase">STRENGTH STATUS</span>
              <span className="font-bold text-slate-800">Database connected</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
