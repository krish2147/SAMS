import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, AlertCircle, Upload, X, Sun, Moon,
  Waves, Users, Dumbbell, ShieldCheck, MessageCircle, CreditCard, Sparkles,
  Pencil, Loader2, RefreshCw, HeartPulse, Lock
} from "lucide-react";
import { AcademyId, UserSession } from "../types";
import swimmerImage from "../assets/registration-swimmer.jpg";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

interface RegisterPageProps {
  academyId: AcademyId;
  onRegisterSuccess: (session: UserSession) => void;
  onCancel: () => void;
  /** Rendered inside the staff console rather than as its own full page. */
  embedded?: boolean;
}

type Category = "Learners" | "General" | "Family_4" | "Family_3";
type Frequency = "6_days" | "3_days";
type Duration = "1_month" | "3_months" | "6_months" | "9_months" | "annual";

interface FormState {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  mobileNumber: string;
  whatsappSameAsMobile: boolean;
  whatsappNumber: string;
  email: string;
  photoFile: File | null;
  photoUrl: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
  memberType: string;
  batchCategory: Category | "";
  frequency: Frequency | "";
  planDuration: Duration | "";
  /** Exact batch_name from the batches table, so the server assigns the batch that was chosen. */
  batch: string;
  // null until the applicant answers; the declaration is never assumed.
  hasMedicalCondition: boolean | null;
  medicalDetails: string;
  agreedToRules: boolean;
}

type FieldKey = keyof FormState;

const INITIAL_FORM_STATE: FormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  mobileNumber: "",
  whatsappSameAsMobile: true,
  whatsappNumber: "",
  email: "",
  photoFile: null,
  photoUrl: "",
  address: "",
  city: "Vadodara",
  state: "Gujarat",
  pincode: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  relationship: "",
  memberType: "",
  batchCategory: "",
  frequency: "",
  planDuration: "",
  batch: "",
  hasMedicalCondition: null,
  medicalDetails: "",
  agreedToRules: false,
};

const REGISTRATION_FEE = 300;

const CATEGORIES: Array<{ id: Category; name: string; tagline: string; who: string; icon: typeof Waves }> = [
  { id: "Learners", name: "Learners", tagline: "Learn to swim with stroke drills and a coach on deck.", who: "New and improving swimmers", icon: Waves },
  { id: "General", name: "General", tagline: "Lane swimming for fitness and regular practice.", who: "Confident swimmers", icon: Dumbbell },
  { id: "Family_4", name: "Family of four", tagline: "Pool access for 2 adults and 2 kids, 6 days a week.", who: "2 adults + 2 kids", icon: Users },
  { id: "Family_3", name: "Family of three", tagline: "Pool access for 2 adults and 1 kid, 6 days a week.", who: "2 adults + 1 kid", icon: Users },
];

const FREQUENCIES: Array<{ id: Frequency; name: string; detail: string }> = [
  { id: "6_days", name: "6 days a week", detail: "Monday to Saturday" },
  { id: "3_days", name: "3 days a week", detail: "Alternate days" },
];

const DURATION_MONTHS: Record<Duration, number> = { "1_month": 1, "3_months": 3, "6_months": 6, "9_months": 9, annual: 12 };
const DURATION_LABEL: Record<Duration, string> = { "1_month": "1 month", "3_months": "3 months", "6_months": "6 months", "9_months": "9 months", annual: "1 year" };

// Baroda Swim Front official rate card, effective 1 February 2026. The server prices the
// registration itself from membership_plans; this mirror only drives what the form displays.
const RATE_CARD: Record<Category, Partial<Record<Frequency, Partial<Record<Duration, number>>>>> = {
  Learners: {
    "6_days": { "1_month": 3500, "3_months": 9500, "6_months": 18500, "9_months": 26500, annual: 33500 },
    "3_days": { "1_month": 3000, "3_months": 8500, "6_months": 16000, "9_months": 22500, annual: 28500 },
  },
  General: {
    "6_days": { "1_month": 3000, "3_months": 8500, "6_months": 16000, "9_months": 22500, annual: 28500 },
    "3_days": { "1_month": 2700, "3_months": 7500, "6_months": 14500, "9_months": 20500, annual: 25500 },
  },
  Family_4: { "6_days": { "1_month": 10000, "3_months": 28500 } },
  Family_3: { "6_days": { "1_month": 8000, "3_months": 22500 } },
};

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const NOT_SURE_BLOOD = "Not known";
const RELATIONSHIPS = ["Father", "Mother", "Spouse", "Sibling", "Guardian", "Friend"];

const SAFETY_RULES = [
  "Follow the instructions of the coach on deck at all times.",
  "Swimwear and a silicone swim cap are compulsory before entering the water. Costume hire is ₹50 per hour.",
  "Report any medical condition, such as epilepsy, a skin condition or a heart condition, accurately.",
  "The academy may decline an application or suspend access in case of misconduct.",
];

const STEPS: Array<{ id: string; title: string; short: string; fields: FieldKey[] }> = [
  { id: "plan", title: "Choose your membership", short: "Plan", fields: ["memberType"] },
  { id: "time", title: "Pick your pool time", short: "Pool time", fields: ["batch"] },
  { id: "you", title: "Tell us about you", short: "About you", fields: ["fullName", "dateOfBirth", "gender", "bloodGroup", "mobileNumber", "whatsappNumber", "email", "photoUrl"] },
  { id: "contact", title: "Address and emergency contact", short: "Contact", fields: ["address", "city", "state", "pincode", "emergencyContactName", "emergencyContactNumber", "relationship"] },
  { id: "review", title: "Health and confirmation", short: "Confirm", fields: ["medicalDetails", "agreedToRules"] },
];

const SERVER_FIELD_MAP: Record<string, FieldKey> = {
  full_name: "fullName", date_of_birth: "dateOfBirth", gender: "gender", mobile_number: "mobileNumber",
  whatsapp_number: "whatsappNumber", email: "email", address: "address", city: "city", state: "state",
  pincode: "pincode", emergency_contact_name: "emergencyContactName", emergency_contact_number: "emergencyContactNumber",
  member_type: "memberType", batch: "batch", medical_details: "medicalDetails",
};

