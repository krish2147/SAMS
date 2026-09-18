import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  FileText,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Smartphone,
  Eye,
  Edit3,
  Save,
  Zap,
  Users,
  UserCheck,
  Award,
  Sparkles,
  ChevronRight,
  Info,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";

interface CommunicationLog {
  id: number;
  member_id?: number;
  member_name: string;
  mobile_no: string;
  email: string;
  event_key: string;
  message_title: string;
  channel_whatsapp: "Delivered" | "Read" | "Failed" | "Pending" | "N/A";
  channel_sms: "Delivered" | "Read" | "Failed" | "Pending" | "N/A";
  channel_email: "Delivered" | "Read" | "Failed" | "Pending" | "N/A";
  whatsapp_response?: string;
  sms_response?: string;
  email_response?: string;
  status: "Delivered" | "Read" | "Failed" | "Pending";
  sent_by: string;
  recipient_group?: string;
  content_preview?: string;
  created_at: string;
}

interface CommunicationTemplate {
  id?: number;
  event_key: string;
  title: string;
  whatsapp_template_name?: string;
  whatsapp_content: string;
  sms_content: string;
  email_subject: string;
  email_body_html: string;
  channels: string;
  updated_at?: string;
}

interface CommStats {
  totalSent: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  whatsappCount: number;
  smsCount: number;
  emailCount: number;
}

