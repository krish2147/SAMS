import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, UserPlus, ShieldCheck, QrCode, CreditCard, Calendar,
  Command
} from "lucide-react";

interface QuickActionsFabProps {
  onAction: (action: string) => void;
  onOpenCommandPalette: () => void;
}

export function QuickActionsFab({ onAction, onOpenCommandPalette }: QuickActionsFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: "scan_qr", label: "Scan Member QR", icon: QrCode, color: "from-cyan-500 to-blue-600" },
    { id: "add_member", label: "Register Swimmer", icon: UserPlus, color: "from-emerald-500 to-teal-600" },
    { id: "approve_members", label: "Pending Approvals", icon: ShieldCheck, color: "from-indigo-500 to-purple-600" },
    { id: "collect_payment", label: "Collect Payment", icon: CreditCard, color: "from-amber-500 to-orange-600" },
    { id: "create_event", label: "Schedule Event", icon: Calendar, color: "from-rose-500 to-pink-600" },
    { id: "command_palette", label: "Command Palette (Ctrl+K)", icon: Command, color: "from-slate-700 to-slate-900" }
  ];

  const handleTrigger = (id: string) => {
    if (id === "command_palette") {
      onOpenCommandPalette();
    } else {
      onAction(id);
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay to close quick actions on tap outside */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1.5px] transition-opacity cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button Container (Bottom Right) */}
      <div className="fixed bottom-[76px] right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end pointer-events-none">
        
        {/* Sub Menu Options */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              className="flex flex-col items-end gap-2.5 mb-3 pointer-events-auto"
            >
              {actions.map((act, index) => {
                const Icon = act.icon;
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.035 }}
                    onClick={() => handleTrigger(act.id)}
                    className="flex items-center justify-end gap-2.5 cursor-pointer group"
                  >
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-xs font-bold shadow-xl border border-slate-700/80 backdrop-blur-md whitespace-nowrap">
                      {act.label}
                    </span>
                    <div className={`p-3 rounded-full bg-gradient-to-r ${act.color} text-white shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-600/40 border border-sky-300/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center relative group pointer-events-auto focus:outline-none focus:ring-4 focus:ring-sky-400/30 shrink-0"
          title="Quick Actions Center (Ctrl + K)"
          aria-label="Quick Actions Center"
          id="btn-fab-quick-actions"
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </motion.div>
        </button>
      </div>
    </>
  );
}

