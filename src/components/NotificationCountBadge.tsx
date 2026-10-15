import React from "react";

// Red unread counter for a bell button, like a phone's notification badge.
// The parent button must be `relative`.
export function NotificationCountBadge({ count, className = "-top-1.5 -right-1.5" }: { count: number; className?: string }) {
  if (!count || count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} unread notification${count === 1 ? "" : "s"}`}
      className={`absolute ${className} min-w-[19px] h-[19px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold leading-[19px] text-center tabular-nums ring-2 ring-white pointer-events-none`}
    >
      {label}
    </span>
  );
}
