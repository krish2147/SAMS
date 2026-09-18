import React, { useEffect } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { accountNavigation, findMemberNavigationItem, mobilePrimarySections, primaryNavigation, type MemberSection } from "./member-navigation";

interface MobileNavigationProps {
  activeSection: MemberSection;
  moreOpen: boolean;
  onMoreChange: (open: boolean) => void;
  onSelect: (section: MemberSection) => void;
}

const moreItems = [...primaryNavigation.filter((item) => item.id === "calendar" || item.id === "attendance" || item.id === "notifications"), ...accountNavigation];

export function MobileNavigation({ activeSection, moreOpen, onMoreChange, onSelect }: MobileNavigationProps) {
  const moreActive = moreItems.some((item) => item.id === activeSection);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMoreChange(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen, onMoreChange]);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More member navigation">
          <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={() => onMoreChange(false)} aria-label="Close more navigation" />
          <div className="absolute inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-[0_-20px_55px_rgba(15,23,42,0.16)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-base font-semibold text-slate-950">More</h2>
              <button type="button" onClick={() => onMoreChange(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-500" aria-label="Close more navigation">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Additional member navigation">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeSection;
                return (
                  <button key={item.id} type="button" onClick={() => { onSelect(item.id); onMoreChange(false); }} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${active ? "bg-cyan-50 text-cyan-900" : "text-slate-700 hover:bg-slate-50"}`}>
                    <Icon className={`h-[19px] w-[19px] ${active ? "text-cyan-700" : "text-slate-400"}`} /> {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Mobile member navigation">
        <div className="member-mobile-tabs mx-auto h-[72px] max-w-xl">
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
            <MoreHorizontal className="h-5 w-5" /><span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
