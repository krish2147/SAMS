import React, { useState, useEffect, useRef } from "react";
import { QrCode, Search, CheckCircle2, AlertTriangle, X, Camera, RefreshCw, User, ShieldCheck, Clock, Check, Waves, Maximize2, Minimize2 } from "lucide-react";
import { QrScannerModal } from "./QrScannerModal";

interface ReceptionKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  attendanceLogs: any[];
  onCheckInMember: (member: any) => Promise<{ success: boolean; message: string; checkInTime?: string }>;
}

export function ReceptionKioskModal({
  isOpen,
  onClose,
  members = [],
  attendanceLogs = [],
  onCheckInMember
}: ReceptionKioskModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeConfirmation, setActiveConfirmation] = useState<{
    member: any;
    time: string;
    alreadyCheckedIn?: boolean;
    errorReason?: string;
  } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on load
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto hide confirmation modal after 3 seconds and return to scanner
  useEffect(() => {
    if (activeConfirmation) {
      const timer = setTimeout(() => {
        setActiveConfirmation(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeConfirmation]);

  if (!isOpen) return null;

  // Filter members by Membership No, Mobile, or Name
  const searchResults = searchQuery.trim() === "" ? [] : members.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const memNo = (m.membershipNo || m.id || "").toString().toLowerCase();
    const name = (m.fullName || m.name || "").toLowerCase();
    const mobile = (m.mobileNo || m.mobile_no || m.mobile || "").toString().toLowerCase();
    return memNo.includes(q) || name.includes(q) || mobile.includes(q);
  }).slice(0, 5);

  const handleQrScanSuccess = async (qrValue: string) => {
    setIsScannerOpen(false);
    let memberToProcess: any = null;

    // Parse payload if JSON
    try {
      const parsed = JSON.parse(qrValue);
      if (parsed.membershipNo) {
        memberToProcess = members.find(m => m.membershipNo === parsed.membershipNo);
      }
    } catch (e) {
      // Direct string search
      memberToProcess = members.find(m => (m.membershipNo || "").toLowerCase() === qrValue.toLowerCase());
    }

    if (!memberToProcess) {
      setActiveConfirmation({
        member: { fullName: "Unknown Pass", membershipNo: qrValue },
        time: new Date().toLocaleTimeString(),
        errorReason: "Invalid QR Code - Member not found in database!"
      });
      return;
    }

    processMemberCheckIn(memberToProcess);
  };

  const processMemberCheckIn = async (member: any) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const checkInTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

    // Validate Membership Status & Payment Status
    const status = (member.membership_status || member.status || member.registration_status || "Approved").toLowerCase();
    const paymentStatus = (member.payment_status || "Paid").toLowerCase();

    if (status !== "approved" && status !== "active") {
      setActiveConfirmation({
        member,
        time: checkInTime,
        errorReason: `Entry Denied: Membership status is '${status.toUpperCase()}'. Approval required!`
      });
      return;
    }

    if (paymentStatus === "pending") {
      setActiveConfirmation({
        member,
        time: checkInTime,
        errorReason: "Entry Denied: Membership fee payment is pending!"
      });
      return;
    }

    // Validate duplicate check-in today
    const existingLog = attendanceLogs.find(a => 
      a.date === todayStr && 
      (a.member_id === member.id || a.membershipNo === member.membershipNo)
    );

    if (existingLog) {
      setActiveConfirmation({
        member,
        time: existingLog.time || checkInTime,
        alreadyCheckedIn: true
      });
      return;
    }

    // Call backend API to record attendance
    const result = await onCheckInMember(member);
    if (result.success) {
      setActiveConfirmation({
        member,
        time: result.checkInTime || checkInTime
      });
    } else {
      setActiveConfirmation({
        member,
        time: checkInTime,
        errorReason: result.message || "Failed to record attendance"
      });
    }
  };

  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner / Navigation */}
      <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg text-white">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">BARODA SWIM FRONT KIOSK MODE</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                ● LIVE ENTRY DESK
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Automatic Lobby QR Attendance Check-In Station</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreenMode}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
          >
            Exit Kiosk Mode
          </button>
        </div>
      </div>

      {/* Main Kiosk Layout */}
      <div className="flex-1 p-6 md:p-12 max-w-6xl w-full mx-auto flex flex-col justify-center items-center space-y-8 overflow-y-auto">
        {/* Large Central Action Button */}
        <div className="w-full max-w-xl text-center space-y-6">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="group relative w-full py-10 px-8 rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black shadow-2xl shadow-cyan-900/40 border-2 border-cyan-300/30 transition-all transform active:scale-98 cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-5 rounded-full bg-white/20 border border-white/30 text-white shadow-inner group-hover:scale-110 transition-transform">
              <Camera className="w-12 h-12" />
            </div>
            <div>
              <span className="text-2xl md:text-3xl font-black tracking-tight block">
                TAP TO SCAN QR CODE
              </span>
              <span className="text-xs font-semibold text-cyan-200 mt-1 block">
                Opens camera scanner for instant lobby check-in
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <div className="flex-1 h-px bg-slate-800" />
            <span>OR SEARCH MEMBER BY DETAILS</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Quick Manual Search Bar */}
          <div className="relative w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Membership No., Mobile No., or Member Name..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-900 border-2 border-slate-800 focus:border-cyan-500 text-white placeholder-slate-500 font-semibold text-sm focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-20 divide-y divide-slate-800/80">
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSearchQuery("");
                      processMemberCheckIn(m);
                    }}
                    className="p-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={m.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"}
                        alt={m.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                      />
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">{m.fullName}</div>
                        <div className="text-xs text-slate-400 font-mono">No: {m.membershipNo} • Mob: {m.mobileNo || m.mobile_no}</div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs">
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUCCESS / WARNING OVERLAY MODAL */}
      {activeConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-in fade-in duration-150">
          <div className={`relative w-full max-w-md p-8 rounded-3xl border-2 text-center space-y-6 shadow-2xl ${
            activeConfirmation.errorReason
              ? "bg-slate-900 border-rose-500/80 text-white"
              : activeConfirmation.alreadyCheckedIn
                ? "bg-slate-900 border-amber-500/80 text-white"
                : "bg-slate-900 border-emerald-500/80 text-white"
          }`}>
            {/* Status Icon */}
            <div className="flex justify-center">
              {activeConfirmation.errorReason ? (
                <div className="p-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <AlertTriangle className="w-16 h-16 animate-bounce" />
                </div>
              ) : activeConfirmation.alreadyCheckedIn ? (
                <div className="p-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Clock className="w-16 h-16 animate-pulse" />
                </div>
              ) : (
                <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="w-16 h-16 animate-bounce" />
                </div>
              )}
            </div>

            {/* Member Details */}
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-1">
                {activeConfirmation.errorReason
                  ? "❌ CHECK-IN DENIED"
                  : activeConfirmation.alreadyCheckedIn
                    ? "⚠️ ALREADY CHECKED IN TODAY"
                    : "✅ ATTENDANCE RECORDED"}
              </div>

              {activeConfirmation.member && (
                <div className="mt-4 flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <img
                    src={activeConfirmation.member.photoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={activeConfirmation.member.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-md"
                  />
                  <div>
                    <h3 className="text-xl font-black text-white">{activeConfirmation.member.fullName}</h3>
                    <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                      Membership No: {activeConfirmation.member.membershipNo || "N/A"}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Batch: <strong>{activeConfirmation.member.batchName || activeConfirmation.member.allottedTiming || "Morning Batch"}</strong>
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Time: {activeConfirmation.time}
                    </p>
                  </div>
                </div>
              )}

              {activeConfirmation.errorReason && (
                <p className="mt-3 text-xs text-rose-300 font-bold bg-rose-950/60 p-3 rounded-xl border border-rose-800/60">
                  {activeConfirmation.errorReason}
                </p>
              )}

              {activeConfirmation.alreadyCheckedIn && (
                <p className="mt-3 text-xs text-amber-300 font-bold bg-amber-950/60 p-3 rounded-xl border border-amber-800/60">
                  Attendance was already logged today at {activeConfirmation.time}.
                </p>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Auto returning to camera scanner in 3s...
            </div>

            <button
              onClick={() => setActiveConfirmation(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Close Immediately
            </button>
          </div>
        </div>
      )}

      {/* QR CAMERA SCANNER MODAL */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCheckInSuccess={(data) => {
          if (data && data.membershipNo) {
            handleQrScanSuccess(data.membershipNo);
          } else if (data && data.member && data.member.membershipNo) {
            handleQrScanSuccess(data.member.membershipNo);
          }
        }}
      />
    </div>
  );
}