interface BatchOption {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  capacity: number;
  remaining: number;
  open: boolean;
}

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** Converts the form's choice into the codes the server prices against. */
const toPlanSelection = (category: string, frequency: string, duration: string) =>
  category === "Family_4" || category === "Family_3"
    ? { membershipType: "Family", variant: category, duration }
    : { membershipType: category, variant: frequency, duration };

const frequenciesFor = (category: Category | "") => (category ? (Object.keys(RATE_CARD[category]) as Frequency[]) : []);

const durationsFor = (category: Category | "", frequency: Frequency | "") =>
  category && frequency ? (Object.keys(RATE_CARD[category][frequency] || {}) as Duration[]) : [];

const priceFor = (category: Category | "", frequency: Frequency | "", duration: Duration | "") =>
  category && frequency && duration ? RATE_CARD[category][frequency]?.[duration] ?? null : null;

/** Lowest monthly price across a category's options, shown as "from" on the plan card. */
const fromPriceFor = (category: Category) =>
  Math.min(...frequenciesFor(category).map(f => RATE_CARD[category][f]?.["1_month"] ?? Infinity));

/** What a longer plan saves against paying the 1-month rate every month, from the rate card. */
const savingFor = (category: Category | "", frequency: Frequency | "", duration: Duration) => {
  const monthly = priceFor(category, frequency, "1_month");
  const price = priceFor(category, frequency, duration);
  if (monthly === null || price === null) return 0;
  return Math.max(0, monthly * DURATION_MONTHS[duration] - price);
};

const ageFrom = (dob: string) => {
  const match = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const today = new Date();
  let age = today.getFullYear() - Number(match[1]);
  const beforeBirthday = today.getMonth() + 1 < Number(match[2]) || (today.getMonth() + 1 === Number(match[2]) && today.getDate() < Number(match[3]));
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : null;
};

const isEvening = (time: string) => /pm/i.test(time) && !/^12/.test(time.trim());

function validate(form: FormState): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {};
  if (!form.batchCategory) e.memberType = "Choose a membership to continue.";
  else if (!form.frequency || !form.planDuration || !form.memberType) e.memberType = "Choose how often you will swim and for how long.";
  if (!form.batch) e.batch = "Choose a pool time to continue.";

  if (!form.fullName.trim()) e.fullName = "Enter your full name.";
  else if (form.fullName.trim().length < 3) e.fullName = "Enter your full name as on an ID.";
  if (!form.dateOfBirth) e.dateOfBirth = "Enter your date of birth.";
  else if (ageFrom(form.dateOfBirth) === null) e.dateOfBirth = "Enter a valid date of birth.";
  if (!form.gender) e.gender = "Choose an option.";
  if (!form.bloodGroup) e.bloodGroup = "Choose your blood group, or Not known.";
  if (digitsOnly(form.mobileNumber).length !== 10) e.mobileNumber = "Enter a 10-digit mobile number.";
  if (!form.whatsappSameAsMobile && digitsOnly(form.whatsappNumber).length !== 10) e.whatsappNumber = "Enter a 10-digit WhatsApp number.";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address, or leave it blank.";

  if (!form.address.trim()) e.address = "Enter your house and street.";
  if (!form.city.trim()) e.city = "Enter your city.";
  if (!form.state.trim()) e.state = "Enter your state.";
  if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter a 6-digit PIN code.";
  if (!form.emergencyContactName.trim()) e.emergencyContactName = "Enter who we should call in an emergency.";
  if (digitsOnly(form.emergencyContactNumber).length !== 10) e.emergencyContactNumber = "Enter their 10-digit phone number.";
  else if (digitsOnly(form.emergencyContactNumber) === digitsOnly(form.mobileNumber)) e.emergencyContactNumber = "Use someone else's number, not your own.";
  if (!form.relationship.trim()) e.relationship = "Choose how they are related to you.";

  if (form.hasMedicalCondition === null) e.medicalDetails = "Tell us whether you have any medical condition.";
  else if (form.hasMedicalCondition && !form.medicalDetails.trim()) e.medicalDetails = "Describe the condition so the coach can keep you safe.";
  if (!form.agreedToRules) e.agreedToRules = "Confirm the declaration to submit.";
  return e;
}

const stepOfField = (field: string) => Math.max(0, STEPS.findIndex(s => s.fields.includes(field as FieldKey)));

// ---------------------------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-rose-600" role="alert">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

/** Red asterisk marking a required field. Screen readers hear "required". */
function Req() {
  return <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>;
}

function Label({ htmlFor, children, optional }: { htmlFor?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-semibold text-ink-800">
      {children}
      {optional ? <span className="ml-1.5 font-normal text-ink-400">Optional</span> : <><Req /><span className="sr-only"> (required)</span></>}
    </label>
  );
}

