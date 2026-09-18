import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, LogIn, UserPlus, HelpCircle, X, Play, Pause, 
  BookOpen, Phone, Mail, MapPin, Clock, ChevronRight, CheckCircle2 
} from "lucide-react";
import { AcademyId } from "../types";
import { motion } from "motion/react";

interface AcademyExploreProps {
  academyId: AcademyId;
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
  onSelectAcademy: (id: AcademyId | null) => void;
}

type HelpTab = "video" | "guide" | "contact";

export function AcademyExplore({ 
  academyId, 
  onOpenLogin, 
  onOpenRegister, 
  onSelectAcademy 
}: AcademyExploreProps) {
  const isSwim = academyId === "swim";

  // Help Modal States
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HelpTab>("video");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(12);

  // Simulated Video playback progress
  useEffect(() => {
    let interval: any = null;
    if (isVideoPlaying) {
      interval = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 300);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  const togglePlayVideo = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between pt-24 pb-6 px-6 md:pt-28 md:pb-12 md:px-12 ${
      isSwim 
        ? "bg-sky-100/50 text-slate-800" 
        : "bg-emerald-950 text-emerald-50"
    } transition-colors duration-500 font-sans`}>
      
      {/* Header with Back Button */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-start pt-2 pb-1">
        <button 
          id="btn-explore-back"
          onClick={() => onSelectAcademy(null)}
          className={`group flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-200 ${
            isSwim 
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-sm" 
              : "border-emerald-800 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/80 hover:border-emerald-700"
          }`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Sports Selection</span>
        </button>
      </header>

      {/* Main Welcome Content */}
      <main className="flex-1 flex items-center justify-center py-2">
        <div className={`max-w-xl w-full p-8 md:p-10 rounded-3xl border ${
          isSwim 
            ? "bg-white border-slate-200/80 shadow-xl shadow-slate-100" 
            : "bg-emerald-900/20 border-emerald-800/30 shadow-2xl"
        } text-center space-y-8`}>
          
          {/* Friendly Icon / Badge */}
          <div className="flex justify-center">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${
              isSwim ? "bg-sky-50 border border-sky-100" : "bg-emerald-900/50 border border-emerald-800"
            }`}>
              {isSwim ? "🏊" : "🏏"}
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <span className={`text-[10px] font-mono tracking-widest uppercase ${
              isSwim ? "text-sky-600" : "text-amber-400"
            }`}>
              {isSwim ? "Swimming Academy" : "Cricket Academy"}
            </span>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isSwim ? "text-slate-900" : "text-white"
            }`}>
              {isSwim ? "Welcome to Baroda Swim Front" : "Welcome to Elite Cricket Academy"}
            </h1>
          </div>

          {/* Short, Human-Friendly Description */}
          <p className={`text-sm sm:text-base leading-relaxed font-light ${
            isSwim ? "text-slate-600" : "text-emerald-100/80"
          }`}>
            {isSwim 
              ? "Welcome to our friendly swimming pool community! Whether you want to learn to swim, enjoy open lap swim slots, or sign up your kids for private lessons, we are here to support you with clean facilities and friendly coaches."
              : "Welcome to our professional cricket training arena! Whether you want to practice your batting on our quality turf pitches, book a slot with our bowling machines, or get coaching for your child, our gates are open for players of all ages."
            }
          </p>

          {/* Login & Register Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              id="btn-explore-login"
              onClick={onOpenLogin}
              className={`flex-1 py-4 px-6 rounded-2xl text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                isSwim 
                  ? "bg-slate-900 text-white hover:bg-slate-800" 
                  : "bg-amber-400 text-slate-950 hover:bg-amber-300"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In / Login</span>
            </button>

            <button
              id="btn-explore-register"
              onClick={onOpenRegister}
              className={`flex-1 py-4 px-6 rounded-2xl text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                isSwim 
                  ? "border-slate-200 text-slate-800 hover:bg-slate-50" 
                  : "border-emerald-700 text-emerald-100 hover:bg-emerald-900/40"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              <span>Register New Member</span>
            </button>
          </div>

        </div>
      </main>

      {/* Need Help Section */}
      <div className="flex justify-center mt-4 mb-2">
        <motion.button
          id="btn-need-help"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => {
            setIsHelpOpen(true);
            setActiveTab("video");
          }}
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-semibold tracking-wide cursor-pointer shadow-sm transition-all duration-300 ${
            isSwim
              ? "border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-300 hover:shadow-sky-200/50"
              : "border-emerald-800 bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/80 hover:border-emerald-700 hover:shadow-emerald-900/20"
          }`}
        >
          <HelpCircle className="h-4 w-4 text-sky-400 animate-pulse" />
          <span>Need Help?</span>
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto py-6 border-t border-current/5 text-center">
        <p className="text-[10px] font-mono opacity-40">
          © {new Date().getFullYear()} Academy Member System. All rights reserved.
        </p>
      </footer>

      {/* Interactive Support Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div 
            className={`w-full max-w-2xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col md:flex-row h-[500px] max-h-[90vh] animate-in zoom-in-95 duration-300 ${
              isSwim 
                ? "bg-white border-slate-200 text-slate-800" 
                : "bg-emerald-950 border-emerald-900 text-emerald-50"
            }`}
          >
            {/* Left Sidebar - Help Navigation */}
            <div className={`w-full md:w-1/3 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r ${
              isSwim ? "bg-slate-50 border-slate-100" : "bg-[#052214] border-emerald-900"
            }`}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400 font-mono">
                    Support Desk
                  </h3>
                  <p className={`text-xl font-extrabold mt-1 ${isSwim ? "text-slate-800" : "text-amber-400"}`}>
                    How can we help?
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setActiveTab("video")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "video"
                        ? isSwim 
                          ? "bg-slate-900 text-white" 
                          : "bg-amber-400 text-slate-950"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Play className="h-4 w-4" />
                    <span>Watch Demo Video</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("guide")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "guide"
                        ? isSwim 
                          ? "bg-slate-900 text-white" 
                          : "bg-amber-400 text-slate-950"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Registration Guide</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("contact")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      activeTab === "contact"
                        ? isSwim 
                          ? "bg-slate-900 text-white" 
                          : "bg-amber-400 text-slate-950"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    <span>Contact Details</span>
                  </button>
                </div>
              </div>

              {/* Close Button Inside Left (Desktop) */}
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  setIsVideoPlaying(false);
                }}
                className={`hidden md:block w-full py-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-colors ${
                  isSwim 
                    ? "border-slate-200 text-slate-600 hover:bg-slate-100" 
                    : "border-emerald-800 text-emerald-200 hover:bg-emerald-900/60"
                }`}
              >
                Close Support
              </button>
            </div>

            {/* Right Pane - Dynamic Interactive Content */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-current/5">
                <h4 className="text-sm font-bold tracking-tight uppercase opacity-80">
                  {activeTab === "video" && "Video Walkthrough"}
                  {activeTab === "guide" && "Step-by-Step Guide"}
                  {activeTab === "contact" && "Get in Touch"}
                </h4>
                <button
                  onClick={() => {
                    setIsHelpOpen(false);
                    setIsVideoPlaying(false);
                  }}
                  className="p-1 rounded-full hover:bg-current/5 transition-colors cursor-pointer md:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 py-4 flex flex-col justify-center">
                
                {/* 1. Watch Demo Video Tab */}
                {activeTab === "video" && (
                  <div className="space-y-4">
                    <p className={`text-xs ${isSwim ? "text-slate-500" : "text-emerald-200/80"}`}>
                      Watch this short 1-minute walkthrough to understand how to register, select member roles, and log into your dashboard.
                    </p>
                    
                    {/* Beautiful Simulated Video Player */}
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-current/10 shadow-inner flex flex-col justify-between p-4 group">
                      
                      {/* Animated water visual when not playing, active player when playing */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none overflow-hidden">
                        <div className={`w-full h-full bg-gradient-to-tr from-sky-500/20 to-indigo-500/15 ${isVideoPlaying ? "animate-pulse" : ""}`} />
                        {isVideoPlaying && (
                          <div className="absolute inset-0 flex flex-col justify-center gap-2 items-center">
                            <span className="w-48 h-1 bg-sky-500/20 rounded-full overflow-hidden">
                              <span className="block h-full bg-sky-400 animate-[pulse_1.5s_infinite]" style={{ width: `${videoProgress}%` }}></span>
                            </span>
                            <span className="text-[10px] font-mono tracking-widest text-sky-400 animate-pulse">PLAYING MULTIMEDIA DEMO</span>
                          </div>
                        )}
                      </div>

                      {/* Video Title Indicator */}
                      <div className="relative z-10 flex justify-between items-center">
                        <span className="text-[10px] font-mono bg-black/40 text-slate-300 px-2 py-1 rounded-md backdrop-blur-sm">
                          SAMS_Portal_Demo.mp4
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">
                          {isVideoPlaying ? `00:${videoProgress < 10 ? `0${videoProgress}` : videoProgress}` : "00:12"} / 01:40
                        </span>
                      </div>

                      {/* Playback Controls Overlay */}
                      <div className="relative z-10 flex justify-center items-center">
                        <button
                          onClick={togglePlayVideo}
                          className={`h-12 w-12 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                            isVideoPlaying 
                              ? "bg-white text-slate-900 scale-95" 
                              : "bg-sky-500 text-white hover:scale-105 hover:bg-sky-400 shadow-lg shadow-sky-500/30"
                          }`}
                        >
                          {isVideoPlaying ? (
                            <Pause className="h-5 w-5 fill-current" />
                          ) : (
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Progress Bar scrubber */}
                      <div className="relative z-10 space-y-1.5">
                        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer">
                          <div 
                            className="h-full bg-sky-400 transition-all duration-300"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>{isVideoPlaying ? "Streaming online" : "Click to view demo"}</span>
                          <span>Auto Quality: 1080p</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Registration Guide Tab */}
                {activeTab === "guide" && (
                  <div className="space-y-3.5">
                    {[
                      { step: "1", title: "Click Register Button", desc: "Select 'Register New Member' on the landing screen." },
                      { step: "2", title: "Choose Your Account Type", desc: "Choose your role: Parent (to manage children), Individual Member, or Coach." },
                      { step: "3", title: "Fill Details", desc: "Input your full name, unique email address, password, and active phone contact." },
                      { step: "4", title: "Unlock Member Dashboard", desc: "Instantly sign in, view programs, schedule slot times, and make payments." },
                    ].map((item, index) => (
                      <div key={index} className="flex gap-3.5 items-start">
                        <div className="h-6 w-6 rounded-full bg-sky-500/10 text-sky-500 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-sky-500/20 mt-0.5">
                          {item.step}
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-bold tracking-wide">{item.title}</h5>
                          <p className={`text-[11px] leading-relaxed ${isSwim ? "text-slate-500" : "text-emerald-100/70"}`}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Contact Information Tab */}
                {activeTab === "contact" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-900/10 border-emerald-800/30"
                    }`}>
                      <Phone className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase opacity-50 block">Call support</span>
                        <a href="tel:+912657946376" className="text-xs font-bold hover:underline block text-sky-500">
                          +91 (265) 794-6376
                        </a>
                        <span className="text-[9px] opacity-40 block">Toll-free across India</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-900/10 border-emerald-800/30"
                    }`}>
                      <Mail className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase opacity-50 block">Write to Us</span>
                        <a href="mailto:support@barodaswimfront.com" className="text-xs font-bold hover:underline block text-indigo-500 truncate">
                          support@swimfront.com
                        </a>
                        <span className="text-[9px] opacity-40 block">Fast response within 2 hrs</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-start gap-3 sm:col-span-2 ${
                      isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-900/10 border-emerald-800/30"
                    }`}>
                      <MapPin className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase opacity-50 block">Academy Campus</span>
                        <span className="text-xs font-semibold block">
                          12, Swim Front Olympic Arena, Alkapuri Road, Vadodara, Gujarat 390007
                        </span>
                        <span className="text-[9px] opacity-40 block">Drop in for in-person tours</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-start gap-3 sm:col-span-2 ${
                      isSwim ? "bg-slate-50 border-slate-100" : "bg-emerald-900/10 border-emerald-800/30"
                    }`}>
                      <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase opacity-50 block">Opening Hours</span>
                        <span className="text-xs font-semibold block">
                          Monday to Saturday: 6:00 AM — 9:00 PM | Sunday: Closed
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Close Button at bottom on mobile */}
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  setIsVideoPlaying(false);
                }}
                className={`md:hidden w-full mt-4 py-3 rounded-xl text-xs font-extrabold text-center uppercase cursor-pointer ${
                  isSwim 
                    ? "bg-slate-100 text-slate-800 hover:bg-slate-200" 
                    : "bg-emerald-900 text-emerald-100 hover:bg-emerald-850"
                }`}
              >
                Close Support
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
