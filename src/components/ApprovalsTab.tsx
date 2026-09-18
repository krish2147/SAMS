import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, ShieldAlert, User, Phone, Mail, Calendar, 
  IndianRupee, Clock, AlertTriangle, X, Check, XCircle, Search, FileText,
  Trash2, CheckSquare, Square, MessageSquare, Send, CheckCircle2
} from "lucide-react";

const getSessionToken = () => {
  return localStorage.getItem("bsf_session_token") || localStorage.getItem("token") || "";
};

interface Member {
  membershipNo: string;
  fullName: string;
  mobileNo: string;
  email?: string;
  gender?: string;
  age?: number;
  typeOfMembership?: string;
  batchTiming?: string;
  batchSchedule?: string;
  amountPaid?: number;
  undertakerParentName?: string;
  undertakerParentPhone?: string;
  registrationDate?: string;
  photoUrl?: string;
  registration_status?: string;
  status?: string;
  paymentStatus?: string;
  payment_status?: string;
  remarks?: string;
  academyId?: string;
}

interface ApprovalsTabProps {
  members: Member[];
  onApprove: (membershipNo: string) => Promise<void>;
  onReject: (membershipNo: string, remarks: string) => Promise<void>;
  onDelete?: (membershipNos: string[], isAllRejected?: boolean) => Promise<void>;
  academyId: string;
  isSwim: boolean;
}

