import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { MemberAvatar, getMemberFirstName } from "./MemberAvatar";
import type { MemberSection } from "./member-navigation";

interface AccountMenuProps {
  userName: string;
  avatar?: string;
  membershipStatus?: string;
  collapsed?: boolean;
  placement?: "header" | "sidebar";
  onSelect: (section: MemberSection) => void;
  onLogout?: () => void;
}

export function AccountMenu({ userName, avatar, membershipStatus, collapsed = false, placement = "header", onSelect, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstName = getMemberFirstName(userName);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const choose = (section: MemberSection) => {
    setOpen(false);
    onSelect(section);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group flex min-h-11 items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua-400 ${placement === "sidebar" ? `w-full rounded-xl border border-white/10 bg-white/5 p-2 hover:border-white/20 hover:bg-white/10 ${collapsed ? "justify-center" : "gap-2.5"}` : "gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 sm:pr-2"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? `${firstName} account` : undefined}
      >
        <MemberAvatar avatar={avatar} userName={userName} className="h-8 w-8 shrink-0 rounded-lg" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className={`block truncate text-sm font-semibold ${placement === "sidebar" ? "text-white" : "text-ink-900"}`}>{firstName}</span>
              {placement === "sidebar" && (
                <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-200">
                  {membershipStatus && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${membershipStatus.toLowerCase() === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />}
                  {membershipStatus || "Status unavailable"}
                </span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${placement === "sidebar" ? "text-ink-400" : "text-ink-400"} ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div role="menu" className={`absolute z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ${placement === "sidebar" ? "bottom-[calc(100%+8px)] left-0" : "right-0 top-[calc(100%+8px)]"}`}>
          <button type="button" role="menuitem" onClick={() => choose("profile")} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-slate-700 outline-none hover:bg-slate-50 focus-visible:bg-slate-50">
            <UserRound className="h-[18px] w-[18px] text-slate-400" /> My Profile
          </button>
          <button type="button" role="menuitem" onClick={() => choose("security")} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-slate-700 outline-none hover:bg-slate-50 focus-visible:bg-slate-50">
            <LockKeyhole className="h-[18px] w-[18px] text-slate-400" /> Security
          </button>
          {onLogout && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button type="button" role="menuitem" onClick={onLogout} className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-rose-700 outline-none hover:bg-rose-50 focus-visible:bg-rose-50">
                <LogOut className="h-[18px] w-[18px]" /> Logout
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
