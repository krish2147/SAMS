import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  UserCheck,
  UserPlus,
  RefreshCw,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  PieChart as PieIcon,
  Activity,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { formatCurrency } from "../utils/formatter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AnalyticsKPIs {
  totalMembers: number;
  activeMembersToday: number;
  activeMembersCount: number;
  newRegistrationsThisMonth: number;
  newRegistrationsFiltered: number;
  renewalsCount: number;
  renewalsFiltered: number;
  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  revenueFiltered: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  attendancePercentage: number;
  todayAttendanceCount: number;
  overallBatchOccupancy: number;
  totalBatchCapacity: number;
  totalBatchStrength: number;
}

interface AnalyticsCharts {
  monthlyRevenue: any[];
  monthlyRegistrations: any[];
  attendanceTrend: any[];
  renewalTrend: any[];
  paymentMethods: any[];
  batchOccupancy: any[];
  genderDistribution: any[];
  planDistribution: any[];
}

const COLORS = {
  sky: "#0284c7",
  emerald: "#10b981",
  indigo: "#6366f1",
  amber: "#f59e0b",
  rose: "#f43f5e",
  purple: "#a855f7",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  slate: "#64748b"
};

const PIE_COLORS = ["#0284c7", "#10b981", "#6366f1", "#f59e0b", "#a855f7", "#f43f5e", "#06b6d4"];

