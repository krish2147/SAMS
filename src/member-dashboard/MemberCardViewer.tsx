import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Download, RotateCw, X } from "lucide-react";
import type { MemberDashboardData } from "./member-overview-data";
import {
  buildMembershipCardBackSvg, buildMembershipCardSvg, prepareCardImages, CARD_HEIGHT, CARD_WIDTH, type CardImages
} from "./download-membership-card";

// "Open card": the membership card in 3D. It flies in, tilts with the finger, mouse or the phone's
// own tilt, a holographic shine follows the light, and a tap flips it to the back (big QR for the
// counter). Motion is switched off for people who ask their device for reduced motion.

interface MemberCardViewerProps {
  data: MemberDashboardData;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}

export function MemberCardViewer({ data, open, onClose, onDownload, downloading }: MemberCardViewerProps) {
  const reduceMotion = useReducedMotion();
  const [images, setImages] = useState<CardImages>({ qr: null, photo: null });
  const [flipped, setFlipped] = useState(false);
  const interacted = useRef(false);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 140, damping: 18 });
  const rotateY = useSpring(tiltY, { stiffness: 140, damping: 18 });
  const shineX = useTransform(rotateY, [-25, 25], [0, 100]);
  const shineY = useTransform(rotateX, [-20, 20], [100, 0]);
  const shinePosition = useMotionTemplate`${shineX}% ${shineY}%`;
  const holoAngle = useTransform(rotateY, [-25, 25], [0, 180]);
  const holo = useMotionTemplate`conic-gradient(from ${holoAngle}deg at 50% 50%, #f0abfc, #a5f3fc, #fde68a, #c4b5fd, #99f6e4, #f0abfc)`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    prepareCardImages(data).then((ready) => { if (!cancelled) setImages(ready); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, data.member.membershipNo, data.member.photoUrl]);

  // Escape closes; the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    setFlipped(false);
    interacted.current = false;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [open, onClose]);

  // A slow sway until the person touches it, so the card feels alive.
  useEffect(() => {
    if (!open || reduceMotion) return;
    const controls = animate(tiltY, [-10, 10], { duration: 3.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 0.9 });
    const controlsX = animate(tiltX, [5, -5], { duration: 4.1, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: 0.9 });
    const stop = () => { controls.stop(); controlsX.stop(); };
    const id = window.setInterval(() => { if (interacted.current) { stop(); window.clearInterval(id); } }, 150);
    return () => { stop(); window.clearInterval(id); };
  }, [open, reduceMotion, tiltX, tiltY]);

  // The phone's own tilt moves the card, where the browser allows it without asking.
  useEffect(() => {
    if (!open || reduceMotion) return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      interacted.current = true;
      tiltY.set(Math.max(-25, Math.min(25, e.gamma * 0.6)));
      tiltX.set(Math.max(-20, Math.min(20, (e.beta - 45) * -0.4)));
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [open, reduceMotion, tiltX, tiltY]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduceMotion) return;
    interacted.current = true;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    tiltY.set(x * 40);
    tiltX.set(-y * 30);
  };
  const onPointerLeave = () => { tiltX.set(0); tiltY.set(0); };

  // Drawn at twice the size and scaled down, so the browser keeps the text sharp while the card is
  // tilted in 3D (tilted layers are otherwise painted at low resolution and look blurry).
  const sharp = "absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 [&>svg]:block [&>svg]:h-full [&>svg]:w-full";
  const face = "absolute inset-0 overflow-hidden rounded-[4%/6.3%] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]";
  const shine = (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: "linear-gradient(115deg, transparent 20%, rgba(255,248,230,0.32) 44%, rgba(255,255,255,0.12) 50%, transparent 66%)",
          backgroundSize: "260% 260%",
          backgroundPosition: shinePosition
        }}
      />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-color-dodge" style={{ backgroundImage: holo }} />
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Your membership card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          style={{ background: "radial-gradient(120% 80% at 50% 0%, #0f5c9e 0%, #062a52 45%, #010c1c 100%)" }}
        >
          {/* Light moving like sun through pool water. */}
          {!reduceMotion && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    width: `${55 + i * 15}vmax`, height: `${55 + i * 15}vmax`,
                    left: `${[-15, 45, 10][i]}%`, top: `${[-20, 30, 60][i]}%`,
                    background: ["#38bdf826", "#d9bd7c12", "#0ea5e922"][i]
                  }}
                  animate={{ x: [0, 40, -30, 0], y: [0, -30, 20, 0] }}
                  transition={{ duration: 14 + i * 4, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}

          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 cursor-pointer">
            <X className="h-6 w-6" />
          </button>

          <motion.p
            className="relative mb-6 text-center text-sm font-medium tracking-[0.3em] text-[#d9bd7c]"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          >
            BARODA SWIM FRONT · MEMBER
          </motion.p>

          {/* The card */}
          <div className="relative w-full max-w-[560px] [perspective:1400px]">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, rotateY: -75, rotateX: 25, y: 120 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotateY: 0, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ type: "spring", stiffness: 90, damping: 14, mass: 0.9 }}
              className="[transform-style:preserve-3d]"
            >
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="[transform-style:preserve-3d]"
              >
                <motion.button
                  type="button"
                  onClick={() => setFlipped((f) => !f)}
                  aria-label={flipped ? "Show the front of the card" : "Show the back of the card"}
                  className="relative block w-full cursor-pointer [transform-style:preserve-3d]"
                  style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}`, rotateX, rotateY }}
                >
                  <motion.div
                    className="absolute inset-0 [transform-style:preserve-3d]"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 13 }}
                  >
                    <div className={`${face} shadow-[0_40px_80px_-20px_rgba(0,0,0,0.75)]`}>
                      <div className={sharp} dangerouslySetInnerHTML={{ __html: buildMembershipCardSvg(data, images) }} />
                      {shine}
                    </div>
                    <div className={`${face} [transform:rotateY(180deg)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.75)]`}>
                      <div className={sharp} dangerouslySetInnerHTML={{ __html: buildMembershipCardBackSvg(data, images) }} />
                      {shine}
                    </div>
                  </motion.div>
                </motion.button>
              </motion.div>
            </motion.div>
            {/* Soft shadow on the "floor" */}
            <div aria-hidden="true" className="mx-auto mt-8 h-6 w-3/4 rounded-[50%] bg-black/50 blur-xl" />
          </div>

          <motion.p
            className="relative mt-4 text-center text-sm text-white/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          >
            {flipped ? "Show the QR code at the reception" : "Tap the card to turn it over"}
          </motion.p>

          <motion.div
            className="relative mt-6 flex w-full max-w-[560px] gap-3"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          >
            <button type="button" onClick={() => setFlipped((f) => !f)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-[15px] font-semibold text-white backdrop-blur hover:bg-white/20 cursor-pointer">
              <RotateCw className="h-5 w-5" /> {flipped ? "Front" : "Back"}
            </button>
            <button type="button" onClick={onDownload} disabled={downloading} className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-slate-950 hover:bg-cyan-50 disabled:opacity-70 cursor-pointer">
              <Download className="h-5 w-5" /> {downloading ? "Preparing…" : "Download"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
