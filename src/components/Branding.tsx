import React from "react";

// Premium Logo Monogram
export function SAMSLogo({ className = "h-8 w-8", light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 font-sans tracking-widest ${light ? "text-white" : "text-black"}`}>
      <div className={`flex items-center justify-center rounded-lg ${
        light 
          ? "bg-white text-black" 
          : "bg-black text-white"
      } h-9 w-9 shrink-0 shadow-sm`}>
        <div className={`w-3.5 h-3.5 border-2 rotate-45 ${
          light
            ? "border-black"
            : "border-white"
        }`}></div>
      </div>
      <div className="flex flex-col justify-center">
        <span className={`text-base font-bold tracking-tight leading-none ${light ? "text-white" : "text-black"}`}>SAMS</span>
      </div>
    </div>
  );
}

// Gorgeous Wave shader backdrop for Baroda Swim Front
export function SwimWaveBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      <svg className="absolute w-full h-[300px] -bottom-10 left-0 text-sky-100/30" viewBox="0 0 1440 320" fill="currentColor" preserveAspectRatio="none">
        <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,144C672,149,768,203,864,224C960,245,1056,235,1152,208C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
      <svg className="absolute w-full h-[250px] -bottom-20 left-0 text-sky-200/20" viewBox="0 0 1440 320" fill="currentColor" preserveAspectRatio="none">
        <path d="M0,96L48,112C96,128,192,160,288,181.3C384,203,480,213,576,197.3C672,181,768,139,864,128C960,117,1056,139,1152,149.3C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
      </svg>
    </div>
  );
}

// Elegant Stadium Light / Grass Pitch shader for Cricket
export function CricketTurfBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {/* Dynamic beam of light */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-[100px]" />
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
      {/* Clean stadium grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
}

// Wave Canvas Animation
export function SwimmingPoolAnimation() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900 to-sky-950 flex items-center justify-center p-6 border border-cyan-800/30">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute w-full h-1/2 top-0 bg-cyan-400/10 blur-[60px] animate-pulse"></div>
      </div>
      {/* Animated swim lanes */}
      <div className="w-full flex flex-col gap-4 relative z-10">
        {[1, 2, 3, 4, 5].map((lane) => (
          <div key={lane} className="relative h-6 w-full bg-cyan-950/40 rounded-full border border-cyan-800/20 overflow-hidden flex items-center">
            {/* Lane line indicator */}
            <div className="absolute inset-y-0 left-0 w-2 bg-red-500"></div>
            <div className="absolute inset-y-0 right-0 w-2 bg-red-500"></div>
            <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] border-t border-dashed border-cyan-700/50"></div>
            
            {/* Animated swimmer dot */}
            <div 
              className="absolute h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] flex items-center justify-center"
              style={{
                left: `${15 + lane * 12}%`,
                animation: `swimMove ${4 + lane}s infinite ease-in-out alternate`
              }}
            >
              <div className="h-1 w-1 bg-white rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
      <span className="absolute bottom-4 right-4 text-[9px] font-mono tracking-widest text-cyan-400/60 uppercase">Status: Lanes Active</span>
      <style>{`
        @keyframes swimMove {
          0% { left: 10%; transform: scaleX(1); }
          50% { left: 85%; transform: scaleX(1); }
          51% { transform: scaleX(-1); }
          100% { left: 10%; transform: scaleX(-1); }
        }
      `}</style>
    </div>
  );
}

// Elegant Cricket Pitch Visualization
export function CricketPitchAnimation() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-green-900 flex items-center justify-center p-6 border border-emerald-800/30">
      <div className="absolute inset-0 opacity-15">
        <div className="absolute w-full h-1/2 bottom-0 bg-amber-400/5 blur-[50px]"></div>
      </div>
      {/* Classic pitch outline */}
      <div className="relative w-[340px] h-[160px] border border-emerald-700/50 rounded-lg bg-emerald-900/30 p-2 flex items-center justify-between">
        {/* Pitch crease details */}
        <div className="h-full w-12 border-r border-amber-500/40 relative flex items-center justify-center">
          {/* Stumps */}
          <div className="flex flex-col gap-1.5 items-center">
            <div className="h-4 w-[2px] bg-amber-400"></div>
            <div className="h-4 w-[2px] bg-amber-400"></div>
            <div className="h-4 w-[2px] bg-amber-400"></div>
          </div>
          <div className="absolute top-2 left-2 text-[8px] font-mono text-emerald-400/60">CREASE</div>
        </div>
        
        {/* Pitch center logo */}
        <div className="h-8 w-8 rounded-full border border-emerald-600/30 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-amber-500/70 animate-ping"></div>
        </div>

        <div className="h-full w-12 border-l border-amber-500/40 relative flex items-center justify-center">
          {/* Stumps */}
          <div className="flex flex-col gap-1.5 items-center">
            <div className="h-4 w-[2px] bg-amber-400"></div>
            <div className="h-4 w-[2px] bg-amber-400"></div>
            <div className="h-4 w-[2px] bg-amber-400"></div>
          </div>
          <div className="absolute top-2 right-2 text-[8px] font-mono text-emerald-400/60 font-medium">BOWLER</div>
        </div>

        {/* Bowling path trace */}
        <div className="absolute h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent left-12 right-12 top-1/2 -translate-y-1/2 overflow-hidden">
          <div className="h-full w-20 bg-white shadow-[0_0_10px_#fff] animate-[ballRoll_3s_infinite_linear]"></div>
        </div>
      </div>
      <span className="absolute bottom-4 right-4 text-[9px] font-mono tracking-widest text-amber-400/60 uppercase">Pitch Diagnostics: Turf Dry</span>
      <style>{`
        @keyframes ballRoll {
          0% { transform: translateX(-50px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(300px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
