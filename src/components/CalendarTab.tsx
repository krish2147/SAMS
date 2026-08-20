import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, 
  Edit3, MapPin, Clock, Info, Check, Filter, Trash, Sparkles
} from "lucide-react";

interface CalendarItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: "Competition" | "Holiday" | "Maintenance" | "Workshop" | "Specialized Training";
  timing: string;
  venue: string;
  desc: string;
}

const PRESET_ITEMS: CalendarItem[] = [
  { 
    id: "e1", 
    title: "Baroda Summer Swim Festival", 
    date: "2026-08-10", 
    type: "Competition", 
    timing: "09:00 AM - 05:00 PM", 
    venue: "Main Olympic Pool", 
    desc: "District-level championship for age groups 10-18." 
  },
  { 
    id: "e2", 
    title: "Water Safety & Lifesaving Seminar", 
    date: "2026-07-28", 
    type: "Workshop", 
    timing: "10:00 AM - 01:00 PM", 
    venue: "Shallow Training Pool", 
    desc: "Essential drowning prevention and basic lifesaver techniques." 
  },
  { 
    id: "e3", 
    title: "Junior Stroke Correction Camp", 
    date: "2026-09-05", 
    type: "Specialized Training", 
    timing: "04:00 PM - 06:00 PM", 
    venue: "Lanes 1 to 4", 
    desc: "Targeted feedback on breaststroke and butterfly techniques." 
  },
  { 
    id: "h1", 
    title: "Olympic Pool Deep-Cleaning", 
    date: "2026-07-20", 
    type: "Maintenance", 
    timing: "Full Day", 
    venue: "Main Olympic Pool", 
    desc: "All training batches suspended for standard deep cleaning & pH level adjustments." 
  },
  { 
    id: "h2", 
    title: "Independence Day Holiday", 
    date: "2026-08-15", 
    type: "Holiday", 
    timing: "Full Day", 
    venue: "Entire Club Facility", 
    desc: "National holiday. Academy closed." 
  },
  { 
    id: "h3", 
    title: "Ganesh Chaturthi Closure", 
    date: "2026-09-14", 
    type: "Holiday", 
    timing: "Full Day", 
    venue: "Entire Club Facility", 
    desc: "Academy closed for festival." 
  }
];

interface CalendarTabProps {
  isSwim: boolean;
  userRole?: string; // "admin" | "super_admin" | "coach" | "member" | "staff"
}

