import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  User, Bell, KeyRound, Palette, LogOut, ArrowLeft, Check, X, Shuffle,
  Smile, Image as ImageIcon, Camera, CheckCircle, AlertCircle, RefreshCw
} from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "../utils/password";
import { sessionStore } from "../utils/sessionStore";
import { PasswordInput } from "./PasswordInput";
import { CHARACTER_AVATARS, CHARACTER_AVATAR_LABELS } from "../utils/avatars";
import { CameraCapture } from "./PhotoPicker";
import { SettingsGroup as Group, SettingsRow as Row } from "./SettingsList";
import { ACCENTS, getAccent, saveAccent, type AccentId } from "../utils/accent";
import { roleLabel } from "../utils/roles";
import { mobileDigits } from "../utils/phone";

// Settings laid out like a phone settings app: one list of rows, each opening its own page.

interface SettingsTabProps {
  activeUser: {
    id?: string;
    name: string;
    role: string;
    email?: string;
    phoneNumber?: string;
    avatar?: string;
  };
  buttonPrimary?: string;
  inputStyle?: string;
  onProfileUpdated?: (updatedUser: { name: string; email: string; phoneNumber: string; avatar: string }) => void;
  onLogout?: () => void;
}

type Page = "home" | "profile" | "password" | "notifications" | "appearance";

// "+91 98765 43210", "919876543210" or "9876543210" -> "9876543210"
const nationalDigits = (phone?: string) => {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length > 10 && d.startsWith("91") ? d.slice(-10) : d.slice(0, 10);
};

const sessionToken = () => {
  try {
    const saved = sessionStore.get();
    if (saved) return JSON.parse(saved)?.token || "";
  } catch { /* ignore */ }
  return "";
};

const field = "w-full h-14 px-4 rounded-2xl border border-slate-200 bg-white text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-aqua-500 focus:ring-4 focus:ring-aqua-500/15";

