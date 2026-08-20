import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Smartphone, ArrowLeft, ShieldCheck, Mail, MapPin,
  Calendar, Heart, FileText, CheckCircle, AlertCircle,
  Clock, Activity, Check, Upload, Sparkles, UserCheck, Droplets,
  PhoneCall, ShieldAlert, HeartPulse, Sparkle, X
} from "lucide-react";
import { AcademyId, UserSession } from "../types";

interface RegisterPageProps {
  academyId: AcademyId;
  onRegisterSuccess: (session: UserSession) => void;
  onCancel: () => void;
}

interface FormState {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  mobileNumber: string;
  whatsappNumber: string;
  email: string;
  photoFile: File | null;
  photoUrl: string; // for local base64 preview
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relationship: string;
  memberType: string;
  batchCategory: "Learners" | "General" | "Family_4" | "Family_3" | "Guest" | "Group" | "";
  frequency: "6_days" | "3_days" | "hourly" | "fixed" | "";
  planDuration: "1_month" | "3_months" | "6_months" | "9_months" | "annual" | "hourly" | "one_time" | "";
  batch: string;
  hasMedicalCondition: boolean;
  medicalDetails: string;
  agreedToRules: boolean;
}

const INITIAL_FORM_STATE: FormState = {
  fullName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  mobileNumber: "",
  whatsappNumber: "",
  email: "",
  photoFile: null,
  photoUrl: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  relationship: "",
  memberType: "",
  batchCategory: "",
  frequency: "6_days",
  planDuration: "1_month",
  batch: "",
  hasMedicalCondition: false,
  medicalDetails: "",
  agreedToRules: false,
};

