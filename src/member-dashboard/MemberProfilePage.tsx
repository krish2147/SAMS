import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, HeartPulse, MapPin, Phone, RefreshCw, UserRound } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";

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

function Panel({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-400/10 text-aqua-600 ring-1 ring-inset ring-aqua-400/20">
          <Icon className="h-[17px] w-[17px]" />
        </span>
        <h2 className="text-[15px] font-semibold text-ink-950">{title}</h2>
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Renders nothing when the academy holds no value, rather than printing a placeholder. */
function Field({ label, value }: { label: string; value?: string | number | null }) {
  const text = value === 0 ? "0" : (value || "").toString().trim();
  if (!text) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink-900">{text}</dd>
    </div>
  );
}

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
  const hasMedical = (profile.hasMedicalCondition || "").toLowerCase() === "yes";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
        <MemberAvatar avatar={profile.photoUrl} userName={profile.fullName || ""} className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <h2 className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink-950 sm:text-[26px]">
            {profile.fullName || "Member"}
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {profile.membershipNo ? `Membership no. ${profile.membershipNo}` : "Membership number pending"}
            {profile.registrationDate ? ` · Member since ${formatDate(profile.registrationDate)}` : ""}
          </p>
        </div>
      </section>

      <Panel icon={UserRound} title="Personal details">
        <Field label="Date of birth" value={formatDate(profile.dateOfBirth)} />
        <Field label="Age" value={profile.age} />
        <Field label="Gender" value={titleCase(profile.gender)} />
        <Field label="Blood group" value={profile.bloodGroup} />
      </Panel>

      <Panel icon={Phone} title="Contact">
        <Field label="Mobile" value={profile.mobileNo} />
        <Field label="Email" value={profile.email} />
      </Panel>

      {address && (
        <Panel icon={MapPin} title="Address">
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Registered address</dt>
            <dd className="mt-1 text-sm font-medium leading-6 text-ink-900">{address}</dd>
          </div>
        </Panel>
      )}

      {(profile.emergencyName || emergencyPhone) && (
        <Panel icon={AlertCircle} title="Emergency contact">
          <Field label="Name" value={profile.emergencyName} />
          <Field label="Relationship" value={titleCase(profile.emergencyRelation)} />
          <Field label="Phone" value={emergencyPhone} />
        </Panel>
      )}

      <Panel icon={HeartPulse} title="Medical">
        <div className="sm:col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Declared condition</dt>
          <dd className="mt-1 text-sm font-medium leading-6 text-ink-900">
            {hasMedical ? profile.medicalDetails || "A medical condition was declared." : "No medical conditions declared."}
          </dd>
        </div>
      </Panel>

      <p className="px-1 text-sm leading-6 text-ink-600">
        To correct any of these details, please contact the academy reception.
      </p>
    </div>
  );
}
