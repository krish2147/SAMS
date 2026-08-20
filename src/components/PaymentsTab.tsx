import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  IndianRupee, Calendar, Search, Filter, RefreshCw, 
  CheckCircle2, AlertCircle, Clock, XCircle, FileText, Download, 
  Send, RotateCcw, ShieldAlert, Eye, CreditCard, ExternalLink, 
  FileSpreadsheet, Sparkles, Building, User, Phone, Mail, MapPin, X
} from "lucide-react";
import { generatePaymentReceiptPDF, generateCSVReport, PaymentReceiptData } from "../utils/receiptGenerator";

interface SummaryData {
  totalRevenue: number;
  todaysRevenue: number;
  monthlyRevenue: number;
  pendingPaymentsCount: number;
  pendingPaymentsSum: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  refundsTotal: number;
  renewalPaymentsTotal: number;
}

interface PaymentsTabProps {
  getSessionToken: () => string;
  userRole?: string;
  username?: string;
}

export function PaymentsTab({ getSessionToken, userRole = "admin", username = "Admin" }: PaymentsTabProps) {
  const [summary, setSummary] = useState<SummaryData>({
    totalRevenue: 0,
    todaysRevenue: 0,
    monthlyRevenue: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsSum: 0,
    successfulPaymentsCount: 0,
    failedPaymentsCount: 0,
    refundsTotal: 0,
    renewalPaymentsTotal: 0
  });

  const [transactions, setTransactions] = useState<PaymentReceiptData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "This Week" | "This Month" | "Custom">("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected Transaction for Details Modal
  const [selectedTx, setSelectedTx] = useState<PaymentReceiptData | null>(null);

  // Refund Modal State
  const [refundTx, setRefundTx] = useState<PaymentReceiptData | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Link Sent Modal State
  const [sentLinkData, setSentLinkData] = useState<{ link: string; memberName: string } | null>(null);

  // Reports Modal State
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportsData, setReportsData] = useState<any>(null);

  // Load Razorpay Checkout SDK Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (_) {}
    };
  }, []);

  const fetchPaymentsData = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const token = getSessionToken();
      let url = "/api/admin/payments?";
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== "All") params.append("dateFilter", dateFilter);
      if (customStart) params.append("startDate", customStart);
      if (customEnd) params.append("endDate", customEnd);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(url + params.toString(), {
        headers: token ? { "x-session-token": token } : {}
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You do not have permission to view payment management records.");
        }
        let serverMsg = "";
        try {
          const errData = await res.json();
          serverMsg = errData.error || errData.message || "";
        } catch (_) {}
        throw new Error(serverMsg || `Failed to fetch payment records (Status ${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSummary(data.summary || {
          totalRevenue: 0,
          todaysRevenue: 0,
          monthlyRevenue: 0,
          pendingPaymentsCount: 0,
          pendingPaymentsSum: 0,
          successfulPaymentsCount: 0,
          failedPaymentsCount: 0,
          refundsTotal: 0,
          renewalPaymentsTotal: 0
        });
        setTransactions(data.transactions || []);
      }
    } catch (err: any) {
      console.error("Error fetching payments data:", err);
      setErrorMsg(err.message || "Unable to connect to database payments server.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, [dateFilter, statusFilter, customStart, customEnd]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPaymentsData();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatCurrency = (val: number) => {
    return "₹" + (val || 0).toLocaleString("en-IN");
  };

  // Open Razorpay Checkout Modal for Direct Fee Collection
  const handleOpenRazorpayCheckout = async (tx: PaymentReceiptData) => {
    try {
      const token = getSessionToken();
      // 1. Generate Razorpay Order
      const orderRes = await fetch("/api/admin/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({
          memberId: tx.memberId,
          membershipNo: tx.membershipNo,
          paymentType: tx.paymentType,
          amount: tx.amount,
          registrationFee: tx.registrationFee,
          renewalFee: tx.renewalFee
        })
      });

      if (!orderRes.ok) {
        throw new Error("Failed to generate Razorpay order from server.");
      }

      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderData.orderId) {
        throw new Error("Invalid Razorpay Order ID returned.");
      }

      // Check if Razorpay Checkout script is loaded
      if (typeof (window as any).Razorpay === "undefined") {
        alert("Razorpay Checkout SDK is still loading. Please try again in 3 seconds.");
        return;
      }

      const options = {
        key: orderData.razorpayKeyId || "rzp_test_key_id",
        amount: Math.round(tx.amount * 100),
        currency: "INR",
        name: "Baroda Swim Front",
        description: `${tx.planName} Fee Payment`,
        image: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=120&auto=format&fit=crop&q=80",
        order_id: orderData.orderId,
        prefill: {
          name: tx.memberName,
          contact: tx.mobileNo,
          email: tx.email || "swimmer@barodaswimfront.in"
        },
        notes: {
          membershipNo: tx.membershipNo,
          receiptNo: orderData.receiptNo
        },
        theme: {
          color: "#0284c7"
        },
        handler: async function (response: any) {
          // Verify payment signature
          try {
            const verifyRes = await fetch("/api/admin/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { "x-session-token": token } : {})
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                memberId: tx.memberId,
                paymentId: orderData.paymentId
              })
            });

            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyData.success) {
              setSuccessMsg(`✅ Razorpay Payment Verified! Receipt #${verifyData.receiptNo} created. Member is now ACTIVE.`);
              setSelectedTx(null);
              fetchPaymentsData();
            } else {
              throw new Error(verifyData.error || "Payment verification failed.");
            }
          } catch (vErr: any) {
            setErrorMsg(vErr.message || "Payment verification failed.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setErrorMsg(`Payment Failed: ${response.error.description || "Transaction cancelled or declined."}`);
      });
      rzp.open();

    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      setErrorMsg(err.message || "Failed to launch Razorpay payment gateway.");
    }
  };

  // Send Payment Link via WhatsApp / Email / SMS
  const handleSendPaymentLink = async (tx: PaymentReceiptData) => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/payments/send-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({
          paymentId: tx.id,
          memberId: tx.memberId,
          membershipNo: tx.membershipNo,
          channel: "all"
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSentLinkData({
          link: data.paymentLink,
          memberName: tx.memberName
        });
        setSuccessMsg(`Payment link generated and dispatched to ${tx.memberName} via WhatsApp, SMS, and Email.`);
        fetchPaymentsData();
      } else {
        throw new Error(data.error || "Failed to send payment link.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch payment link.");
    }
  };

  // Process Refund (Super Admin)
  const handleInitiateRefund = async () => {
    if (!refundTx) return;
    setIsProcessingRefund(true);
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/payments/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {})
        },
        body: JSON.stringify({
          paymentId: refundTx.id,
          refundAmount: refundAmount || refundTx.amount,
          reason: refundReason
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSuccessMsg(`Refund of ₹${data.refundAmount} successfully processed (Txn ${data.refundTxnId}).`);
        setRefundTx(null);
        setSelectedTx(null);
        fetchPaymentsData();
      } else {
        throw new Error(data.error || "Refund processing failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue refund.");
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Fetch Reports Data
  const handleOpenReports = async () => {
    try {
      const token = getSessionToken();
      const res = await fetch("/api/admin/payments/reports", {
        headers: token ? { "x-session-token": token } : {}
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setReportsData(data);
        setShowReportsModal(true);
      }
    } catch (err: any) {
      setErrorMsg("Failed to generate financial reports.");
    }
  };

  const getStatusBadge = (status: string) => {
    const lower = (status || "").toLowerCase();
    if (lower === "paid" || lower === "successful" || lower === "success") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Paid
        </span>
      );
    }
    if (lower === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <Clock className="h-3 w-3 text-amber-600" />
          Pending
        </span>
      );
    }
    if (lower === "refunded") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
          <RotateCcw className="h-3 w-3 text-purple-600" />
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="h-3 w-3 text-rose-600" />
        Failed
      </span>
    );
  };

  // Coach Restriction View
  if (userRole === "coach") {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-2xl mx-auto mt-8 shadow-sm">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Payment Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-2">
          Coaches do not have permission to access financial ledger management. Please contact the Super Admin or Academy Manager for fee records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 md:px-0 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-black tracking-widest text-sky-600 uppercase block mb-1">FINANCIAL MANAGEMENT ENGINE</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Payments & Revenue Ledger</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Real-time MySQL collection auditing, automated Razorpay order tracking, and receipt generation.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenReports}
            className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold px-4 py-2 rounded-2xl shadow-xs text-xs md:text-sm transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-sky-600" />
            <span>Financial Reports</span>
          </button>

          <button
            onClick={() => generateCSVReport(transactions)}
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-2xl shadow-xs text-xs md:text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-300" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchPaymentsData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-2xl shadow-xs text-xs md:text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* MESSAGES BAR */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-bold text-rose-800">Operational Notice</h5>
              <p className="text-xs text-rose-700 mt-0.5 font-medium">{errorMsg}</p>
            </div>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-bold text-emerald-800">Action Confirmed</h5>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">{successMsg}</p>
            </div>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* SUMMARY STATS CARDS GRID (8 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <span className="text-[10px] text-emerald-600 font-extrabold tracking-wide block mt-3">✓ 100% Real MySQL Database</span>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
              <div className="p-2 rounded-2xl bg-sky-50 text-sky-600">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{formatCurrency(summary.todaysRevenue)}</div>
          </div>
          <span className="text-[10px] text-sky-600 font-extrabold tracking-wide block mt-3">● Real-time Razorpay webhook</span>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Monthly Revenue</span>
              <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{formatCurrency(summary.monthlyRevenue)}</div>
          </div>
          <span className="text-[10px] text-indigo-600 font-extrabold tracking-wide block mt-3">Current Calendar Month</span>
        </div>

        {/* Pending Payments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pending Payments</span>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-amber-600 tracking-tight mt-2">{summary.pendingPaymentsCount} Orders</div>
          </div>
          <span className="text-[10px] text-amber-600 font-extrabold tracking-wide block mt-3">Awaiting fee settlement</span>
        </div>

        {/* Successful Payments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Successful Payments</span>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{summary.successfulPaymentsCount}</div>
          </div>
          <span className="text-[10px] text-slate-400 font-bold block mt-3">Verified receipts generated</span>
        </div>

        {/* Failed Payments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Failed Payments</span>
              <div className="p-2 rounded-2xl bg-rose-50 text-rose-600">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-rose-600 tracking-tight mt-2">{summary.failedPaymentsCount}</div>
          </div>
          <span className="text-[10px] text-rose-600 font-bold block mt-3">Requires retry or link resend</span>
        </div>

        {/* Refunds */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Refunds</span>
              <div className="p-2 rounded-2xl bg-purple-50 text-purple-600">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-2">{formatCurrency(summary.refundsTotal)}</div>
          </div>
          <span className="text-[10px] text-purple-600 font-bold block mt-3">Processed via Super Admin</span>
        </div>

        {/* Renewal Payments */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Renewal Payments</span>
              <div className="p-2 rounded-2xl bg-teal-50 text-teal-600">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-black text-teal-700 tracking-tight mt-2">{formatCurrency(summary.renewalPaymentsTotal)}</div>
          </div>
          <span className="text-[10px] text-teal-600 font-bold block mt-3">Recurring member renewals</span>
        </div>

      </div>

      {/* FILTER & SEARCH CONTROLS BAR */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 md:p-6 shadow-xs flex flex-col gap-4">
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Text Search Field */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, ID, mobile, txn ID..."
              className="w-full bg-slate-50 text-slate-800 text-sm pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {["All", "Pending", "Paid", "Failed", "Refunded"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                  statusFilter === st
                    ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Date Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {["All", "Today", "This Week", "This Month", "Custom"].map((tab) => (
              <button
                key={tab}
                onClick={() => setDateFilter(tab as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  dateFilter === tab
                    ? "bg-sky-600 border-sky-600 text-white shadow-xs"
                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

        </div>

        {/* Custom Date Picker Bar */}
        {dateFilter === "Custom" && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">From Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white text-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">To Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white text-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              />
            </div>
            <button
              onClick={() => { setCustomStart(""); setCustomEnd(""); }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Clear Range
            </button>
          </motion.div>
        )}

      </div>

      {/* TRANSACTIONS TABLE LEDGER */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">Payments Ledger</h3>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">{transactions.length} Records</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">All amounts in INR (₹)</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-16 text-center animate-fade-in">
            <IndianRupee className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-2" />
            <p className="text-slate-600 font-bold text-base">No payments have been received yet.</p>
            <p className="text-slate-400 text-xs mt-1">When members register or pay fees via Razorpay, transactions will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Swimmer Name</th>
                  <th className="p-4">Membership #</th>
                  <th className="p-4">Plan / Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Reg / Renewal Fee</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Txn / Order ID</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Approved By</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Swimmer Name */}
                    <td className="p-4 font-extrabold text-slate-900 uppercase">
                      <div>{tx.memberName}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-semibold">{tx.mobileNo}</div>
                    </td>

                    {/* Membership # */}
                    <td className="p-4 font-mono font-bold text-sky-600">{tx.membershipNo}</td>

                    {/* Plan Name */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{tx.planName}</div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{tx.paymentType}</span>
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-mono font-black text-slate-900 text-sm">
                      {formatCurrency(tx.amount)}
                    </td>

                    {/* Reg / Renewal Fee */}
                    <td className="p-4 font-mono text-slate-600">
                      <div>Reg: {formatCurrency(tx.registrationFee)}</div>
                      <div className="text-[10px] text-slate-400">Ren: {formatCurrency(tx.renewalFee)}</div>
                    </td>

                    {/* Method */}
                    <td className="p-4 font-bold text-slate-700 uppercase">
                      {tx.paymentMethod}
                    </td>

                    {/* Txn ID */}
                    <td className="p-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-700">{tx.transactionId}</div>
                      <div className="text-[10px] text-slate-400">{tx.orderId}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      {getStatusBadge(tx.status)}
                    </td>

                    {/* Date */}
                    <td className="p-4 font-medium text-slate-500">
                      {new Date(tx.paymentDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>

                    {/* Approved By */}
                    <td className="p-4 font-bold text-slate-600 text-[11px]">
                      {tx.approvedBy || "System Admin"}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          title="View Full Payment Details"
                          className="p-1.5 hover:bg-sky-50 text-sky-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => generatePaymentReceiptPDF(tx)}
                          title="Download Receipt PDF"
                          className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {(tx.status === "Pending" || tx.status === "Failed") && (
                          <button
                            onClick={() => handleOpenRazorpayCheckout(tx)}
                            title="Collect Fee via Razorpay Gateway"
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}

                        {userRole === "super_admin" && (tx.status === "Paid" || tx.status === "Successful") && (
                          <button
                            onClick={() => {
                              setRefundTx(tx);
                              setRefundAmount(tx.amount);
                              setRefundReason("");
                            }}
                            title="Initiate Refund (Super Admin)"
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYMENT DETAILS MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 md:p-8 text-left relative"
            >
              <button
                onClick={() => setSelectedTx(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 border-b border-slate-150 pb-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">TRANSACTION AUDIT VIEW</span>
                  <h3 className="text-xl font-extrabold text-slate-900">Payment & Receipt Details</h3>
                </div>
              </div>

              {/* Status Header Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Receipt Number</span>
                  <span className="text-base font-black font-mono text-slate-900">{selectedTx.receiptNo}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block">Payment Status</span>
                  {getStatusBadge(selectedTx.status)}
                </div>
              </div>

              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Member Info */}
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Member Details</h4>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Full Name</span>
                      <span className="text-sm font-extrabold text-slate-800">{selectedTx.memberName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Membership Number</span>
                      <span className="text-xs font-mono font-bold text-sky-600">{selectedTx.membershipNo}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Mobile Number</span>
                      <span className="text-xs font-medium text-slate-700">{selectedTx.mobileNo}</span>
                    </div>
                  </div>
                </div>

                {/* Plan & Fee Breakdown */}
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Fee Breakdown</h4>
                  
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">{selectedTx.planName} ({selectedTx.paymentType})</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedTx.amount - selectedTx.registrationFee)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">Registration Fee</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedTx.registrationFee)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs py-1 font-bold pt-2">
                    <span className="text-slate-800">Total Amount Paid</span>
                    <span className="font-mono text-sm text-sky-600">{formatCurrency(selectedTx.amount)}</span>
                  </div>
                </div>

              </div>

              {/* Gateway & Technical Details */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl space-y-2 font-mono text-xs mb-6">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Razorpay Gateway Technical Log</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-sky-400">{selectedTx.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID:</span>
                  <span className="text-sky-400">{selectedTx.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approved By:</span>
                  <span className="text-slate-300">{selectedTx.approvedBy || "System Admin"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Date:</span>
                  <span className="text-slate-300">{new Date(selectedTx.paymentDate).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-150">
                <button
                  onClick={() => generatePaymentReceiptPDF(selectedTx)}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs cursor-pointer shadow-xs transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Receipt PDF</span>
                </button>

                {(selectedTx.status === "Pending" || selectedTx.status === "Failed") && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendPaymentLink(selectedTx)}
                      className="inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-4 py-2.5 rounded-2xl text-xs cursor-pointer border border-sky-200 transition-all"
                    >
                      <Send className="h-4 w-4" />
                      <span>Resend Payment Link</span>
                    </button>

                    <button
                      onClick={() => handleOpenRazorpayCheckout(selectedTx)}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs cursor-pointer shadow-xs transition-all"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Collect Fee (Razorpay)</span>
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REFUND MODAL (SUPER ADMIN) */}
      <AnimatePresence>
        {refundTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left relative"
            >
              <button
                onClick={() => setRefundTx(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">SUPER ADMIN PRIVILEGE</span>
                  <h3 className="text-lg font-extrabold text-slate-900">Initiate Fee Refund</h3>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                Refunding payment for <strong className="text-slate-800">{refundTx.memberName}</strong> ({refundTx.membershipNo}). This action updates the database record and initiates a Razorpay refund.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Refund Amount (INR)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    max={refundTx.amount}
                    className="w-full bg-slate-50 text-slate-900 text-sm p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-rose-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Refund</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Member requested cancellation / Medical grounds"
                    rows={3}
                    className="w-full bg-slate-50 text-slate-900 text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-rose-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-150">
                <button
                  onClick={() => setRefundTx(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleInitiateRefund}
                  disabled={isProcessingRefund || refundAmount <= 0}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRefund ? "Processing Refund..." : "Confirm & Issue Refund"}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LINK SENT DISPATCH MODAL */}
      <AnimatePresence>
        {sentLinkData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-left relative"
            >
              <button
                onClick={() => setSentLinkData(null)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Send className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">PAYMENT LINK GENERATED</span>
                  <h3 className="text-lg font-extrabold text-slate-900">Dispatched Successfully</h3>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4 font-medium">
                Payment request link has been dispatched to <strong className="text-slate-900">{sentLinkData.memberName}</strong> via WhatsApp, Email, and SMS.
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-6 font-mono text-xs break-all text-slate-700">
                {sentLinkData.link}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(sentLinkData.link);
                  alert("Payment Link copied to clipboard!");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Copy Link to Clipboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FINANCIAL REPORTS MODAL */}
      <AnimatePresence>
        {showReportsModal && reportsData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-200 text-left relative"
            >
              <button
                onClick={() => setShowReportsModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 border-b border-slate-150 pb-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">AUDIT BREAKDOWN</span>
                  <h3 className="text-xl font-extrabold text-slate-900">Financial Reports & Analytics</h3>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="mb-6 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Monthly Revenue Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reportsData.monthlyBreakdown?.map((m: any) => (
                    <div key={m.month} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">{m.month}</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(m.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mb-6 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Payment Method Distribution</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reportsData.paymentMethodBreakdown?.map((pm: any) => (
                    <div key={pm.method} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">{pm.method}</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(pm.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registration vs Renewal */}
              <div className="mb-6 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Revenue Type Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700 block">Registration Fees</span>
                    <span className="text-lg font-black text-emerald-900">{formatCurrency(reportsData.typeBreakdown?.registrationRevenue || 0)}</span>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200">
                    <span className="text-xs font-bold text-teal-700 block">Membership Renewals</span>
                    <span className="text-lg font-black text-teal-900">{formatCurrency(reportsData.typeBreakdown?.renewalRevenue || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => generateCSVReport(reportsData.transactions || [])}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-2xl text-xs transition-all cursor-pointer shadow-xs"
                >
                  Export Full Ledger CSV
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