export const CommunicationTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"logs" | "bulk" | "templates" | "test">("logs");
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [stats, setStats] = useState<CommStats>({
    totalSent: 0,
    deliveredCount: 0,
    failedCount: 0,
    pendingCount: 0,
    whatsappCount: 0,
    smsCount: 0,
    emailCount: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters for Logs
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedEvent, setSelectedEvent] = useState<string>("All");
  const [selectedLogDetail, setSelectedLogDetail] = useState<CommunicationLog | null>(null);

  // Bulk Announcement Form
  const [bulkTarget, setBulkTarget] = useState<string>("all");
  const [bulkSubject, setBulkSubject] = useState<string>("Important Announcement - Baroda Swim Front");
  const [bulkMessage, setBulkMessage] = useState<string>("");
  const [bulkSending, setBulkSending] = useState<boolean>(false);

  // Template Editing State
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Test Trigger State
  const [testEventKey, setTestEventKey] = useState<string>("registration_submitted");
  const [testMemberName, setTestMemberName] = useState<string>("Ananya Patel");
  const [testMobileNo, setTestMobileNo] = useState<string>("9876543210");
  const [testEmail, setTestEmail] = useState<string>("ananya.patel@example.com");
  const [testSending, setTestSending] = useState<boolean>(false);

  const fetchLogsAndStats = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Build Query params
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedStatus !== "All") params.append("status", selectedStatus);
      if (selectedEvent !== "All") params.append("eventKey", selectedEvent);

      const [logsRes, statsRes, tplRes] = await Promise.all([
        fetch(`/api/admin/communication/logs?${params.toString()}`, { headers }),
        fetch("/api/admin/communication/stats", { headers }),
        fetch("/api/admin/communication/templates", { headers })
      ]);

      const logsData = await logsRes.json().catch(() => ({}));
      const statsData = await statsRes.json().catch(() => ({}));
      const tplData = await tplRes.json().catch(() => ({}));

      if (logsData.success) setLogs(logsData.logs || []);
      if (statsData.success) setStats(statsData.stats || stats);
      if (tplData.success) setTemplates(tplData.templates || []);
    } catch (err) {
      console.error("Failed to fetch communication data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
  }, [searchQuery, selectedStatus, selectedEvent]);

  const handleRetryLog = async (logId: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/communication/retry-log/${logId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setActionMessage({ type: "success", text: "Message re-dispatched successfully." });
        fetchLogsAndStats();
      } else {
        setActionMessage({ type: "error", text: data.error || "Retry failed." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Retry connection failed." });
    }
  };

  const handleSendBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMessage.trim()) {
      setActionMessage({ type: "error", text: "Please enter announcement text." });
      return;
    }
    setBulkSending(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/communication/send-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetGroup: bulkTarget,
          subject: bulkSubject,
          messageText: bulkMessage
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setActionMessage({
          type: "success",
          text: `Bulk announcement successfully queued and sent to ${data.recipientsCount} recipient(s)!`
        });
        setBulkMessage("");
        fetchLogsAndStats();
        setActiveTab("logs");
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to dispatch bulk announcement." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Network request failed while sending bulk message." });
    } finally {
      setBulkSending(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setSaveLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/communication/templates/${editingTemplate.event_key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(editingTemplate)
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setActionMessage({ type: "success", text: `Template '${editingTemplate.title}' saved successfully!` });
        setEditingTemplate(null);
        fetchLogsAndStats();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to update template." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Failed to save template updates." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/communication/test-trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          eventKey: testEventKey,
          memberName: testMemberName,
          mobileNo: testMobileNo,
          email: testEmail
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setActionMessage({ type: "success", text: `Test notification '${testEventKey}' dispatched successfully!` });
        fetchLogsAndStats();
        setActiveTab("logs");
      } else {
        setActionMessage({ type: "error", text: data.error || "Test trigger failed." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Failed to send test notification." });
    } finally {
      setTestSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
      case "Read":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status}
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <MessageSquare className="w-64 h-64 text-sky-400" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> BSF Communication & Messaging Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Communication Center</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Automated multi-channel notifications via WhatsApp Business API, MSG91 SMS Gateway, and HTML Email for Baroda Swim Front.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogsAndStats}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-lg shadow-sky-500/25"
            >
              <Send className="w-3.5 h-3.5" />
              New Bulk Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dispatches</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalSent}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated & Manual</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered & Read</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.deliveredCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {stats.totalSent > 0 ? `${Math.round((stats.deliveredCount / stats.totalSent) * 100)}% Success Rate` : "100% Rate"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed Messages</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.failedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Retry Available</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Channels</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="p-1 rounded bg-emerald-100 text-emerald-700 title='WhatsApp'"><Smartphone className="w-3.5 h-3.5" /></span>
              <span className="p-1 rounded bg-blue-100 text-blue-700 title='SMS MSG91'"><Phone className="w-3.5 h-3.5" /></span>
              <span className="p-1 rounded bg-indigo-100 text-indigo-700 title='HTML Email'"><Mail className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Multi-Channel Active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Banner Action Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "logs"
              ? "border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Message History Logs
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "bulk"
              ? "border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Send className="w-4 h-4" />
          Bulk Announcement Center
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "templates"
              ? "border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          Message Templates Manager
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
            activeTab === "test"
              ? "border-sky-600 text-sky-600 bg-sky-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Zap className="w-4 h-4" />
          Manual Test Trigger Bench
        </button>
      </div>

      {/* VIEW 1: MESSAGE HISTORY LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search member name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-500">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Read">Read</option>
                  <option value="Failed">Failed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-500">Trigger:</span>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="All">All Triggers</option>
                  <option value="registration_submitted">Registration Submitted</option>
                  <option value="registration_approved">Registration Approved</option>
                  <option value="registration_rejected">Registration Rejected</option>
                  <option value="payment_link">Payment Link</option>
                  <option value="payment_successful">Payment Successful</option>
                  <option value="membership_activated">Membership Activated</option>
                  <option value="renewal_reminder">Renewal Reminder</option>
                  <option value="new_event">New Event</option>
                  <option value="new_holiday">New Holiday</option>
                  <option value="batch_changed">Batch Changed</option>
                  <option value="bulk_announcement">Bulk Announcement</option>
                </select>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Recipient Member</th>
                    <th className="px-4 py-3">Message Title & Event</th>
                    <th className="px-4 py-3 text-center">WhatsApp</th>
                    <th className="px-4 py-3 text-center">SMS (MSG91)</th>
                    <th className="px-4 py-3 text-center">Email</th>
                    <th className="px-4 py-3">Overall Status</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No communication logs found.</p>
                        <p className="text-xs text-slate-400">Trigger an event or send a bulk announcement to populate real-time logs.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{log.member_name}</p>
                          <p className="text-[11px] text-slate-400">{log.mobile_no} {log.email ? `• ${log.email}` : ""}</p>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-semibold text-slate-800 truncate">{log.message_title}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                            {log.event_key}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(log.channel_whatsapp)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(log.channel_sms)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(log.channel_email)}
                        </td>

                        <td className="px-4 py-3">
                          {getStatusBadge(log.status)}
                        </td>

                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedLogDetail(log)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                              title="View Content Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {log.status === "Failed" && (
                              <button
                                onClick={() => handleRetryLog(log.id)}
                                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] transition"
                                title="Retry Sending"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BULK ANNOUNCEMENT CENTER */}
      {activeTab === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-600" />
                Dispatch Bulk Announcement
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Send official announcements instantly across WhatsApp, MSG91 SMS, and HTML Email to selected member groups.
              </p>
            </div>

            <form onSubmit={handleSendBulk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Recipient Category
                </label>
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">All Registered Members (Swim + Cricket)</option>
                  <option value="swim">Baroda Swim Front Members Only</option>
                  <option value="cricket">Baroda Cricket Academy Members Only</option>
                  <option value="staff">Academy Staff & Receptionist Team</option>
                  <option value="coaches">Coaches & Instructors</option>
                  <option value="expiring">Members Expiring Within 7 Days</option>
                  <option value="pending_payment">Members with Pending Payments</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Important Pool Maintenance Notice"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Announcement Message Content
                  </label>
                  <span className="text-[11px] text-slate-400">{bulkMessage.length} characters</span>
                </div>
                <textarea
                  rows={6}
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Write your announcement message here... You can use variables like {{MemberName}} for personalization."
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkMessage("")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={bulkSending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-lg shadow-sky-600/25 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${bulkSending ? "animate-bounce" : ""}`} />
                  {bulkSending ? "Dispatching..." : "Send Announcement Now"}
                </button>
              </div>
            </form>
          </div>

          {/* Side Info Box */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600" />
              Dynamic Personalization Variables
            </h3>
            <p className="text-xs text-slate-500">
              You can insert variables into your messages. The backend automatically populates them per member:
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <span className="text-sky-600 font-bold">{"{{MemberName}}"}</span> → Full Name
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <span className="text-sky-600 font-bold">{"{{MembershipNo}}"}</span> → BSF-MEM-XXXX
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <span className="text-sky-600 font-bold">{"{{Batch}}"}</span> → Morning / Evening
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <span className="text-sky-600 font-bold">{"{{PaymentLink}}"}</span> → Razorpay Link
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TEMPLATE MANAGER */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              Automated Event Templates ({templates.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.event_key}
                  onClick={() => setEditingTemplate(tpl)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    editingTemplate?.event_key === tpl.event_key
                      ? "bg-sky-50 border-sky-300 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900">{tpl.title}</h4>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1">{tpl.event_key}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {editingTemplate ? (
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{editingTemplate.title}</h3>
                    <p className="text-xs font-mono text-slate-400">Trigger: {editingTemplate.event_key}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saveLoading ? "Saving..." : "Save Template"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp Message Format
                  </label>
                  <textarea
                    rows={4}
                    value={editingTemplate.whatsapp_content}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, whatsapp_content: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SMS (MSG91) Text Format
                  </label>
                  <textarea
                    rows={3}
                    value={editingTemplate.sms_content}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, sms_content: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.email_subject}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, email_subject: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Body HTML Content
                  </label>
                  <textarea
                    rows={5}
                    value={editingTemplate.email_body_html}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, email_body_html: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </form>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <Edit3 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">Select a template from the left list to edit.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: MANUAL TEST TRIGGER BENCH */}
      {activeTab === "test" && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Manual Test Trigger Bench
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Instantly test backend trigger events to verify WhatsApp, SMS, and Email integrations in real-time.
            </p>
          </div>

          <form onSubmit={handleTestTrigger} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Event Trigger
              </label>
              <select
                value={testEventKey}
                onChange={(e) => setTestEventKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="registration_submitted">Registration Submitted</option>
                <option value="registration_approved">Registration Approved</option>
                <option value="registration_rejected">Registration Rejected</option>
                <option value="payment_link">Payment Link Generated</option>
                <option value="payment_successful">Payment Successful</option>
                <option value="membership_activated">Membership Activated</option>
                <option value="renewal_reminder">Renewal Reminder (3 Days)</option>
                <option value="otp_login">OTP Login</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={testMemberName}
                  onChange={(e) => setTestMemberName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={testMobileNo}
                  onChange={(e) => setTestMobileNo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={testSending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-lg shadow-amber-500/25 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${testSending ? "animate-bounce" : ""}`} />
                {testSending ? "Dispatching Test Event..." : "Send Test Notification"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT DETAIL MODAL */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Message Content Preview</h3>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase">Recipient:</p>
                <p className="font-bold text-slate-900 text-sm">{selectedLogDetail.member_name}</p>
                <p className="text-slate-500">{selectedLogDetail.mobile_no} • {selectedLogDetail.email}</p>
              </div>

              <div>
                <p className="font-bold text-slate-500 uppercase">Message Text Preview:</p>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 whitespace-pre-wrap mt-1">
                  {selectedLogDetail.content_preview || "No preview recorded."}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2 rounded-xl bg-slate-50 border">
                  <p className="text-[10px] font-bold text-slate-400">WHATSAPP</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLogDetail.channel_whatsapp}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border">
                  <p className="text-[10px] font-bold text-slate-400">SMS</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLogDetail.channel_sms}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border">
                  <p className="text-[10px] font-bold text-slate-400">EMAIL</p>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedLogDetail.channel_email}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationTab;
