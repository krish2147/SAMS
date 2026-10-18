import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Search, X } from "lucide-react";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";

// The phone "Menu" for every dashboard: a full-height panel that slides in from the left with
// the academy name on top, the pages as a simple list, and the signed-in person at the bottom.

export interface SideMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface SideMenuSection {
  heading?: string;
  items: SideMenuItem[];
}

interface SideMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  sections: SideMenuSection[];
  activeId: string;
  onSelect: (id: string) => void;
  subtitle: string;
  user: { name: string; role: string; avatar?: string };
  onProfile?: () => void;
  onSearch?: () => void;
  onLogout?: () => void;
  primaryAction?: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void };
}

export function SideMenuDrawer({
  open, onClose, sections, activeId, onSelect, subtitle, user, onProfile, onSearch, onLogout, primaryAction
}: SideMenuDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const pick = (fn: () => void) => () => { onClose(); fn(); };
  const PrimaryIcon = primaryAction?.icon;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 cursor-default"
          />

          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 left-0 w-[86%] max-w-[360px] bg-ink-950 text-ink-100 flex flex-col shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            {/* Academy name */}
            <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
              <img src={BARODA_SWIM_FRONT_LOGO_DATA_URI} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/15 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight text-white">Baroda Swim Front</p>
                <p className="text-xs font-medium text-aqua-300 mt-0.5 truncate">{subtitle}</p>
              </div>
              {onSearch && (
                <button type="button" onClick={pick(onSearch)} aria-label="Search" className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-ink-100 hover:bg-white/10 cursor-pointer">
                  <Search className="h-6 w-6" />
                </button>
              )}
              <button type="button" onClick={onClose} aria-label="Close menu" className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-ink-100 hover:bg-white/10 cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Pages */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Pages">
              {sections.map((section, i) => (
                <div key={section.heading || i} className={i > 0 ? "mt-3 pt-3 border-t border-white/10" : ""}>
                  {section.heading && (
                    <p className="px-3 pt-1 pb-2 text-sm font-semibold text-ink-400">{section.heading}</p>
                  )}
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === activeId;
                    return (
                      <button
                        key={item.id}
                        id={`menu-item-${item.id}`}
                        type="button"
                        onClick={pick(() => onSelect(item.id))}
                        aria-current={active ? "page" : undefined}
                        className={`w-full min-h-[52px] px-3 rounded-2xl flex items-center gap-4 text-left text-[17px] transition-colors cursor-pointer ${
                          active ? "bg-white/12 text-white font-semibold" : "text-ink-100 hover:bg-white/5"
                        }`}
                      >
                        <Icon className={`h-6 w-6 shrink-0 ${active ? "text-aqua-300" : "text-ink-200"}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge ? (
                          <span className="min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}

              {onLogout && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button
                    id="menu-item-logout"
                    type="button"
                    onClick={pick(onLogout)}
                    className="w-full min-h-[52px] px-3 rounded-2xl flex items-center gap-4 text-left text-[17px] text-red-300 hover:bg-red-500/10 cursor-pointer"
                  >
                    <LogOut className="h-6 w-6 shrink-0" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Signed-in person and the main action */}
            <div className="flex items-center gap-3 px-4 py-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={onProfile ? pick(onProfile) : undefined}
                disabled={!onProfile}
                aria-label="My profile"
                className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-2xl cursor-pointer disabled:cursor-default"
              >
                <span className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-aqua-500 text-white text-lg font-bold flex items-center justify-center">
                  {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : (user.name || "?").charAt(0).toUpperCase()}
                </span>
                {!primaryAction && (
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{user.name}</span>
                    <span className="block text-xs text-ink-400 truncate">{user.role}</span>
                  </span>
                )}
              </button>
              {primaryAction && PrimaryIcon && (
                <button
                  type="button"
                  id="menu-primary-action"
                  onClick={pick(primaryAction.onClick)}
                  className="h-12 px-5 rounded-full bg-white text-ink-950 text-[15px] font-semibold flex items-center gap-2 shrink-0 hover:bg-ink-50 cursor-pointer"
                >
                  <PrimaryIcon className="h-5 w-5" />
                  {primaryAction.label}
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
