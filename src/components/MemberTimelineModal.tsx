import React from "react";
import { X, CheckCircle2, UserCheck, CreditCard, Sparkles, Clock, Award, RefreshCw, Calendar } from "lucide-react";

interface MemberTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
}

export function MemberTimelineModal({ isOpen, onClose, member }: MemberTimelineModalProps) {
  if (!isOpen || !member) return null;

  const regDate = member.registrationDate || member.created_at || "15-Aug-2025";
  const approvedDate = member.approval_date || member.registrationDate || "16-Aug-2025";
  const paymentDate = member.payment_date || member.registrationDate || "16-Aug-2025";
  const expiryDate = member.endDate || "30-Nov-2026";

  const timelineSteps = [
    {
      title: "Online Registration Submitted",
      description: `Member application submitted for ${member.planName || member.typeOfMembership || "Quarterly Swimmer"}`,
      date: regDate,
      status: "completed",
      icon: Clock,
      badge: "Completed"
    },
    {
      title: "Admin Membership Approval",
      description: `Application reviewed & verified by SAMS Reception Desk. Assigned Membership ID: ${member.membershipNo || member.id}`,
      date: approvedDate,
      status: "completed",
      icon: UserCheck,
      badge: "Verified"
    },
    {
      title: "Payment Received & Receipt Issued",
      description: `Fee payment verified (Receipt: ${member.receiptNo || "REC-BSF-8821"}) via Razorpay / Cash`,
      date: paymentDate,
      status: "completed",
      icon: CreditCard,
      badge: "Paid"
    },
    {
      title: "Digital Membership Pass Activated",
      description: `Digital QR Code Pass generated & enabled for reception kiosk auto-attendance`,
      date: approvedDate,
      status: "completed",
      icon: Sparkles,
      badge: "Active Pass"
    },
    {
      title: "Lobby Attendance Check-ins",
      description: `Member active in ${member.batchName || member.allottedTiming || "Morning Batch"}. 100% attendance recorded`,
      date: "Ongoing Daily",
      status: "in_progress",
      icon: CheckCircle2,
      badge: "Active"
    },
    {
      title: "Next Scheduled Renewal",
      description: `Membership plan renewal due before ${expiryDate}`,
      date: expiryDate,
      status: "pending",
      icon: RefreshCw,
      badge: "Upcoming"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-xl bg-white border border-slate-100 rounded-3xl shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-cyan-400 shrink-0">
              <img
                src={member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                alt={member.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">MEMBER JOURNEY TIMELINE</span>
              <h3 className="text-lg font-black tracking-tight">{member.fullName}</h3>
              <p className="text-xs text-slate-400">{member.membershipNo} • {member.planName || member.typeOfMembership}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 my-2">
            {timelineSteps.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div key={idx} className="relative pl-8 group">
                  {/* Circle Marker */}
                  <div className={`absolute -left-[17px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.status === "completed" 
                      ? "bg-emerald-500 border-white text-white shadow-md shadow-emerald-500/20" 
                      : step.status === "in_progress"
                        ? "bg-sky-500 border-white text-white shadow-md shadow-sky-500/20 animate-pulse"
                        : "bg-slate-100 border-slate-300 text-slate-400"
                  }`}>
                    <IconComp className="w-4 h-4" />
                  </div>

                  {/* Step Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{step.title}</h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        step.status === "completed" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : step.status === "in_progress"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-200 text-slate-600"
                      }`}>
                        {step.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 pt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Date: {step.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
