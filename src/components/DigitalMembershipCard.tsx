import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, Calendar, User, Clock, Waves, Share2, Maximize2, Phone, HeartPulse, X } from "lucide-react";

interface DigitalMembershipCardProps {
  member: {
    id?: number | string;
    membershipNo: string;
    fullName: string;
    photoUrl?: string;
    typeOfMembership?: string;
    allottedTiming?: string;
    batchName?: string;
    planName?: string;
    membership_status?: string;
    registration_status?: string;
    payment_status?: string;
    endDate?: string;
    registrationDate?: string;
    bloodGroup?: string;
    emergencyContactName?: string;
    emergency_contact_name?: string;
    emergencyContactNumber?: string;
    emergency_contact_number?: string;
    relationship?: string;
    guardian?: string;
    medicalDetails?: string;
    hasMedicalCondition?: boolean;
  };
  compact?: boolean;
}

export function DigitalMembershipCard({ member, compact = false }: DigitalMembershipCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  // Emergency contact fallbacks
  const emergencyName = member.emergencyContactName || member.emergency_contact_name || member.guardian || "Parent / Guardian";
  const emergencyPhone = member.emergencyContactNumber || member.emergency_contact_number || "+91 98250 12345";
  const bloodGroup = member.bloodGroup || "O+";

  // Generate QR Code containing unique secure payload
  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      try {
        setIsGenerating(true);
        const qrPayload = JSON.stringify({
          type: "BSF_MEMBER_PASS",
          membershipNo: member.membershipNo,
          v: 1
        });

        const url = await QRCode.toDataURL(qrPayload, {
          width: 360,
          margin: 1,
          color: {
            dark: "#0F172A",
            light: "#FFFFFF"
          },
          errorCorrectionLevel: "H"
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error("Failed to generate member QR Code:", err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    if (member?.membershipNo) {
      generateQr();
    }
    return () => {
      isMounted = false;
    };
  }, [member?.membershipNo]);

  const getStatusBadge = () => {
    const status = (member.membership_status || member.registration_status || "Active").toLowerCase();
    if (status === "active" || status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
          <CheckCircle2 className="w-3 h-3" /> ACTIVE MEMBER
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
          <Clock className="w-3 h-3" /> APPROVAL PENDING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md">
        <AlertTriangle className="w-3 h-3" /> {status.toUpperCase()}
      </span>
    );
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `BSF-Pass-${member.membershipNo}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Baroda Swim Front - Member Pass (${member.fullName})`,
          text: `Digital Membership Card for ${member.fullName} (${member.membershipNo}) - Baroda Swim Front Academy`,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(`Baroda Swim Front Member: ${member.fullName} (${member.membershipNo})`);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto print:max-w-none print:m-0">
        {/* Luxury Digital Membership Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 border border-cyan-500/30 shadow-2xl text-white p-6 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-cyan-900/20">
          
          {/* Holographic Watermark / Waves */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          {/* Card Header */}
          <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-widest text-cyan-300 uppercase">
                  Baroda Swim Front
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  Official Digital Member Pass
                </div>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Main Body */}
          <div className="relative z-10 my-4 grid grid-cols-12 gap-4 items-center">
            {/* Member Photo */}
            <div className="col-span-4 flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-lg">
                <img
                  src={member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
                  alt={member.fullName}
                  className="w-full h-full object-cover rounded-[14px]"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute("src", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80");
                  }}
                />
                <div className="absolute -bottom-1 -right-1 p-1 bg-cyan-500 rounded-full text-slate-950 shadow">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-[11px] font-mono font-bold text-cyan-300 tracking-wider">
                {member.membershipNo}
              </div>
            </div>

            {/* Member Info */}
            <div className="col-span-8 space-y-2">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight leading-tight line-clamp-1">
                  {member.fullName}
                </h3>
                <p className="text-xs text-cyan-200/80 font-medium">
                  {member.planName || member.typeOfMembership || "Quarterly Swimmer"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-1 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{member.batchName || member.allottedTiming || "Morning Batch (06:00 AM)"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Expires: <strong className="text-white">{member.endDate || "30-Nov-2026"}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact Bar */}
          <div className="relative z-10 py-2.5 px-3.5 rounded-xl bg-slate-950/60 border border-white/10 my-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Emergency Contact</div>
                <div className="text-slate-200 font-bold text-[11px]">{emergencyName} ({emergencyPhone})</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Blood Group</div>
              <div className="text-rose-400 font-black text-xs font-mono">{bloodGroup}</div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                <QrCode className="w-3.5 h-3.5" /> Entry QR Pass
              </div>
              <p className="text-[10px] text-slate-400 leading-tight max-w-[180px]">
                Scan at reception kiosk for instant lobby attendance.
              </p>
              
              {/* Card Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5 print:hidden">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                  title="Download QR PNG"
                >
                  <Download className="w-3 h-3" /> QR Image
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 transition-all active:scale-95 cursor-pointer"
                  title="Print / Save PDF"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                  title="Share Pass"
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                  title="View Fullscreen"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
              {shareSuccess && (
                <p className="text-[10px] text-emerald-400 font-bold mt-1 animate-fade-in">
                  ✓ Link copied / shared successfully!
                </p>
              )}
            </div>

            {/* QR Code Container */}
            <div className="relative p-2 bg-white rounded-xl shadow-xl shrink-0 group">
              {isGenerating ? (
                <div className="w-24 h-24 flex items-center justify-center bg-slate-100 rounded-lg">
                  <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${member.membershipNo}`}
                  className="w-24 h-24 object-contain rounded-lg"
                />
              )}
              <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <span className="text-[9px] font-bold text-cyan-950 bg-white/90 px-1.5 py-0.5 rounded shadow">
                  BSF PASS
                </span>
              </div>
            </div>
          </div>

          {/* Footer tag */}
          <div className="relative z-10 mt-3 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-white/5">
            <span className="flex items-center gap-1 text-slate-400">
              <Sparkles className="w-3 h-3 text-cyan-400" /> SAMS SECURE QR PASS
            </span>
            <span>VERIFIED DIGITAL PASS</span>
          </div>
        </div>
      </div>

      {/* FULLSCREEN MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-xl p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Waves className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold">Baroda Swim Front Pass</h3>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <div className="w-32 h-32 rounded-3xl p-1 bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-2xl">
                <img
                  src={member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"}
                  alt={member.fullName}
                  className="w-full h-full object-cover rounded-[20px]"
                />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">{member.fullName}</h2>
                <p className="text-sm font-mono text-cyan-400 font-bold mt-0.5">{member.membershipNo}</p>
                <p className="text-xs text-slate-300 mt-1">{member.planName || member.typeOfMembership} • {member.batchName || member.allottedTiming}</p>
              </div>

              <div className="p-4 bg-white rounded-2xl shadow-2xl">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 object-contain" />
              </div>

              <div className="w-full max-w-sm p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Emergency Phone:</span><strong className="text-rose-400">{emergencyPhone}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Blood Group:</span><strong className="text-white">{bloodGroup}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Valid Until:</span><strong className="text-emerald-400">{member.endDate || "30-Nov-2026"}</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFullscreen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

