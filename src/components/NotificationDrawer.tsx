import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Bell, Check, Trash2, ShieldAlert, UserPlus, 
  CheckCircle, XCircle, RefreshCw, BookOpen, Megaphone,
  Filter, Clock, CheckCheck
} from "lucide-react";

export interface SysNotification {
  id: number;
  text: string;
  time: string;
  read: boolean;
  type: "registration" | "approval" | "rejection" | "renewal" | "system" | "class" | "announcement";
  title?: string;
  category?: "alert" | "class_update" | "system";
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SysNotification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll
}: NotificationDrawerProps) {
  const [filter, setFilter] = useState<"all" | "alerts" | "class" | "unread">("all");

  const getIcon = (type: string) => {
    switch (type) {
      case "registration":
        return <UserPlus className="h-4 w-4 text-sky-500" />;
      case "approval":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "rejection":
        return <XCircle className="h-4 w-4 text-rose-500" />;
      case "renewal":
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      case "class":
        return <BookOpen className="h-4 w-4 text-indigo-500" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getBg = (type: string, read: boolean) => {
    if (read) return "bg-slate-50 border-slate-100 hover:bg-slate-100/70";
    switch (type) {
      case "registration":
        return "bg-sky-50/50 border-sky-100 hover:bg-sky-50";
      case "approval":
        return "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50";
      case "rejection":
        return "bg-rose-50/50 border-rose-100 hover:bg-rose-50";
      case "renewal":
        return "bg-amber-50/50 border-amber-100 hover:bg-amber-50";
      case "class":
        return "bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50";
      case "announcement":
        return "bg-purple-50/50 border-purple-100 hover:bg-purple-50";
      default:
        return "bg-blue-50/50 border-blue-100 hover:bg-blue-50";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "alerts") return ["registration", "approval", "rejection", "renewal", "system"].includes(n.type);
    if (filter === "class") return ["class", "announcement"].includes(n.type);
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 text-left"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <Bell className="h-5 w-5 text-slate-800" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">System Alerts & Updates</h3>
                  <p className="text-[10.5px] text-slate-500 font-medium">Recent announcements, class updates & alerts</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                title="Close Drawer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 text-xs font-semibold overflow-x-auto shrink-0">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: `Unread (${unreadCount})` },
                { id: "alerts", label: "System Alerts" },
                { id: "class", label: "Class Updates" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id as any)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filter === t.id 
                      ? "bg-slate-900 text-white shadow-2xs" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Quick Actions Bar */}
            {notifications.length > 0 && (
              <div className="px-5 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 text-[11px] font-semibold shrink-0">
                <button
                  onClick={onMarkAllRead}
                  className="text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
                <button
                  onClick={onClearAll}
                  className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear all</span>
                </button>
              </div>
            )}

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-slate-600 text-xs font-bold">No notifications found</p>
                  <p className="text-slate-400 text-[11px] mt-1 max-w-xs">You're all caught up! System alerts or class updates will appear here.</p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layoutId={`notif-${n.id}`}
                    className={`p-4 rounded-2xl border flex gap-3 group relative transition-all ${getBg(
                      n.type,
                      n.read
                    )}`}
                  >
                    {/* Status Indicator */}
                    {!n.read && (
                      <span className="absolute top-4 right-4 h-2 w-2 bg-sky-500 rounded-full animate-pulse" />
                    )}

                    {/* Icon Container */}
                    <div className="mt-0.5 shrink-0 h-8.5 w-8.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-2xs">
                      {getIcon(n.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600 tracking-wider">
                          {n.type.replace("_", " ")}
                        </span>
                        {n.title && (
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {n.title}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed ${n.read ? "text-slate-500 font-medium" : "text-slate-800 font-bold"}`}>
                        {n.text}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
                        <Clock className="h-3 w-3" />
                        <span>{n.time}</span>
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          onClick={() => onMarkRead(n.id)}
                          title="Mark as read"
                          className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:border-sky-300 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(n.id)}
                        title="Delete notification"
                        className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
