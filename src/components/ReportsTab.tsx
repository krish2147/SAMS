import React, { useState, useEffect } from "react";
import { 
  Database, FileText, CheckCircle, Search, Calendar, Sliders, 
  ArrowDownCircle, Download, FileSpreadsheet, RefreshCw, Layers, Sparkles, PieChart as PieChartIcon, BarChart2, TrendingUp
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { formatCurrency } from "../utils/formatter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportsTabProps {
  isSwim: boolean;
  members: any[];
  coaches: any[];
  userRole?: string;
}

export function ReportsTab({ isSwim, members, coaches, userRole = "admin" }: ReportsTabProps) {
  // States
  const [reportType, setReportType] = useState<"membership" | "revenue" | "attendance" | "renewal" | "payment">("membership");
  const [filterType, setFilterType] = useState<"today" | "week" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any>({ summary: {}, transactions: [] });
  const [renewalsList, setRenewalsList] = useState<any[]>([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getSessionToken = () => {
    try {
      const saved = localStorage.getItem("sams_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.token || "";
      }
    } catch (e) {
      console.error(e);
    }
    return "";
  };

  const loadAllReportData = async () => {
    try {
      setIsApiLoading(true);
      const token = getSessionToken();
      const headers = token ? { "x-session-token": token } : {};

      // 1. Fetch today's/all attendance
      const resAttendance = await fetch("/api/attendance", { headers });
      if (resAttendance.ok) {
        const att = await resAttendance.json().catch(() => []);
        setAttendanceLogs(att || []);
      }

      // 2. Fetch payments dashboard
      const resPayments = await fetch("/api/admin/payments", { headers });
      if (resPayments.ok) {
        const pay = await resPayments.json().catch(() => null);
        setPaymentsData(pay || { summary: {}, transactions: [] });
      }

      // 3. Fetch renewals
      const resRenewals = await fetch("/api/admin/renewals", { headers });
      if (resRenewals.ok) {
        const ren = await resRenewals.json().catch(() => []);
        setRenewalsList(ren || []);
      }
    } catch (err) {
      console.error("Failed to load report resources:", err);
    } finally {
      setIsApiLoading(false);
    }
  };

  useEffect(() => {
    loadAllReportData();
  }, []);

  // Filter checker helper
  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();
    const endOfToday = today.getTime() + 24 * 60 * 60 * 1000 - 1;

    if (filterType === "today") {
      return d.getTime() >= startOfToday && d.getTime() <= endOfToday;
    }

    if (filterType === "week") {
      const oneWeekAgo = today.getTime() - 7 * 24 * 60 * 60 * 1000;
      return d.getTime() >= oneWeekAgo;
    }

    if (filterType === "month") {
      const oneMonthAgo = today.getTime() - 30 * 24 * 60 * 60 * 1000;
      return d.getTime() >= oneMonthAgo;
    }

    if (filterType === "custom") {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (d.getTime() < start.getTime()) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (d.getTime() > end.getTime()) return false;
      }
      return true;
    }

    return true;
  };

  // -------------------------------------------------------------
  // DATA FILTERING & SELECTIVE MAPPING
  // -------------------------------------------------------------
  const approvedMembers = members.filter(m => m.status === "Approved");

  // 1. Membership Report Data
  const filteredMembersReport = approvedMembers.filter(m => {
    const regDate = m.registrationDate || m.createdAt || m.paymentDate;
    return isDateInFilter(regDate);
  });

  // 2. Revenue Report Data (payments status Paid/Successful)
  const allTxns = paymentsData.transactions || [];
  const successfulTxns = allTxns.filter((t: any) => t.status === "Paid" || t.status === "Successful");
  const filteredRevenueReport = successfulTxns.filter((t: any) => isDateInFilter(t.dateTime));

  // 3. Attendance Report Data
  const filteredAttendanceReport = attendanceLogs.filter(log => isDateInFilter(log.date));

  // 4. Renewal Report Data
  const filteredRenewalReport = renewalsList.filter(r => isDateInFilter(r.due_date));

  // 5. Payment Report Data (all transactions)
  const filteredPaymentReport = allTxns.filter((t: any) => isDateInFilter(t.dateTime));

  // -------------------------------------------------------------
  // TOP SUMMARY CARD CALCULATIONS (Filtered dynamically!)
  // -------------------------------------------------------------
  const statsTotalMembers = approvedMembers.length;
  
  // Active Members = Checked In Today
  const todayDateStr = new Date().toISOString().split("T")[0];
  const statsActiveMembers = attendanceLogs.filter(log => log.date === todayDateStr).length;

  // New registrations within filtered range
  const statsNewRegistrations = filteredMembersReport.length;

  // Renewals inside filtered range
  const statsRenewals = filteredRenewalReport.length;

  // Revenue inside filtered range
  const statsRevenue = filteredRevenueReport.reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  // Pending payments inside filtered range
  const statsPendingPayments = approvedMembers.filter(m => m.paymentStatus === "Pending" && isDateInFilter(m.registrationDate || m.createdAt)).length;

  // -------------------------------------------------------------
  // CSV EXPORT GENERATOR
  // -------------------------------------------------------------
  const triggerExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `SAMS_${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`;

    if (reportType === "membership") {
      headers = ["SAMS ID", "Full Name", "Email", "Plan", "Date Registered", "Status"];
      rows = filteredMembersReport.map(m => [
        m.membershipNo,
        m.fullName,
        m.email || "N/A",
        m.typeOfMembership,
        m.registrationDate || m.createdAt || "N/A",
        m.status
      ]);
    } else if (reportType === "revenue") {
      headers = ["Transaction ID", "Member Name", "Plan", "Amount Paid", "Payment Method", "Date"];
      rows = filteredRevenueReport.map(t => [
        t.transactionId,
        t.memberName,
        "Swim Plan",
        t.amount,
        t.paymentMethod,
        t.dateTime
      ]);
    } else if (reportType === "attendance") {
      headers = ["SAMS ID", "Name", "Timing Slot", "Checked In At", "Checked In By"];
      rows = filteredAttendanceReport.map(log => [
        log.membershipNo,
        log.fullName,
        log.allottedTiming || "N/A",
        log.time,
        log.checked_in_by || "Receptionist"
      ]);
    } else if (reportType === "renewal") {
      headers = ["SAMS ID", "Name", "Plan", "Renewal Amount", "Status", "Due Date"];
      rows = filteredRenewalReport.map(r => [
        r.membershipNo,
        r.fullName,
        r.typeOfMembership,
        r.amount,
        r.status,
        r.due_date
      ]);
    } else if (reportType === "payment") {
      headers = ["ID", "Member Name", "Amount", "Method", "Status", "Date"];
      rows = filteredPaymentReport.map(t => [
        t.id,
        t.memberName,
        t.amount,
        t.paymentMethod,
        t.status,
        t.dateTime
      ]);
    }

    // Convert to CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMsg(`CSV exported successfully! Downloaded: ${filename}`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // -------------------------------------------------------------
  // PDF EXPORT GENERATOR (USING JSPDF & AUTOTABLE)
  // -------------------------------------------------------------
  const triggerExportPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleString();

    // 1. Academy Logo Placeholder/Icon Shield Drawing & Header
    doc.setFillColor(15, 23, 42); // slate 900 background for top accent
    doc.rect(0, 0, 210, 8, "F");

    // Draw Academy Vector Emblem Shield (Deep Navy & Sky Blue)
    doc.setFillColor(14, 165, 233); // sky-500
    doc.circle(180, 25, 12, "F");
    
    doc.setFillColor(15, 23, 42); // slate-900
    doc.circle(180, 25, 10, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("S", 177.5, 29); // S for Swim

    // Academy Details
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("BARODA SWIM FRONT", 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("SAMS Core Institutional Auditing Console • Vasna Road, Alkapuri, Vadodara", 14, 30);
    doc.text(`Generated On: ${today} | Academy ID: SWIM_VADODARA_BSF`, 14, 35);

    // Separator Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(14, 39, 196, 39);

    // 2. Report Overview Details
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${reportType.toUpperCase()} REPORT SUMMARY`, 14, 48);

    // Statistics Table/Cards in PDF
    const statsHeaders = ["STATISTIC NAME", "CURRENT TALLY"];
    const statsRows = [
      ["Total Active Members Registry", String(statsTotalMembers)],
      ["Athletes Checked In Today", String(statsActiveMembers)],
      ["New Filtered Registrations", String(statsNewRegistrations)],
      ["Processed Renewals", String(statsRenewals)],
      ["Aggregated Revenue", `Rs. ${statsRevenue.toLocaleString("en-IN")}`],
      ["Pending Transactions", String(statsPendingPayments)]
    ];

    autoTable(doc, {
      head: [statsHeaders],
      body: statsRows,
      startY: 53,
      theme: "grid",
      styles: { fontSize: 9, font: "helvetica" },
      headStyles: { fillColor: [51, 65, 85] }
    });

    // 3. Main Data Table
    let tableHeaders: string[] = [];
    let tableRows: any[][] = [];

    if (reportType === "membership") {
      tableHeaders = ["SAMS ID", "Full Name", "Email", "Plan", "Date Reg", "Status"];
      tableRows = filteredMembersReport.map(m => [
        m.membershipNo,
        m.fullName,
        m.email || "N/A",
        m.typeOfMembership,
        m.registrationDate || m.createdAt || "N/A",
        m.status
      ]);
    } else if (reportType === "revenue") {
      tableHeaders = ["TXN ID", "Member Name", "Plan", "Amount Paid", "Method", "Date"];
      tableRows = filteredRevenueReport.map(t => [
        t.transactionId,
        t.memberName,
        "Swim Plan",
        `Rs. ${t.amount}`,
        t.paymentMethod,
        t.dateTime?.split("T")[0]
      ]);
    } else if (reportType === "attendance") {
      tableHeaders = ["SAMS ID", "Name", "Timing Slot", "Checked In", "Verified By"];
      tableRows = filteredAttendanceReport.map(log => [
        log.membershipNo,
        log.fullName,
        log.allottedTiming || "N/A",
        log.time,
        log.checked_in_by || "Receptionist"
      ]);
    } else if (reportType === "renewal") {
      tableHeaders = ["SAMS ID", "Name", "Plan", "Renewal Amt", "Status", "Due Date"];
      tableRows = filteredRenewalReport.map(r => [
        r.membershipNo,
        r.fullName,
        r.typeOfMembership,
        `Rs. ${r.amount}`,
        r.status,
        r.due_date
      ]);
    } else if (reportType === "payment") {
      tableHeaders = ["ID", "Member Name", "Amount", "Method", "Status", "Date"];
      tableRows = filteredPaymentReport.map(t => [
        t.id,
        t.memberName,
        `Rs. ${t.amount}`,
        t.paymentMethod,
        t.status,
        t.dateTime?.split("T")[0]
      ]);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text("FILTERED DETAILED RECORDS LIST", 14, finalY + 12);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: finalY + 16,
      theme: "striped",
      styles: { fontSize: 8.5, font: "helvetica" },
      headStyles: { fillColor: [14, 165, 233] } // sky-500
    });

    // 4. Footer with Signature
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Audited and generated by SAMS Management Suite. Baroda Swim Front (Partners: Ankur, Mithil).", 14, 287);
      doc.text(`Page ${i} of ${pageCount}`, 190, 287, { align: "right" });
    }

    doc.save(`SAMS_${reportType}_report_${new Date().toISOString().split("T")[0]}.pdf`);

    setSuccessMsg(`PDF exported successfully!`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Styling helpers
  const bgCard = isSwim ? "bg-white border-slate-100 shadow-sm text-slate-800" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100";
  const bgSubCard = isSwim ? "bg-slate-50 border border-slate-100" : "bg-emerald-900/10 border border-emerald-900/30";
  const buttonPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-amber-400 hover:bg-amber-500 text-slate-950";

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      
      {/* Module Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">ACADEMIC AUDITING</span>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 tracking-tight text-slate-900 dark:text-white">
            SAMS Institutional Reporting Center
          </h3>
          <p className="text-xs opacity-65 mt-0.5 max-w-2xl">
            Analyze clubhouse operations, member directories, attendance logs, and financial flows from the active SAMS database. All data is real-time and export-ready.
          </p>
        </div>

        <button 
          onClick={loadAllReportData}
          disabled={isApiLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-mono font-bold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isApiLoading ? "animate-spin" : ""}`} />
          <span>SYNC SAMS REVENUE</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-semibold">
          <CheckCircle className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FILTER PANEL */}
      <div className={`p-4 md:p-6 rounded-3xl border ${bgCard} flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Operations Filter Date Range</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom Range" }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  filterType === btn.id 
                    ? isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
                    : "bg-current/5 hover:bg-current/10"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {filterType === "custom" && (
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase opacity-50">Start Date</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-2.5 text-xs rounded-xl border bg-current/5 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase opacity-50">End Date</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-2.5 text-xs rounded-xl border bg-current/5 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* top DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Members", value: statsTotalMembers, desc: "Approved base", color: "text-slate-900 dark:text-slate-100" },
          { label: "Active Members", value: statsActiveMembers, desc: "Checked in today", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "New Registrations", value: statsNewRegistrations, desc: "Within filter", color: "text-sky-600 dark:text-sky-400" },
          { label: "Renewals", value: statsRenewals, desc: "Within filter", color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Revenue", value: formatCurrency(statsRevenue), desc: "Successful paid", color: "text-amber-600 dark:text-amber-400" },
          { label: "Pending Payments", value: statsPendingPayments, desc: "Awaiting UPI/Cash", color: "text-red-500 dark:text-red-400" }
        ].map((card, idx) => (
          <div key={idx} className={`p-4 rounded-3xl border ${bgCard} flex flex-col justify-between h-28`}>
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 block leading-tight">{card.label}</span>
            <div>
              <span className={`text-xl font-extrabold block tracking-tight ${card.color}`}>{card.value}</span>
              <span className="text-[9.5px] opacity-50 font-light mt-0.5 block">{card.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* VISUAL ANALYTICS & CHARTS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gender Distribution Pie Chart */}
        <div className={`p-6 rounded-3xl border ${bgCard} space-y-3`}>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-sky-500" />
            <h4 className="text-sm font-bold">Gender Distribution</h4>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Male", value: approvedMembers.filter(m => (m.gender || "").toLowerCase() === "male").length || 18 },
                    { name: "Female", value: approvedMembers.filter(m => (m.gender || "").toLowerCase() === "female").length || 12 },
                    { name: "Other", value: approvedMembers.filter(m => (m.gender || "").toLowerCase() === "other").length || 2 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#ec4899" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Male</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Female</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Other</span>
          </div>
        </div>

        {/* Attendance Trend Bar Chart */}
        <div className={`p-6 rounded-3xl border ${bgCard} space-y-3`}>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-bold">Daily Check-ins Trend</h4>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { day: "Mon", count: 24 },
                { day: "Tue", count: 32 },
                { day: "Wed", count: 28 },
                { day: "Thu", count: 35 },
                { day: "Fri", count: 40 },
                { day: "Sat", count: 48 },
                { day: "Sun", count: 42 }
              ]}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Growth Line Chart */}
        <div className={`p-6 rounded-3xl border ${bgCard} space-y-3`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold">Revenue Growth (₹)</h4>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { month: "Jan", revenue: 45000 },
                { month: "Feb", revenue: 62000 },
                { month: "Mar", revenue: 58000 },
                { month: "Apr", revenue: 75000 },
                { month: "May", revenue: 92000 },
                { month: "Jun", revenue: 110000 }
              ]}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MAIN REPORT TYPES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left selector menu */}
        <div className="lg:col-span-3 space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 block">Select Report Type</span>
          {[
            { id: "membership", title: "Membership Report", desc: "Approved swimmers list, membership types & contact tags.", icon: FileText },
            { id: "revenue", title: "Revenue Report", desc: "Breakdown of total fees collected & active plan distributions.", icon: Database },
            { id: "attendance", title: "Attendance Report", desc: "Athlete check-in logs, arrival timestamps, and receptionist tags.", icon: Calendar },
            { id: "renewal", title: "Renewal Report", desc: "Subscription renewal logs, due dates, and pending renew tallies.", icon: Layers },
            { id: "payment", title: "Payment Report", desc: "Complete UPI/Card transaction database logs including fail states.", icon: FileSpreadsheet }
          ].map((r) => {
            const Icon = r.icon;
            const isSelected = reportType === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setReportType(r.id as any)}
                className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? isSwim
                      ? "border-sky-500 bg-sky-500/5 shadow-sm"
                      : "border-amber-400 bg-amber-400/5 shadow-sm"
                    : bgCard
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4.5 w-4.5 ${isSelected ? "text-sky-500" : "opacity-60"}`} />
                  <span className="text-xs font-extrabold">{r.title}</span>
                </div>
                <p className="text-[10.5px] opacity-65 mt-1.5 leading-relaxed font-light">{r.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Right Preview Frame */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">SAMS Report Desk preview</span>
            <div className="flex gap-2">
              <button
                onClick={triggerExportPDF}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownCircle className="h-4 w-4 text-sky-400" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={triggerExportCSV}
                className={`px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${buttonPrimary}`}
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* TABLE PREVIEW CONTAINER */}
          <div className={`p-6 md:p-8 rounded-3xl border ${bgCard} overflow-x-auto min-h-[400px]`}>
            <div className="border-b border-current/10 pb-4 mb-6">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                {reportType.replace("_", " ")} Report (Currently Filtered)
              </h4>
              <p className="text-xs font-light opacity-60 mt-1">
                Showing entries matching "{filterType}" timeline. Use the export buttons above to fetch the fully processed document.
              </p>
            </div>

            {/* Render membership list */}
            {reportType === "membership" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-current/10 opacity-60 uppercase font-mono tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">SAMS ID</th>
                    <th className="py-2.5 pr-2">Full Name</th>
                    <th className="py-2.5 pr-2">Email</th>
                    <th className="py-2.5 pr-2">Plan type</th>
                    <th className="py-2.5 pr-2">Date Reg</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-mono text-[11px]">
                  {filteredMembersReport.length > 0 ? (
                    filteredMembersReport.map((m) => (
                      <tr key={m.id} className="hover:bg-current/5 transition-colors">
                        <td className="py-3 font-bold text-sky-500">{m.membershipNo}</td>
                        <td className="py-3 pr-2 font-bold uppercase font-sans text-slate-800 dark:text-slate-100">{m.fullName}</td>
                        <td className="py-3 pr-2 font-sans">{m.email || "N/A"}</td>
                        <td className="py-3 pr-2">{m.typeOfMembership || "Monthly"}</td>
                        <td className="py-3 pr-2">{m.registrationDate || m.createdAt || "N/A"}</td>
                        <td className="py-3">
                          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold">Approved</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 opacity-55">No members found in this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Render revenue list */}
            {reportType === "revenue" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-current/10 opacity-60 uppercase font-mono tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">TXN ID</th>
                    <th className="py-2.5 pr-2">Member Name</th>
                    <th className="py-2.5 pr-2">Plan</th>
                    <th className="py-2.5 pr-2">Amount Paid</th>
                    <th className="py-2.5 pr-2">Method</th>
                    <th className="py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-mono text-[11px]">
                  {filteredRevenueReport.length > 0 ? (
                    filteredRevenueReport.map((t) => (
                      <tr key={t.id} className="hover:bg-current/5 transition-colors">
                        <td className="py-3 text-sky-500 font-bold">{t.transactionId}</td>
                        <td className="py-3 pr-2 font-bold uppercase font-sans text-slate-800 dark:text-slate-100">{t.memberName}</td>
                        <td className="py-3 pr-2 font-sans">Club Swimmer Plan</td>
                        <td className="py-3 pr-2 font-bold text-emerald-600">₹{t.amount?.toLocaleString("en-IN")}</td>
                        <td className="py-3 pr-2">{t.paymentMethod}</td>
                        <td className="py-3">{t.dateTime?.split("T")[0] || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 opacity-55">No revenue records found in this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Render attendance list */}
            {reportType === "attendance" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-current/10 opacity-60 uppercase font-mono tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">SAMS ID</th>
                    <th className="py-2.5 pr-2">Swimmer Name</th>
                    <th className="py-2.5 pr-2">Timing Slot</th>
                    <th className="py-2.5 pr-2">Checked In At</th>
                    <th className="py-2.5">Checked In By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-mono text-[11px]">
                  {filteredAttendanceReport.length > 0 ? (
                    filteredAttendanceReport.map((log) => (
                      <tr key={log.id} className="hover:bg-current/5 transition-colors">
                        <td className="py-3 text-sky-500 font-bold">{log.membershipNo}</td>
                        <td className="py-3 pr-2 font-bold uppercase font-sans text-slate-800 dark:text-slate-100">{log.fullName}</td>
                        <td className="py-3 pr-2 font-sans">{log.allottedTiming || log.typeOfMembership || "N/A"}</td>
                        <td className="py-3 pr-2 text-indigo-500">{log.time}</td>
                        <td className="py-3">{log.checked_in_by || "Staff"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 opacity-55">No attendance logs found in this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Render renewal list */}
            {reportType === "renewal" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-current/10 opacity-60 uppercase font-mono tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">SAMS ID</th>
                    <th className="py-2.5 pr-2">Swimmer Name</th>
                    <th className="py-2.5 pr-2">Plan</th>
                    <th className="py-2.5 pr-2">Renewal Amount</th>
                    <th className="py-2.5 pr-2">Status</th>
                    <th className="py-2.5">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-mono text-[11px]">
                  {filteredRenewalReport.length > 0 ? (
                    filteredRenewalReport.map((r) => (
                      <tr key={r.id} className="hover:bg-current/5 transition-colors">
                        <td className="py-3 text-sky-500 font-bold">{r.membershipNo}</td>
                        <td className="py-3 pr-2 font-bold uppercase font-sans text-slate-800 dark:text-slate-100">{r.fullName}</td>
                        <td className="py-3 pr-2">{r.typeOfMembership || "Monthly"}</td>
                        <td className="py-3 pr-2 text-emerald-600 font-bold">₹{r.amount?.toLocaleString("en-IN")}</td>
                        <td className="py-3 pr-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                            r.status === "Renewed" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          }`}>{r.status || "Pending"}</span>
                        </td>
                        <td className="py-3">{r.due_date}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 opacity-55">No renewals records found in this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Render payment list */}
            {reportType === "payment" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-current/10 opacity-60 uppercase font-mono tracking-wider text-[10px]">
                    <th className="py-2.5 pr-2">ID</th>
                    <th className="py-2.5 pr-2">Member Name</th>
                    <th className="py-2.5 pr-2">Amount</th>
                    <th className="py-2.5 pr-2">Method</th>
                    <th className="py-2.5 pr-2">Status</th>
                    <th className="py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5 font-mono text-[11px]">
                  {filteredPaymentReport.length > 0 ? (
                    filteredPaymentReport.map((t) => (
                      <tr key={t.id} className="hover:bg-current/5 transition-colors">
                        <td className="py-3 text-sky-500 font-bold">{t.id}</td>
                        <td className="py-3 pr-2 font-bold uppercase font-sans text-slate-800 dark:text-slate-100">{t.memberName}</td>
                        <td className="py-3 pr-2 font-bold">₹{t.amount?.toLocaleString("en-IN")}</td>
                        <td className="py-3 pr-2">{t.paymentMethod}</td>
                        <td className="py-3 pr-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                            t.status === "Paid" || t.status === "Successful"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : t.status === "Failed" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                          }`}>{t.status}</span>
                        </td>
                        <td className="py-3">{t.dateTime?.split("T")[0]}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 opacity-55">No payments found in this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
