import React, { type ReactNode, useMemo, useState } from "react";
import { MemberHeader } from "./MemberHeader";
import { MemberSidebar } from "./MemberSidebar";
import { MobileNavigation } from "./MobileNavigation";
import { findMemberNavigationItem, type MemberSection } from "./member-navigation";

interface MemberLayoutProps {
  activeSection: MemberSection;
  userName: string;
  avatar?: string;
  membershipStatus?: string;
  onSelect: (section: MemberSection) => void;
  onLogout?: () => void;
  showSectionIntro?: boolean;
  children: ReactNode;
}

export function MemberLayout({ activeSection, userName, avatar, membershipStatus, onSelect, onLogout, showSectionIntro = true, children }: MemberLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const currentSection = useMemo(() => findMemberNavigationItem(activeSection), [activeSection]);

  return (
    <div className="min-h-dvh bg-canvas text-ink-950">
      <MemberSidebar activeSection={activeSection} collapsed={sidebarCollapsed} userName={userName} avatar={avatar} membershipStatus={membershipStatus} onToggle={() => setSidebarCollapsed((value) => !value)} onSelect={onSelect} onLogout={onLogout} />
      <div className={`member-app-frame min-h-dvh transition-[padding] duration-200 ease-out ${sidebarCollapsed ? "member-app-frame--collapsed" : ""}`}>
        <MemberHeader currentSection={currentSection} userName={userName} avatar={avatar} onSelect={onSelect} onLogout={onLogout} />
        <main className="pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-10">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <div className={`mb-6 hidden lg:block ${showSectionIntro ? "" : "lg:hidden"}`}>
              <h1 className="font-display text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-ink-950">{currentSection.label}</h1>
              <p className="mt-2 text-[15px] leading-6 text-ink-600">{currentSection.description}</p>
            </div>
            <div className={`mb-5 lg:hidden ${showSectionIntro ? "" : "hidden"}`}>
              <p className="text-sm leading-6 text-ink-600">{currentSection.description}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
      <MobileNavigation activeSection={activeSection} moreOpen={moreOpen} onMoreChange={setMoreOpen} onSelect={onSelect} />
    </div>
  );
}
