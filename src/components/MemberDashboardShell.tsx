import React, { useEffect, useMemo, useState } from "react";
import { MemberLayout } from "../member-dashboard/MemberLayout";
import { findMemberNavigationItem, type MemberSection } from "../member-dashboard/member-navigation";
import { MemberOverview } from "../member-dashboard/MemberOverview";
import { MyMembershipPage } from "../member-dashboard/MyMembershipPage";
import { PaymentsPage } from "../member-dashboard/PaymentsPage";
import { MyBatchPage } from "../member-dashboard/MyBatchPage";
import { MemberCalendarPage } from "../member-dashboard/MemberCalendarPage";

interface MemberDashboardShellProps {
  userName: string;
  avatar?: string;
  onLogout?: () => void;
}

export function MemberDashboardShell({ userName, avatar, onLogout }: MemberDashboardShellProps) {
  const [activeSection, setActiveSection] = useState<MemberSection>("overview");
  const [membershipStatus, setMembershipStatus] = useState<string>();
  const currentSection = useMemo(() => findMemberNavigationItem(activeSection), [activeSection]);
  const CurrentIcon = currentSection.icon;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/member/dashboard", { credentials: "same-origin", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const status = data?.membership?.status;
        if (typeof status === "string" && status.trim()) setMembershipStatus(status.trim());
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setMembershipStatus(undefined);
      });
    return () => controller.abort();
  }, []);

  return (
    <MemberLayout activeSection={activeSection} userName={userName} avatar={avatar} membershipStatus={membershipStatus} onSelect={setActiveSection} onLogout={onLogout} showSectionIntro={!(["overview", "membership", "payments", "batch", "calendar"] as MemberSection[]).includes(activeSection)}>
      {activeSection === "overview" ? <MemberOverview sessionName={userName} onNavigate={setActiveSection} /> : activeSection === "membership" ? <MyMembershipPage onNavigate={setActiveSection} /> : activeSection === "payments" ? <PaymentsPage /> : activeSection === "batch" ? <MyBatchPage onNavigate={setActiveSection} /> : activeSection === "calendar" ? <MemberCalendarPage /> : <section aria-labelledby="member-content-title" className="max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <h2 id="member-content-title" className="sr-only">{currentSection.label}</h2>
        <div className="flex min-h-[200px] items-center justify-center px-6 py-8">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-100">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{currentSection.label}</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">No information is available in this section yet.</p>
          </div>
        </div>
      </section>}
    </MemberLayout>
  );
}