export function SettingsTab({ activeUser, onProfileUpdated, onLogout }: SettingsTabProps) {
  const [page, setPage] = useState<Page>("home");

  const [profileName, setProfileName] = useState(activeUser.name);
  const [profileEmail, setProfileEmail] = useState(activeUser.email || "");
  const [profilePhone, setProfilePhone] = useState(nationalDigits(activeUser.phoneNumber));
  const [photoUrl, setPhotoUrl] = useState(activeUser.avatar || "");

  // Sync with activeUser prop changes (asynchronous load)
  useEffect(() => {
    setProfileName(activeUser.name || "");
    setProfileEmail(activeUser.email || "");
    setProfilePhone(nationalDigits(activeUser.phoneNumber));
    setPhotoUrl(activeUser.avatar || "");
  }, [activeUser]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  const [accent, setAccent] = useState<AccentId>(getAccent);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);

  const go = (next: Page) => {
    setErrorMsg(null);
    setSaveSuccess(null);
    setPage(next);
    window.scrollTo?.({ top: 0 });
  };

  const flash = (msg: string) => {
    setErrorMsg(null);
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const saveProfile = async (overrides: { photoUrl?: string } = {}) => {
    setErrorMsg(null);
    setSaveSuccess(null);
    const nextPhoto = overrides.photoUrl ?? photoUrl;
    if (!profileName.trim() || !profileEmail.trim()) {
      setErrorMsg("Name and email are required.");
      return false;
    }
    if (profilePhone && !/^[6-9]\d{9}$/.test(profilePhone)) {
      setErrorMsg("Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
      return false;
    }
    const fullPhone = profilePhone ? `+91 ${profilePhone}` : "";
    setIsSaving(true);
    try {
      const response = await fetch("/api/staff/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-token": sessionToken() },
        body: JSON.stringify({ name: profileName, email: profileEmail, phoneNumber: fullPhone, photoUrl: nextPhoto })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't save your profile. Please try again.");
      setPhotoUrl(nextPhoto);
      onProfileUpdated?.({ name: profileName, email: profileEmail, phoneNumber: fullPhone, avatar: nextPhoto });
      flash(overrides.photoUrl !== undefined ? "Photo updated." : "Profile updated.");
      return true;
    } catch (err: any) {
      setErrorMsg(err.message || "Couldn't save your profile. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files (JPEG, PNG, WEBP) are supported.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("That photo is bigger than 4 MB. Please choose a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => { void saveProfile({ photoUrl: reader.result as string }); };
    reader.readAsDataURL(file);
  };

  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  };

  const takePhoto = () => {
    if (navigator.mediaDevices?.getUserMedia) setCameraOpen(true);
    else nativeCameraRef.current?.click();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(null);
    if (!currentPassword) return setErrorMsg("Enter your current password.");
    if (newPassword.length < MIN_PASSWORD_LENGTH) return setErrorMsg(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    if (newPassword !== confirmPassword) return setErrorMsg("The new passwords don't match.");
    setIsSaving(true);
    try {
      const response = await fetch("/api/staff/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-token": sessionToken() },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Couldn't change your password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flash("Password changed.");
    } catch (err: any) {
      setErrorMsg(err.message || "Couldn't change your password.");
    } finally {
      setIsSaving(false);
    }
  };

  const profileDirty =
    profileName !== (activeUser.name || "") ||
    profileEmail !== (activeUser.email || "") ||
    profilePhone !== nationalDigits(activeUser.phoneNumber);

  const accentLabel = ACCENTS.find((a) => a.id === accent)?.label || "";
  const notifSummary = [notifEmail && "Email", notifSms && "SMS", notifPush && "App"].filter(Boolean).join(", ") || "Off";

  const messages = (
    <>
      {saveSuccess && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">{saveSuccess}</span>
        </div>
      )}
      {errorMsg && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="text-sm font-semibold text-rose-800">{errorMsg}</span>
        </div>
      )}
    </>
  );

  const header = (title: string) => (
    <div className="mb-6 grid grid-cols-[44px_1fr_44px] items-center">
      {page === "home" ? <span /> : (
        <button type="button" onClick={() => go("home")} aria-label="Back to settings" className="h-11 w-11 -ml-2 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer">
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="text-center font-display text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <span />
    </div>
  );

  const avatarCircle = (size: string, text: string) => (
    <span className={`${size} shrink-0 rounded-full overflow-hidden bg-aqua-500 text-white font-bold flex items-center justify-center ${text}`}>
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : (profileName || "?").charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 text-left md:px-0 md:pb-10">
      {page === "home" && (
        <>
          {header("Settings")}
          {messages}

          <button type="button" id="settings-account" onClick={() => go("profile")} className="mb-4 flex w-full items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 cursor-pointer">
            {avatarCircle("h-14 w-14", "text-xl")}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold text-slate-900">{profileName || "Your profile"}</span>
              <span className="block truncate text-sm text-slate-500">{profileEmail}</span>
            </span>
            <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{roleLabel(activeUser.role)}</span>
          </button>

          <Group>
            <Row icon={User} title="Profile" onClick={() => go("profile")} />
            <Row icon={KeyRound} title="Password" subtitle="Change your login password" onClick={() => go("password")} />
          </Group>
          <Group>
            <Row icon={Bell} title="Notifications" subtitle={notifSummary} onClick={() => go("notifications")} />
            <Row icon={Palette} title="Accent colour" subtitle={accentLabel} onClick={() => go("appearance")} />
          </Group>
          {onLogout && (
            <Group>
              <Row icon={LogOut} title="Log out" danger onClick={onLogout} />
            </Group>
          )}
        </>
      )}

      {page === "profile" && (
        <>
          {header("Profile")}
          <div className="mb-8 flex flex-col items-center gap-4">
            {avatarCircle("h-32 w-32", "text-5xl")}
            <button type="button" id="settings-edit-photo" onClick={() => setPhotoSheetOpen(true)} disabled={isSaving} className="h-11 rounded-full border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">
              {isSaving ? "Saving…" : "Edit photo"}
            </button>
          </div>
          {messages}
          <form onSubmit={(e) => { e.preventDefault(); void saveProfile(); }} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">Full name</span>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} autoComplete="name" className={field} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">Email</span>
              <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} autoComplete="email" className={field} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">Mobile number</span>
              <span className={`${field} flex items-center gap-0 !px-0 overflow-hidden focus-within:border-aqua-500 focus-within:ring-4 focus-within:ring-aqua-500/15`}>
                <span className="shrink-0 border-r border-slate-200 px-4 font-semibold text-slate-700">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(mobileDigits(e.target.value))}
                  placeholder="98765 43210"
                  className="h-full min-w-0 flex-1 bg-transparent px-4 focus:outline-none"
                />
              </span>
            </label>
            <button type="submit" disabled={!profileDirty || isSaving} className="h-14 w-full rounded-full bg-slate-900 text-[17px] font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer disabled:cursor-default flex items-center justify-center gap-2">
              {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
              Update profile
            </button>
          </form>
        </>
      )}

      {page === "password" && (
        <>
          {header("Password")}
          {messages}
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">Current password</span>
              <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" className={field} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">New password</span>
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} autoComplete="new-password" className={field} />
            </label>
            <label className="block">
              <span className="mb-2 block text-[15px] font-medium text-slate-700">Confirm new password</span>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className={field} />
            </label>
            <button type="submit" disabled={isSaving || !currentPassword || !newPassword} className="h-14 w-full rounded-full bg-slate-900 text-[17px] font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer disabled:cursor-default">
              Change password
            </button>
          </form>
        </>
      )}

      {page === "notifications" && (
        <>
          {header("Notifications")}
          <Group>
            <ToggleRow title="Email" subtitle="Daily reports and important alerts" checked={notifEmail} onChange={setNotifEmail} />
            <ToggleRow title="SMS & WhatsApp" subtitle="Batch changes, fee approvals and greetings to members" checked={notifSms} onChange={setNotifSms} />
            <ToggleRow title="App notifications" subtitle="Red count on the bell and reminders" checked={notifPush} onChange={setNotifPush} />
          </Group>
        </>
      )}

      {page === "appearance" && (
        <>
          {header("Accent colour")}
          <p className="mb-4 px-1 text-sm text-slate-500">Changes buttons, links and highlights. Saved on this device.</p>
          <Group>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={accent === a.id}
                onClick={() => { setAccent(a.id); saveAccent(a.id); }}
                className="flex min-h-[60px] w-full items-center gap-4 px-4 text-left hover:bg-slate-50 cursor-pointer"
              >
                <span className="h-7 w-7 shrink-0 rounded-full" style={{ background: a.swatch }} />
                <span className="flex-1 text-[17px] text-slate-900">{a.label}</span>
                {accent === a.id && <Check className="h-5 w-5 text-slate-900" strokeWidth={3} />}
              </button>
            ))}
          </Group>
        </>
      )}

      <input ref={galleryRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={fromInput} />
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={fromInput} />

      {/* Edit photo: bottom sheet */}
      <AnimatePresence>
        {photoSheetOpen && (
          <div className="fixed inset-0 z-[70] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Edit photo">
            <motion.button type="button" aria-label="Close" onClick={() => setPhotoSheetOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 cursor-default" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="relative mx-auto w-full max-w-xl rounded-t-[28px] bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3">
              <div className="mb-2 grid grid-cols-[44px_1fr_44px] items-center">
                <button type="button" onClick={() => setPhotoSheetOpen(false)} aria-label="Close" className="h-11 w-11 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer">
                  <X className="h-6 w-6" />
                </button>
                <p className="text-center text-[17px] font-semibold text-slate-900">Edit photo</p>
                <span />
              </div>
              <SheetRow icon={Smile} label="Choose an avatar" onClick={() => { setPhotoSheetOpen(false); setAvatarPickerOpen(true); }} />
              <SheetRow icon={ImageIcon} label="Choose from photos" onClick={() => { setPhotoSheetOpen(false); galleryRef.current?.click(); }} />
              <SheetRow icon={Camera} label="Take a photo" onClick={() => { setPhotoSheetOpen(false); takePhoto(); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {avatarPickerOpen && (
        <AvatarPicker
          current={photoUrl}
          onClose={() => setAvatarPickerOpen(false)}
          onDone={(url) => { setAvatarPickerOpen(false); if (url !== photoUrl) void saveProfile({ photoUrl: url }); }}
        />
      )}

      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => { setCameraOpen(false); handlePhotoFile(file); }}
          onUnavailable={() => { setCameraOpen(false); nativeCameraRef.current?.click(); }}
        />
      )}
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }: { title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[64px] w-full items-center gap-4 px-4 py-3 cursor-pointer">
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] text-slate-900">{title}</span>
        <span className="block text-sm text-slate-500">{subtitle}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-aqua-500/25 ${checked ? "bg-aqua-500" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-7" : "left-1"}`} />
      </span>
    </label>
  );
}

function SheetRow({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[60px] w-full items-center gap-4 rounded-2xl px-3 text-left text-[17px] text-slate-900 hover:bg-slate-50 cursor-pointer">
      <Icon className="h-6 w-6 shrink-0 text-slate-700" />
      {label}
    </button>
  );
}

function AvatarPicker({ current, onClose, onDone }: { current: string; onClose: () => void; onDone: (url: string) => void }) {
  const [picked, setPicked] = useState(CHARACTER_AVATARS.includes(current) ? current : CHARACTER_AVATARS[0]);
  const shuffle = () => {
    const others = CHARACTER_AVATARS.filter((a) => a !== picked);
    setPicked(others[Math.floor(Math.random() * others.length)]);
  };
  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-label="Choose an avatar">
      <div className="mx-auto max-w-xl px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-6 grid grid-cols-[44px_1fr_44px] items-center">
          <button type="button" onClick={onClose} aria-label="Cancel" className="h-11 w-11 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="h-6 w-6" />
          </button>
          <p className="text-center text-[19px] font-semibold text-slate-900">Choose an avatar</p>
          <button type="button" id="avatar-picker-done" onClick={() => onDone(picked)} aria-label="Use this avatar" className="h-11 w-11 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-100 cursor-pointer">
            <Check className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <img src={picked} alt={CHARACTER_AVATAR_LABELS[CHARACTER_AVATARS.indexOf(picked)] || ""} className="h-40 w-40 rounded-full object-cover" />
          <button type="button" onClick={shuffle} className="h-11 rounded-full border border-slate-300 px-5 text-[15px] font-semibold text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
        </div>
        <div role="radiogroup" aria-label="Avatars" className="mt-8 grid grid-cols-3 gap-5 sm:grid-cols-4">
          {CHARACTER_AVATARS.map((url, i) => {
            const selected = url === picked;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={CHARACTER_AVATAR_LABELS[i]}
                onClick={() => setPicked(url)}
                className={`aspect-square rounded-full p-1 cursor-pointer ${selected ? "ring-[3px] ring-slate-900" : ""}`}
              >
                <img src={url} alt="" className="h-full w-full rounded-full object-cover" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
