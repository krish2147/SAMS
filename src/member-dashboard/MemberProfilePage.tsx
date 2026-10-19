import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, Droplet, HeartPulse, Mail, MapPin, Phone, RefreshCw, UserRound, Users } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import { SettingsGroup, SettingsRow, SettingsTitle } from "../components/SettingsList";

interface MemberProfile {
  fullName?: string;
  membershipNo?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  age?: number | string;
  gender?: string;
  bloodGroup?: string;
  mobileNo?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  emergencyMobile?: string;
  hasMedicalCondition?: string;
  medicalDetails?: string;
  registrationDate?: string;
}

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const titleCase = (value?: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

const has = (value?: string | number | null) => (value === 0 ? true : Boolean((value ?? "").toString().trim()));

export function MemberProfilePage() {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/member/profile", { credentials: "same-origin", signal });
      if (!response.ok) throw new Error("profile unavailable");
      setProfile(await response.json());
    } catch (requestError: any) {
      if (requestError?.name !== "AbortError") setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
        <div className="h-56 animate-pulse rounded-2xl bg-white" />
        <div className="h-44 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
        <AlertCircle className="mx-auto h-9 w-9 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold text-ink-950">Your details could not be loaded</h2>
        <p className="mt-1.5 text-sm leading-6 text-ink-600">Please check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-ink-800 focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </section>
    );
  }

  const address = [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.pincode]
    .map((part) => (part || "").toString().trim())
    .filter(Boolean)
    .join(", ");
  const emergencyPhone = profile.emergencyPhone || profile.emergencyMobile;
  const medicalAnswer = (profile.hasMedicalCondition || "").toLowerCase();
  const hasMedical = medicalAnswer === "yes";

  const personal = [
    { icon: CalendarDays, title: "Date of birth", value: formatDate(profile.dateOfBirth) },
    { icon: UserRound, title: "Age", value: profile.age },
    { icon: UserRound, title: "Gender", value: titleCase(profile.gender) },
    { icon: Droplet, title: "Blood group", value: profile.bloodGroup }
  ].filter((row) => has(row.value));
  const contact = [
    { icon: Phone, title: "Mobile", value: profile.mobileNo },
    { icon: Mail, title: "Email", value: profile.email }
  ].filter((row) => has(row.value));

  return (
    <div className="mx-auto max-w-xl pb-6">
      <SettingsTitle>Profile</SettingsTitle>

      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <MemberAvatar avatar={profile.photoUrl} userName={profile.fullName || ""} className="h-32 w-32 rounded-full text-4xl" />
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-slate-900">{profile.fullName || "Member"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {profile.membershipNo ? `Membership no. ${profile.membershipNo}` : "Membership number pending"}
            {profile.registrationDate ? ` · Member since ${formatDate(profile.registrationDate)}` : ""}
          </p>
        </div>
      </div>

      {personal.length > 0 && (
        <SettingsGroup heading="Personal details">
          {personal.map((row) => <SettingsRow key={row.title} icon={row.icon} title={row.title} subtitle={String(row.value)} />)}
        </SettingsGroup>
      )}

      {contact.length > 0 && (
        <SettingsGroup heading="Contact">
          {contact.map((row) => <SettingsRow key={row.title} icon={row.icon} title={row.title} subtitle={String(row.value)} />)}
        </SettingsGroup>
      )}

      {address && (
        <SettingsGroup heading="Address">
          <SettingsRow icon={MapPin} title="Registered address" subtitle={address} />
        </SettingsGroup>
      )}

      {(profile.emergencyName || emergencyPhone) && (
        <SettingsGroup heading="Emergency contact">
          {has(profile.emergencyName) && (
            <SettingsRow icon={Users} title={profile.emergencyName!} subtitle={titleCase(profile.emergencyRelation) || undefined} />
          )}
          {has(emergencyPhone) && <SettingsRow icon={Phone} title="Phone" subtitle={emergencyPhone} />}
        </SettingsGroup>
      )}

      <SettingsGroup heading="Medical">
        <SettingsRow
          icon={HeartPulse}
          title="Declared condition"
          subtitle={hasMedical ? profile.medicalDetails || "A medical condition was declared." : medicalAnswer === "no" ? "No medical conditions declared." : "Not recorded yet. Please tell the academy reception."}
        />
      </SettingsGroup>

      <p className="px-4 text-sm leading-6 text-slate-500">
        To correct any of these details, or to change your photo, please contact the academy reception.
      </p>
    </div>
  );
}
