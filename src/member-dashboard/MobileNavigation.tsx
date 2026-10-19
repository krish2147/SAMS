import React from "react";
import { Menu } from "lucide-react";
import { SideMenuDrawer } from "../components/SideMenuDrawer";
import { accountNavigation, findMemberNavigationItem, mobilePrimarySections, primaryNavigation, type MemberSection } from "./member-navigation";

interface MobileNavigationProps {
  activeSection: MemberSection;
  moreOpen: boolean;
  onMoreChange: (open: boolean) => void;
  onSelect: (section: MemberSection) => void;
  unreadCount?: number;
  userName: string;
  avatar?: string;
  onLogout?: () => void;
}

const moreItems = [...primaryNavigation.filter((item) => item.id === "calendar" || item.id === "attendance" || item.id === "notifications"), ...accountNavigation];

export function MobileNavigation({ activeSection, unreadCount = 0, moreOpen, onMoreChange, onSelect, userName, avatar, onLogout }: MobileNavigationProps) {
  const moreActive = moreItems.some((item) => item.id === activeSection);

  return (
    <>
      <SideMenuDrawer
        open={moreOpen}
        onClose={() => onMoreChange(false)}
        sections={[
          { items: primaryNavigation.filter((item) => mobilePrimarySections.includes(item.id)) },
          { heading: "More", items: primaryNavigation.filter((item) => !mobilePrimarySections.includes(item.id)).map((item) => (item.id === "notifications" ? { ...item, badge: unreadCount } : item)) },
          { heading: "Account", items: accountNavigation }
        ]}
        activeId={activeSection}
        onSelect={(id) => onSelect(id as MemberSection)}
        subtitle="Member"
        user={{ name: userName, role: "Member", avatar }}
        onProfile={() => onSelect("profile")}
        onLogout={onLogout}
      />

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Mobile member navigation">
        <div className="mx-auto grid h-[72px] max-w-xl grid-cols-5">
          {mobilePrimarySections.map((section) => {
            const item = findMemberNavigationItem(section);
            const Icon = item.icon;
            const active = item.id === activeSection;
            return (
              <button key={item.id} type="button" onClick={() => { onSelect(item.id); onMoreChange(false); }} aria-current={active ? "page" : undefined} className={`relative flex min-h-11 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${active ? "text-cyan-800" : "text-slate-500 hover:text-slate-800"}`}>
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-cyan-600" />}
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.shortLabel || item.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => onMoreChange(!moreOpen)} aria-expanded={moreOpen} className={`relative flex min-h-11 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${moreOpen || moreActive ? "text-cyan-800" : "text-slate-500 hover:text-slate-800"}`}>
            {(moreOpen || moreActive) && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-cyan-600" />}
            <span className="relative"><Menu className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}</span><span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
