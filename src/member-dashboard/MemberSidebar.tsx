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
    <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out lg:flex ${collapsed ? "w-[72px]" : "w-[240px]"}`}>
      <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}>
        <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="Baroda Swim Front" className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-slate-950">Baroda Swim Front</p>
            <p className="mt-0.5 text-xs text-slate-500">Member Portal</p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 py-4">
        {!collapsed && <p className="mb-2 px-3 text-xs font-medium text-slate-400">Main</p>}
        <nav className="space-y-1" aria-label="Primary member navigation">
          {primaryNavigation.map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} collapsed={collapsed} onSelect={onSelect} />)}
        </nav>
        <div className="my-4 border-t border-slate-100" />
        {!collapsed && <p className="mb-2 px-3 text-xs font-medium text-slate-400">Account</p>}
        <nav className="space-y-1" aria-label="Member account navigation">
          {accountNavigation.map((item) => <NavItem key={item.id} item={item} active={activeSection === item.id} collapsed={collapsed} onSelect={onSelect} />)}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-100 p-2.5">
        <AccountMenu userName={userName} avatar={avatar} membershipStatus={membershipStatus} collapsed={collapsed} placement="sidebar" onSelect={onSelect} onLogout={onLogout} />
      </div>

      <button type="button" onClick={onToggle} className="absolute -right-3 top-[84px] inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-colors hover:border-cyan-300 hover:text-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-500" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