const BATCH_CATEGORIES = {
  morning: [
    { label: "05:00 AM - 06:00 AM", value: "Morning (5:00-6:00)" },
    { label: "06:00 AM - 07:00 AM", value: "Morning (6:00-7:00)" },
    { label: "07:00 AM - 08:00 AM", value: "Morning (7:00-8:00)" },
  ],
  evening: [
    { label: "04:00 PM - 05:00 PM", value: "Evening (4:00-5:00)" },
    { label: "05:00 PM - 06:00 PM", value: "Evening (5:00-6:00)" },
    { label: "06:00 PM - 07:00 PM", value: "Evening (6:00-7:00)" },
    { label: "07:00 PM - 08:00 PM", value: "Evening (7:00-8:00)" },
  ]
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDERS = ["Male", "Female", "Other"];

// Official Membership Types extracted from Baroda Swim Front (Effective 1st Feb 2026)
const BATCH_TYPES = [
  { 
    id: "Learners", 
    name: "Learners Batch", 
    desc: "Structured swimming stroke drills & water guidance under certified coaches." 
  },
  { 
    id: "General", 
    name: "General Batch", 
    desc: "Access to designated pool lanes for regular swimming practice & exercise." 
  },
  { 
    id: "Family_4", 
    name: "Family Membership (2 Adults + 2 Kids)", 
    desc: "Privileged family pool access pass (6 days / week)." 
  },
  { 
    id: "Family_3", 
    name: "Family Membership (2 Adults + 1 Kid)", 
    desc: "Privileged family pool access pass (6 days / week)." 
  },
  { 
    id: "Guest", 
    name: "Guest Entry (Anyone without Membership)", 
    desc: "Hourly pool entry pass (₹300 Mon-Fri / ₹350 Sat-Sun + Costume charges)." 
  },
  { 
    id: "Group", 
    name: "Group Booking (Max 50 Members)", 
    desc: "Private 2-hour group pool reservation for events & clubs (₹25,000)." 
  }
];

const FREQUENCY_OPTIONS = [
  { 
    id: "6_days", 
    name: "6 Days per Week", 
    subtitle: "Monday to Saturday (Full Schedule)" 
  },
  { 
    id: "3_days", 
    name: "3 Days per Week", 
    subtitle: "Alternate Days (MWF or TTS)" 
  }
];

// Exact Pricing Matrix Extracted from Official Document (From 1st Feb 2026 onwards)
const OFFICIAL_PRICING_MATRIX: Record<string, Record<string, Array<{ id: string; label: string; price: number; formattedPrice: string }>>> = {
  Learners: {
    "6_days": [
      { id: "1_month", label: "1 Month", price: 3500, formattedPrice: "₹3,500 / Month" },
      { id: "3_months", label: "3 Months", price: 9500, formattedPrice: "₹9,500" },
      { id: "6_months", label: "6 Months", price: 18500, formattedPrice: "₹18,500" },
      { id: "9_months", label: "9 Months", price: 26500, formattedPrice: "₹26,500" },
      { id: "annual", label: "Annual (1 Year)", price: 33500, formattedPrice: "₹33,500" },
    ],
    "3_days": [
      { id: "1_month", label: "1 Month", price: 3000, formattedPrice: "₹3,000 / Month" },
      { id: "3_months", label: "3 Months", price: 8500, formattedPrice: "₹8,500" },
      { id: "6_months", label: "6 Months", price: 16000, formattedPrice: "₹16,000" },
      { id: "9_months", label: "9 Months", price: 22500, formattedPrice: "₹22,500" },
      { id: "annual", label: "Annual (1 Year)", price: 28500, formattedPrice: "₹28,500" },
    ]
  },
  General: {
    "6_days": [
      { id: "1_month", label: "1 Month", price: 3000, formattedPrice: "₹3,000 / Month" },
      { id: "3_months", label: "3 Months", price: 8500, formattedPrice: "₹8,500" },
      { id: "6_months", label: "6 Months", price: 16000, formattedPrice: "₹16,000" },
      { id: "9_months", label: "9 Months", price: 22500, formattedPrice: "₹22,500" },
      { id: "annual", label: "Annual (1 Year)", price: 28500, formattedPrice: "₹28,500" },
    ],
    "3_days": [
      { id: "1_month", label: "1 Month", price: 2700, formattedPrice: "₹2,700 / Month" },
      { id: "3_months", label: "3 Months", price: 7500, formattedPrice: "₹7,500" },
      { id: "6_months", label: "6 Months", price: 14500, formattedPrice: "₹14,500" },
      { id: "9_months", label: "9 Months", price: 20500, formattedPrice: "₹20,500" },
      { id: "annual", label: "Annual (1 Year)", price: 25500, formattedPrice: "₹25,500" },
    ]
  },
  Family_4: {
    "6_days": [
      { id: "1_month", label: "1 Month", price: 10000, formattedPrice: "₹10,000 / Month" },
      { id: "3_months", label: "3 Months", price: 28500, formattedPrice: "₹28,500" },
    ]
  },
  Family_3: {
    "6_days": [
      { id: "1_month", label: "1 Month", price: 8000, formattedPrice: "₹8,000 / Month" },
      { id: "3_months", label: "3 Months", price: 22500, formattedPrice: "₹22,500" },
    ]
  },
  Guest: {
    "hourly": [
      { id: "hourly", label: "1 Hour Entry", price: 300, formattedPrice: "₹300 (Mon-Fri) / ₹350 (Sat-Sun)" }
    ]
  },
  Group: {
    "fixed": [
      { id: "one_time", label: "2 Hour Slot (Max 50 members)", price: 25000, formattedPrice: "₹25,000 (One Time)" }
    ]
  }
};

export function RegisterPage({ academyId, onRegisterSuccess, onCancel }: RegisterPageProps) {
  const isSwim = academyId === "swim";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showTariffModal, setShowTariffModal] = useState(false);

  // Background patterns & themed styling parameters
  const accentText = isSwim ? "text-sky-600" : "text-emerald-400";
  const accentBg = isSwim ? "bg-sky-600" : "bg-emerald-600";
  const accentBorder = isSwim ? "border-sky-200" : "border-emerald-800/60";
  const ringColor = isSwim ? "focus:ring-sky-500 focus:border-sky-500" : "focus:ring-emerald-500 focus:border-emerald-500";
  const themeCardBg = isSwim ? "bg-white border-slate-100 shadow-sm" : "bg-emerald-950/40 border-emerald-900/60 shadow-xl";
  const textPrimary = isSwim ? "text-slate-800" : "text-emerald-50";
  const textSecondary = isSwim ? "text-slate-500" : "text-emerald-300/80";
  const labelStyle = `block text-xs font-semibold tracking-wide uppercase mb-2 ${isSwim ? "text-slate-600" : "text-emerald-200"}`;
  const inputStyle = `w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none duration-150 ${
    isSwim 
      ? "bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white" 
      : "bg-emerald-900/30 border-emerald-800/50 text-emerald-100 placeholder-emerald-600/80 focus:bg-emerald-950/50"
  } ${ringColor}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleToggleMedical = (hasCondition: boolean) => {
    setForm(prev => ({ 
      ...prev, 
      hasMedicalCondition: hasCondition,
      medicalDetails: hasCondition ? prev.medicalDetails : "" 
    }));
    if (errors.medicalDetails) {
      setErrors(prev => ({ ...prev, medicalDetails: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: checked }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Image Upload Handling
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, photoUrl: "Only image files (JPEG, PNG, WEBP) are supported." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photoUrl: "Image file must be less than 2MB." }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({
        ...prev,
        photoFile: file,
        photoUrl: reader.result as string
      }));
      setErrors(prev => ({ ...prev, photoUrl: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photoFile: null, photoUrl: "" }));
  };

  // UI Validation Check
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";
    else if (form.fullName.trim().length < 3) newErrors.fullName = "Name must be at least 3 characters";

    if (!form.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!form.gender) newErrors.gender = "Gender is required";
    if (!form.bloodGroup) newErrors.bloodGroup = "Blood group is required";

    if (!form.mobileNumber) {
      newErrors.mobileNumber = "Mobile number is required";
    } else if (form.mobileNumber.replace(/\D/g, "").length !== 10) {
      newErrors.mobileNumber = "Mobile number must be exactly 10 digits";
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    if (form.whatsappNumber && !phoneRegex.test(form.whatsappNumber.replace(/\s+/g, ""))) {
      newErrors.whatsappNumber = "Must be a valid WhatsApp number";
    }

    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = "Must be a valid email address";
      }
    }

    if (!form.address.trim()) newErrors.address = "Address is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.state.trim()) newErrors.state = "State is required";

    const pinRegex = /^\d{6}$/;
    if (!form.pincode.trim()) {
      newErrors.pincode = "PIN Code is required";
    } else if (!pinRegex.test(form.pincode.trim())) {
      newErrors.pincode = "Must be a 6-digit PIN Code";
    }

    if (!form.emergencyContactName.trim()) newErrors.emergencyContactName = "Emergency contact name is required";
    
    if (!form.emergencyContactNumber) {
      newErrors.emergencyContactNumber = "Emergency phone number is required";
    } else if (!phoneRegex.test(form.emergencyContactNumber.replace(/\s+/g, ""))) {
      newErrors.emergencyContactNumber = "Must be a valid contact number";
    }

    if (!form.relationship.trim()) newErrors.relationship = "Relationship status is required";
    if (!form.memberType) newErrors.memberType = "Please select a membership plan";
    if (!form.batch) newErrors.batch = "Please select a training session batch";

    if (form.hasMedicalCondition && !form.medicalDetails.trim()) {
      newErrors.medicalDetails = "Please describe your medical conditions";
    }

    if (!form.agreedToRules) {
      newErrors.agreedToRules = "You must agree to the rules and regulations to proceed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (!validateForm()) {
      // Find the first error element and scroll to it
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const element = document.getElementsByName(firstErrorKey)[0];
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullName", form.fullName);
      formData.append("full_name", form.fullName);
      formData.append("dateOfBirth", form.dateOfBirth);
      formData.append("date_of_birth", form.dateOfBirth);
      formData.append("gender", form.gender);
      formData.append("bloodGroup", form.bloodGroup);
      formData.append("blood_group", form.bloodGroup);
      const cleanMobile = form.mobileNumber.replace(/\D/g, "");
      const finalMobile = "+91 " + cleanMobile;
      const finalWhatsapp = form.whatsappNumber 
        ? "+91 " + form.whatsappNumber.replace(/\D/g, "")
        : finalMobile;

      formData.append("mobileNumber", finalMobile);
      formData.append("mobile_number", finalMobile);
      formData.append("whatsappNumber", finalWhatsapp);
      formData.append("whatsapp_number", finalWhatsapp);
      formData.append("email", form.email || "");
      formData.append("address", form.address);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("pincode", form.pincode);
      formData.append("emergencyContactName", form.emergencyContactName);
      formData.append("emergency_contact_name", form.emergencyContactName);
      formData.append("emergencyContactNumber", form.emergencyContactNumber);
      formData.append("emergency_contact_number", form.emergencyContactNumber);
      formData.append("relationship", form.relationship);
      formData.append("memberType", form.memberType);
      formData.append("member_type", form.memberType);
      formData.append("batch", form.batch);
      formData.append("academyId", academyId);
      formData.append("academy_id", academyId);
      formData.append("hasMedicalCondition", String(form.hasMedicalCondition));
      formData.append("has_medical_condition", String(form.hasMedicalCondition));
      formData.append("medicalDetails", form.medicalDetails);
      formData.append("medical_details", form.medicalDetails);

      if (form.photoFile) {
        formData.append("photo", form.photoFile);
      }

      const response = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldMap: Record<string, keyof FormState> = {
          full_name: "fullName",
          date_of_birth: "dateOfBirth",
          gender: "gender",
          mobile_number: "mobileNumber",
          whatsapp_number: "whatsappNumber",
          email: "email",
          address: "address",
          city: "city",
          state: "state",
          pincode: "pincode",
          emergency_contact_name: "emergencyContactName",
          emergency_contact_number: "emergencyContactNumber",
          member_type: "memberType",
          batch: "batch",
          medical_details: "medicalDetails"
        };

        if (data.errors && Array.isArray(data.errors)) {
          const newErrors: Partial<Record<keyof FormState, string>> = {};
          data.errors.forEach((err: any) => {
            const frontendField = fieldMap[err.field] || err.field;
            newErrors[frontendField as keyof FormState] = err.message;
          });
          setErrors(newErrors);
          
          const firstErrorKey = Object.keys(newErrors)[0];
          if (firstErrorKey) {
            const element = document.getElementsByName(firstErrorKey)[0];
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else if (data.error) {
          const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || "An error occurred");
          if (/email/i.test(errMsg)) {
            setErrors(prev => ({ ...prev, email: errMsg }));
            const element = document.getElementsByName("email")[0];
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (/mobile|phone/i.test(errMsg)) {
            setErrors(prev => ({ ...prev, mobileNumber: errMsg }));
            const element = document.getElementsByName("mobileNumber")[0];
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            setGeneralError(errMsg);
          }
        } else {
          setGeneralError(data.message || "An error occurred during registration. Please check your details.");
        }
        setIsSubmitting(false);
        return;
      }

      setSubmittedData({
        applicationNumber: data.data?.application_number || `APP-${Date.now()}`,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        mobileNumber: "+91 " + form.mobileNumber.replace(/\D/g, ""),
        whatsappNumber: "+91 " + (form.whatsappNumber || form.mobileNumber).replace(/\D/g, ""),
        email: form.email || "Not Provided",
        photoUrl: data.data?.photoUrl || form.photoUrl || null,
        address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
        emergencyContact: `${form.emergencyContactName} (${form.relationship}) - ${form.emergencyContactNumber}`,
        memberType: form.memberType,
        batch: form.batch,
        medicalStatus: form.hasMedicalCondition ? form.medicalDetails : "No medical conditions declared",
        registrationStatus: "Pending",
        adminApproval: "Pending",
        paymentStatus: "Pending",
        loginEnabled: "False"
      });

      // Dispatch global window event so any open dashboards auto-refresh their member list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sams_member_registered", { detail: data.data }));
      }

      // Clear the form
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      setGeneralError(null);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error(err);
      setGeneralError("Network error: Could not reach the registration server.");
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM_STATE);
    setErrors({});
    setSubmittedData(null);
  };

  // Success Screen Receipt Rendering
  if (submittedData) {
    return (
      <div className={`min-h-screen w-full flex flex-col justify-center items-center py-16 px-4 ${
        isSwim ? "bg-slate-50 text-slate-800" : "bg-[#021d14] text-emerald-50"
      }`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-xl p-8 md:p-12 rounded-[32px] border text-center shadow-2xl space-y-8 ${
            isSwim ? "bg-white border-slate-100" : "bg-emerald-950/40 border-emerald-900/60"
          }`}
        >
          {/* Brand/Check Icon */}
          <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-10 h-10 animate-bounce" />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isSwim ? "text-slate-900" : "text-white"}`}>
              Your application has been submitted successfully.
            </h2>
            <p className={`text-sm md:text-base font-medium opacity-80 ${isSwim ? "text-slate-600" : "text-emerald-200"}`}>
              Our team will verify your details.
            </p>
          </div>

          {/* WhatsApp Guidance Panel */}
          <div className={`p-6 rounded-2xl border text-sm text-left leading-relaxed ${
            isSwim 
              ? "bg-emerald-50/50 border-emerald-100 text-slate-700" 
              : "bg-emerald-900/10 border-emerald-900/40 text-emerald-100/90"
          }`}>
            <p className="font-bold flex items-center gap-2 mb-3 text-emerald-500 text-xs uppercase tracking-wider">
              <span className="text-base">💬</span>
              Official Gateway Notice
            </p>
            <p className="font-semibold text-xs md:text-sm">
              Once approved, you will receive a WhatsApp message containing your secure payment link.
            </p>
            <p className="font-semibold text-xs md:text-sm mt-3 border-t border-emerald-500/10 pt-3">
              After successful payment, your membership will be activated automatically.
            </p>
          </div>

          {/* CTAs */}
          <div className="pt-4 border-t border-current/10 flex flex-col sm:flex-row gap-4">
            <button
              id="btn-confirm-return"
              onClick={onCancel}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSwim
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  : "bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-200 border border-emerald-800/40"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sports Selection</span>
            </button>
            <button
              id="btn-register-another"
              onClick={handleReset}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${accentBg}`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Register Another</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col justify-start items-center pt-32 pb-20 px-4 md:px-8 relative z-10 transition-colors duration-500 ${
      isSwim ? "bg-slate-50 text-slate-800" : "bg-[#011a12] text-emerald-50"
    }`}>
      {/* Visual background atmospheric glowing accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-gradient-to-tr from-sky-400/10 to-teal-400/5 blur-3xl pointer-events-none rounded-full" />
      
      <div className="w-full max-w-4xl relative">
        
        {/* Portal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <button 
              id="btn-register-cancel"
              onClick={onCancel}
              className={`group flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all duration-200 cursor-pointer mb-3 ${
                isSwim 
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100" 
                  : "border-emerald-800/60 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/60"
              }`}
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Go Back
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              Member Registration
              <Sparkle className={`w-6 h-6 ${accentText} animate-pulse`} />
            </h1>
            <p className={`text-sm mt-1 max-w-xl ${textSecondary}`}>
              Complete the unified enrollment application details to register as a new active member of the {isSwim ? "Baroda Swim Front" : "SAMS Elite Club"}.
            </p>
          </div>

          <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${themeCardBg}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSwim ? "bg-sky-50" : "bg-emerald-900/40"}`}>
              {isSwim ? <Droplets className="w-5 h-5 text-sky-600" /> : <Activity className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Academy Context</p>
              <p className={`text-xs font-bold ${accentText}`}>{isSwim ? "Baroda Swim Academy" : "SAMS Cricket Academy"}</p>
            </div>
          </div>
        </div>

        {/* Core Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          
          {generalError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Registration Error</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">{generalError}</p>
              </div>
            </div>
          )}
          
          {/* Grid Layout of Bento Section Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Column 1: Personal Details & Emergency Contact (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Card 1: Personal Details */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">1. Personal Profile</h3>
                    <p className={`text-xs ${textSecondary}`}>Standard member identity & contact data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className={labelStyle}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        className={inputStyle}
                        placeholder="e.g. Krish Prajapati"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className={labelStyle}>
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className={inputStyle}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className={labelStyle}>
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className={inputStyle}
                    >
                      <option value="">Select Gender</option>
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.gender}
                      </p>
                    )}
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className={labelStyle}>
                      Blood Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={handleChange}
                      className={inputStyle}
                    >
                      <option value="">Select Group</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                    {errors.bloodGroup && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.bloodGroup}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className={labelStyle}>
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className={`absolute left-4 text-sm font-semibold pointer-events-none ${isSwim ? "text-slate-500" : "text-emerald-300"}`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={form.mobileNumber}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setForm(prev => ({ ...prev, mobileNumber: clean }));
                          if (errors.mobileNumber) {
                            setErrors(prev => ({ ...prev, mobileNumber: undefined }));
                          }
                        }}
                        className={`${inputStyle} pl-14`}
                        placeholder="98765 43210"
                      />
                    </div>
                    {errors.mobileNumber && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.mobileNumber}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Number */}
                  <div>
                    <label className={labelStyle}>
                      WhatsApp Number <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={form.whatsappNumber}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="Leave blank to use Mobile No"
                    />
                    {errors.whatsappNumber && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.whatsappNumber}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className={labelStyle}>
                      Email Address <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="e.g. mail@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Profile Photo upload */}
                <div className="space-y-3">
                  <label className={labelStyle}>Profile Photograph</label>
                  
                  {form.photoUrl ? (
                    <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                      isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-950/30 border-emerald-900/40"
                    }`}>
                      <img 
                        src={form.photoUrl} 
                        alt="Profile Preview" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-300 shadow-sm"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold">Photograph Ready</p>
                        <p className={`text-[11px] ${textSecondary}`}>This file will be submitted as your member profile avatar.</p>
                      </div>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="text-xs font-bold text-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                        isDragging 
                          ? "border-sky-500 bg-sky-50/20 scale-99" 
                          : isSwim 
                            ? "border-slate-300 hover:border-slate-400 bg-slate-50/30" 
                            : "border-emerald-800/50 hover:border-emerald-700/80 bg-emerald-950/10"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSwim ? "bg-slate-100 text-slate-500" : "bg-emerald-900/40 text-emerald-400"
                      }`}>
                        <Upload className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Drag & drop profile picture, or <span className={accentText}>browse files</span></p>
                        <p className="text-[10px] text-slate-400 mt-1">Accepts JPEG, PNG or WEBP. Max file size: 2MB.</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  )}
                  {errors.photoUrl && (
                    <p className="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.photoUrl}
                    </p>
                  )}
                </div>
              </div>

              {/* Card 2: Residential Address */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">2. Address Details</h3>
                    <p className={`text-xs ${textSecondary}`}>Physical address specifications</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelStyle}>
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="Flat No, Wing, Housing Society Name, Area"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelStyle}>
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        className={inputStyle}
                        placeholder="e.g. Vadodara"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelStyle}>
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        className={inputStyle}
                        placeholder="e.g. Gujarat"
                      />
                      {errors.state && (
                        <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {errors.state}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelStyle}>
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        maxLength={6}
                        value={form.pincode}
                        onChange={handleChange}
                        className={inputStyle}
                        placeholder="e.g. 390001"
                      />
                      {errors.pincode && (
                        <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {errors.pincode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Emergency Contacts */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">3. Emergency Contact</h3>
                    <p className={`text-xs ${textSecondary}`}>Primary reference contact during critical conditions</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelStyle}>
                      Contact Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={form.emergencyContactName}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="e.g. Paresh Prajapati"
                    />
                    {errors.emergencyContactName && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.emergencyContactName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="emergencyContactNumber"
                      value={form.emergencyContactNumber}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="e.g. 9825012345"
                    />
                    {errors.emergencyContactNumber && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.emergencyContactNumber}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelStyle}>
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="relationship"
                      value={form.relationship}
                      onChange={handleChange}
                      className={inputStyle}
                      placeholder="e.g. Father, Spouse, Friend"
                    />
                    {errors.relationship && (
                      <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.relationship}
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Column 2: Membership & Session & Medical (5 Cols) */}
            <div className="lg:col-span-5 space-y-8">
              
              {/* Card 4: Membership Tier & Pricing Structure */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center justify-between border-b pb-4 border-slate-100/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold">4. Membership & Pricing Plan</h3>
                      <p className={`text-xs ${textSecondary}`}>Baroda Swim Front Official Fee Schedule (From 1st Feb 2026)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTariffModal(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      isSwim 
                        ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100" 
                        : "border-emerald-700/60 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/80"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Rate Card</span>
                  </button>
                </div>

                {/* Step 1: Batch Category Selection */}
                <div className="space-y-3">
                  <label className={labelStyle}>
                    Select Membership Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BATCH_TYPES.map(b => {
                      const selected = form.batchCategory === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            let defaultFreq = "6_days";
                            if (b.id === "Guest") defaultFreq = "hourly";
                            if (b.id === "Group") defaultFreq = "fixed";

                            const availableTiers = OFFICIAL_PRICING_MATRIX[b.id]?.[defaultFreq] || [];
                            const defaultDur = availableTiers[0]?.id || "1_month";
                            const defaultTier = availableTiers[0];

                            const memTypeStr = `${b.name} (${defaultTier?.formattedPrice || "Selected"})`;

                            setForm(prev => ({ 
                              ...prev, 
                              batchCategory: b.id as any,
                              frequency: defaultFreq as any,
                              planDuration: defaultDur as any,
                              memberType: memTypeStr 
                            }));
                            if (errors.memberType) setErrors(prev => ({ ...prev, memberType: undefined }));
                          }}
                          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                            selected 
                              ? isSwim 
                                ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20 shadow-sm"
                                : "border-emerald-500 bg-emerald-950/80 ring-2 ring-emerald-500/20 shadow-lg"
                              : isSwim 
                                ? "border-slate-200 hover:bg-slate-50/80" 
                                : "border-emerald-800/40 hover:bg-emerald-900/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold">{b.name}</span>
                            {selected && (
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${accentBg}`}>
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <p className={`text-[11px] mt-1.5 leading-normal ${textSecondary}`}>{b.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Frequency Selection (for Learners and General) */}
                {form.batchCategory && (form.batchCategory === "Learners" || form.batchCategory === "General") && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-2 border-t border-slate-100/10"
                  >
                    <label className={labelStyle}>
                      Weekly Schedule Frequency <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {FREQUENCY_OPTIONS.map(freq => {
                        const selected = form.frequency === freq.id;
                        return (
                          <div
                            key={freq.id}
                            onClick={() => {
                              const categoryObj = BATCH_TYPES.find(b => b.id === form.batchCategory);
                              const availableTiers = OFFICIAL_PRICING_MATRIX[form.batchCategory]?.[freq.id] || [];
                              const selectedTier = availableTiers.find(t => t.id === form.planDuration) || availableTiers[0];
                              
                              const memTypeStr = `${categoryObj?.name || form.batchCategory} - ${freq.id === "6_days" ? "6 Days/Wk" : "3 Days/Wk"} (${selectedTier?.label}: ${selectedTier?.formattedPrice})`;

                              setForm(prev => ({
                                ...prev,
                                frequency: freq.id as any,
                                planDuration: (selectedTier?.id || "1_month") as any,
                                memberType: memTypeStr
                              }));
                            }}
                            className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                              selected
                                ? isSwim
                                  ? "border-sky-500 bg-sky-500 text-white font-bold shadow-sm"
                                  : "border-emerald-500 bg-emerald-600 text-white font-bold shadow-md"
                                : isSwim
                                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  : "border-emerald-800/40 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/20"
                            }`}
                          >
                            <span className="text-xs block font-bold">{freq.name}</span>
                            <span className={`text-[10px] block mt-0.5 opacity-80 font-normal`}>{freq.subtitle}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Duration & Official Pricing Tiers */}
                {form.batchCategory && form.frequency && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-2 border-t border-slate-100/10"
                  >
                    <div className="flex justify-between items-center">
                      <label className={labelStyle}>
                        Select Plan Duration & Price <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-mono text-amber-500 font-bold uppercase">Official Feb 2026 Rate</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(OFFICIAL_PRICING_MATRIX[form.batchCategory]?.[form.frequency] || []).map((tier) => {
                        const selected = form.planDuration === tier.id;
                        return (
                          <div
                            key={tier.id}
                            onClick={() => {
                              const categoryObj = BATCH_TYPES.find(b => b.id === form.batchCategory);
                              const freqText = form.frequency === "6_days" ? "6 Days/Wk" : form.frequency === "3_days" ? "3 Days/Wk" : "";
                              const memTypeStr = `${categoryObj?.name} ${freqText ? `- ${freqText}` : ""} (${tier.label}: ${tier.formattedPrice})`;

                              setForm(prev => ({
                                ...prev,
                                planDuration: tier.id as any,
                                memberType: memTypeStr
                              }));
                            }}
                            className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                              selected
                                ? isSwim
                                  ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500 text-slate-900 shadow-sm"
                                  : "border-emerald-400 bg-emerald-900/60 ring-2 ring-emerald-400 text-white shadow-md"
                                : isSwim
                                  ? "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 text-slate-800"
                                  : "border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-900/20 text-emerald-100"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold block">{tier.label}</span>
                              {selected && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              )}
                            </div>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                              {tier.formattedPrice}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Fee Breakdown Calculation Pill */}
                {form.memberType && (() => {
                  const tiers = OFFICIAL_PRICING_MATRIX[form.batchCategory]?.[form.frequency] || [];
                  const activeTier = tiers.find(t => t.id === form.planDuration) || tiers[0];
                  const basePrice = activeTier?.price || 0;
                  const registrationFee = 300;
                  const grandTotal = basePrice + registrationFee;

                  return (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      isSwim ? "bg-sky-50/80 border-sky-200 text-sky-950" : "bg-emerald-950/70 border-emerald-800/60 text-emerald-100"
                    }`}>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="opacity-80">Selected Plan Fee:</span>
                        <span className="font-bold">₹{basePrice.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="opacity-80">Form & Registration Fee (One-Time):</span>
                        <span className="font-bold text-amber-500">+ ₹300</span>
                      </div>
                      <div className="pt-2 border-t border-slate-300/30 dark:border-emerald-800/40 flex justify-between items-center font-extrabold text-sm">
                        <span>Total Initial Payment:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">₹{grandTotal.toLocaleString("en-IN")}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-emerald-300/60 italic pt-1">
                        * Costume charges ₹50/hr & additional coaching ₹1,500/member/hr billed separately as applicable.
                      </p>
                    </div>
                  );
                })()}

                {errors.memberType && (
                  <p className="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.memberType}
                  </p>
                )}
              </div>

              {/* Card 5: Batch Selection */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">5. Training Session Batch</h3>
                    <p className={`text-xs ${textSecondary}`}>Select preferred morning or evening timings</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Morning Slots */}
                  <div>
                    <p className={`text-xs font-bold tracking-wider mb-2 flex items-center gap-1.5 ${isSwim ? "text-slate-400" : "text-emerald-300"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Morning Batches
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {BATCH_CATEGORIES.morning.map(b => {
                        const isSelected = form.batch === b.value;
                        return (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, batch: b.value }));
                              if (errors.batch) setErrors(prev => ({ ...prev, batch: undefined }));
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-xs text-left font-semibold transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? isSwim 
                                  ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                  : "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                : isSwim
                                  ? "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                                  : "border-emerald-800/40 hover:bg-emerald-900/20 text-emerald-200 bg-emerald-950/20"
                            }`}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evening Slots */}
                  <div>
                    <p className={`text-xs font-bold tracking-wider mb-2 flex items-center gap-1.5 ${isSwim ? "text-slate-400" : "text-emerald-300"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Evening Batches
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {BATCH_CATEGORIES.evening.map(b => {
                        const isSelected = form.batch === b.value;
                        return (
                          <button
                            key={b.value}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, batch: b.value }));
                              if (errors.batch) setErrors(prev => ({ ...prev, batch: undefined }));
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-xs text-left font-semibold transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? isSwim 
                                  ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                  : "bg-emerald-500 text-white border-emerald-500 shadow-md"
                                : isSwim
                                  ? "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                                  : "border-emerald-800/40 hover:bg-emerald-900/20 text-emerald-200 bg-emerald-950/20"
                            }`}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {errors.batch && (
                    <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.batch}
                    </p>
                  )}
                </div>
              </div>

              {/* Card 6: Medical Declaration */}
              <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
                <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">6. Medical Condition</h3>
                    <p className={`text-xs ${textSecondary}`}>Declare physical fitness constraints</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className={labelStyle}>Do you have any existing medical conditions? <span className="text-red-500">*</span></label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleMedical(true)}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        form.hasMedicalCondition
                          ? isSwim 
                            ? "bg-amber-500 text-white border-amber-500" 
                            : "bg-amber-600 text-white border-amber-600"
                          : isSwim
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-emerald-800/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/10"
                      }`}
                    >
                      Yes, I have
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMedical(false)}
                      className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !form.hasMedicalCondition
                          ? isSwim 
                            ? "bg-slate-700 text-white border-slate-700" 
                            : "bg-emerald-800 text-white border-emerald-800"
                          : isSwim
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-emerald-800/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/10"
                      }`}
                    >
                      No conditions
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {form.hasMedicalCondition && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        <label className={labelStyle}>
                          Describe Medical Conditions <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="medicalDetails"
                          value={form.medicalDetails}
                          onChange={handleChange}
                          rows={3}
                          className={`${inputStyle} resize-none`}
                          placeholder="Please supply illness records, surgeries, breathing constraints, asthma, cardiovascular issues, epilepsy or physical allergies."
                        />
                        {errors.medicalDetails && (
                          <p className="text-red-500 text-xs font-medium flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {errors.medicalDetails}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>

          </div>

          {/* Rules, Declaration & Submit Block */}
          <div className={`rounded-3xl border p-6 md:p-8 space-y-6 ${themeCardBg}`}>
            <div className="flex items-center gap-3 border-b pb-4 border-slate-100/10">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-emerald-400"}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-md font-bold">7. Code of Conduct & Declaration</h3>
                <p className={`text-xs ${textSecondary}`}>Read and accept the safety rules of the training academy</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-xs space-y-2 leading-relaxed ${
              isSwim ? "bg-sky-50/50 border-sky-100 text-slate-600" : "bg-emerald-950/50 border-emerald-900/60 text-emerald-100/80"
            }`}>
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Safety Regulations Outline
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Active members must obey general swimming instructions issued by the chief coach on the deck.</li>
                <li>Proper swimming attire (swimwear and standard silicone swim cap) is strictly mandatory before entering the pool water.</li>
                <li>Members diagnosed with physical or medical ailments like epilepsy, skin issues, or cardiac troubles must report accurate health logs.</li>
                <li>The administration holds absolute reservation rights to reject application requests or suspend access in case of behavior disputes.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreedToRules"
                  checked={form.agreedToRules}
                  onChange={handleCheckboxChange}
                  className={`mt-0.5 w-4.5 h-4.5 rounded border text-sky-600 ${
                    isSwim ? "border-slate-300" : "border-emerald-800 bg-emerald-950"
                  } focus:ring-sky-500`}
                />
                <span className={`text-xs select-none font-semibold ${isSwim ? "text-slate-700" : "text-emerald-100"}`}>
                  I hereby state that the details compiled in this member registration application form are true to my knowledge. I fully agree to comply with the safety rules, regulations, and declarations of SAMS Academy. <span className="text-red-500">*</span>
                </span>
              </label>

              {errors.agreedToRules && (
                <p className="text-red-500 text-xs font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.agreedToRules}
                </p>
              )}
            </div>

            {/* Form CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100/10">
              <button
                type="button"
                onClick={onCancel}
                className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm transition-all text-center border cursor-pointer active:scale-98 ${
                  isSwim 
                    ? "border-slate-200 bg-white hover:bg-slate-100 text-slate-700" 
                    : "border-emerald-800/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/20"
                }`}
              >
                Cancel Registration
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-white text-sm transition-all text-center shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 ${accentBg}`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/ajax/libs/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Record...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Registration Form
                  </>
                )}
              </button>
            </div>

          </div>

        </form>

      </div>

      {/* Official Tariff Schedule Modal */}
      <AnimatePresence>
        {showTariffModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-left"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-sky-600 dark:text-sky-400 uppercase font-bold">
                    Official Fee Schedule Document
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Baroda Swim Front
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Membership charges — <span className="font-semibold text-amber-600 dark:text-amber-400">From 1st Feb 2026 onwards</span>
                  </p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                    Mob: <a href="tel:9313241071" className="underline hover:text-sky-500 font-bold">9313241071</a>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTariffModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Rate Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-sky-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700 w-12 text-center">SL.NO.</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[200px]">Details</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700 min-w-[120px]">Week days / duration</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700">1 Month</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700">3 Months</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700">6 Months</th>
                      <th className="p-3 border-b border-r border-slate-200 dark:border-slate-700">9 Months</th>
                      <th className="p-3 border-b border-slate-200 dark:border-slate-700">Annually</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">1</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Learners batch (members only)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">6days/ week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹3,500/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹9,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹18,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹26,500</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">₹33,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">2</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Learners batch (members only)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">3 days/ week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹3,000/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹8,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹16,000</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹22,500</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">₹28,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">3</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">General batch (members only)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">6days/ week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹3,000/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹8,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹16,000</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹22,500</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">₹28,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">4</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">General batch (members only)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">3days/week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹2,700/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹7,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹14,500</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹20,500</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">₹25,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">5</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Family Membership (2 adults + 2 kids)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">6days/week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹10,000/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹28,500</td>
                      <td className="p-3 text-center opacity-40 border-r border-slate-200 dark:border-slate-800">-</td>
                      <td className="p-3 text-center opacity-40 border-r border-slate-200 dark:border-slate-800">-</td>
                      <td className="p-3 text-center opacity-40">-</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">6</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Family Membership (2 adults + 1 kids)</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">6days/week</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹8,000/month</td>
                      <td className="p-3 font-mono border-r border-slate-200 dark:border-slate-800">₹22,500</td>
                      <td className="p-3 text-center opacity-40 border-r border-slate-200 dark:border-slate-800">-</td>
                      <td className="p-3 text-center opacity-40 border-r border-slate-200 dark:border-slate-800">-</td>
                      <td className="p-3 text-center opacity-40">-</td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">7</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Anyone without membership</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">1 hour</td>
                      <td className="p-3 font-mono text-[11px] border-r border-slate-200 dark:border-slate-800 col-span-5" colSpan={5}>
                        ₹300 (Mon to Fri) / ₹350 (Sat & Sun) + extra costume charges
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">8</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Group charges</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">2 hour</td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400 border-r border-slate-200 dark:border-slate-800" colSpan={5}>
                        ₹25,000/- (One Time) — (Max 50 members)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-amber-50/40 dark:bg-amber-950/20">
                      <td className="p-3 text-center font-bold border-r border-slate-200 dark:border-slate-800">10</td>
                      <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">Form and Registration</td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">One Time</td>
                      <td className="p-3 font-mono font-extrabold text-sky-600 dark:text-sky-400" colSpan={5}>
                        ₹300/- (One Time)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Additional Rules & Footnotes */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Additional Coaching & Costume Directives:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li><strong>Additional coaching charges:</strong> ₹1,500 / member / hour (3 lessons / week)</li>
                  <li><strong>Costume charges:</strong> ₹50/- per hour</li>
                  <li><strong>Mandatory Safety Rule:</strong> Costume is compulsory for everyone in the pool</li>
                </ul>
              </div>

              {/* Modal Close CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTariffModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Close Rate Card
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
