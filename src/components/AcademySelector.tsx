import React, { useState, useEffect } from "react";
import { ArrowRight, Waves, Trophy } from "lucide-react";
import { AcademyId } from "../types";

interface AcademySelectorProps {
  onSelectAcademy: (id: AcademyId) => void;
}

export function AcademySelector({ onSelectAcademy }: AcademySelectorProps) {
  // Loop Typewriter Effect alternating between "Select Your Academy Portal" and "Select Your Sport"
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(70);

  const phrases = ["Select Your Academy Portal", "Select Your Sport"];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[phraseIndex];

    const handleType = () => {
      if (!isDeleting) {
        // Typing
        if (typedText.length < currentPhrase.length) {
          setTypedText(currentPhrase.slice(0, typedText.length + 1));
          setTypingSpeed(60); // stable custom typing pace
        } else {
          // Completed typing the phrase
          setIsDeleting(true);
          setTypingSpeed(2200); // pause at the end of the phrase
        }
      } else {
        // Deleting
        if (typedText.length > 0) {
          setTypedText(typedText.slice(0, -1));
          setTypingSpeed(25); // fast backspacing
        } else {
          // Entirely deleted, cycle to next phrase
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
          setTypingSpeed(150); // tiny pause before typing the next phrase
        }
      }
    };

    timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [typedText, isDeleting, phraseIndex]);

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#F3F4F6] flex flex-col justify-between selection:bg-white selection:text-black font-sans overflow-hidden antialiased">
      
      {/* Sleek Minimalist Header */}
      <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm">
            <div className="w-4 h-4 border-2 border-black rotate-45"></div>
          </div>
          <span className="text-xl font-display font-medium tracking-tight">SAMS</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col justify-center items-center">
        
        {/* Animated Typewriter Heading */}
        <div className="text-center w-full mb-12">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-white leading-none min-h-[4rem] sm:min-h-[5.5rem] flex items-center justify-center">
            <span className="relative">
              <span className="bg-gradient-to-r from-white via-white/95 to-white/75 bg-clip-text text-transparent">
                {typedText}
              </span>
              <span className="inline-block w-[3px] h-[0.9em] ml-2 bg-sky-400 animate-pulse rounded-full align-middle" />
            </span>
          </h1>
        </div>

        {/* Compact, High-End Card List (No scrolling needed!) */}
        <div className="w-full flex flex-col gap-6">
          
          {/* Card 1: Baroda Swim Front */}
          <div 
            onClick={() => onSelectAcademy("swim")}
            className="group relative h-40 sm:h-48 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-between px-6 sm:px-10 cursor-pointer transition-all duration-500 hover:border-sky-500/30 hover:shadow-[0_0_50px_rgba(14,165,233,0.15)] bg-black"
          >
            {/* Ambient Back Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />

            {/* Immersive Image Background */}
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10 transition-opacity duration-300" />
              <img 
                src="https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1200"
                alt="Baroda Swim Front"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Content Overlaid on Left */}
            <div className="relative z-20 flex flex-col justify-center space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-500/20 flex items-center justify-center border border-sky-400/30">
                  <Waves className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <span className="text-[9px] font-mono tracking-[0.2em] text-sky-400 uppercase font-bold">
                  SWIMMING
                </span>
              </div>
              <h3 className="text-2xl sm:text-3.5xl font-display font-semibold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                Baroda Swim Front
              </h3>
            </div>

            {/* High-End Minimal Arrow Button */}
            <div className="relative z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-sky-500 group-hover:border-sky-500 group-hover:scale-110 shrink-0">
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 2: Elite Cricket Academy */}
          <div 
            onClick={() => onSelectAcademy("cricket")}
            className="group relative h-40 sm:h-48 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-between px-6 sm:px-10 cursor-pointer transition-all duration-500 hover:border-amber-500/30 hover:shadow-[0_0_50px_rgba(245,158,11,0.15)] bg-black"
          >
            {/* Ambient Back Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />

            {/* Immersive Image Background */}
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10 transition-opacity duration-300" />
              <img 
                src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1200"
                alt="Elite Cricket Academy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            {/* Content Overlaid on Left */}
            <div className="relative z-20 flex flex-col justify-center space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center border border-amber-400/30">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-[9px] font-mono tracking-[0.2em] text-amber-400 uppercase font-bold">
                  CRICKET
                </span>
              </div>
              <h3 className="text-2xl sm:text-3.5xl font-display font-semibold text-white tracking-tight group-hover:text-amber-300 transition-colors">
                Elite Cricket Academy
              </h3>
            </div>

            {/* High-End Minimal Arrow Button */}
            <div className="relative z-20 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-amber-400 group-hover:border-amber-400 group-hover:text-black group-hover:scale-110 shrink-0">
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

        </div>

      </main>

      {/* Simplified Footer */}
      <footer className="py-6 px-6 md:px-12 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <span className="text-[9px] uppercase tracking-[0.25em] text-white/30 font-mono text-center sm:text-left">
          Seamless Multilateral Athletic management system
        </span>
        <div className="text-[9px] font-mono text-white/40 flex items-center gap-2">
          <span>SECURE NODE</span>
          <span>•</span>
          <span>PCI-DSS ENCRYPTED</span>
        </div>
      </footer>

    </div>
  );
}
