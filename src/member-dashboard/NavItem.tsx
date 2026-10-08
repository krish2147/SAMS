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
      className={`group relative flex min-h-11 w-full items-center rounded-xl text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-white/10 font-semibold text-white" : "font-medium text-ink-200 hover:bg-white/5 hover:text-white"}`}
    >
      {active && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-aqua-400" />}
      <Icon className={`h-[19px] w-[19px] shrink-0 ${active ? "text-aqua-300" : "text-ink-400 group-hover:text-ink-200"}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}