export const AnalyticsDashboard: React.FC = () => {
  const [filter, setFilter] = useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [kpis, setKpis] = useState<AnalyticsKPIs>({
    totalMembers: 0,
    activeMembersToday: 0,
    activeMembersCount: 0,
    newRegistrationsThisMonth: 0,
    newRegistrationsFiltered: 0,
    renewalsCount: 0,
    renewalsFiltered: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
    revenueThisYear: 0,
    revenueFiltered: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0,
    attendancePercentage: 0,
    todayAttendanceCount: 0,
    overallBatchOccupancy: 0,
    totalBatchCapacity: 0,
    totalBatchStrength: 0
  });

  const [charts, setCharts] = useState<AnalyticsCharts>({
    monthlyRevenue: [],
    monthlyRegistrations: [],
    attendanceTrend: [],
    renewalTrend: [],
    paymentMethods: [],
    batchOccupancy: [],
    genderDistribution: [],
    planDistribution: []
  });

  const fetchAnalytics = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      params.append("filter", filter);
      if (filter === "custom" && startDate) params.append("startDate", startDate);
      if (filter === "custom" && endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`, { headers });
      const data = await res.json().catch(() => ({}));

      if (data.success) {
        setKpis(data.kpis);
        setCharts(data.charts);
      } else {
        setErrorMsg(data.error || "Failed to load live analytics data");
      }
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setErrorMsg("Network connection error. Failed to retrieve analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filter, startDate, endDate]);

  // Export as PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header Branding
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BARODA SWIM FRONT", 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text("Executive Analytics & Performance Report", 14, 22);

    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 140, 15);
    doc.text(`Filter Period: ${filter.toUpperCase()}`, 140, 22);

    // KPI Summary Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Executive Overview KPIs", 14, 42);

    const kpiTableData = [
      ["Total Registered Members", kpis.totalMembers.toString(), "Active Today", kpis.activeMembersToday.toString()],
      ["New Registrations (This Month)", kpis.newRegistrationsThisMonth.toString(), "Total Renewals", kpis.renewalsCount.toString()],
      ["Revenue Today", formatCurrency(kpis.revenueToday), "Revenue This Month", formatCurrency(kpis.revenueThisMonth)],
      ["Revenue This Year", formatCurrency(kpis.revenueThisYear), "Pending Payments", `${formatCurrency(kpis.pendingPaymentsAmount)} (${kpis.pendingPaymentsCount})`],
      ["Attendance Rate Today", `${kpis.attendancePercentage}%`, "Batch Occupancy Rate", `${kpis.overallBatchOccupancy}%`]
    ];

    autoTable(doc, {
      startY: 46,
      head: [["Metric Category", "Value", "Metric Category", "Value"]],
      body: kpiTableData,
      theme: "striped",
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9 }
    });

    // Batch Occupancy Table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text("2. Batch Capacity & Occupancy Breakdown", 14, finalY);

    const batchRows = charts.batchOccupancy.map((b) => [
      b.fullName,
      b.capacity.toString(),
      b.filled.toString(),
      `${b.occupancyRate}%`
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [["Batch Name", "Capacity", "Enrolled", "Occupancy %"]],
      body: batchRows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 8 }
    });

    // Save PDF
    doc.save(`BSF_Analytics_Report_${filter}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Export as CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "BARODA SWIM FRONT - EXECUTIVE ANALYTICS REPORT\n";
    csvContent += `Filter Period,${filter}\n`;
    csvContent += `Generated At,${new Date().toLocaleString("en-IN")}\n\n`;

    csvContent += "EXECUTIVE KPIS\n";
    csvContent += `Total Members,${kpis.totalMembers}\n`;
    csvContent += `Active Members Today,${kpis.activeMembersToday}\n`;
    csvContent += `New Registrations This Month,${kpis.newRegistrationsThisMonth}\n`;
    csvContent += `Total Renewals,${kpis.renewalsCount}\n`;
    csvContent += `Revenue Today,${kpis.revenueToday}\n`;
    csvContent += `Revenue This Month,${kpis.revenueThisMonth}\n`;
    csvContent += `Revenue This Year,${kpis.revenueThisYear}\n`;
    csvContent += `Pending Payments Amount,${kpis.pendingPaymentsAmount}\n`;
    csvContent += `Attendance Percentage,${kpis.attendancePercentage}%\n`;
    csvContent += `Batch Occupancy Percentage,${kpis.overallBatchOccupancy}%\n\n`;

    csvContent += "MONTHLY REVENUE TREND\n";
    csvContent += "Month,Total Revenue (INR),Registration Fees,Renewal Fees\n";
    charts.monthlyRevenue.forEach((r) => {
      csvContent += `${r.month},${r.revenue},${r.regFee},${r.renewalFee}\n`;
    });

    csvContent += "\nBATCH OCCUPANCY BREAKDOWN\n";
    csvContent += "Batch Name,Capacity,Enrolled Strength,Occupancy Rate %\n";
    charts.batchOccupancy.forEach((b) => {
      csvContent += `"${b.fullName}",${b.capacity},${b.filled},${b.occupancyRate}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BSF_Analytics_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <BarChart3 className="w-80 h-80 text-sky-400" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-sky-400" /> Baroda Swim Front Real-Time Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Executive Analytics Dashboard
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1.5 max-w-2xl">
              Live database metrics on member acquisition, revenue streams, daily attendance velocity, batch capacities, and financial distributions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition border border-white/15 shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Analytics
            </button>

            {/* Export Group */}
            <div className="flex items-center gap-1.5 bg-sky-500/20 p-1 rounded-xl border border-sky-400/30 backdrop-blur-md">
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow"
                title="Export PDF Report"
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                title="Export spreadsheet-compatible CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Spreadsheet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Time Horizon:</span>

          <button
            onClick={() => setFilter("today")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === "today"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Today
          </button>

          <button
            onClick={() => setFilter("week")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === "week"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            This Week
          </button>

          <button
            onClick={() => setFilter("month")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === "month"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            This Month
          </button>

          <button
            onClick={() => setFilter("year")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === "year"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            This Year
          </button>

          <button
            onClick={() => setFilter("custom")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === "custom"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Custom Range
          </button>
        </div>

        {filter === "custom" && (
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800"
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800"
            />
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchAnalytics} className="text-xs font-bold text-rose-700 underline">
            Retry
          </button>
        </div>
      )}

      {/* OVERVIEW SECTION: 10 KEY PERFORMANCE INDICATORS (KPIS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Members */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.totalMembers}</p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3 h-3" />
            <span>{kpis.activeMembersCount} Active Members</span>
          </div>
        </div>

        {/* KPI 2: Active Members Today */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Members Today</p>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.activeMembersToday}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Pool & Academy Active</p>
        </div>

        {/* KPI 3: New Registrations This Month */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Registrations</p>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.newRegistrationsThisMonth}</p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">This Month Count</p>
        </div>

        {/* KPI 4: Renewals */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Renewals</p>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{kpis.renewalsCount}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Processed Renewals</p>
        </div>

        {/* KPI 5: Revenue Today */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue Today</p>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{formatCurrency(kpis.revenueToday)}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Daily Collection</p>
        </div>

        {/* KPI 6: Revenue This Month */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue This Month</p>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(kpis.revenueThisMonth)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Monthly Gross Revenue</p>
        </div>

        {/* KPI 7: Revenue This Year */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue This Year</p>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-600 mt-2">{formatCurrency(kpis.revenueThisYear)}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Annual Aggregate</p>
        </div>

        {/* KPI 8: Pending Payments */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Payments</p>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{formatCurrency(kpis.pendingPaymentsAmount)}</p>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">{kpis.pendingPaymentsCount} Invoices Due</p>
        </div>

        {/* KPI 9: Attendance Percentage */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance %</p>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-600 mt-2">{kpis.attendancePercentage}%</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{kpis.todayAttendanceCount} Check-ins Today</p>
        </div>

        {/* KPI 10: Batch Occupancy */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch Occupancy</p>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-600 mt-2">{kpis.overallBatchOccupancy}%</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {kpis.totalBatchStrength} / {kpis.totalBatchCapacity} Seats Filled
          </p>
        </div>
      </div>

      {/* CHARTS GRID 1: MONTHLY REVENUE & REGISTRATIONS TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: MONTHLY REVENUE */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-600" />
                Monthly Revenue Stream (INR)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Registration vs Renewal fee breakdown</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wider border border-sky-100">
              Live Aggregate
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.sky} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.sky} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke={COLORS.sky} fillOpacity={1} fill="url(#colorRev)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="regFee" name="Registration Fees" stroke={COLORS.emerald} fillOpacity={1} fill="url(#colorReg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: MONTHLY REGISTRATIONS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Monthly Registrations Velocity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Approved vs Pending applicant counts</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
              Acquisitions
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyRegistrations} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="approved" name="Approved Members" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Pending Review" fill={COLORS.amber} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS GRID 2: ATTENDANCE TREND & RENEWAL TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 3: ATTENDANCE TREND */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                Daily Attendance Trend (Last 7 Days)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Daily member check-in volume</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider border border-teal-100">
              Check-ins
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.attendanceTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Line type="monotone" dataKey="checkIns" name="Check-ins" stroke={COLORS.teal} strokeWidth={3} dot={{ r: 5, fill: COLORS.teal }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: RENEWAL TREND */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
                Membership Renewal Dynamics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Renewed vs Due renewals per month</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider border border-purple-100">
              Retention
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.renewalTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="renewed" name="Renewed" fill={COLORS.purple} radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" name="Pending Due" fill={COLORS.rose} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS GRID 3: BATCH OCCUPANCY & PAYMENT METHODS & GENDER & PLAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 5: BATCH OCCUPANCY */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-600" />
                Batch Capacity & Occupancy Comparison
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Capacity limit vs filled strength across morning and evening batches</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold uppercase tracking-wider border border-cyan-100">
              Capacity
            </span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.batchOccupancy} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#1e293b" }} width={120} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="capacity" name="Max Capacity" fill="#e2e8f0" radius={[0, 6, 6, 0]} barSize={12} />
                <Bar dataKey="filled" name="Enrolled Seats" fill={COLORS.cyan} radius={[0, 6, 6, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 6: PAYMENT METHODS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-amber-500" />
              Payment Gateway Methods
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Razorpay, UPI, Cards, NetBanking, Cash</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS GRID 4: GENDER & MEMBERSHIP PLAN DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CHART 7: GENDER DISTRIBUTION */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Member Gender Demographics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Male, Female, and Other member distribution</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.genderDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  <Cell fill={COLORS.sky} />
                  <Cell fill={COLORS.rose} />
                  <Cell fill={COLORS.amber} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 8: MEMBERSHIP PLAN DISTRIBUTION */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Membership Plan Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Enrolled members per subscription package</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.planDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", border: "none" }} />
                <Bar dataKey="count" name="Enrolled Members" fill={COLORS.emerald} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
