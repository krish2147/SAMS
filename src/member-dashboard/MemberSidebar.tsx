import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { AccountMenu } from "./AccountMenu";
import { NavItem } from "./NavItem";
import { accountNavigation, primaryNavigation, type MemberSection } from "./member-navigation";

interface MemberSidebarProps {
  activeSection: MemberSection;
  collapsed: boolean;
  userName: string;
  avatar?: string;
  membershipStatus?: string;
  onToggle: () => void;
  onSelect: (section: MemberSection) => void;
  onLogout?: () => void;
}

export function MemberSidebar({ activeSection, collapsed, userName, avatar, membershipStatus, onToggle, onSelect, onLogout }: MemberSidebarProps) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-ink-900 transition-[width] duration-200 ease-out lg:flex ${collapsed ? "w-[72px]" : "w-[248px]"}`}>
      <div className={`flex h-[72px] shrink-0 items-center ${collapsed ? "justify-center px-2" : "gap-3 px-5"}`}>
        <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/15" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-white">Baroda Swim Front</p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-aqua-300">Member dashboard</p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">Main</p>}
        <nav className="space-y-1" aria-label="Primary member navigation">
          {primaryNavigation.map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} collapsed={collapsed} onSelect={onSelect} />)}
        </nav>
        <div className="my-4 border-t border-white/8" />
        {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">Account</p>}
        <nav className="space-y-1" aria-label="Member account navigation">
          {accountNavigation.map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} collapsed={collapsed} onSelect={onSelect} />)}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        <AccountMenu userName={userName} avatar={avatar} membershipStatus={membershipStatus} collapsed={collapsed} placement="sidebar" onSelect={onSelect} onLogout={onLogout} />
      </div>

      <button type="button" onClick={onToggle} className="absolute -right-3 top-[88px] inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink-100 bg-white text-ink-600 shadow-sm outline-none transition-colors hover:border-aqua-400 hover:text-aqua-600 focus-visible:ring-2 focus-visible:ring-aqua-500" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
