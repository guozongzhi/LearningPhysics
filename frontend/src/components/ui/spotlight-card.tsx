"use client";

import React, { useRef, useState, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(56, 189, 248, 0.15)", // Default to sky blue
  ...props
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setOpacity(1);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
  };

  const handleTouchEnd = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md transition-all duration-300 hover:border-slate-700/50 hover:shadow-2xl hover:shadow-black/50 touch-manipulation",
        className
      )}
      {...props}
    >
      {/* Background radial spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 ease-in-out"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />

      {/* Enhanced border glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl border border-transparent transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(150px circle at ${position.x}px ${position.y}px, ${spotlightColor.replace("0.15", "0.6")}, transparent 70%)`,
          maskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          WebkitMaskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Inner glow effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: opacity * 0.5,
          background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, ${spotlightColor.replace("0.15", "0.1")}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
