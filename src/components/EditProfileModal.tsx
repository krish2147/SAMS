import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Camera, Phone, User, Heart, Upload, Check, AlertCircle, RefreshCw, MapPin, ShieldAlert, Activity
} from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
  onSave: (updatedProfile: any) => Promise<void>;
  isSwim: boolean;
}

// Preset sports avatars for quick pick if user does not wish to upload
const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150", // Female swimmer/athlete feel
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150", // Male athlete feel
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150", // Professional/athlete feel
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150", // Active feel
];

export function EditProfileModal({ isOpen, onClose, currentProfile, onSave, isSwim }: EditProfileModalProps) {
  const [mobileNo, setMobileNo] = useState(currentProfile?.mobileNo || "");
  
  // Emergency Contact Info
  const [emergencyName, setEmergencyName] = useState(currentProfile?.emergencyName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentProfile?.emergencyPhone || currentProfile?.emergencyMobile || ""
  );
  const [emergencyRelation, setEmergencyRelation] = useState(currentProfile?.emergencyRelation || "Father");
  const [photoUrl, setPhotoUrl] = useState(currentProfile?.photoUrl || currentProfile?.photo || "");

  // Residential Address Info
  const [addressLine1, setAddressLine1] = useState(currentProfile?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(currentProfile?.addressLine2 || "");
  const [city, setCity] = useState(currentProfile?.city || "Vadodara");
  const [stateValue, setStateValue] = useState(currentProfile?.state || "Gujarat");
  const [pincode, setPincode] = useState(currentProfile?.pincode || "");

  // Parent / Guardian Info
  const [parentName, setParentName] = useState(currentProfile?.parentName || "");
  const [parentMobile, setParentMobile] = useState(currentProfile?.parentMobile || "");
  const [parentRelation, setParentRelation] = useState(currentProfile?.parentRelation || "Father");

  // Medical Info
  const [hasMedicalCondition, setHasMedicalCondition] = useState(currentProfile?.hasMedicalCondition || "No");
  const [medicalDetails, setMedicalDetails] = useState(currentProfile?.medicalDetails || "");
  const [bloodGroup, setBloodGroup] = useState(currentProfile?.bloodGroup || "O+");
  
  // UI & interaction states
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Validation
  const validateForm = () => {
    if (!mobileNo.trim()) {
      setErrorMessage("Primary contact number is required.");
      return false;
    }
    const cleanPhone = mobileNo.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit primary contact number.");
      return false;
    }

    if (!emergencyName.trim()) {
      setErrorMessage("Emergency contact name is required.");
      return false;
    }

    if (!emergencyPhone.trim()) {
      setErrorMessage("Emergency contact number is required.");
      return false;
    }
    const cleanEmergencyPhone = emergencyPhone.replace(/\D/g, "");
    if (cleanEmergencyPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit emergency contact number.");
      return false;
    }

    if (!addressLine1.trim()) {
      setErrorMessage("Address Line 1 is required.");
      return false;
    }

    if (!city.trim()) {
      setErrorMessage("City is required.");
      return false;
    }

    if (!pincode.trim() || pincode.replace(/\D/g, "").length !== 6) {
      setErrorMessage("Please enter a valid 6-digit Pincode.");
      return false;
    }

    setErrorMessage("");
    return true;
  };

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
      setErrorMessage("Only image files (JPEG, PNG, WEBP) are supported.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage("Image size exceeds the 4MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
      setErrorMessage("");
    };
    reader.readAsDataURL(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      const updatedData = {
        membershipNo: currentProfile?.membershipNo,
        mobileNo: mobileNo.trim(),
        emergencyName: emergencyName.trim(),
        emergencyPhone: emergencyPhone.trim(),
        emergencyMobile: emergencyPhone.trim(),
        emergencyRelation: emergencyRelation,
        photoUrl: photoUrl,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        pincode: pincode.trim(),
        parentName: parentName.trim(),
        parentMobile: parentMobile.trim(),
        parentRelation: parentRelation,
        hasMedicalCondition: hasMedicalCondition,
        medicalDetails: medicalDetails.trim(),
        bloodGroup: bloodGroup
      };

      await onSave(updatedData);
      setSuccessMessage("Profile updated and synchronized successfully!");
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while updating profile details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeColor = isSwim ? "sky" : "emerald";
  const btnColorClass = isSwim 
    ? "bg-sky-500 hover:bg-sky-600 focus:ring-sky-400 text-white" 
    : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white font-bold";
  const modalBg = "bg-white text-slate-800 border border-slate-100";
  const inputBgClass = "bg-slate-50 border-slate-200 text-slate-950 focus:border-sky-400 focus:bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ cubicBezier: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className={`relative w-full max-w-2xl ${modalBg} rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col`}
      >
        {/* Top Accent Strip */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${isSwim ? "from-sky-400 to-sky-600" : "from-emerald-400 to-emerald-600"}`} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 md:p-8 pb-4 border-b border-slate-100 shrink-0 text-left">
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">SAMS PROFILE SYSTEM</span>
          <h3 className="text-xl font-black mt-1 text-slate-900">Update Member Information</h3>
          <p className="text-xs text-slate-500 mt-0.5">Keep your photo, personal contact details, residential address, and emergency contacts current.</p>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-left">
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-600 flex items-center gap-3"
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                <span className="font-semibold">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-3"
              >
                <Check className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                <span className="font-semibold">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. PHOTO UPDATE */}
          <div className="space-y-3.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              1. ATHLETE PROFILE IMAGE
            </span>

            <div className="flex flex-col md:flex-row gap-5 items-center">
              <div className="relative group select-none shrink-0">
                <img 
                  src={photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"} 
                  alt="Member Avatar Preview" 
                  className={`w-24 h-24 rounded-2xl object-cover border-2 border-sky-400 shadow-md`}
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </div>

              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`flex-1 w-full p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all border-slate-200 hover:border-sky-400 hover:bg-sky-50/20`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden" 
                />
                <Upload className={`h-6 w-6 text-sky-400 mb-1.5`} />
                <p className="text-xs font-bold text-slate-700">Drag & drop photo here, or <span className="text-sky-500 underline">browse</span></p>
                <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WEBP (Max 4MB)</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Quick Choice Presets</label>
              <div className="flex gap-3">
                {AVATAR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(preset)}
                    className={`h-11 w-11 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      photoUrl === preset 
                        ? "border-sky-500 ring-2 ring-sky-200"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={preset} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. CONTACT DETAILS */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              2. CONTACT DETAILS
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Primary Mobile (Login)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-mono text-xs font-semibold">+91</span>
                  <input 
                    type="tel" 
                    value={mobileNo.startsWith("+91 ") ? mobileNo.replace("+91 ", "") : mobileNo} 
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setMobileNo("+91 " + clean);
                    }}
                    placeholder="99012 34567"
                    className={`w-full py-3.5 pl-12 pr-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                    required
                  />
                  <Phone className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputBgClass}`}
                >
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. RESIDENTIAL ADDRESS */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              3. RESIDENTIAL ADDRESS
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Address Line 1</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={addressLine1} 
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Flat No, Wing, Apartment Name"
                    className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                    required
                  />
                  <MapPin className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Address Line 2</label>
                <input 
                  type="text" 
                  value={addressLine2} 
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Street name, Landmark, Area"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">City</label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="E.g., Vadodara"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">State</label>
                <input 
                  type="text" 
                  value={stateValue} 
                  onChange={(e) => setStateValue(e.target.value)}
                  placeholder="E.g., Gujarat"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Pincode</label>
                <input 
                  type="text" 
                  value={pincode} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPincode(val);
                  }}
                  placeholder="390001"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                  required
                />
              </div>
            </div>
          </div>

          {/* 4. PARENT / GUARDIAN DETAILS */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              4. PARENT / GUARDIAN INFORMATION
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Full Name</label>
                <input 
                  type="text" 
                  value={parentName} 
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="E.g., Sanjaybhai Patel"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Guardian Phone</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-mono text-xs font-semibold">+91</span>
                  <input 
                    type="tel" 
                    value={parentMobile.startsWith("+91 ") ? parentMobile.replace("+91 ", "") : parentMobile} 
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setParentMobile("+91 " + clean);
                    }}
                    placeholder="99012 34503"
                    className={`w-full py-3.5 pl-12 pr-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Relation</label>
                <select
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value)}
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputBgClass}`}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* 5. EMERGENCY CONTACT */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              5. EMERGENCY LIFELINE CONTACT
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Full Name</label>
                <input 
                  type="text" 
                  value={emergencyName} 
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Emergency Contact Name"
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Emergency Phone</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-mono text-xs font-semibold">+91</span>
                  <input 
                    type="tel" 
                    value={emergencyPhone.startsWith("+91 ") ? emergencyPhone.replace("+91 ", "") : emergencyPhone} 
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setEmergencyPhone("+91 " + clean);
                    }}
                    placeholder="99012 34502"
                    className={`w-full py-3.5 pl-12 pr-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${inputBgClass}`}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Relation</label>
                <select
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputBgClass}`}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* 6. MEDICAL INFORMATION */}
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-black block border-b pb-1.5 border-slate-100">
              6. MEDICAL & SECURITY DECLARATION
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Has Medical Condition?</label>
                <select
                  value={hasMedicalCondition}
                  onChange={(e) => setHasMedicalCondition(e.target.value)}
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputBgClass}`}
                >
                  <option value="No">No, I am medically fit</option>
                  <option value="Yes">Yes, I have conditions</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-500 font-bold">Medical Conditions / Details</label>
                <input 
                  type="text" 
                  value={medicalDetails} 
                  onChange={(e) => setMedicalDetails(e.target.value)}
                  placeholder="Asthma, Sinusitis, Cardiac limits, etc. (Or 'None')"
                  disabled={hasMedicalCondition === "No"}
                  className={`w-full py-3.5 px-4 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${
                    hasMedicalCondition === "No" ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : inputBgClass
                  }`}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3 justify-end rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-xs uppercase tracking-wider font-extrabold cursor-pointer border border-slate-200 hover:bg-slate-100 bg-white"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-5 py-3 rounded-xl text-xs uppercase tracking-widest font-extrabold cursor-pointer flex items-center justify-center gap-2 min-w-40 shadow-md ${btnColorClass}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
