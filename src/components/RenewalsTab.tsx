import React, { useState } from "react";
import { RefreshCw, IndianRupee, Search, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";

interface RenewalsTabProps {
  isSwim: boolean;
  members: any[];
  onRenew: (membershipNo: string, term: string, paymentMode: string, newEndDate: string) => void;
}

export function RenewalsTab({ isSwim, members, onRenew }: RenewalsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemNoForRenewal, setSelectedMemNoForRenewal] = useState<string | null>(null);
  const [renewalTerm, setRenewalTerm] = useState("Monthly");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Styling helpers
  const bgCard = isSwim ? "bg-white border-slate-100 shadow-md text-slate-800" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100";
  const bgSubCard = isSwim ? "bg-slate-50 border border-slate-100" : "bg-emerald-900/10 border border-emerald-900/30";
  const buttonPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-amber-400 hover:bg-amber-500 text-slate-950";
  const inputStyle = `w-full p-3 text-xs rounded-xl focus:outline-none border font-semibold ${
    isSwim 
      ? "bg-white border-slate-200 text-slate-900 focus:border-sky-400" 
      : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:border-amber-400"
  }`;

  const approvedMembers = members.filter(m => m.status === "Approved");

  const filtered = approvedMembers.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      (m.fullName || "").toLowerCase().includes(query) ||
      (m.membershipNo || "").toLowerCase().includes(query) ||
      (m.mobileNo || "").includes(query)
    );
  });

  const getMembershipStatus = (endDateStr: string) => {
    if (!endDateStr) return { label: "Unknown", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    const today = new Date();
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Expired", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    } else if (diffDays <= 30) {
      return { label: "Expiring Soon", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    } else {
      return { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
  };

  const selectedMember = approvedMembers.find(m => m.membershipNo === selectedMemNoForRenewal);

  const handleProcessRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemNoForRenewal || !selectedMember) return;

    // Calculate new end date from today or from old end date (whichever is later)
    const today = new Date();
    const oldEnd = new Date(selectedMember.endDate);
    const baseDate = oldEnd > today ? oldEnd : today;

    let daysToAdd = 30;
    if (renewalTerm === "Quarterly") daysToAdd = 90;
    else if (renewalTerm === "Yearly") daysToAdd = 365;

    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + daysToAdd);
    const newEndDateStr = newEnd.toISOString().split("T")[0];

    onRenew(selectedMemNoForRenewal, renewalTerm, paymentMode, newEndDateStr);

    setSuccessAlert(`Successfully renewed membership for ${selectedMember.fullName}. Term extended to ${newEndDateStr}!`);
    setSelectedMemNoForRenewal(null);

    setTimeout(() => {
      setSuccessAlert(null);
    }, 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      
      <div>
        <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">SUBSCRIPTION MANAGER</span>
        <h3 className="text-xl font-bold mt-1">SAMS Membership Renewals Desk</h3>
        <p className="text-xs opacity-65 mt-0.5">
          Process payments and extend subscription dates for approved athletes. Receipts are calculated transparently.
        </p>
      </div>

      {successAlert && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span className="font-semibold">{successAlert}</span>
        </div>
      )}

      {/* Renewals Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Swimmers Grid */}
        <div className={`min-w-0 ${selectedMemNoForRenewal ? "7" : "12"} rounded-3xl border ${bgCard} overflow-hidden`}>
          <div className="p-5 border-b border-current/10 flex justify-between items-center">
            <h4 className="text-sm font-bold uppercase">Membership Renewals</h4>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active members..."
                className={`pl-8 py-2 ${inputStyle}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-current/5 border-b border-current/10 font-mono text-[10px] opacity-75 uppercase tracking-wider">
                  <th className="p-4">SAMS ID</th>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Membership Term</th>
                  <th className="p-4">Expiration Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Renewal Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/5">
                {filtered.length > 0 ? (
                  filtered.map((m) => {
                    const mStatus = getMembershipStatus(m.endDate);
                    return (
                      <tr key={m.membershipNo} className="hover:bg-current/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-sky-500">
                          {m.membershipNo}
                        </td>
                        <td className="p-4 font-extrabold uppercase">
                          {m.fullName}
                        </td>
                        <td className="p-4 font-semibold">{m.typeOfMembership}</td>
                        <td className="p-4 font-mono opacity-80">{m.endDate}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9.5px] font-bold font-mono px-2.5 py-1 rounded-full uppercase border ${mStatus.color}`}>
                            {mStatus.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedMemNoForRenewal(m.membershipNo)}
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 cursor-pointer text-[10px] uppercase font-mono tracking-widest font-extrabold transition-all"
                          >
                            Process Fee Extension
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center opacity-50 font-light">
                      No active members matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Renewals Cards (Visible only on mobile) */}
          <div className="md:hidden block p-4 space-y-4">
            {filtered.length > 0 ? (
              filtered.map((m) => {
                const mStatus = getMembershipStatus(m.endDate);
                return (
                  <div 
                    key={m.membershipNo}
                    onClick={() => setSelectedMemNoForRenewal(m.membershipNo)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      selectedMemNoForRenewal === m.membershipNo 
                        ? "bg-sky-500/10 border-sky-500/30 shadow-xs" 
                        : isSwim 
                          ? "bg-slate-50 border-slate-200/60 hover:bg-slate-100/50" 
                          : "bg-emerald-900/10 border-emerald-900/30 hover:bg-emerald-900/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white uppercase text-xs">{m.fullName}</h4>
                        <p className="text-[10px] opacity-65 font-mono mt-0.5">ID: {m.membershipNo} • Expiry: {m.endDate}</p>
                        <p className="text-[10px] font-semibold text-sky-600 mt-1">{m.typeOfMembership} Plan</p>
                      </div>
                      <span className={`text-[8.5px] font-bold font-mono px-2 py-0.5 rounded-full uppercase border ${mStatus.color}`}>
                        {mStatus.label}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between items-center border-t border-current/5 pt-2 text-[10px]">
                      <span className="text-sky-500 font-bold uppercase tracking-wider">Tap to process fee &rarr;</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 opacity-50 text-xs">
                No active members matching search.
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive Processing Panel */}
        {selectedMemNoForRenewal && selectedMember && (
          <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:col-span-5 lg:z-0 flex flex-col justify-end lg:justify-start">
            {/* Backdrop for mobile */}
            <div className="absolute inset-0 bg-slate-950/60 lg:hidden" onClick={() => setSelectedMemNoForRenewal(null)} />
            
            {/* Panel */}
            <div className={`relative w-full max-h-[90vh] lg:max-h-[600px] rounded-t-3xl lg:rounded-3xl border ${bgCard} text-left p-6 md:p-8 overflow-y-auto shadow-2xl lg:shadow-md`}>
              <button
                onClick={() => setSelectedMemNoForRenewal(null)}
                className="absolute top-6 right-6 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>

              <form onSubmit={handleProcessRenewal} className="space-y-4">
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-50 block">SAMS SINK ENGINE</span>
                <h3 className="text-lg font-bold">Process Fee Extension Drawer</h3>
                <p className="text-xs opacity-65 leading-relaxed">
                  Log a physical or digital payment transaction to extend <strong className="uppercase">{selectedMember.fullName}</strong>.
                </p>

                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="opacity-60">Current Plan Type:</span>
                    <span className="font-bold">{selectedMember.typeOfMembership}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Registered Expiry:</span>
                    <span className="font-mono font-bold text-sky-500">{selectedMember.endDate}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase opacity-50">Select New Subscription Plan</label>
                    <select
                      value={renewalTerm}
                      onChange={(e) => setRenewalTerm(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="Monthly">Monthly Basic (₹3,500)</option>
                      <option value="Quarterly">Quarterly Club Pro (₹9,000)</option>
                      <option value="Yearly">Yearly Elite Prestige (₹28,000)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase opacity-50">Method of Payment</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className={inputStyle}
                    >
                      <option value="UPI">UPI Instant Pay (GPay / PhonePe / Paytm)</option>
                      <option value="Credit Card">Credit/Debit Card (Visa / Mastercard)</option>
                      <option value="Cash">Cash Receipt at Front Counter</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3.5 rounded-xl text-xs uppercase tracking-widest font-extrabold shadow-md cursor-pointer flex items-center justify-center gap-2 mt-4 ${buttonPrimary}`}
                >
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                  <span>Issue SAMS Renewal extension</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
