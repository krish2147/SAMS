import React, { useState } from "react";
import { X, Download, FileText, Printer, CheckCircle2, DollarSign, Users, Calendar, Clock, AlertCircle } from "lucide-react";

interface DailyClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  attendanceLogs?: any[];
  paymentsList?: any[];
  renewalsList?: any[];
}

export function DailyClosingReportModal({
  isOpen,
  onClose,
  members = [],
  attendanceLogs = [],
  paymentsList = [],
  renewalsList = []
}: DailyClosingReportModalProps) {
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute daily numbers for reportDate
  const todayMembers = members.filter(m => m.created_at && m.created_at.startsWith(reportDate));
  const todayAttendance = attendanceLogs.filter(a => a.date === reportDate);
  const todayPayments = paymentsList.filter(p => p.date && p.date.startsWith(reportDate));
  
  const totalRevenue = todayPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const pendingApprovalsCount = members.filter(m => m.registration_status === "Pending").length;
  const pendingPaymentsCount = members.filter(m => m.registration_status === "Approved" && m.payment_status === "Pending").length;
  const renewalsCount = renewalsList.filter(r => r.due_date && r.due_date.startsWith(reportDate)).length;

  const handleExportCsv = () => {
    const csvRows = [
      ["BARODA SWIM FRONT - DAILY CLOSING REPORT"],
      ["Report Date", reportDate],
      ["Generated At", new Date().toLocaleString()],
      [""],
      ["Metric", "Value"],
      ["Total Attendance Today", todayAttendance.length],
      ["Total Revenue Collected (₹)", totalRevenue],
      ["New Registrations Today", todayMembers.length],
      ["Pending Approvals", pendingApprovalsCount],
      ["Pending Payments", pendingPaymentsCount],
      ["Renewals Due", renewalsCount],
      [""],
      ["TODAYS ATTENDANCE BREAKDOWN"],
      ["Time", "Member Name", "Membership No", "Batch"],
      ...todayAttendance.map(a => [a.time || "N/A", a.fullName || a.member_name || "N/A", a.membershipNo || "N/A", a.batchName || "Morning"]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BSF-Daily-Closing-Report-${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess("CSV Report exported successfully!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportExcel = () => {
    handleExportCsv(); // Using clean CSV compatible with Excel
    setDownloadSuccess("Excel-compatible CSV exported successfully!");
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
      <div className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center print:bg-white print:text-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500 text-white font-black text-lg">
              BSF
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Baroda Swim Front Daily Closing Report</h3>
              <p className="text-xs text-slate-300 font-medium">Verified Operational & Financial Summary</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer print:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector & Action Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Select Date:</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> PDF / Print
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="px-6 py-2 bg-emerald-50 text-emerald-700 border-b border-emerald-100 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Report Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Total Attendance</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{todayAttendance.length}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Check-ins on {reportDate}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Revenue</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">₹{totalRevenue.toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Collected today</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">New Members</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{todayMembers.length}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Registered today</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending Approvals</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{pendingApprovalsCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Awaiting verification</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Pending Payments</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{pendingPaymentsCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Approved but unpaid</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Renewals Due</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{renewalsCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Expiring or due</span>
            </div>
          </div>

          {/* Detailed Check-ins Table for today */}
          <div className="space-y-3">
            <h4 className="text-sm font-extrabold text-slate-900">Attendance Log for {reportDate}</h4>
            {todayAttendance.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Membership No</th>
                      <th className="p-3">Batch Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {todayAttendance.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-sky-600">{a.time || "N/A"}</td>
                        <td className="p-3 font-bold text-slate-900">{a.fullName || a.member_name}</td>
                        <td className="p-3 font-mono text-slate-500">{a.membershipNo}</td>
                        <td className="p-3 text-slate-600">{a.batchName || "Morning Slot"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                No attendance entries recorded for {reportDate}.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Baroda Swim Front Operations Desk</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer print:hidden"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