export function ApprovalsTab({ members, onApprove, onReject, onDelete, academyId, isSwim }: ApprovalsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [inspectingMember, setInspectingMember] = useState<Member | null>(null);
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRejectedIds, setSelectedRejectedIds] = useState<string[]>([]);
  const [sendingWhatsAppMemberNo, setSendingWhatsAppMemberNo] = useState<string | null>(null);
  const [whatsappToast, setWhatsappToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleResendWhatsApp = async (membershipNo: string, mobileNo?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSendingWhatsAppMemberNo(membershipNo);
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
      if (res.ok && data.success) {
        setWhatsappToast({
          message: data.message || `WhatsApp payment link sent successfully to ${mobileNo || "registered number"}!`,
          type: "success"
        });
      } else {
        setWhatsappToast({
          message: data.error || "Failed to dispatch WhatsApp message via MSG91.",
          type: "error"
        });
      }
    } catch (err: any) {
      console.error("WhatsApp dispatch error:", err);
      setWhatsappToast({
        message: err.message || "Network error while contacting WhatsApp API gateway.",
        type: "error"
      });
    } finally {
      setSendingWhatsAppMemberNo(null);
      setTimeout(() => {
        setWhatsappToast(null);
      }, 5000);
    }
  };

  // Filter members based on their actual status
  const filteredMembers = members.filter(m => {
    // Determine the status
    let rawStatus = m.registration_status || m.status || "Pending";
    if (rawStatus === "Pending Approval") rawStatus = "Pending";

    const matchesStatus = rawStatus === activeSubTab;
    const matchesSearch = 
      (m.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.membershipNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.mobileNo || "").includes(searchQuery);

    const mAcademy = (m.academyId || academyId || "swim").toLowerCase();
    const curAcademy = (academyId || "swim").toLowerCase();

    return matchesStatus && matchesSearch && (mAcademy === curAcademy);
  });

  const handleApproveAction = async (membershipNo: string) => {
    setIsSubmitting(true);
    try {
      await onApprove(membershipNo);
      setInspectingMember(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingMember) return;
    const finalRemarks = remarks.trim() || "Registration application rejected by administrator.";
    setIsSubmitting(true);
    try {
      await onReject(inspectingMember.membershipNo, finalRemarks);
      setInspectingMember(null);
      setIsRejectMode(false);
      setRemarks("");
    } catch (e) {
      console.error("Rejection error:", e);
      alert("Failed to reject registration application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSingle = async (membershipNo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete application #${membershipNo}?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (onDelete) {
        await onDelete([membershipNo]);
      }
      setSelectedRejectedIds(prev => prev.filter(id => id !== membershipNo));
      if (inspectingMember?.membershipNo === membershipNo) {
        setInspectingMember(null);
      }
    } catch (err) {
      console.error("Deletion error:", err);
      alert("Failed to delete application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRejectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedRejectedIds.length} selected rejected application(s)?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (onDelete) {
        await onDelete(selectedRejectedIds, false);
      }
      setSelectedRejectedIds([]);
    } catch (err) {
      console.error("Bulk deletion error:", err);
      alert("Failed to delete selected applications.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllRejected = async () => {
    const allRejectedList = filteredMembers.map(m => m.membershipNo);
    if (allRejectedList.length === 0) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY ERASE ALL ${allRejectedList.length} rejected applications? This action cannot be undone.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (onDelete) {
        await onDelete(allRejectedList, true);
      }
      setSelectedRejectedIds([]);
    } catch (err) {
      console.error("Delete all error:", err);
      alert("Failed to delete all rejected applications.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectRejected = (membershipNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRejectedIds(prev => 
      prev.includes(membershipNo) ? prev.filter(id => id !== membershipNo) : [...prev, membershipNo]
    );
  };

  const toggleSelectAllRejected = () => {
    const currentIds = filteredMembers.map(m => m.membershipNo);
    const allSelected = currentIds.every(id => selectedRejectedIds.includes(id));
    if (allSelected) {
      setSelectedRejectedIds([]);
    } else {
      setSelectedRejectedIds(currentIds);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-0 text-left">
      {/* WHATSAPP TOAST NOTIFICATION */}
      <AnimatePresence>
        {whatsappToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between shadow-md ${
              whatsappToast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              {whatsappToast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <span className="text-xs font-bold">{whatsappToast.message}</span>
            </div>
            <button onClick={() => setWhatsappToast(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div>
        <span className="text-xs font-black tracking-widest text-sky-600 uppercase block mb-1">GATEKEEPER SERVICE</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Institutional Registration Approvals</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Verify walk-in or public online applicant profiles. Approve to generate membership or reject with clear remarks.</p>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white border border-slate-150 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Sub-tab Switchers */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-full md:w-auto overflow-x-auto scrollbar-none whitespace-nowrap">
          {(["Pending", "Approved", "Rejected"] as const).map((tab) => {
            const count = members.filter(m => {
              const status = m.registration_status || (
                m.status === "Approved" ? "Approved" :
                m.status === "Rejected" ? "Rejected" : "Pending"
              );
              const mAcademy = (m.academyId || academyId || "swim").toLowerCase();
              const curAcademy = (academyId || "swim").toLowerCase();
              return status === tab && mAcademy === curAcademy;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveSubTab(tab);
                  setSelectedRejectedIds([]);
                }}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer flex-1 md:flex-none whitespace-nowrap ${
                  activeSubTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>{tab} <span className="hidden sm:inline">Approvals</span></span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === tab ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applicants by name or phone..."
            className="w-full bg-slate-50 text-slate-800 text-sm pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:bg-white transition-all text-left placeholder:text-slate-400"
          />
        </div>

      </div>

      {/* REJECTED BULK ACTION TOOLBAR */}
      {activeSubTab === "Rejected" && filteredMembers.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAllRejected}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {filteredMembers.length > 0 && filteredMembers.every(m => selectedRejectedIds.includes(m.membershipNo)) ? (
                <CheckSquare className="h-4 w-4 text-rose-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Select All Rejected ({filteredMembers.length})</span>
            </button>
            {selectedRejectedIds.length > 0 && (
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                {selectedRejectedIds.length} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedRejectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedRejectedIds.length})</span>
              </button>
            )}
            <button
              onClick={handleDeleteAllRejected}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete All Rejected</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAILED APPLICATIONS GRID */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center">
          <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto stroke-1" />
          <p className="text-slate-500 font-medium mt-3">No registration records found under "{activeSubTab}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((m, index) => {
            const isSelected = selectedRejectedIds.includes(m.membershipNo);
            return (
              <motion.div
                key={m.membershipNo}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                onClick={() => {
                  setInspectingMember(m);
                  setIsRejectMode(false);
                  setRemarks("");
                }}
                className={`bg-white border hover:border-sky-400 rounded-3xl p-6 shadow-xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative ${
                  isSelected ? "border-rose-400 bg-rose-50/20" : "border-slate-150"
                }`}
              >
                {/* Badge and Select Checkbox */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  {activeSubTab === "Rejected" && (
                    <button
                      onClick={(e) => toggleSelectRejected(m.membershipNo, e)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Select for bulk action"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-rose-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  )}
                  <span className={`text-[9px] font-mono font-black px-2.5 py-1 rounded-full uppercase border ${
                    activeSubTab === "Approved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : activeSubTab === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                  }`}>
                    {activeSubTab}
                  </span>
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      <img 
                        src={m.photoUrl} 
                        alt={m.fullName}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-2xl object-cover border border-slate-150"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-150">
                        <User className="h-6 w-6 stroke-1.5" />
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-mono font-black text-sky-600 uppercase block">Ref: {m.membershipNo}</span>
                      <h4 className="text-base font-extrabold text-slate-900 uppercase group-hover:text-sky-600 transition-colors line-clamp-1">{m.fullName}</h4>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gender / Age:</span>
                      <span className="font-extrabold text-slate-800">{m.gender || "Not Specified"} / {m.age || "N/A"} Yrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Membership:</span>
                      <span className="font-extrabold text-slate-800">{m.typeOfMembership} Plan</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Request:</span>
                      <span className="font-extrabold text-slate-800 line-clamp-1">{(m.batchTiming || "").split(" ")[0] || "No Batch"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile Phone:</span>
                      <span className="font-mono font-bold text-slate-700">{m.mobileNo}</span>
                    </div>
                  </div>
                </div>

                {/* Inspect Button Footer */}
                <div className="border-t border-slate-100 mt-4 pt-4 flex items-center justify-between">
                  {activeSubTab === "Rejected" ? (
                    <button
                      onClick={(e) => handleDeleteSingle(m.membershipNo, e)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-rose-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : activeSubTab === "Approved" ? (
                    <button
                      onClick={(e) => handleResendWhatsApp(m.membershipNo, m.mobileNo, e)}
                      disabled={sendingWhatsAppMemberNo === m.membershipNo}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 border border-emerald-200"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{sendingWhatsAppMemberNo === m.membershipNo ? "Sending..." : "Send WhatsApp"}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">Reg Date: {m.registrationDate || "N/A"}</span>
                  )}
                  <span className="text-xs font-black text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 group-hover:translate-x-1 transition-all">
                    Review Applicant →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* INSPECTION MODAL */}
      <AnimatePresence>
        {inspectingMember && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-slate-150 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="border-b border-slate-150 p-6 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[10px] font-mono font-black text-sky-600 uppercase">Reviewing Application Profile</span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">{inspectingMember.fullName}</h3>
                </div>
                <button
                  onClick={() => setInspectingMember(null)}
                  className="p-1.5 rounded-full hover:bg-slate-150 text-slate-500 cursor-pointer transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-700">
                {/* Profile header visual row */}
                <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-slate-100 pb-6">
                  {inspectingMember.photoUrl ? (
                    <img 
                      src={inspectingMember.photoUrl} 
                      alt={inspectingMember.fullName}
                      referrerPolicy="no-referrer"
                      className="h-24 w-24 rounded-3xl object-cover border border-slate-200 shadow-xs"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-150">
                      <User className="h-12 w-12 stroke-1" />
                    </div>
                  )}

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">ID: {inspectingMember.membershipNo}</span>
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">{inspectingMember.typeOfMembership} plan</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Applied for registration on: <span className="font-mono font-bold text-slate-700">{inspectingMember.registrationDate || "N/A"}</span></p>
                  </div>
                </div>

                {/* Info Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Swimmer details */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Swimmer Specifications</h5>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Full Name:</span>
                        <span className="text-slate-800 uppercase">{inspectingMember.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Age & Gender:</span>
                        <span className="text-slate-800">{inspectingMember.age || "N/A"} yrs • {inspectingMember.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Contact Mobile:</span>
                        <span className="text-slate-800 font-mono">{inspectingMember.mobileNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Address:</span>
                        <span className="text-slate-800 font-mono">{inspectingMember.email || "No Email"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Program Logistics */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Program Logistics</h5>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Membership Tier:</span>
                        <span className="text-slate-800 uppercase font-black">{inspectingMember.typeOfMembership} Plan</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Requested Batch:</span>
                        <span className="text-slate-800 uppercase">{inspectingMember.batchTiming || "No Batch Selected"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calculated Fees:</span>
                        <span className="text-slate-800 font-mono font-black">₹{(inspectingMember.amountPaid || 3500).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4 sm:col-span-2">
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Emergency & Indemnity Sign-off</h5>
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Parent / Guardian:</span>
                        <span className="text-slate-800 uppercase">{inspectingMember.undertakerParentName || "None Registered"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Emergency Phone:</span>
                        <span className="text-slate-800 font-mono">{inspectingMember.undertakerParentPhone || "None Registered"}</span>
                      </div>
                    </div>
                  </div>

                  {inspectingMember.remarks && (
                    <div className="sm:col-span-2 bg-rose-50 border border-rose-150 rounded-2xl p-4">
                      <span className="text-[10px] font-mono font-black text-rose-700 uppercase block mb-1">Rejection Remarks / Deficiencies</span>
                      <p className="text-xs font-medium text-rose-800">{inspectingMember.remarks}</p>
                    </div>
                  )}

                </div>

                {/* Reject Input Field inline */}
                {isRejectMode && (
                  <motion.form 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleRejectAction}
                    className="space-y-3 bg-rose-50 border border-rose-150 p-4 rounded-2xl"
                  >
                    <label className="text-xs font-bold text-rose-900 block">State deficiency or rejection reason:</label>
                    <textarea
                      required
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="e.g. Incomplete signature, profile photograph blur, invalid age proof..."
                      className="w-full bg-white text-slate-800 text-xs p-3 rounded-xl border border-rose-200 focus:outline-none focus:border-rose-500 font-medium min-h-[80px]"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsRejectMode(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                      </button>
                    </div>
                  </motion.form>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="border-t border-slate-150 p-6 flex flex-wrap gap-3 bg-slate-50 justify-between items-center">
                <div className="flex gap-2">
                  {inspectingMember.status !== "Rejected" && inspectingMember.registration_status !== "Rejected" && !isRejectMode && (
                    <button
                      onClick={() => setIsRejectMode(true)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      Reject Application
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSingle(inspectingMember.membershipNo)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Application</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setInspectingMember(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Close Profile
                  </button>

                  {/* Send WhatsApp Link Button if Approved */}
                  {(inspectingMember.status === "Approved" || inspectingMember.registration_status === "Approved" || activeSubTab === "Approved") && (
                    <button
                      onClick={() => handleResendWhatsApp(inspectingMember.membershipNo, inspectingMember.mobileNo)}
                      disabled={sendingWhatsAppMemberNo === inspectingMember.membershipNo}
                      className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>{sendingWhatsAppMemberNo === inspectingMember.membershipNo ? "Sending via WhatsApp..." : "Send WhatsApp Payment Link"}</span>
                    </button>
                  )}

                  {(inspectingMember.status !== "Approved" && inspectingMember.registration_status !== "Approved" && activeSubTab !== "Approved") && !isRejectMode && (
                    <button
                      onClick={() => handleApproveAction(inspectingMember.membershipNo)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isSubmitting ? "Approving..." : "Approve Application"}</span>
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
