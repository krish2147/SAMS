import React from "react";
import { Bell, ChevronRight } from "lucide-react";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { AccountMenu } from "./AccountMenu";
import type { MemberNavigationItem, MemberSection } from "./member-navigation";

interface MemberHeaderProps {
  currentSection: MemberNavigationItem;
  userName: string;
  avatar?: string;
  onSelect: (section: MemberSection) => void;
  onLogout?: () => void;
}

export function MemberHeader({ currentSection, userName, avatar, onSelect, onLogout }: MemberHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span className="font-medium text-slate-500">Member Portal</span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="truncate font-semibold text-slate-900">{currentSection.label}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-slate-500">Baroda Swim Front</p>
            <p className="truncate text-sm font-semibold leading-tight text-slate-950">{currentSection.shortLabel || currentSection.label}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onSelect("notifications")} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-500" aria-label="Open notifications">
            <Bell className="h-[19px] w-[19px]" />
          </button>
          <AccountMenu userName={userName} avatar={avatar} onSelect={onSelect} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
