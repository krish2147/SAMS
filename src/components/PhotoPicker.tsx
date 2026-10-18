import React, { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, RefreshCw, SwitchCamera, X } from "lucide-react";

// Two clear choices for a profile photo: take one with the camera, or pick one from the
// phone's photos / the computer's files. Hands back an image File either way.

interface PhotoPickerProps {
  onPick: (file: File) => void;
  accept?: string;
  className?: string;
}

export function PhotoPicker({ onPick, accept = "image/png, image/jpeg, image/webp", className = "" }: PhotoPickerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const takePhoto = () => {
    // Live camera in the page when the browser allows it; otherwise the phone's own camera app.
    if (navigator.mediaDevices?.getUserMedia) setCameraOpen(true);
    else nativeCameraRef.current?.click();
  };

  const fromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = ""; // allow choosing the same file again
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={takePhoto}
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 cursor-pointer"
      >
        <Camera className="h-4 w-4" /> Take photo
      </button>
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
      >
        <ImageIcon className="h-4 w-4" /> Choose from photos
      </button>
      <input ref={galleryRef} type="file" accept={accept} className="hidden" onChange={fromInput} />
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={fromInput} />
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => { setCameraOpen(false); onPick(file); }}
          onUnavailable={() => { setCameraOpen(false); nativeCameraRef.current?.click(); }}
        />
      )}
    </div>
  );
}

export function CameraCapture({ onClose, onCapture, onUnavailable }: { onClose: () => void; onCapture: (file: File) => void; onUnavailable: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.name === "NotAllowedError") setError("Camera access was blocked. Allow the camera for this site in your browser settings, or choose a photo instead.");
        else onUnavailable(); // no camera here: fall back to the device's own picker
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Square crop from the centre, mirrored for the front camera so it matches the preview.
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(size, 720);
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.88));
  };

  const usePhoto = async () => {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Take a photo">
      <div className="w-full max-w-sm rounded-3xl bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-base font-bold text-slate-900">Take a photo</p>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-square bg-slate-900">
          {shot ? (
            <img src={shot} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
          )}
          {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white bg-slate-900/90">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          {shot ? (
            <>
              <button type="button" onClick={() => setShot(null)} className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                <RefreshCw className="h-4 w-4" /> Retake
              </button>
              <button type="button" onClick={usePhoto} className="flex-1 min-h-11 px-4 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 cursor-pointer">
                Use this photo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Switch camera" title="Switch camera" className="h-11 w-11 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center cursor-pointer">
                <SwitchCamera className="h-5 w-5" />
              </button>
              <button type="button" onClick={capture} disabled={!!error} aria-label="Capture" className="h-16 w-16 rounded-full border-4 border-sky-600 bg-white hover:bg-sky-50 disabled:opacity-40 cursor-pointer" />
              <span className="h-11 w-11" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
