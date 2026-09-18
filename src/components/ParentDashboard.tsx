import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, Calendar, CreditCard, Clock, MessageSquare, CheckCircle, 
  Sparkles, Award, ArrowUpRight, IndianRupee, Send, UserCheck, ShieldAlert 
} from "lucide-react";
import { AcademyId, Student, Booking, SupportQuery } from "../types";
import { initialStudents, initialBookings, swimCoaches, cricketCoaches } from "../data";

interface ParentDashboardProps {
  academyId: AcademyId;
  userName: string;
}

export function ParentDashboard({ academyId, userName }: ParentDashboardProps) {
  const isSwim = academyId === "swim";
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 950);
    return () => clearTimeout(timer);
  }, []);
  
  // States
  const [students, setStudents] = useState<Student[]>(
    initialStudents.filter((s) => isSwim ? s.id !== "std_2" : s.id === "std_2")
  );
  const [selectedStudent, setSelectedStudent] = useState<Student>(students[0]);
  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings.filter((b) => b.academyId === academyId)
  );

  // Billing dues list
  const [dues, setDues] = useState([
    { id: "inv_1", description: "Monthly Training Tuition - July 2026", amount: 3500, status: "unpaid" },
    { id: "inv_2", description: "Elite Biomechanical Wearable Rental", amount: 800, status: "unpaid" }
  ]);

  // Support messenger states
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to SAMS Elite Parent portal. You can dispatch encrypted messages to current coaches.", time: "09:00 AM" }
  ]);
  const [newMessageText, setNewMessageText] = useState("");

  // Payment modal state
  const [activePayment, setActivePayment] = useState<typeof dues[0] | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const coaches = isSwim ? swimCoaches : cricketCoaches;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    setMessages([
      ...messages,
      { sender: "Me", text: newMessageText, time: "Just now" }
    ]);
    setNewMessageText("");
    
    // Coach auto-reply dispatch logic
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { 
          sender: coaches[0]?.name || "Coach", 
          text: `Message secure logs updated. I've noted this and will check ${selectedStudent?.name || "swimmer"}'s wrist telemetry tomorrow.`, 
          time: "Just now" 
        }
      ]);
    }, 2000);
  };

  const startPayment = (due: typeof dues[0]) => {
    setActivePayment(due);
    setCardName(userName);
    setCardNumber("•••• •••• •••• 4820");
    setPaymentDone(false);
  };

  const processPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setPaymentDone(true);
      
      // Update invoices
      setDues(dues.map(d => d.id === activePayment?.id ? { ...d, status: "paid" } : d));
      
      // Clear after brief delay
      setTimeout(() => {
        setActivePayment(null);
      }, 1500);
    }, 1500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
        delayChildren: 0.01,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 110,
        damping: 16
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 text-left"
    >
      {isLoading ? (
        <div className="space-y-8 animate-pulse text-left">
          {/* Header block skeleton */}
          <div className="space-y-2 border-b border-current/10 pb-5">
            <div className={`h-3 w-32 rounded ${isSwim ? "bg-slate-200" : "bg-emerald-900/40"}`} />
            <div className={`h-8 w-64 rounded-lg ${isSwim ? "bg-slate-300" : "bg-emerald-800/40"}`} />
            <div className={`h-4 w-96 rounded-md ${isSwim ? "bg-slate-200" : "bg-emerald-900/30"}`} />
          </div>

          {/* Quick Metrics grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`p-6 rounded-3xl border ${isSwim ? "bg-white border-slate-100 shadow-sm" : "bg-emerald-950/20 border-emerald-900/30"}`}>
                <div className={`h-3 w-24 rounded mb-4 ${isSwim ? "bg-slate-200" : "bg-emerald-900/30"}`} />
                <div className={`h-7 w-36 rounded-lg mb-3 ${isSwim ? "bg-slate-300" : "bg-emerald-800/40"}`} />
                <div className={`h-2.5 w-48 rounded ${isSwim ? "bg-slate-100" : "bg-emerald-900/20"}`} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side skeleton */}
            <div className={`lg:col-span-6 p-6 md:p-8 rounded-3xl border ${
              isSwim ? "bg-white border-slate-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
            } space-y-6`}>
              <div className={`h-4 w-40 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className={`p-4 rounded-2xl border ${isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-900/10 border-emerald-900/25"} flex justify-between items-center`}>
                    <div className="space-y-2">
                      <div className={`h-4 w-32 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
                      <div className={`h-3 w-48 rounded ${isSwim ? "bg-slate-200" : "bg-emerald-900/20"}`} />
                    </div>
                    <div className={`h-7 w-20 rounded-xl ${isSwim ? "bg-slate-200" : "bg-emerald-800/30"}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right side skeleton */}
            <div className={`lg:col-span-6 p-6 md:p-8 rounded-3xl border ${
              isSwim ? "bg-white border-slate-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
            } space-y-4`}>
              <div className={`h-4 w-48 rounded-md ${isSwim ? "bg-slate-300" : "bg-emerald-850/40"}`} />
              <div className={`h-32 w-full rounded-2xl ${isSwim ? "bg-slate-100" : "bg-emerald-900/15"}`} />
              <div className={`h-10 w-full rounded-2xl ${isSwim ? "bg-slate-300" : "bg-emerald-800/50"}`} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Dashboard Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">PARENT PORTAL</span>
          <h2 className={`text-3xl font-extrabold tracking-tight mt-1 ${isSwim ? "text-slate-900" : "text-white font-serif"}`}>
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
              const parentName = (userName || "Parent").replace(" (Parent)", "").trim();
              return `${greeting}, ${parentName} 👋`;
            })()}
          </h2>
          <p className="text-sm opacity-60 font-light mt-0.5">Monitoring biomechanical metrics & scheduling.</p>
        </div>

        {/* Student selector toggler */}
        {students.length > 1 && (
          <div className="flex bg-current/5 border border-current/10 p-1.5 rounded-2xl gap-1">
            {students.map((std) => (
              <button
                id={`btn-parent-select-child-${std.id}`}
                key={std.id}
                onClick={() => setSelectedStudent(std)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedStudent.id === std.id
                    ? (isSwim ? "bg-slate-900 text-white" : "bg-amber-400 text-slate-900")
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {(std?.name || "").split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* 2. Primary Metrics Row & Progress Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Child Performance Metrics */}
        <motion.div variants={itemVariants} className={`lg:col-span-8 p-6 md:p-8 rounded-3xl border ${
          isSwim ? "bg-white border-sky-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">BIOMECHANICAL ANALYTICS</span>
              <h3 className="text-lg font-bold mt-1">Historic Performance development</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-900/40">
              <TrendingUp className="h-4 w-4" />
              <span>SAMS AI Optimized</span>
            </div>
          </div>

          {/* SVG Performance Chart Curve */}
          <div className="h-64 w-full bg-slate-950/20 rounded-2xl border border-current/5 p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Chart Grid Lines */}
            <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-current/5" />
            <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-current/5" />
            <div className="absolute inset-x-0 top-3/4 border-b border-dashed border-current/5" />

            {/* Custom SVG Curve Line */}
            <div className="absolute inset-x-12 top-8 bottom-12">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* SVG Curve shadow area */}
                <path
                  d="M 0 120 Q 80 80 180 50 T 360 20 L 360 180 L 0 180 Z"
                  fill="url(#chartGlow)"
                  className="transition-all duration-1000"
                />

                {/* SVG Stroke line */}
                <path
                  d="M 0 120 Q 80 80 180 50 T 360 20"
                  fill="none"
                  stroke={isSwim ? "#0ea5e9" : "#fbbf24"}
                  strokeWidth="3"
                  className="transition-all duration-1000"
                />

                {/* Interactive Dot Markers */}
                <circle cx="0" cy="120" r="5" fill="#fff" stroke="#10b981" strokeWidth="2" />
                <circle cx="180" cy="50" r="5" fill="#fff" stroke="#10b981" strokeWidth="2" />
                <circle cx="360" cy="20" r="5" fill="#fff" stroke="#10b981" strokeWidth="2" />
              </svg>
            </div>

            {/* Chart X axis markers */}
            <div className="flex justify-between text-[10px] font-mono opacity-50 px-6 relative z-10">
              <span>May 10 ({selectedStudent.performanceHistory[0]?.value || "28.4"}{selectedStudent.performanceHistory[0]?.unit || "s"})</span>
              <span>Jun 02 ({selectedStudent.performanceHistory[1]?.value || "27.9"}{selectedStudent.performanceHistory[1]?.unit || "s"})</span>
              <span>Jun 28 ({selectedStudent.performanceHistory[2]?.value || "27.2"}{selectedStudent.performanceHistory[2]?.unit || "s"})</span>
            </div>
          </div>

          {/* Metric Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-2xl bg-current/5 border border-current/10">
              <span className="text-[10px] font-mono uppercase tracking-wide opacity-50 block">Current Focus Tier</span>
              <span className="text-base font-bold mt-1 block">{selectedStudent.level}</span>
            </div>
            <div className="p-4 rounded-2xl bg-current/5 border border-current/10">
              <span className="text-[10px] font-mono uppercase tracking-wide opacity-50 block">Coach Evaluation Notes</span>
              <span className="text-xs font-light leading-relaxed mt-1 block italic text-current opacity-80">
                "{selectedStudent.performanceHistory[selectedStudent.performanceHistory.length - 1]?.notes || "Doing great work"}"
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Quick Schedule, Attendance and Billing */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Quick Attendance */}
          <div className={`p-6 rounded-3xl border ${
            isSwim ? "bg-white border-sky-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
          }`}>
            <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase block">ATTENDANCE COMPLIANCE</span>
            <div className="flex justify-between items-baseline mt-2 mb-4">
              <span className="text-3xl font-black">92.4%</span>
              <span className="text-xs text-emerald-400 font-semibold font-mono">EXCELLENT</span>
            </div>
            
            {/* Dots representation for attendance of past few days */}
            <div className="flex gap-2 justify-between">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    idx < 4 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-current/5 text-current/30 border border-current/10"
                  }`}>
                    {idx < 4 ? "✓" : "—"}
                  </div>
                  <span className="text-[10px] font-mono opacity-50">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* High-fidelity Billing Due */}
          <div className={`p-6 rounded-3xl border ${
            isSwim ? "bg-white border-sky-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
          }`}>
            <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase block">FINANCIAL OUTSTANDINGS</span>
            <h3 className="text-base font-bold mt-1 mb-4">Dues & Tuitions</h3>
            
            <div className="space-y-3">
              {dues.map((due) => (
                <div key={due.id} className="flex items-center justify-between p-3 rounded-2xl bg-current/5 border border-current/10">
                  <div className="max-w-[160px]">
                    <span className="text-xs font-semibold block truncate" title={due.description}>{due.description}</span>
                    <span className="text-[10px] font-mono opacity-60 block">₹{due.amount.toLocaleString("en-IN")}</span>
                  </div>
                  {due.status === "paid" ? (
                    <span className="text-[10px] font-bold font-mono tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl uppercase">
                      SETTLED
                    </span>
                  ) : (
                    <button
                      id={`btn-parent-pay-${due.id}`}
                      onClick={() => startPayment(due)}
                      className={`text-[10px] font-extrabold font-mono tracking-wider px-3 py-1.5 rounded-xl uppercase cursor-pointer hover:opacity-90 ${
                        isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-900"
                      }`}
                    >
                      PAY DUES
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Bookings Tracker & Messenger Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Upcoming Lanes/Pitches slots */}
        <motion.div variants={itemVariants} className={`lg:col-span-6 p-6 md:p-8 rounded-3xl border ${
          isSwim ? "bg-white border-sky-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">ACTIVE COVENANTS</span>
              <h3 className="text-lg font-bold mt-1">Confirmed Facility bookings</h3>
            </div>
            <Calendar className="h-5 w-5 opacity-40" />
          </div>

          <div className="space-y-4">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 p-4 rounded-2xl bg-current/5 border border-current/10">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg ${
                    isSwim ? "bg-sky-50 text-sky-600" : "bg-emerald-900/40 text-amber-300"
                  }`}>
                    {isSwim ? "🏊" : "🏏"}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{booking.facility}</span>
                      <span className="text-[10px] font-mono opacity-50">{booking.date}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs font-light">
                      <span className="opacity-75">{booking.studentName} — {booking.timeSlot}</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                        <CheckCircle className="h-3.5 w-3.5" /> CONFIRMED
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm font-light opacity-60">No pending practice sessions scheduled.</p>
            )}
          </div>
        </motion.div>

        {/* Right Side: Secure Messenger to Coaches */}
        <motion.div variants={itemVariants} className={`lg:col-span-6 p-6 md:p-8 rounded-3xl border ${
          isSwim ? "bg-white border-sky-100 shadow-md text-slate-900" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100"
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">ENCRYPTED TELEPHONY</span>
              <h3 className="text-lg font-bold mt-1">Direct Message Coach Desk</h3>
            </div>
            <MessageSquare className="h-5 w-5 opacity-40" />
          </div>

          {/* Messages Stream */}
          <div className="h-52 bg-slate-950/25 rounded-2xl border border-current/5 p-4 flex flex-col gap-3.5 overflow-y-auto mb-4 text-xs">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`max-w-[85%] p-3 rounded-2xl flex flex-col ${
                  msg.sender === "Me" 
                    ? "self-end bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-400/20 text-right" 
                    : "self-start bg-current/5 border border-current/5"
                }`}
              >
                <span className="font-bold opacity-60 text-[9px] uppercase tracking-wide mb-1">{msg.sender}</span>
                <p className="font-light leading-relaxed">{msg.text}</p>
                <span className="text-[8px] opacity-40 mt-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Quick Send Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Inquire about child stroke dynamics..."
              className={`flex-grow px-4 py-3 text-xs rounded-xl focus:outline-none border transition-all ${
                isSwim 
                  ? "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-sky-400" 
                  : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:bg-emerald-900/30 focus:border-amber-400"
              }`}
            />
            <button
              type="submit"
              id="btn-parent-send-msg"
              className={`p-3 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
                isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </motion.div>

      </div>

      {/* 4. Sliding Apple-Pay Style Payment Drawer Modal */}
      <AnimatePresence>
        {activePayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setActivePayment(null)} />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ cubicBezier: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className={`relative h-full w-full max-w-md p-8 md:p-10 border-l flex flex-col justify-between ${
                isSwim ? "bg-white border-slate-100 text-slate-950" : "bg-emerald-950 border-emerald-900 text-emerald-50"
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest opacity-60 uppercase">SAMS CAPITAL GATEWAY</span>
                    <h3 className="text-xl font-bold font-serif">Settle Tuition Invoice</h3>
                  </div>
                  <button 
                    id="btn-payment-close"
                    onClick={() => setActivePayment(null)} 
                    className="p-1.5 rounded-lg hover:bg-current/5"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-current/5 border border-current/10 mb-8">
                  <span className="text-[10px] font-mono opacity-50 block uppercase">INVOICE ITEM</span>
                  <span className="text-sm font-bold block mt-1">{activePayment.description}</span>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-black">₹{activePayment.amount.toLocaleString("en-IN")}</span>
                    <span className="text-xs opacity-60 font-mono">INR</span>
                  </div>
                </div>

                {paymentDone ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4 animate-bounce">
                      ✓
                    </div>
                    <h4 className="text-base font-bold">Transaction Confirmed</h4>
                    <p className="text-xs opacity-60 font-light mt-1">An encrypted SAMS capital receipt has been dispatched.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={processPayment} className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className={`w-full p-3.5 text-xs rounded-xl focus:outline-none border font-semibold ${
                          isSwim ? "bg-slate-50 border-slate-200" : "bg-emerald-900/20 border-emerald-900/40"
                        }`}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Credit Card Number</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="•••• •••• •••• 4820"
                          className={`w-full p-3.5 pl-10 text-xs rounded-xl focus:outline-none border font-mono ${
                            isSwim ? "bg-slate-50 border-slate-200" : "bg-emerald-900/20 border-emerald-900/40"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Expiry Date</label>
                        <input
                          type="text"
                          defaultValue="08/30"
                          className={`w-full p-3.5 text-xs rounded-xl focus:outline-none border font-mono ${
                            isSwim ? "bg-slate-50 border-slate-200" : "bg-emerald-900/20 border-emerald-900/40"
                          }`}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase tracking-wider opacity-60">Security CVV</label>
                        <input
                          type="password"
                          defaultValue="412"
                          className={`w-full p-3.5 text-xs rounded-xl focus:outline-none border font-mono ${
                            isSwim ? "bg-slate-50 border-slate-200" : "bg-emerald-900/20 border-emerald-900/40"
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="btn-parent-complete-pay"
                      className={`w-full py-4 rounded-xl text-xs uppercase tracking-widest font-extrabold shadow-lg cursor-pointer flex items-center justify-center gap-2 mt-4 ${
                        isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
                      }`}
                    >
                      {isPaying ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span>Authorizing Card...</span>
                        </>
                      ) : (
                        <span>Authorize Secure Payment</span>
                      )}
                    </button>
                  </form>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-[10px] font-mono opacity-50 justify-center">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>PCI-DSS ENCRYPTED TRANSFERS</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

    </motion.div>
  );
}
