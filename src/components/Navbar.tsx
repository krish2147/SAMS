import React, { useState } from "react";
import { SAMSLogo } from "./Branding";
import { Menu, X, Sparkles, LogOut, User, Users, ArrowLeft } from "lucide-react";
import { AcademyId, UserSession } from "../types";
import { motion } from "motion/react";

interface NavbarProps {
  selectedAcademyId: AcademyId | null;
  onSelectAcademy: (id: AcademyId | null) => void;
  onOpenLogin: () => void;
  userSession: UserSession | null;
  onLogout: () => void;
  isRegisterPageActive?: boolean;
}

export function Navbar({
  selectedAcademyId,
  onSelectAcademy,
  onOpenLogin,
  userSession,
  onLogout,
  isRegisterPageActive = false
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Styling based on current academy
  const getNavStyle = () => {
    if (!selectedAcademyId) {
      return "bg-slate-950/60 border-slate-900/50 text-white backdrop-blur-xl";
    }
    if (selectedAcademyId === "swim") {
      return "bg-white/70 border-sky-100/50 text-slate-800 backdrop-blur-xl shadow-sm";
    }
    return "bg-emerald-950/70 border-emerald-900/40 text-emerald-50 backdrop-blur-xl shadow-lg";
  };

  const getButtonStyle = () => {
    if (!selectedAcademyId) {
      return "bg-white text-slate-950 hover:bg-slate-100 shadow-[0_4px_20px_rgba(255,255,255,0.15)]";
    }
    if (selectedAcademyId === "swim") {
      return "bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-sky-500/10";
    }
    return "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold hover:opacity-95 shadow-lg shadow-amber-500/10";
  };

  return (
    <nav className={`fixed top-4 inset-x-4 md:inset-x-8 h-18 rounded-2xl border flex items-center justify-between px-6 md:px-8 z-50 transition-all duration-700 ${getNavStyle()}`}>
      
      {/* Brand Logo and Branding */}
      <motion.div 
        key={selectedAcademyId || "general"}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 sm:gap-4"
      >
        {selectedAcademyId === "swim" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white h-10 w-10 shrink-0 shadow-md">
              <span className="text-lg">🌊</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-extrabold tracking-tight leading-none text-slate-800">
                Baroda Swim Front
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-slate-400 mt-1">
                Swimming Academy
              </span>
            </div>
          </div>
        ) : selectedAcademyId === "cricket" ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white h-10 w-10 shrink-0 shadow-md">
              <span className="text-lg">🏏</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-sm font-extrabold tracking-tight leading-none text-emerald-100">
                The Cricket Academy
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-emerald-400 mt-1">
                Elite Training Arena
              </span>
            </div>
          </div>
        ) : (
          <button 
            id="btn-nav-logo"
            onClick={() => onSelectAcademy(null)} 
            className="hover:scale-105 transition-transform cursor-pointer shrink-0"
          >
            <SAMSLogo light={selectedAcademyId !== "swim"} />
          </button>
        )}
      </motion.div>

      {/* Nav Actions / Items */}
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        {/* User Authenticated State or Login */}
        {userSession ? (
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              selectedAcademyId === "swim"
                ? "bg-slate-50 border-slate-200"
                : "bg-emerald-900/20 border-emerald-800/30"
            }`}>
              {userSession.avatar ? (
                <img src={userSession.avatar} alt={userSession.name} className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span className="text-xs font-semibold">
                {userSession.role === "member" 
                  ? userSession.name 
                  : `${userSession.name} • ${userSession.role === 'staff' ? 'Reception' : userSession.role.charAt(0).toUpperCase() + userSession.role.slice(1)}`}
              </span>
            </div>
            
            <button
              id="btn-nav-logout"
              onClick={onLogout}
              className={`p-2 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer`}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobile Menu Icon */}
      <div className="md:hidden flex items-center gap-3">
        {userSession && (
          <span className="text-xs font-medium truncate max-w-[100px]">{userSession.name}</span>
        )}
        {!userSession && isRegisterPageActive ? null : (
          <button
            id="btn-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-xl hover:bg-current/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`absolute top-22 inset-x-0 rounded-2xl border p-6 flex flex-col gap-6 z-40 md:hidden animate-in fade-in slide-in-from-top-4 duration-300 ${
          selectedAcademyId === "swim"
            ? "bg-white border-slate-100 text-slate-800 shadow-xl"
            : "bg-emerald-950 border-emerald-900 text-emerald-50 shadow-2xl"
        }`}>
          {userSession ? (
            <div className="flex flex-col gap-3 pt-4 border-t border-current/10">
              <div className="flex items-center gap-3">
                <img src={userSession.avatar} alt={userSession.name} className="h-8 w-8 rounded-full object-cover" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {userSession.role === "member" 
                      ? userSession.name 
                      : `${userSession.name} • ${userSession.role === 'staff' ? 'Reception' : userSession.role.charAt(0).toUpperCase() + userSession.role.slice(1)}`}
                  </span>
                </div>
              </div>
              <button
                id="btn-nav-mobile-logout"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 rounded-xl bg-red-500/10 text-red-500 font-semibold text-xs uppercase"
              >
                Sign Out
              </button>
            </div>
          ) : null}

          {selectedAcademyId && (
            <button
              id="btn-nav-mobile-reset"
              onClick={() => {
                onSelectAcademy(null);
                setMobileMenuOpen(false);
              }}
              className="text-xs opacity-60 flex items-center justify-center gap-1 mt-2"
            >
              ← Back to Academy Selection
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