export function CalendarTab({ isSwim, userRole = "admin" }: CalendarTabProps) {
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  // States
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Start on July 2026 (6 is index of July)
  const [selectedDate, setSelectedDate] = useState<string>("2026-07-20");
  const [filterType, setFilterType] = useState<string>("All");

  // Form States (for creating/editing)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<CalendarItem["type"]>("Competition");
  const [formDate, setFormDate] = useState("");
  const [formTiming, setFormTiming] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Load items
  useEffect(() => {
    const saved = localStorage.getItem("sams_calendar_items");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        setItems(PRESET_ITEMS);
      }
    } else {
      setItems(PRESET_ITEMS);
      localStorage.setItem("sams_calendar_items", JSON.stringify(PRESET_ITEMS));
    }
  }, []);

  const saveItems = (newItems: CalendarItem[]) => {
    setItems(newItems);
    localStorage.setItem("sams_calendar_items", JSON.stringify(newItems));
  };

  // Date utilities
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Form submit (Add or Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate) return;

    if (editingId) {
      // Edit
      const updated = items.map(item => {
        if (item.id === editingId) {
          return {
            ...item,
            title: formTitle,
            type: formType,
            date: formDate,
            timing: formTiming || "10:00 AM - 12:00 PM",
            venue: formVenue || "Main Pool",
            desc: formDesc
          };
        }
        return item;
      });
      saveItems(updated);
      setAlertMsg("Calendar item updated successfully!");
    } else {
      // Add
      const newItem: CalendarItem = {
        id: "c_" + Date.now(),
        title: formTitle,
        type: formType,
        date: formDate,
        timing: formTiming || "10:00 AM - 12:00 PM",
        venue: formVenue || "Main Pool",
        desc: formDesc
      };
      saveItems([...items, newItem]);
      setSelectedDate(formDate); // Focus on newly added date
      setAlertMsg("New calendar item scheduled!");
    }

    // Reset
    setShowFormModal(false);
    setEditingId(null);
    setFormTitle("");
    setFormTiming("");
    setFormVenue("");
    setFormDesc("");
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Delete
  const handleDeleteItem = (id: string) => {
    if (!confirm("Are you sure you want to delete this calendar item?")) return;
    const filtered = items.filter(i => i.id !== id);
    saveItems(filtered);
    setAlertMsg("Calendar item removed.");
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Start edit
  const handleStartEdit = (item: CalendarItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormDate(item.date);
    setFormTiming(item.timing);
    setFormVenue(item.venue);
    setFormDesc(item.desc);
    setShowFormModal(true);
  };

  // Open add modal for a specific day
  const handleOpenAddForDay = (dateStr: string) => {
    setEditingId(null);
    setFormTitle("");
    setFormType("Competition");
    setFormDate(dateStr);
    setFormTiming("10:00 AM - 12:00 PM");
    setFormVenue(isSwim ? "Main Olympic Pool" : "Main Turf Pitch");
    setFormDesc("");
    setShowFormModal(true);
  };

  // Calculations
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate blank spots for starting days of previous month
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Filter items matching filterType
  const filteredItems = items.filter(item => {
    if (filterType === "All") return true;
    return item.type === filterType;
  });

  // Items on selected day
  const selectedDayItems = items.filter(item => item.date === selectedDate);

  // Type styling helpers
  const getTypeColor = (type: CalendarItem["type"]) => {
    switch (type) {
      case "Competition": return "bg-red-500 text-white";
      case "Holiday": return "bg-amber-500 text-slate-950";
      case "Maintenance": return "bg-slate-700 text-white";
      case "Workshop": return "bg-sky-500 text-white";
      case "Specialized Training": return "bg-indigo-500 text-white";
      default: return "bg-slate-400 text-white";
    }
  };

  const getTypeDotColor = (type: CalendarItem["type"]) => {
    switch (type) {
      case "Competition": return "bg-red-500";
      case "Holiday": return "bg-amber-400";
      case "Maintenance": return "bg-slate-500";
      case "Workshop": return "bg-sky-500";
      case "Specialized Training": return "bg-indigo-500";
      default: return "bg-slate-400";
    }
  };

  // Styling
  const bgCard = isSwim ? "bg-white border-slate-100 shadow-sm text-slate-800" : "bg-emerald-950/40 border-emerald-900/40 text-emerald-100";
  const bgSubCard = isSwim ? "bg-slate-50 border border-slate-100" : "bg-emerald-900/10 border border-emerald-900/30";
  const buttonPrimary = isSwim ? "bg-sky-500 hover:bg-sky-600 text-white" : "bg-amber-400 hover:bg-amber-500 text-slate-950";

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">SCHEDULING PROTOCOL</span>
            <Sparkles className="h-4 w-4 text-sky-500" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 tracking-tight text-slate-900 dark:text-white">
            SAMS Schedulers & Calendars
          </h3>
          <p className="text-xs opacity-65 mt-0.5 max-w-2xl">
            Track competitions, deep cleaning maintenance windows, public holidays, and specialized workshops. 
            {isAdmin ? " Admins have full write permissions." : " Members have read-only permissions."}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingId(null);
              setFormTitle("");
              setFormType("Competition");
              setFormDate(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`);
              setFormTiming("10:00 AM - 12:00 PM");
              setFormVenue(isSwim ? "Main Olympic Pool" : "Main Turf Pitch");
              setFormDesc("");
              setShowFormModal(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${buttonPrimary}`}
          >
            <Plus className="h-4 w-4" />
            <span>Schedule New Event</span>
          </button>
        )}
      </div>

      {alertMsg && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-400 flex items-center gap-2 font-semibold">
          <Check className="h-4 w-4 text-emerald-500" />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* FILTER DRAWER */}
      <div className={`p-4 rounded-3xl border ${bgCard} flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-sky-500" />
          <span className="text-xs font-mono uppercase tracking-wider opacity-60">Filter Event Types:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "Competition", "Holiday", "Maintenance", "Workshop", "Specialized Training"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all ${
                filterType === type 
                  ? isSwim ? "bg-sky-500 text-white" : "bg-amber-400 text-slate-950"
                  : "bg-current/5 hover:bg-current/10"
              }`}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: THE REAL CALENDAR GRID */}
        <div className={`lg:col-span-8 p-6 md:p-8 rounded-3xl border ${bgCard} space-y-6`}>
          
          {/* Grid Header Controls */}
          <div className="flex justify-between items-center">
            <h4 className="text-base font-extrabold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-sky-500" />
              <span>{monthNames[currentMonth]} {currentYear}</span>
            </h4>
            <div className="flex gap-1 bg-current/5 p-1 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-current/10 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-current/10 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-mono font-extrabold opacity-60 uppercase tracking-widest border-b border-current/10 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square opacity-0" />;
              }

              // Compute YYYY-MM-DD
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = selectedDate === dateStr;

              // Find items matching this day
              const dayItems = filteredItems.filter(item => item.date === dateStr);

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square p-2 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between relative group ${
                    isSelected
                      ? isSwim
                        ? "border-sky-500 bg-sky-500/10 shadow-sm font-bold ring-1 ring-sky-400"
                        : "border-amber-400 bg-amber-400/10 shadow-sm font-bold ring-1 ring-amber-400"
                      : "bg-current/5 border-current/5 hover:border-current/20"
                  }`}
                >
                  {/* Day Number */}
                  <span className="text-xs">{day}</span>

                  {/* Colored indicator dots for events */}
                  <div className="flex flex-wrap gap-1 mt-1 max-h-[16px] overflow-hidden">
                    {dayItems.map((item) => (
                      <span
                        key={item.id}
                        className={`h-1.5 w-1.5 rounded-full ${getTypeDotColor(item.type)}`}
                        title={item.title}
                      />
                    ))}
                  </div>

                  {/* Add hover shortcut for admin */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddForDay(dateStr);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-sky-500 text-white p-0.5 rounded-md hover:bg-sky-600 transition-opacity cursor-pointer hidden sm:block"
                      title="Quick Schedule"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: DAY LOG DETAILS PANEL */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 md:p-8 rounded-3xl border ${bgCard} space-y-5 text-left`}>
            
            <div className="border-b border-current/10 pb-3">
              <span className="text-[10px] font-mono tracking-wider opacity-60 uppercase">SCHEDULED ITEMS ON</span>
              <h4 className="text-sm font-extrabold text-sky-500 mt-0.5">
                {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h4>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {selectedDayItems.length > 0 ? (
                selectedDayItems.map((item) => (
                  <div key={item.id} className={`p-4 rounded-2xl ${bgSubCard} space-y-3 relative group`}>
                    
                    {/* Header badge & title */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-extrabold uppercase ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <h5 className="text-xs font-extrabold mt-1 text-slate-800 dark:text-slate-100">{item.title}</h5>
                      </div>

                      {/* Admin action buttons */}
                      {isAdmin && (
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-sky-500 transition-colors cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[10.5px] opacity-75 leading-relaxed">{item.desc}</p>

                    {/* Metadata lines */}
                    <div className="space-y-1 pt-1.5 border-t border-current/5 text-[9.5px] font-mono opacity-60">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-sky-500" />
                        <span>Slot: {item.timing}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Venue: {item.venue}</span>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="text-center py-12 opacity-50 font-light text-xs space-y-2">
                  <Info className="h-5 w-5 mx-auto opacity-40 text-slate-400" />
                  <p>No training closures or events are scheduled for this day.</p>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenAddForDay(selectedDate)}
                      className="text-[11px] font-bold text-sky-500 hover:underline cursor-pointer"
                    >
                      + Schedule an Item
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ADD/EDIT EVENT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full text-left space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-500 font-bold block">
                {editingId ? "Modify Scheduler Credentials" : "Add SAMS Calendar Entry"}
              </span>
              <h3 className="text-lg font-black mt-0.5 text-slate-900 dark:text-white">
                {editingId ? "Edit Scheduled Item" : "Schedule New Event"}
              </h3>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-3.5">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Event Name</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Pool Maintenance Deep Clean"
                    className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Category</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
                      className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Competition" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Competition Gala</option>
                      <option value="Holiday" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Academy Holiday</option>
                      <option value="Maintenance" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Maintenance Window</option>
                      <option value="Workshop" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Safety Workshop</option>
                      <option value="Specialized Training" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Stroke Camp</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Scheduled Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Slot / Timing</label>
                    <input
                      type="text"
                      value={formTiming}
                      onChange={(e) => setFormTiming(e.target.value)}
                      placeholder="e.g. 10:00 AM - 12:00 PM"
                      className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Venue</label>
                    <input
                      type="text"
                      value={formVenue}
                      onChange={(e) => setFormVenue(e.target.value)}
                      placeholder="e.g. Main Pool"
                      className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9.5px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Description Remarks</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Provide description regarding closures, rules, entry pricing, age criteria, or guidelines..."
                    className="p-3 text-xs rounded-xl border bg-slate-50 border-slate-200 focus:outline-none dark:bg-slate-800/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 h-20 resize-none"
                  />
                </div>

              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer ${buttonPrimary}`}
                >
                  {editingId ? "Save Changes" : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
