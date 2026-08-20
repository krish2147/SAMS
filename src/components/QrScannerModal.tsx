import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode, Camera, RefreshCw, X, CheckCircle2, AlertTriangle, XCircle,
  Search, User, Clock, CreditCard, ShieldAlert, Waves, Check, RefreshCcw, Sparkles
} from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInSuccess?: (data: any) => void;
  userName?: string;
}

export function QrScannerModal({ isOpen, onClose, onCheckInSuccess, userName }: QrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Result state after scanning
  const [scanResult, setScanResult] = useState<{
    status: "success" | "already_checked_in" | "denied";
    title: string;
    message: string;
    member?: any;
    data?: any;
    reason?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "html5qr-code-full-region";

  // Get session token
  const getSessionToken = () => {
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.token || "";
      }
    } catch (e) {}
    return "";
  };

  // Sound effect trigger (audio chime)
  const playScanBeep = (type: "success" | "error" = "success") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Handle QR scan result payload
  const handleDecodedQr = async (qrText: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setScanError(null);

    // Pause scanner if running
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.pause(true);
      } catch (e) {}
    }

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) headers["x-session-token"] = token;

      const response = await fetch("/api/attendance/scan-qr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          qrData: qrText,
          scannedBy: userName || "Reception Scanner"
        })
      });

      const resData = await response.json().catch(() => ({}));

      if (response.ok && resData.success) {
        playScanBeep("success");
        setScanResult({
          status: "success",
          title: "Access Granted",
          message: resData.message || "Check-in successful",
          member: resData.data,
          data: resData.data
        });
        if (onCheckInSuccess) onCheckInSuccess(resData.data);
      } else if (resData.alreadyCheckedIn) {
        playScanBeep("error");
        setScanResult({
          status: "already_checked_in",
          title: "Already Checked In Today",
          message: resData.message || resData.error || "Swimmer was already logged for today's session.",
          member: resData.member,
          data: resData
        });
      } else {
        playScanBeep("error");
        setScanResult({
          status: "denied",
          title: "Access Denied",
          message: resData.error || "Invalid QR Code or membership restriction.",
          member: resData.member,
          reason: resData.reason || "DENIED"
        });
      }
    } catch (err: any) {
      playScanBeep("error");
      setScanError("Network communication error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize camera list
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") return;

    let mounted = true;
    Html5Qrcode.getCameras()
      .then((deviceList) => {
        if (mounted && deviceList && deviceList.length > 0) {
          setCameras(deviceList.map((d) => ({ id: d.id, label: d.label || `Camera (${d.id.slice(0, 5)}...)` })));
          // Prefer environment / back camera if available
          const backCam = deviceList.find((d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("environment"));
          setSelectedCameraId(backCam ? backCam.id : deviceList[0].id);
        }
      })
      .catch((err) => {
        console.warn("Camera device access warning:", err);
        if (mounted) {
          setScanError("Camera access permission requested. Please allow camera permissions in browser.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, activeTab]);

  // Start Scanner Stream
  useEffect(() => {
    if (!isOpen || activeTab !== "camera" || !selectedCameraId || scanResult) return;

    const html5Qrcode = new Html5Qrcode(scannerContainerId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });
    scannerRef.current = html5Qrcode;

    setIsScanning(true);
    setScanError(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    html5Qrcode
      .start(
        selectedCameraId,
        config,
        (decodedText) => {
          handleDecodedQr(decodedText);
        },
        () => {
          // Frame error (normal scanning state)
        }
      )
      .catch((err) => {
        console.error("Failed to start QR scanner stream:", err);
        setIsScanning(false);
        setScanError("Could not launch camera stream. Ensure camera permissions are granted.");
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
  }, [isOpen, activeTab, selectedCameraId, scanResult]);

  // Restart Scanning
  const handleResetScanner = async () => {
    setScanResult(null);
    setScanError(null);
    setManualInput("");
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.resume();
        }
      } catch (e) {}
    }
  };

  // Submit Manual Entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleDecodedQr(manualInput.trim());
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Baroda Swim Front - QR Scanner
                </h3>
                <p className="text-xs text-slate-400">
                  Lobby Attendance Check-in Station
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          {!scanResult && (
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-2">
              <button
                onClick={() => {
                  setActiveTab("camera");
                  setScanError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Camera className="w-4 h-4" /> Live Camera Scanner
              </button>
              <button
                onClick={() => {
                  setActiveTab("manual");
                  setScanError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "manual"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Search className="w-4 h-4" /> Manual Membership Search
              </button>
            </div>
          )}

          {/* Modal Content Body */}
          <div className="p-6">
            {/* SCAN RESULT OVERLAY */}
            {scanResult ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 text-center"
              >
                {scanResult.status === "success" && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {scanResult.title}
                      </span>
                      <h4 className="mt-2 text-xl font-bold text-white">
                        {scanResult.member?.fullName || scanResult.message}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Membership No: <strong className="text-cyan-300">{scanResult.member?.membershipNo}</strong>
                      </p>
                    </div>

                    {/* Member Details Box */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-left space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Assigned Batch:</span>
                        <strong className="text-white">{scanResult.member?.batchName || "Morning Batch"}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Membership Plan:</span>
                        <strong className="text-white">{scanResult.member?.planName || "Quarterly"}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="text-slate-400">Check-in Time:</span>
                        <strong className="text-emerald-400">{scanResult.member?.time || new Date().toLocaleTimeString()}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {scanResult.status === "already_checked_in" && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                      <Clock className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {scanResult.title}
                      </span>
                      <h4 className="mt-2 text-xl font-bold text-white">
                        {scanResult.member?.fullName || "Swimmer Already Logged"}
                      </h4>
                      <p className="text-xs text-amber-300/90 mt-1.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {scanResult.status === "denied" && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
                      <ShieldAlert className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {scanResult.title}
                      </span>
                      <h4 className="mt-2 text-lg font-bold text-rose-200">
                        {scanResult.message}
                      </h4>
                      {scanResult.member?.fullName && (
                        <p className="text-xs text-slate-400 mt-1">
                          Swimmer: <strong className="text-white">{scanResult.member.fullName}</strong> ({scanResult.member.membershipNo})
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Scan Next Swimmer Button */}
                <div className="pt-2">
                  <button
                    onClick={handleResetScanner}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <RefreshCcw className="w-4 h-4" /> Scan Next Swimmer
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* CAMERA VIEW TAB */}
                {activeTab === "camera" && (
                  <div className="space-y-4">
                    {/* Camera Switcher Dropdown */}
                    {cameras.length > 1 && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-cyan-400" />
                        <select
                          value={selectedCameraId}
                          onChange={(e) => setSelectedCameraId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cyan-500 outline-none"
                        >
                          {cameras.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Camera Video Region */}
                    <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 min-h-[260px] flex items-center justify-center">
                      <div id={scannerContainerId} className="w-full h-full" />

                      {/* Viewfinder Overlay Reticle */}
                      {isScanning && !scanError && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-56 h-56 border-2 border-cyan-400/80 rounded-2xl relative shadow-[0_0_30px_rgba(34,211,238,0.25)] animate-pulse">
                            {/* Scanning Laser Animation */}
                            <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-[bounce_2s_infinite]" />
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                          </div>
                        </div>
                      )}

                      {/* Loading or Error State */}
                      {isSubmitting && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-cyan-400 gap-3 z-10">
                          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-white">Validating QR Code with SAMS...</span>
                        </div>
                      )}
                    </div>

                    {scanError && (
                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{scanError}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-center text-slate-400">
                      Position the member's QR code within the viewfinder box for instant validation.
                    </p>
                  </div>
                )}

                {/* MANUAL SEARCH TAB */}
                {activeTab === "manual" && (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Membership Number / Mobile No / App No:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          placeholder="e.g. BSF-2026-0001 or 9901234501"
                          className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-cyan-500 outline-none"
                          autoFocus
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                    </div>

                    {scanError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                        {scanError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || !manualInput.trim()}
                      className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Validate & Check-In Swimmer
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
