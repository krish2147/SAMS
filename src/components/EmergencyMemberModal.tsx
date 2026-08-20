import React from "react";
import { X, ShieldAlert, Phone, HeartPulse, AlertTriangle, User, Droplets, Heart } from "lucide-react";

interface EmergencyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
}

export function EmergencyMemberModal({ isOpen, onClose, member }: EmergencyMemberModalProps) {
  if (!isOpen || !member) return null;

  const emergencyName = member.emergencyContactName || member.emergency_contact_name || member.guardian || "Parent / Emergency Contact";
  const emergencyPhone = member.emergencyContactNumber || member.emergency_contact_number || "+91 98250 12345";
  const bloodGroup = member.bloodGroup || member.blood_group || "O+";
  const medicalDetails = member.medicalDetails || member.medical_details || (member.hasMedicalCondition ? "Declared condition on profile" : "No known medical conditions declared");
  const allergies = member.allergies || "None reported";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-rose-500/50 rounded-3xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Urgent Emergency Header */}
        <div className="p-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/20 text-white border border-white/30 animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-rose-200 uppercase block">CRITICAL MEDICAL PROFILE</span>
              <h3 className="text-xl font-black tracking-tight">EMERGENCY ACTION CARD</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Member Profile Banner */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <img
              src={member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
              alt={member.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/60"
            />
            <div>
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block">MEMBER NO: {member.membershipNo || member.id}</span>
              <h4 className="text-lg font-black text-white">{member.fullName}</h4>
              <p className="text-xs text-slate-400">{member.batchName || member.allottedTiming || "Morning Batch"} • {member.gender || "Member"}</p>
            </div>
          </div>

          {/* Quick Call Emergency Phone Button */}
          <a
            href={`tel:${emergencyPhone}`}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black text-sm shadow-xl shadow-rose-900/30 flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer border border-rose-400/30"
          >
            <Phone className="w-5 h-5 animate-bounce" />
            <span>ONE-CLICK DIAL EMERGENCY CONTACT ({emergencyPhone})</span>
          </a>

          {/* Critical Info Grid */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold uppercase text-[10px]">
                <Droplets className="w-3.5 h-3.5" /> Blood Group
              </div>
              <p className="text-2xl font-black text-white font-mono">{bloodGroup}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px]">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Guardian / Contact
              </div>
              <p className="text-sm font-bold text-white truncate">{emergencyName}</p>
              <p className="text-[11px] font-mono text-slate-400">{member.relationship || "Guardian"}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 col-span-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[10px]">
                <HeartPulse className="w-3.5 h-3.5" /> Medical Conditions
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">{medicalDetails}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 col-span-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold uppercase text-[10px]">
                <AlertTriangle className="w-3.5 h-3.5" /> Known Allergies
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">{allergies}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Emergency Profile
          </button>
        </div>
      </div>
    </div>
  );
}
