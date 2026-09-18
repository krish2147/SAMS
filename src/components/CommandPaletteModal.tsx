import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Command, X, Users, CreditCard, Calendar, CheckCircle2,
  FileText, ArrowRight, UserPlus, ShieldCheck, QrCode, Sparkles,
  Bell, Settings, Clock, Activity, Zap, Layers, RefreshCw
} from "lucide-react";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onTriggerQuickAction?: (action: string) => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onNavigate,
  onTriggerQuickAction
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/global?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Pre-defined quick navigation routes
  const navItems = [
    { id: "home", title: "Executive Dashboard Home", category: "Navigation", icon: LayoutIcon, tab: "home" },
    { id: "approvals", title: "Member Registration Approvals", category: "Navigation", icon: ShieldCheck, tab: "approvals" },
    { id: "payments", title: "Payments & Financial Collections", category: "Navigation", icon: CreditCard, tab: "payments" },
    { id: "batches", title: "Swimmer Batches & Schedules", category: "Navigation", icon: Layers, tab: "batches" },
    { id: "calendar", title: "Academy Events & Holidays Calendar", category: "Navigation", icon: Calendar, tab: "calendar" },
    { id: "reports", title: "Analytics & Financial Reports", category: "Navigation", icon: FileText, tab: "reports" },
    { id: "activity", title: "Live Audit Timeline & Activity Log", category: "Navigation", icon: Activity, tab: "activity" },
    { id: "communication", title: "SMS & WhatsApp Communication Hub", category: "Navigation", icon: Bell, tab: "communication" },
    { id: "settings", title: "Academy System Settings", category: "Navigation", icon: Settings, tab: "settings" }
  ];

  // Pre-defined quick actions
  const quickActions = [
    { id: "action_scan_qr", title: "Scan Member QR Code (Reception)", icon: QrCode, action: "scan_qr" },
    { id: "action_add_member", title: "Register New Swimmer Member", icon: UserPlus, action: "add_member" },
    { id: "action_approve_members", title: "Batch Approve Pending Members", icon: CheckCircle2, action: "approve_members" },
    { id: "action_collect_payment", title: "Collect Fee / Record Payment", icon: CreditCard, action: "collect_payment" },
    { id: "action_create_event", title: "Schedule Competition / Event", icon: Calendar, action: "create_event" }
  ];

  const handleSelectNav = (tab: string) => {
    onNavigate(tab);
    onClose();
  };

  const handleSelectAction = (actionStr: string) => {
    if (onTriggerQuickAction) {
      onTriggerQuickAction(actionStr);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header Search Input */}
          <div className="relative flex items-center px-5 py-4 border-b border-slate-800/80 bg-slate-900/80">
            <Search className="w-5 h-5 text-cyan-400 shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search members, payments, coaches, batches, or commands... (Ctrl + K)"
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none pr-8"
            />
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-800 rounded border border-slate-700">
                  ESC
                </kbd>
                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Results Container */}
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 custom-scrollbar">
            {/* 1. API SEARCH RESULTS */}
            {query.trim() && results && (
              <div className="space-y-4">
                {/* Members */}
                {results.members && results.members.length > 0 && (
                  <div>
                    <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase mb-2">
                      Members Found ({results.members.length})
                    </div>
                    <div className="space-y-1">
                      {results.members.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => handleSelectNav("home")}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-xs">
                              {m.fullName ? m.fullName.charAt(0) : "M"}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                {m.fullName}
                                <span className="text-[10px] font-mono font-normal text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                  {m.membershipNo}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {m.email || m.mobileNo} • Status: <strong className="text-emerald-400">{m.membership_status || "Active"}</strong>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payments */}
                {results.payments && results.payments.length > 0 && (
                  <div>
                    <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase mb-2">
                      Payments & Invoices ({results.payments.length})
                    </div>
                    <div className="space-y-1">
                      {results.payments.map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectNav("payments")}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">
                                ₹{p.amount} • {p.payment_method || "UPI / Cash"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Txn: {p.transaction_id || `TXN-${p.id}`} • Status: <strong className="text-emerald-400">{p.payment_status}</strong>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Batches */}
                {results.batches && results.batches.length > 0 && (
                  <div>
                    <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-purple-400 uppercase mb-2">
                      Training Batches ({results.batches.length})
                    </div>
                    <div className="space-y-1">
                      {results.batches.map((b: any) => (
                        <div
                          key={b.id}
                          onClick={() => handleSelectNav("batches")}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">
                                {b.batch_name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Timing: {b.start_time} - {b.end_time} • Capacity: {b.capacity}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {results.members?.length === 0 && results.payments?.length === 0 && results.batches?.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No matching records found for "{query}". Try searching by name, ID, or phone number.
                  </div>
                )}
              </div>
            )}

            {/* DEFAULT VIEW: QUICK ACTIONS & NAVIGATION */}
            {!query.trim() && (
              <>
                {/* Quick Actions */}
                <div>
                  <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Frequent Quick Actions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickActions.map((qa) => {
                      const Icon = qa.icon;
                      return (
                        <div
                          key={qa.id}
                          onClick={() => handleSelectAction(qa.action)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition-all group"
                        >
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                            {qa.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Pages */}
                <div>
                  <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">
                    Jump to Dashboard Pages
                  </div>
                  <div className="space-y-1">
                    {navItems.map((ni) => {
                      const Icon = ni.icon;
                      return (
                        <div
                          key={ni.id}
                          onClick={() => handleSelectNav(ni.tab)}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-semibold text-slate-200">
                              {ni.title}
                            </span>
                          </div>
                          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-950 rounded border border-slate-800">
                            Jump ↵
                          </kbd>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between px-5">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> SAMS Universal Command Center
            </span>
            <div className="flex items-center gap-3">
              <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
              <span><strong>ESC</strong> to close</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function LayoutIcon(props: any) {
  return (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/>
      <rect width="7" height="5" x="14" y="3" rx="1"/>
      <rect width="7" height="9" x="14" y="12" rx="1"/>
      <rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>
  );
}
