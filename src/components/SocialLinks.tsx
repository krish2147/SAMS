import React from "react";
import { Facebook, Instagram } from "lucide-react";
import { ACADEMY_SOCIAL } from "../member-dashboard/MemberSocialPopup";

// "Follow us" links side by side, styled as pills with a brand-coloured blob icon overlapping one end,
// alternating sides: Facebook on the left, Instagram on the right.

const BLOB_A = "58% 42% 55% 45% / 48% 58% 42% 52%";
const BLOB_B = "45% 55% 42% 58% / 56% 44% 56% 44%";
const IG_GRADIENT = "linear-gradient(45deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)";

interface RowProps {
  href: string;
  label: string;
  handle: string;
  side: "left" | "right";
  icon: React.ReactNode;
  badgeStyle: React.CSSProperties;
  dotStyle: React.CSSProperties;
}

function SocialRow({ href, label, handle, side, icon, badgeStyle, dotStyle }: RowProps) {
  const badge = (
    <span aria-hidden="true" className="relative z-10 flex h-11 w-11 shrink-0 sm:h-12 sm:w-12 items-center justify-center text-white shadow-lg ring-[3px] ring-white transition-transform group-hover:scale-105" style={badgeStyle}>
      {icon}
    </span>
  );
  const dot = <span aria-hidden="true" className="hidden h-2.5 w-2.5 shrink-0 rounded-full min-[400px]:block" style={dotStyle} />;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={`group flex min-w-0 items-center ${side === "right" ? "flex-row-reverse" : ""}`}>
      {badge}
      <span className={`flex h-9 min-w-0 flex-1 items-center justify-between gap-1.5 border border-ink-100 bg-white shadow-card transition-colors group-hover:border-ink-200 ${
        side === "left" ? "-ml-3 rounded-r-full pl-4 pr-2.5" : "-mr-3 flex-row-reverse rounded-l-full pl-2.5 pr-4"
      }`}>
        <span className="min-w-0 flex-1 truncate text-center text-[clamp(11px,3.1vw,13.5px)] font-semibold tracking-[-0.01em] text-ink-900">{handle}</span>
        {dot}
      </span>
    </a>
  );
}

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      <SocialRow
        href={ACADEMY_SOCIAL.facebookUrl}
        label="Baroda Swim Front on Facebook"
        handle="Facebook"
        side="left"
        icon={<Facebook className="h-5 w-5" fill="currentColor" strokeWidth={0} />}
        badgeStyle={{ background: "#1877f2", borderRadius: BLOB_A }}
        dotStyle={{ background: "#1877f2" }}
      />
      <SocialRow
        href={ACADEMY_SOCIAL.instagramUrl}
        label={`${ACADEMY_SOCIAL.instagramHandle} on Instagram`}
        handle="Instagram"
        side="right"
        icon={<Instagram className="h-5 w-5" strokeWidth={2.25} />}
        badgeStyle={{ background: IG_GRADIENT, borderRadius: BLOB_B }}
        dotStyle={{ background: IG_GRADIENT }}
      />
    </div>
  );
}
