"use client";

import React from "react";

/**
 * Fixed side decorations: physics/cosmic SVG elements + floating particles.
 * Shown on md+ screens on left and right; hidden on mobile to keep layout clean.
 */
export function CosmicDecorations() {
  return (
    <>
      {/* Left side — orbit + planet + wave + atom */}
      <div
        className="fixed left-0 top-0 bottom-0 w-[110px] sm:w-[140px] xl:w-[180px] pointer-events-none z-[1] flex flex-col items-center justify-center gap-1 sm:gap-6 xl:gap-8 py-4 sm:py-20 opacity-50 sm:opacity-100"
        aria-hidden
      >
        {/* Orbital path with small planet */}
        <div className="relative w-20 h-20 xl:w-24 xl:h-24 animate-orbit-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full text-sky-500/35">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 3" />
            <circle cx="50" cy="8" r="6" fill="currentColor" className="text-sky-400/90 animate-pulse-glow" />
          </svg>
        </div>
        {/* Sine wave (波动物理) */}
        <div className="w-16 xl:w-20 animate-wave-drift">
          <svg viewBox="0 0 60 24" className="w-full h-auto text-cyan-500/45">
            <path d="M0 12 Q15 0 30 12 T60 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <path d="M0 16 Q15 24 30 16 T60 16" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
        {/* Simple atom (nucleus + orbit) */}
        <div className="animate-float-down">
          <svg viewBox="0 0 48 48" className="w-12 h-12 xl:w-14 xl:h-14 text-sky-500/40">
            <circle cx="24" cy="24" r="4" fill="currentColor" />
            <ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.8" transform="rotate(-30 24 24)" />
            <ellipse cx="24" cy="24" rx="20" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.6" transform="rotate(30 24 24)" />
            <ellipse cx="24" cy="24" rx="8" ry="20" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
          </svg>
        </div>
        {/* Floating particles */}
        <div className="absolute left-4 top-1/4 w-2 h-2 rounded-full bg-sky-400/50 animate-particle-float" style={{ animationDelay: "0s" }} />
        <div className="absolute left-8 top-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-particle-float" style={{ animationDelay: "2s" }} />
        <div className="absolute left-6 top-3/4 w-1 h-1 rounded-full bg-sky-300/30 animate-particle-float" style={{ animationDelay: "4s" }} />

        {/* Kinematics (抛体运动) */}
        <div className="w-16 xl:w-20 animate-float-down opacity-50 mt-4">
          <svg viewBox="0 0 60 40" className="w-full h-full text-indigo-400">
            <path d="M5 35 Q 30 0 55 35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="5" cy="35" r="2.5" fill="currentColor" />
            <circle cx="20" cy="18" r="2.5" fill="currentColor" />
            <circle cx="40" cy="18" r="2.5" fill="currentColor" />
            <circle cx="55" cy="35" r="2.5" fill="currentColor" />
            <path d="M20 18 L28 15 M40 18 L46 24" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* E=mc² Graphic */}
        <div className="w-16 xl:w-20 animate-float-up opacity-40 mix-blend-screen ml-4">
          <svg viewBox="0 0 80 40" className="w-full h-full text-sky-300">
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="24" fontFamily="serif" fontStyle="italic" fontWeight="bold">
              E=mc<tspan dy="-10" fontSize="14">2</tspan>
            </text>
          </svg>
        </div>
      </div>

      {/* Right side — reverse orbit + field lines + planet/moon */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[110px] sm:w-[140px] xl:w-[180px] pointer-events-none z-[1] flex flex-col items-center justify-center gap-1 sm:gap-6 xl:gap-8 py-4 sm:py-20 opacity-50 sm:opacity-100"
        aria-hidden
      >
        {/* Elliptical orbit (reverse) + satellite */}
        <div className="relative w-24 h-24 xl:w-28 xl:h-28 animate-orbit-reverse">
          <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-500/30">
            <ellipse cx="50" cy="50" rx="38" ry="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 4" />
            <circle cx="50" cy="12" r="5" fill="currentColor" className="text-cyan-400/80" />
          </svg>
        </div>
        {/* Magnetic / force field lines */}
        <div className="w-14 xl:w-16 animate-float-down">
          <svg viewBox="0 0 40 50" className="w-full h-auto text-sky-500/40">
            <path d="M20 0 C20 15 8 25 20 35 C32 25 20 15 20 0" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M20 10 C26 20 14 28 20 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
            <path d="M20 10 C14 20 26 28 20 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
          </svg>
        </div>

        {/* Simple single pendulum */}
        <div className="w-10 h-16 xl:w-12 xl:h-20 origin-top animate-wave-drift opacity-60">
          <svg viewBox="0 0 40 80" className="w-full h-full text-cyan-400/50">
            <line x1="20" y1="0" x2="20" y2="60" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="20" cy="60" r="8" fill="currentColor" opacity="0.8" />
            <path d="M12 60 A8 8 0 0 0 28 60" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        {/* Planet / moon with crater */}
        <div className="animate-float-up">
          <svg viewBox="0 0 40 40" className="w-10 h-10 xl:w-12 xl:h-12 text-slate-500/70">
            <circle cx="20" cy="20" r="14" fill="currentColor" />
            <circle cx="14" cy="14" r="3" fill="currentColor" className="text-slate-600/90" />
          </svg>
        </div>
        {/* Circuit-style nodes (物理电路感) */}
        <div className="w-12 h-10 animate-wave-drift opacity-60">
          <svg viewBox="0 0 32 24" className="w-full h-full text-cyan-500/35">
            <circle cx="8" cy="8" r="2" fill="currentColor" />
            <circle cx="24" cy="8" r="2" fill="currentColor" />
            <circle cx="16" cy="20" r="2" fill="currentColor" />
            <path d="M8 8 L16 20 M24 8 L16 20 M8 8 L24 8" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Magnetism (U型磁铁和磁感线) */}
        <div className="w-14 xl:w-16 animate-float-up opacity-60">
          <svg viewBox="0 0 40 40" className="w-full h-auto text-sky-400">
            <path d="M10 20 V 10 A 10 10 0 0 1 30 10 V 20 H 24 V 10 A 4 4 0 0 0 16 10 V 20 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <rect x="10" y="20" width="6" height="8" fill="currentColor" opacity="0.8" />
            <rect x="24" y="20" width="6" height="8" fill="currentColor" opacity="0.3" />
            <path d="M13 28 C 13 36, 27 36, 27 28" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
            <path d="M9 24 C 0 35, 40 35, 31 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
          </svg>
        </div>

        {/* Integrated Circuit (集成电路芯片) */}
        <div className="w-14 xl:w-16 animate-wave-drift opacity-50 mt-4">
          <svg viewBox="0 0 48 48" className="w-full h-full text-cyan-400">
            <rect x="12" y="12" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 12 V 8 M24 12 V 8 M32 12 V 8 M16 36 V 40 M24 36 V 40 M32 36 V 40 M12 16 H 8 M12 24 H 8 M12 32 H 8 M36 16 H 40 M36 24 H 40 M36 32 H 40" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" />
          </svg>
        </div>
        {/* Floating particles */}
        <div className="absolute right-6 top-1/3 w-2 h-2 rounded-full bg-cyan-400/45 animate-particle-float" style={{ animationDelay: "1s" }} />
        <div className="absolute right-10 top-2/3 w-1.5 h-1.5 rounded-full bg-sky-400/40 animate-particle-float" style={{ animationDelay: "3s" }} />
        <div className="absolute right-4 top-1/2 w-1 h-1 rounded-full bg-cyan-300/30 animate-particle-float" style={{ animationDelay: "5s" }} />
      </div>
    </>
  );
}
