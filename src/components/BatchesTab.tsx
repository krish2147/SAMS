import React, { useState } from "react";
import { Calendar, CheckCircle, Search, Clock, Users, ShieldAlert } from "lucide-react";

interface BatchesTabProps {
  isSwim: boolean;
  members: any[];
  batches: any[];
  onNavigate: (tabId: string) => void;
}

export function BatchesTab({ isSwim, members, batches, onNavigate }: BatchesTabProps) {
  const [selectedBatchId, setSelectedBatchId] = useState("b2");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceState, setAttendanceState] = useState<Record<string, "Present" | "Absent" | "Excused">>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Styling helpers
  const bgCard = isSwim ? "bg-white border-slate-100 shadow-md text-slate-800" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100";
  const bgSubCard = isSwim ? "bg-slate-50 border border-slate-100" : "bg-emerald-900/10 border border-emerald-900/30";
  const buttonPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-amber-400 hover:bg-amber-500 text-slate-950";
  const inputStyle = `w-full p-3 text-xs rounded-xl focus:outline-none border font-semibold ${
    isSwim 
      ? "bg-white border-slate-200 text-slate-900 focus:border-sky-400" 
      : "bg-emerald-900/20 border-emerald-900/40 text-emerald-50 focus:border-amber-400"
  }`;

  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0];

  // Filter members assigned to the current batch based on matching timings or timing slots
  const rosterMembers = members.filter(m => {
    if (m.status !== "Approved") return false;
    
    // Normalize timing match
    const bTiming = currentBatch.timing.toLowerCase().replace(/\s+/g, "");
    const mTiming = (m.batchTiming || m.allottedTiming || "").toLowerCase().replace(/\s+/g, "");
    return mTiming.includes(bTiming) || bTiming.includes(mTiming) || mTiming === bTiming;
  });

  const toggleStatus = (membershipNo: string) => {
    setAttendanceState(prev => {
      const current = prev[membershipNo] || "Present";
      let next: "Present" | "Absent" | "Excused" = "Present";
      if (current === "Present") next = "Absent";
      else if (current === "Absent") next = "Excused";
      return { ...prev, [membershipNo]: next };
    });
  };

  const handleSaveAttendance = () => {
    // Generate simple log output
    const timestamp = new Date().toLocaleTimeString();
    setSaveSuccess(`Successfully synchronized attendance registry for ${currentBatch.name} on ${attendanceDate} at ${timestamp}!`);
    setTimeout(() => {
      setSaveSuccess(null);
    }, 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      
      {/* Batches Overview Board */}
      <div>
        <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">SCHEDULING ENGINE</span>
        <h3 className="text-xl font-bold mt-1">Baroda Swim Front Active Batches</h3>
        <p className="text-xs opacity-65 mt-0.5">
          Academy standard training slots. Swimmers are locked into specific morning or evening schedules to respect capacity bounds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {batches.map((b) => {
            const isSelected = selectedBatchId === b.id;
            const size = members.filter(m => {
              if (m.status !== "Approved") return false;
              const bTiming = b.timing.toLowerCase().replace(/\s+/g, "");
              const mTiming = (m.batchTiming || "").toLowerCase().replace(/\s+/g, "");
              return mTiming.includes(bTiming) || bTiming.includes(mTiming);
            }).length;

            return (
              <div 
                key={b.id} 
                onClick={() => setSelectedBatchId(b.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected 
                    ? isSwim 
                      ? "border-sky-400 bg-sky-50/10 shadow-md ring-1 ring-sky-400" 
                      : "border-amber-400 bg-amber-400/5 shadow-md ring-1 ring-amber-400"
                    : bgCard
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[9px] font-mono opacity-50 block uppercase">{b.days} SCHEDULE</span>
                    <h4 className="text-base font-extrabold">{b.name}</h4>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl uppercase ${
                    b.level === "Elite Squad" || b.level === "Advanced"
                      ? "bg-amber-400/10 text-amber-500"
                      : "bg-sky-500/10 text-sky-500"
                  }`}>
                    {b.level}
                  </span>
                </div>

                <div className="space-y-2 pt-4 border-t border-current/5">
                  <div className="flex items-center gap-2 text-xs opacity-85">
                    <Clock className="h-4 w-4 text-sky-500" />
                    <span>Time: <strong className="font-extrabold">{b.timing}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-xs opacity-85">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-500" />
                      <span>Capacity: <strong className="font-extrabold">{b.capacity}</strong> seats</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-85">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Current Members: <strong className="font-extrabold">{size}</strong> / {b.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs opacity-85">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-sky-500" />
                      <span>Available Seats: <strong className="font-extrabold text-emerald-500">{Math.max(0, b.capacity - size)}</strong></span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      b.capacity - size > 0
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}>
                      {b.capacity - size > 0 ? "🟢 Open" : "🔴 Full"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAMS Active Attendance Desk */}
      <div className={`p-6 md:p-8 rounded-3xl border ${bgCard}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">OPERATIONAL REGISTRY</span>
            <h3 className="text-lg font-black mt-1 uppercase">Daily Attendance marking Desk</h3>
            <p className="text-xs opacity-65 mt-0.5">
              Select any active training slot to inspect its members and record attendance logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="w-full sm:w-48">
              <label className="text-[9px] font-mono uppercase opacity-55 block mb-1">Select Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className={inputStyle}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.days})</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <label className="text-[9px] font-mono uppercase opacity-55 block mb-1">Select Session Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">{saveSuccess}</span>
          </div>
        )}

         {rosterMembers.length > 0 ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="overflow-x-auto rounded-2xl border border-current/10 hidden md:block">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-current/5 border-b border-current/10 font-mono text-[10px] opacity-75 uppercase tracking-wider">
                    <th className="p-4">SAMS Card ID</th>
                    <th className="p-4">Member Name</th>
                    <th className="p-4">Membership Term</th>
                    <th className="p-4">Gender</th>
                    <th className="p-4 text-center">Duty Status Tally</th>
                    <th className="p-4 text-center">Toggle Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/5">
                  {rosterMembers.map((m) => {
                    const status = attendanceState[m.membershipNo] || "Present";
                    return (
                      <tr key={m.membershipNo} className="hover:bg-current/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-sky-500">
                          {m.membershipNo}
                        </td>
                        <td className="p-4 font-extrabold uppercase">
                          {m.fullName}
                        </td>
                        <td className="p-4 font-semibold">{m.typeOfMembership}</td>
                        <td className="p-4 opacity-80">{m.gender}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-extrabold font-mono px-3 py-1 rounded-full uppercase ${
                            status === "Present" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : status === "Absent"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleStatus(m.membershipNo)}
                            className="px-3 py-1.5 rounded-lg bg-current/10 hover:bg-current/20 text-[10px] uppercase font-mono tracking-wider font-extrabold cursor-pointer transition-all"
                          >
                            Cycle Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden block space-y-3">
              {rosterMembers.map((m) => {
                const status = attendanceState[m.membershipNo] || "Present";
                return (
                  <div 
                    key={m.membershipNo}
                    className={`p-4 rounded-2xl border ${bgSubCard} flex justify-between items-center`}
                  >
                    <div className="text-left">
                      <h4 className="font-extrabold uppercase text-xs text-slate-900 dark:text-white">{m.fullName}</h4>
                      <p className="text-[10px] opacity-60 font-mono mt-0.5">ID: {m.membershipNo} • {m.gender}</p>
                      <span className={`inline-block text-[8px] font-extrabold font-mono px-2 py-0.5 rounded-full uppercase mt-2 border ${
                        status === "Present" 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                          : status === "Absent"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {status}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => toggleStatus(m.membershipNo)}
                      className="px-3 py-1.5 rounded-lg bg-current/10 hover:bg-current/20 text-[9px] uppercase font-mono tracking-wider font-extrabold cursor-pointer transition-all"
                    >
                      Cycle
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveAttendance}
                className={`px-5 py-3 rounded-xl text-xs uppercase tracking-widest font-extrabold shadow-md cursor-pointer flex items-center gap-2 ${buttonPrimary}`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Synchronize Attendance Log</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-current/5 border border-dashed border-current/15">
            <ShieldAlert className="h-8 w-8 mx-auto opacity-45 mb-3" />
            <span className="text-sm font-bold block">No Members Scheduled in this timing</span>
            <p className="text-xs opacity-60 max-w-sm mx-auto mt-1 leading-relaxed">
              Ensure you have approved member profiles containing assigned allotted timings matching "{currentBatch.timing}".
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