const inputClass = (hasError?: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink-950 placeholder:text-ink-400 outline-none transition focus:ring-4 ${
    hasError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-ink-200 focus:border-aqua-500 focus:ring-aqua-500/15"
  }`;

function Chip({ selected, onClick, children, disabled, name }: { selected: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; name?: string; key?: React.Key }) {
  return (
    <button
      type="button"
      name={name}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-aqua-500/25 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? "border-ink-950 bg-ink-950 text-white shadow-card" : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------

// Same cricket photo the academy selector uses for the Elite Cricket Academy card.
const CRICKET_IMAGE = "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1200";

export function RegisterPage({ academyId, onCancel, embedded = false }: RegisterPageProps) {
  const reduceMotion = useReducedMotion();
  const academyName = academyId === "swim" ? "Baroda Swim Front" : "Elite Cricket Academy";
  const academyImage = academyId === "swim" ? swimmerImage : CRICKET_IMAGE;
  const nextQuestionRef = useRef<HTMLDivElement>(null);
  const draftKey = `sams_register_draft_${academyId}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>(() => {
    // A refresh or an accidental back should not cost the applicant everything they typed.
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) return { ...INITIAL_FORM_STATE, ...JSON.parse(saved), photoFile: null, photoUrl: "", agreedToRules: false };
    } catch { /* storage unavailable */ }
    return INITIAL_FORM_STATE;
  });
  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { applicationNumber: string; fullName: string; whatsapp: string; planLabel: string; batchLabel: string; total: number }>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [batches, setBatches] = useState<BatchOption[] | null>(null);
  const [batchesError, setBatchesError] = useState(false);

  useEffect(() => {
    try {
      const { photoFile, photoUrl, agreedToRules, ...rest } = form;
      sessionStorage.setItem(draftKey, JSON.stringify(rest));
    } catch { /* storage unavailable */ }
  }, [form, draftKey]);

  const loadBatches = useCallback(() => {
    setBatchesError(false);
    setBatches(null);
    fetch("/api/batches")
      .then(res => (res.ok ? res.json() : Promise.reject(new Error("unavailable"))))
      .then((rows: any[]) => {
        setBatches(
          (Array.isArray(rows) ? rows : [])
            .filter(b => (b.academy_id || b.academyId) === academyId)
            .map(b => {
              const capacity = Number(b.capacity || 0);
              const remaining = Number(b.remaining_seats ?? Math.max(0, capacity - Number(b.current_strength || 0)));
              return {
                id: Number(b.id),
                name: String(b.batch_name),
                startTime: String(b.start_time || ""),
                endTime: String(b.end_time || ""),
                capacity,
                remaining,
                open: String(b.status || "").toUpperCase() === "OPEN" && remaining > 0,
              };
            })
        );
      })
      .catch(() => setBatchesError(true));
  }, [academyId]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // Derived plan
  const price = priceFor(form.batchCategory, form.frequency, form.planDuration);
  const total = price === null ? null : price + REGISTRATION_FEE;
  const category = CATEGORIES.find(c => c.id === form.batchCategory) || null;
  const frequency = FREQUENCIES.find(f => f.id === form.frequency) || null;
  const chosenBatch = batches?.find(b => b.name === form.batch) || null;
  const age = ageFrom(form.dateOfBirth);

  const planLabel = category && frequency && form.planDuration
    ? `${category.name}${frequenciesFor(category.id).length > 1 ? `, ${frequency.name}` : ""}, ${DURATION_LABEL[form.planDuration]}`
    : "";

  // memberType is the human-readable label stored with the application; pricing uses the codes.
  useEffect(() => {
    const label = price === null || !category ? "" : `${planLabel} (${rupees(price)})`;
    setForm(prev => (prev.memberType === label ? prev : { ...prev, memberType: label }));
  }, [planLabel, price, category]);

  const update = <K extends FieldKey>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const chooseCategory = (id: Category) => {
    const freqs = frequenciesFor(id);
    setForm(prev => {
      const keepFreq = prev.frequency && freqs.includes(prev.frequency as Frequency) ? prev.frequency : freqs.length === 1 ? freqs[0] : "";
      const durations = durationsFor(id, keepFreq as Frequency);
      const keepDuration = prev.planDuration && durations.includes(prev.planDuration as Duration) ? prev.planDuration : "";
      return { ...prev, batchCategory: id, frequency: keepFreq as Frequency | "", planDuration: keepDuration as Duration | "" };
    });
    setErrors(prev => ({ ...prev, memberType: undefined }));
    // On a phone the plan cards fill the screen; bring the next question into view.
    window.setTimeout(() => nextQuestionRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 120);
  };

  const chooseFrequency = (id: Frequency) => {
    setForm(prev => {
      const durations = durationsFor(prev.batchCategory, id);
      return { ...prev, frequency: id, planDuration: prev.planDuration && durations.includes(prev.planDuration as Duration) ? prev.planDuration : "" };
    });
    setErrors(prev => ({ ...prev, memberType: undefined }));
  };

  // Photo
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, photoUrl: "Choose a JPEG, PNG or WEBP image." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photoUrl: "Choose an image smaller than 2 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, photoFile: file, photoUrl: reader.result as string }));
      setErrors(prev => ({ ...prev, photoUrl: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const scrollToTop = () => {
    const el = topRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const focusField = (field: string) => {
    window.setTimeout(() => {
      const el = document.getElementsByName(field)[0] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      if (el && "focus" in el) el.focus({ preventScroll: true });
    }, 80);
  };

  const goTo = (index: number) => {
    setStep(index);
    setMaxStepReached(prev => Math.max(prev, index));
    setGeneralError(null);
    scrollToTop();
  };

  const stepErrors = (index: number) => {
    const all = validate(form);
    return Object.fromEntries(STEPS[index].fields.filter(f => all[f]).map(f => [f, all[f]])) as Partial<Record<FieldKey, string>>;
  };

  const handleContinue = () => {
    const found = stepErrors(step);
    if (Object.keys(found).length) {
      setErrors(prev => ({ ...prev, ...found }));
      focusField(Object.keys(found)[0]);
      return;
    }
    goTo(step + 1);
  };

  const handleSubmit = async () => {
    setGeneralError(null);
    const all = validate(form);
    if (Object.keys(all).length) {
      setErrors(all);
      const first = Object.keys(all)[0];
      const target = stepOfField(first);
      if (target !== step) goTo(target);
      focusField(first);
      return;
    }

    setIsSubmitting(true);
    try {
      const mobile = `+91 ${digitsOnly(form.mobileNumber)}`;
      const whatsapp = form.whatsappSameAsMobile ? mobile : `+91 ${digitsOnly(form.whatsappNumber)}`;
      const emergency = `+91 ${digitsOnly(form.emergencyContactNumber)}`;
      const bloodGroup = form.bloodGroup === NOT_SURE_BLOOD ? "" : form.bloodGroup;
      const plan = toPlanSelection(form.batchCategory, form.frequency, form.planDuration);

      const data = new FormData();
      const both = (camel: string, snake: string, value: string) => { data.append(camel, value); data.append(snake, value); };
      both("fullName", "full_name", form.fullName.trim());
      both("dateOfBirth", "date_of_birth", form.dateOfBirth);
      data.append("gender", form.gender);
      both("bloodGroup", "blood_group", bloodGroup);
      both("mobileNumber", "mobile_number", mobile);
      both("whatsappNumber", "whatsapp_number", whatsapp);
      data.append("email", form.email.trim());
      data.append("address", form.address.trim());
      data.append("city", form.city.trim());
      data.append("state", form.state.trim());
      data.append("pincode", form.pincode.trim());
      both("emergencyContactName", "emergency_contact_name", form.emergencyContactName.trim());
      both("emergencyContactNumber", "emergency_contact_number", emergency);
      data.append("relationship", form.relationship.trim());
      data.append("emergencyRelation", form.relationship.trim());
      both("memberType", "member_type", form.memberType);
      // The server prices the membership from these codes, never from the label.
      data.append("membership_type", plan.membershipType);
      data.append("plan_variant", plan.variant);
      data.append("plan_duration", plan.duration);
      data.append("batch", form.batch);
      both("academyId", "academy_id", academyId);
      both("hasMedicalCondition", "has_medical_condition", String(form.hasMedicalCondition));
      both("medicalDetails", "medical_details", form.hasMedicalCondition ? form.medicalDetails.trim() : "");
      if (form.photoFile) data.append("photo", form.photoFile);

      const response = await fetch("/api/register", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (Array.isArray(result.errors) && result.errors.length) {
          const mapped: Partial<Record<FieldKey, string>> = {};
          result.errors.forEach((err: any) => { mapped[(SERVER_FIELD_MAP[err.field] || err.field) as FieldKey] = err.message; });
          setErrors(mapped);
          const first = Object.keys(mapped)[0];
          goTo(stepOfField(first));
          focusField(first);
        } else {
          const message = typeof result.error === "string" ? result.error : result.error?.message || result.message || "We could not submit your application. Please check your details and try again.";
          if (/email/i.test(message)) { setErrors({ email: message }); goTo(stepOfField("email")); focusField("email"); }
          else if (/mobile|phone/i.test(message)) { setErrors({ mobileNumber: message }); goTo(stepOfField("mobileNumber")); focusField("mobileNumber"); }
          else setGeneralError(message);
        }
        setIsSubmitting(false);
        return;
      }

      setSubmitted({
        applicationNumber: result.data?.application_number || "",
        fullName: form.fullName.trim(),
        whatsapp,
        planLabel,
        batchLabel: chosenBatch ? `${chosenBatch.startTime} – ${chosenBatch.endTime}` : form.batch,
        total: total ?? 0,
      });
      window.dispatchEvent(new CustomEvent("sams_member_registered", { detail: result.data }));
      try { sessionStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      setIsSubmitting(false);
      scrollToTop();
    } catch {
      setGeneralError("We could not reach the academy's server. Check your internet connection and try again.");
      setIsSubmitting(false);
    }
  };

  const startAnother = () => {
    setSubmitted(null);
    setStep(0);
    setMaxStepReached(0);
    scrollToTop();
  };

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  // -------------------------------------------------------------------------------------------
  // Success
  // -------------------------------------------------------------------------------------------
  if (submitted) {
    const nextSteps = [
      { icon: CheckCircle2, title: "Application received", body: "The academy now has your details.", done: true },
      { icon: ShieldCheck, title: "The academy reviews it", body: "Staff check your details and confirm your batch." },
      { icon: MessageCircle, title: "Payment link on WhatsApp", body: `A secure Razorpay link for ${rupees(submitted.total)} is sent to ${submitted.whatsapp}.` },
      { icon: CreditCard, title: "Pay, and you are in", body: "Your membership starts as soon as you pay, and the invoice arrives on WhatsApp." },
    ];
    return (
      <div ref={topRef} className={`${embedded ? "" : "min-h-screen"} bg-canvas px-4 py-10 sm:py-16`}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
          <div className="overflow-hidden rounded-[28px] bg-white shadow-panel">
            <div className="relative bg-ink-950 px-7 pb-8 pt-9 text-white sm:px-10">
              <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(120% 80% at 100% 0%, #16a9c4 0%, transparent 60%)" }} />
              <div className="relative">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-aqua-500/20 text-aqua-300"><Check className="h-7 w-7" strokeWidth={3} /></span>
                <h1 className="mt-5 font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">You're all set, {submitted.fullName.split(/\s+/)[0]}.</h1>
                <p className="mt-2 text-[15px] text-ink-200">Your application has reached {academyName}.</p>
                {submitted.applicationNumber && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 font-mono text-[13px] text-white">
                    Application no. <strong className="font-semibold">{submitted.applicationNumber}</strong>
                  </p>
                )}
              </div>
            </div>
            <div className="px-7 py-8 sm:px-10">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-400">What happens next</p>
              <ol className="mt-5 space-y-0">
                {nextSteps.map((s, i) => (
                  <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < nextSteps.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-px bg-ink-100" />}
                    <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-aqua-500 text-white" : "bg-ink-50 text-ink-600"}`}>
                      <s.icon className="h-5 w-5" />
                    </span>
                    <div className="pt-1.5">
                      <p className="font-semibold text-ink-950">{s.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-ink-600">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-7 rounded-2xl bg-ink-50 p-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-ink-600">Plan</span><span className="text-right font-semibold text-ink-950">{submitted.planLabel}</span></div>
                <div className="mt-2 flex justify-between gap-4"><span className="text-ink-600">Pool time</span><span className="text-right font-semibold text-ink-950">{submitted.batchLabel}</span></div>
                <div className="mt-2 flex justify-between gap-4"><span className="text-ink-600">Due after approval</span><span className="font-semibold tabular-nums text-ink-950">{rupees(submitted.total)}</span></div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={onCancel} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  <ArrowLeft className="h-4 w-4" /> Back to the academy
                </button>
                <button type="button" onClick={startAnother} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 text-sm font-semibold text-white hover:bg-ink-800">
                  <Sparkles className="h-4 w-4" /> Register another person
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------------------------------------
  // Steps
  // -------------------------------------------------------------------------------------------
  const morning = (batches || []).filter(b => !isEvening(b.startTime));
  const evening = (batches || []).filter(b => isEvening(b.startTime));
  const isLast = step === STEPS.length - 1;

  const BatchCard = ({ b }: { b: BatchOption; key?: React.Key }) => {
    const selected = form.batch === b.name;
    const fillPct = b.capacity ? Math.round(((b.capacity - b.remaining) / b.capacity) * 100) : 0;
    const low = b.open && b.remaining <= 5;
    return (
      <button
        type="button"
        name="batch"
        disabled={!b.open}
        onClick={() => update("batch", b.name)}
        aria-pressed={selected}
        className={`group relative w-full rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-aqua-500/25 disabled:cursor-not-allowed ${
          selected ? "border-aqua-500 bg-aqua-500/[0.06] ring-1 ring-aqua-500" : b.open ? "border-ink-200 bg-white hover:border-ink-400 hover:shadow-card" : "border-ink-100 bg-ink-50 opacity-60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[17px] font-semibold tabular-nums text-ink-950">{b.startTime} – {b.endTime}</p>
            <p className={`mt-1 text-[13px] font-medium ${!b.open ? "text-ink-400" : low ? "text-amber-600" : "text-ink-600"}`}>
              {!b.open ? "Full" : `${b.remaining} of ${b.capacity} spots left`}
            </p>
          </div>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${selected ? "border-aqua-500 bg-aqua-500 text-white" : "border-ink-200"}`}>
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div className={`h-full rounded-full ${low ? "bg-amber-400" : "bg-aqua-400"}`} style={{ width: `${Math.max(4, fillPct)}%` }} />
        </div>
      </button>
    );
  };

  const stepBody = (() => {
    switch (STEPS[step].id) {
      case "plan":
        return (
          <div className="space-y-9">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Membership type">
              {CATEGORIES.map(c => {
                const selected = form.batchCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    name="memberType"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseCategory(c.id)}
                    className={`relative rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-aqua-500/25 ${
                      selected ? "border-ink-950 bg-ink-950 text-white shadow-panel" : "border-ink-200 bg-white hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-card-hover"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-aqua-500/20 text-aqua-300" : "bg-aqua-500/10 text-aqua-600"}`}>
                        <c.icon className="h-5 w-5" />
                      </span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? "border-aqua-400 bg-aqua-400 text-ink-950" : "border-ink-200"}`}>
                        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </div>
                    <p className={`mt-4 font-display text-lg font-semibold ${selected ? "text-white" : "text-ink-950"}`}>{c.name}</p>
                    <p className={`mt-1 text-sm leading-6 ${selected ? "text-ink-200" : "text-ink-600"}`}>{c.tagline}</p>
                    <p className={`mt-4 text-sm ${selected ? "text-ink-200" : "text-ink-600"}`}>
                      from <span className={`font-display text-xl font-bold tabular-nums ${selected ? "text-white" : "text-ink-950"}`}>{rupees(fromPriceFor(c.id))}</span> / month
                    </p>
                  </button>
                );
              })}
            </div>

            <div ref={nextQuestionRef} className="scroll-mt-40" />
            {form.batchCategory && frequenciesFor(form.batchCategory).length > 1 && (
              <div>
                <p className="mb-3 text-[15px] font-semibold text-ink-950">How often will you swim?<Req /></p>
                <div className="grid grid-cols-2 gap-3">
                  {FREQUENCIES.map(f => {
                    const selected = form.frequency === f.id;
                    return (
                      <button key={f.id} type="button" onClick={() => chooseFrequency(f.id)} aria-pressed={selected}
                        className={`rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-aqua-500/25 ${selected ? "border-aqua-500 bg-aqua-500/[0.06] ring-1 ring-aqua-500" : "border-ink-200 bg-white hover:border-ink-400"}`}>
                        <p className="font-semibold text-ink-950">{f.name}</p>
                        <p className="mt-0.5 text-sm text-ink-600">{f.detail}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {form.batchCategory && form.frequency && (
              <div>
                <p className="mb-3 text-[15px] font-semibold text-ink-950">For how long?<Req /></p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {durationsFor(form.batchCategory, form.frequency).map(d => {
                    const selected = form.planDuration === d;
                    const amount = priceFor(form.batchCategory, form.frequency, d) ?? 0;
                    const saving = savingFor(form.batchCategory, form.frequency, d);
                    return (
                      <button key={d} type="button" onClick={() => update("planDuration", d)} aria-pressed={selected}
                        className={`relative rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-aqua-500/25 ${selected ? "border-aqua-500 bg-aqua-500/[0.06] ring-1 ring-aqua-500" : "border-ink-200 bg-white hover:border-ink-400"}`}>
                        <p className="text-sm font-medium text-ink-600">{DURATION_LABEL[d]}</p>
                        <p className="mt-1 font-display text-xl font-bold tabular-nums text-ink-950">{rupees(amount)}</p>
                        {saving > 0 ? (
                          <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">Save {rupees(saving)}</span>
                        ) : (
                          <span className="mt-2 inline-block text-[12px] text-ink-400">Pay monthly</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <FieldError message={errors.memberType} />
          </div>
        );

      case "time":
        return (
          <div className="space-y-8">
            {batches === null && !batchesError && (
              <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-5 text-ink-600"><Loader2 className="h-5 w-5 animate-spin text-aqua-500" /> Loading today's pool timings…</div>
            )}
            {batchesError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <p className="font-semibold">We couldn't load the pool timings.</p>
                <p className="mt-1">Check your internet connection and try again.</p>
                <button type="button" onClick={loadBatches} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 font-semibold text-amber-900 shadow-sm"><RefreshCw className="h-4 w-4" /> Try again</button>
              </div>
            )}
            {batches && batches.length === 0 && (
              <p className="rounded-2xl border border-ink-100 bg-white p-5 text-sm text-ink-600">No pool timings are open right now. Please contact the academy reception.</p>
            )}
            {[{ label: "Morning", icon: Sun, items: morning }, { label: "Evening", icon: Moon, items: evening }].map(group => group.items.length > 0 && (
              <div key={group.label}>
                <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink-950"><group.icon className="h-4 w-4 text-aqua-600" /> {group.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">{group.items.map(b => <BatchCard key={b.id} b={b} />)}</div>
              </div>
            ))}
            <FieldError message={errors.batch} />
          </div>
        );

      case "you":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
                className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition ${isDragging ? "border-aqua-500 bg-aqua-500/10" : "border-ink-200 bg-ink-50"}`}
              >
                {form.photoUrl ? <img src={form.photoUrl} alt="Your photo" className="h-full w-full object-cover" /> : <Upload className="h-6 w-6 text-ink-400" />}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-800">Profile photo <span className="ml-1 font-normal text-ink-400">Optional</span></p>
                <p className="mt-0.5 text-[13px] text-ink-600">Helps reception recognise you. JPEG, PNG or WEBP, up to 2 MB.</p>
                <div className="mt-2.5 flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50">{form.photoUrl ? "Change" : "Upload photo"}</button>
                  {form.photoUrl && <button type="button" onClick={() => setForm(p => ({ ...p, photoFile: null, photoUrl: "" }))} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">Remove</button>}
                </div>
                <input ref={fileInputRef} name="photoUrl" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                <FieldError message={errors.photoUrl} />
              </div>
            </div>

            <div>
              <Label htmlFor="reg-fullName">Full name</Label>
              <input id="reg-fullName" name="fullName" autoComplete="name" value={form.fullName} onChange={e => update("fullName", e.target.value)} placeholder="As on your ID" className={inputClass(!!errors.fullName)} />
              <FieldError message={errors.fullName} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="reg-dob">Date of birth</Label>
                <input id="reg-dob" name="dateOfBirth" type="date" autoComplete="bday" max={new Date().toISOString().split("T")[0]} min="1930-01-01" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} className={inputClass(!!errors.dateOfBirth)} />
                {age !== null && !errors.dateOfBirth && <p className="mt-2 text-[13px] text-ink-600">{age} years old{age < 18 ? ". A parent or guardian should complete this form." : ""}</p>}
                <FieldError message={errors.dateOfBirth} />
              </div>
              <div>
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2">{GENDERS.map(g => <Chip key={g} name="gender" selected={form.gender === g} onClick={() => update("gender", g)}>{g}</Chip>)}</div>
                <FieldError message={errors.gender} />
              </div>
            </div>

            <div>
              <Label>Blood group</Label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_GROUPS.map(g => <Chip key={g} name="bloodGroup" selected={form.bloodGroup === g} onClick={() => update("bloodGroup", g)}>{g}</Chip>)}
                <Chip name="bloodGroup" selected={form.bloodGroup === NOT_SURE_BLOOD} onClick={() => update("bloodGroup", NOT_SURE_BLOOD)}>Not known</Chip>
              </div>
              <FieldError message={errors.bloodGroup} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="reg-mobile">Mobile number</Label>
                <div className={`flex items-center rounded-xl border bg-white transition focus-within:ring-4 ${errors.mobileNumber ? "border-rose-300 focus-within:ring-rose-100" : "border-ink-200 focus-within:border-aqua-500 focus-within:ring-aqua-500/15"}`}>
                  <span className="pl-4 pr-2 text-[15px] font-medium text-ink-600">+91</span>
                  <input id="reg-mobile" name="mobileNumber" inputMode="numeric" autoComplete="tel-national" value={form.mobileNumber} onChange={e => update("mobileNumber", digitsOnly(e.target.value).slice(0, 10))} placeholder="98250 12345" className="w-full rounded-r-xl bg-transparent py-3 pr-4 text-[15px] tabular-nums text-ink-950 outline-none placeholder:text-ink-400" />
                </div>
                <p className="mt-2 text-[13px] text-ink-600">You'll sign in with a code sent to this number.</p>
                <FieldError message={errors.mobileNumber} />
              </div>
              <div>
                <Label htmlFor="reg-email" optional>Email</Label>
                <input id="reg-email" name="email" type="email" autoComplete="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" className={inputClass(!!errors.email)} />
                <FieldError message={errors.email} />
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={form.whatsappSameAsMobile} onChange={e => update("whatsappSameAsMobile", e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-ink-200 accent-[#16a9c4]" />
                <span>
                  <span className="block text-sm font-semibold text-ink-950">My WhatsApp number is the same</span>
                  <span className="block text-[13px] text-ink-600">Your payment link and invoice are sent on WhatsApp.</span>
                </span>
              </label>
              {!form.whatsappSameAsMobile && (
                <div className="mt-4">
                  <Label htmlFor="reg-whatsapp">WhatsApp number</Label>
                  <div className={`flex items-center rounded-xl border bg-white focus-within:ring-4 ${errors.whatsappNumber ? "border-rose-300 focus-within:ring-rose-100" : "border-ink-200 focus-within:border-aqua-500 focus-within:ring-aqua-500/15"}`}>
                    <span className="pl-4 pr-2 text-[15px] font-medium text-ink-600">+91</span>
                    <input id="reg-whatsapp" name="whatsappNumber" inputMode="numeric" value={form.whatsappNumber} onChange={e => update("whatsappNumber", digitsOnly(e.target.value).slice(0, 10))} placeholder="98250 12345" className="w-full rounded-r-xl bg-transparent py-3 pr-4 text-[15px] tabular-nums outline-none" />
                  </div>
                  <FieldError message={errors.whatsappNumber} />
                </div>
              )}
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <Label htmlFor="reg-address">House and street</Label>
                <input id="reg-address" name="address" autoComplete="street-address" value={form.address} onChange={e => update("address", e.target.value)} placeholder="Flat or house no., society, area" className={inputClass(!!errors.address)} />
                <FieldError message={errors.address} />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="reg-city">City</Label>
                  <input id="reg-city" name="city" autoComplete="address-level2" value={form.city} onChange={e => update("city", e.target.value)} className={inputClass(!!errors.city)} />
                  <FieldError message={errors.city} />
                </div>
                <div>
                  <Label htmlFor="reg-state">State</Label>
                  <input id="reg-state" name="state" autoComplete="address-level1" value={form.state} onChange={e => update("state", e.target.value)} className={inputClass(!!errors.state)} />
                  <FieldError message={errors.state} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="reg-pin">PIN code</Label>
                  <input id="reg-pin" name="pincode" inputMode="numeric" autoComplete="postal-code" value={form.pincode} onChange={e => update("pincode", digitsOnly(e.target.value).slice(0, 6))} placeholder="390007" className={`${inputClass(!!errors.pincode)} tabular-nums`} />
                  <FieldError message={errors.pincode} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
              <p className="flex items-center gap-2 font-semibold text-ink-950"><HeartPulse className="h-4 w-4 text-rose-500" /> Emergency contact</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-600">The person staff will call if anything happens at the pool. Please use someone other than yourself.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-ec-name">Their name</Label>
                  <input id="reg-ec-name" name="emergencyContactName" value={form.emergencyContactName} onChange={e => update("emergencyContactName", e.target.value)} className={inputClass(!!errors.emergencyContactName)} />
                  <FieldError message={errors.emergencyContactName} />
                </div>
                <div>
                  <Label htmlFor="reg-ec-phone">Their phone</Label>
                  <div className={`flex items-center rounded-xl border bg-white focus-within:ring-4 ${errors.emergencyContactNumber ? "border-rose-300 focus-within:ring-rose-100" : "border-ink-200 focus-within:border-aqua-500 focus-within:ring-aqua-500/15"}`}>
                    <span className="pl-4 pr-2 text-[15px] font-medium text-ink-600">+91</span>
                    <input id="reg-ec-phone" name="emergencyContactNumber" inputMode="numeric" value={form.emergencyContactNumber} onChange={e => update("emergencyContactNumber", digitsOnly(e.target.value).slice(0, 10))} className="w-full rounded-r-xl bg-transparent py-3 pr-4 text-[15px] tabular-nums outline-none" />
                  </div>
                  <FieldError message={errors.emergencyContactNumber} />
                </div>
              </div>
              <div className="mt-5">
                <Label>They are your</Label>
                <div className="flex flex-wrap gap-2">{RELATIONSHIPS.map(r => <Chip key={r} name="relationship" selected={form.relationship === r} onClick={() => update("relationship", r)}>{r}</Chip>)}</div>
                <FieldError message={errors.relationship} />
              </div>
            </div>
          </div>
        );

      case "review":
      default: {
        const rows: Array<{ label: string; value: string; step: number }> = [
          { label: "Plan", value: planLabel || "Not chosen", step: 0 },
          { label: "Pool time", value: chosenBatch ? `${chosenBatch.startTime} – ${chosenBatch.endTime}` : form.batch || "Not chosen", step: 1 },
          { label: "Name", value: [form.fullName, age !== null ? `${age} yrs` : "", form.gender].filter(Boolean).join(" · "), step: 2 },
          { label: "Mobile", value: form.mobileNumber ? `+91 ${form.mobileNumber}` : "", step: 2 },
          { label: "Address", value: [form.address, form.city, form.pincode].filter(Boolean).join(", "), step: 3 },
          { label: "Emergency", value: [form.emergencyContactName, form.relationship, form.emergencyContactNumber && `+91 ${form.emergencyContactNumber}`].filter(Boolean).join(" · "), step: 3 },
        ];
        return (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-[15px] font-semibold text-ink-950">Do you have any medical condition the coach should know about?<Req /></p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" name="medicalDetails" onClick={() => { update("hasMedicalCondition", false); update("medicalDetails", ""); }} aria-pressed={form.hasMedicalCondition === false}
                  className={`rounded-2xl border p-4 text-left transition ${form.hasMedicalCondition === false ? "border-aqua-500 bg-aqua-500/[0.06] ring-1 ring-aqua-500" : "border-ink-200 bg-white hover:border-ink-400"}`}>
                  <p className="font-semibold text-ink-950">No</p><p className="text-sm text-ink-600">I'm fit to swim</p>
                </button>
                <button type="button" onClick={() => update("hasMedicalCondition", true)} aria-pressed={form.hasMedicalCondition === true}
                  className={`rounded-2xl border p-4 text-left transition ${form.hasMedicalCondition === true ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400" : "border-ink-200 bg-white hover:border-ink-400"}`}>
                  <p className="font-semibold text-ink-950">Yes</p><p className="text-sm text-ink-600">I'll describe it</p>
                </button>
              </div>
              {form.hasMedicalCondition === true && (
                <textarea name="medicalDetails" value={form.medicalDetails} onChange={e => update("medicalDetails", e.target.value)} rows={3}
                  placeholder="For example: asthma, uses an inhaler; or epilepsy, last episode 2024" className={`${inputClass(!!errors.medicalDetails)} mt-4 resize-none`} />
              )}
              <FieldError message={errors.medicalDetails} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <p className="border-b border-ink-100 px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-400">Check your details</p>
              <dl className="divide-y divide-ink-100">
                {rows.map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <dt className="text-[13px] text-ink-400">{r.label}</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-ink-950">{r.value || <span className="text-rose-600">Missing</span>}</dd>
                    </div>
                    <button type="button" onClick={() => goTo(r.step)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-aqua-600 hover:bg-aqua-500/10"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
              <p className="text-sm font-semibold text-ink-950">Pool safety rules</p>
              <ul className="mt-3 space-y-2 text-[13px] leading-5 text-ink-600">
                {SAFETY_RULES.map(rule => <li key={rule} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aqua-600" />{rule}</li>)}
              </ul>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 shadow-card">
                <input name="agreedToRules" type="checkbox" checked={form.agreedToRules} onChange={e => update("agreedToRules", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#16a9c4]" />
                <span className="text-sm leading-6 text-ink-800">The details above are true, and I agree to follow the academy's safety rules.</span>
              </label>
              <FieldError message={errors.agreedToRules} />
            </div>
          </div>
        );
      }
    }
  })();

  const continueLabel = isLast ? (isSubmitting ? "Submitting…" : "Submit application") : `Continue to ${STEPS[step + 1].short.toLowerCase()}`;

  const summary = (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-panel">
      <div className="relative h-36 overflow-hidden">
        <img src={academyImage} alt="" className="h-full w-full object-cover object-[50%_25%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-aqua-300">Your membership</p>
            <p className="font-display text-lg font-semibold text-white">{academyName}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-ink-600">Plan</span><span className="text-right font-semibold text-ink-950">{category ? category.name : <span className="font-normal text-ink-400">Not chosen</span>}</span></div>
          {category && frequenciesFor(category.id).length > 1 && <div className="flex justify-between gap-3"><span className="text-ink-600">Schedule</span><span className="text-right font-semibold text-ink-950">{frequency ? frequency.name : <span className="font-normal text-ink-400">Not chosen</span>}</span></div>}
          <div className="flex justify-between gap-3"><span className="text-ink-600">Duration</span><span className="text-right font-semibold text-ink-950">{form.planDuration ? DURATION_LABEL[form.planDuration] : <span className="font-normal text-ink-400">Not chosen</span>}</span></div>
          <div className="flex justify-between gap-3"><span className="text-ink-600">Pool time</span><span className="text-right font-semibold tabular-nums text-ink-950">{chosenBatch ? `${chosenBatch.startTime} – ${chosenBatch.endTime}` : <span className="font-normal text-ink-400">Not chosen</span>}</span></div>
        </div>
        <div className="border-t border-dashed border-ink-200 pt-4 text-sm">
          <div className="flex justify-between"><span className="text-ink-600">Membership fee</span><span className="tabular-nums text-ink-950">{price === null ? "—" : rupees(price)}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-ink-600">Registration (one time)</span><span className="tabular-nums text-ink-950">{rupees(REGISTRATION_FEE)}</span></div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-semibold text-ink-950">Total</span>
            <span className="font-display text-2xl font-bold tabular-nums text-ink-950">{total === null ? "—" : rupees(total)}</span>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl bg-aqua-500/[0.07] p-3.5 text-[13px] leading-5 text-ink-700">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-aqua-600" />
          <span><strong className="font-semibold text-ink-950">Nothing to pay now.</strong> After the academy approves your application, you'll get a secure Razorpay link on WhatsApp.</span>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={topRef} className={`${embedded ? "rounded-2xl" : "min-h-screen"} bg-canvas text-ink-950`}>
      {/* Header */}
      <header className={`${embedded ? "" : "sticky top-0"} z-30 border-b border-ink-100 bg-white/90 backdrop-blur`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {academyId === "swim"
              ? <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-950 text-white"><Dumbbell className="h-4 w-4" /></span>}
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-semibold text-ink-950">Join {academyName}</p>
              <p className="text-[12px] text-ink-600">Step {step + 1} of {STEPS.length} · about 3 minutes</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 hover:text-ink-950">
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <ol className="flex gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex-1">
                <button type="button" disabled={i > maxStepReached} onClick={() => goTo(i)} className="group block w-full text-left disabled:cursor-default" aria-current={i === step ? "step" : undefined}>
                  <span className={`block h-1.5 rounded-full transition-colors duration-300 ${i < step ? "bg-aqua-500" : i === step ? "bg-ink-950" : "bg-ink-100"}`} />
                  <span className={`mt-1.5 hidden text-[12px] font-medium sm:block ${i === step ? "text-ink-950" : i <= maxStepReached ? "text-ink-600 group-hover:text-ink-950" : "text-ink-400"}`}>{s.short}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-36 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.section key={STEPS[step].id} {...slide} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
              <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink-950 sm:text-[34px]">{STEPS[step].title}</h1>
              <p className="mt-2 max-w-[60ch] text-[15px] leading-6 text-ink-600">
                {[
                  "Official 2026 rates. Longer plans cost less per month.",
                  "Live availability. Each batch is one hour in the pool.",
                  "We'll use this to set up your membership card.",
                  "Where you live, and who to call if you ever need help at the pool.",
                  "One last question, then a quick check before you submit.",
                ][step]}
              </p>

              <div className="mt-8">{stepBody}</div>

              {generalError && (
                <div className="mt-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {generalError}
                </div>
              )}

              {/* Desktop navigation */}
              <div className="mt-10 hidden items-center justify-between gap-4 lg:flex">
                {step > 0 ? (
                  <button type="button" onClick={() => goTo(step - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink-700 hover:bg-white">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : <span />}
                <button type="button" onClick={isLast ? handleSubmit : handleContinue} disabled={isSubmitting}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-ink-950 px-6 text-[15px] font-semibold text-white shadow-card transition hover:bg-ink-800 disabled:opacity-60">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {continueLabel}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </motion.section>
          </AnimatePresence>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-32">{summary}</div>
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className={`${embedded ? "sticky" : "fixed"} inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur lg:hidden`}>
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)} aria-label="Back" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ink-200 text-ink-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-600">{total === null ? "Total" : "Total, due after approval"}</p>
            <p className="font-display text-lg font-bold tabular-nums text-ink-950">{total === null ? "Choose a plan" : rupees(total)}</p>
          </div>
          <button type="button" onClick={isLast ? handleSubmit : handleContinue} disabled={isSubmitting}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-ink-950 px-5 text-[15px] font-semibold text-white disabled:opacity-60">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLast ? (isSubmitting ? "Submitting" : "Submit") : "Continue"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
