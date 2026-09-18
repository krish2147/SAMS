import React from "react";
import type { MemberNavigationItem, MemberSection } from "./member-navigation";

interface NavItemProps {
  key?: React.Key;
  item: MemberNavigationItem;
  active: boolean;
  collapsed: boolean;
  onSelect: (section: MemberSection) => void;
}

export function NavItem({ item, active, collapsed, onSelect }: NavItemProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex min-h-11 w-full items-center rounded-lg text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-cyan-50 font-semibold text-slate-950" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
    >
      {active && <span className="absolute bottom-2.5 left-0 top-2.5 w-0.5 rounded-r-full bg-cyan-600" />}
      <Icon className={`h-[19px] w-[19px] shrink-0 ${active ? "text-cyan-700" : "text-slate-400 group-hover:text-slate-600"}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}
