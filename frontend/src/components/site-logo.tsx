import Link from "next/link";
import Image from "next/image";
import React from "react";

type SiteLogoProps = {
  showText?: boolean;
  compact?: boolean;
};

export function SiteLogo({ showText = true, compact = false }: SiteLogoProps) {
  return (
    <Link href="/" className="flex items-center gap-1.5 group">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-sky-500/20 blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
        <Image
          src="/logo-physics.svg"
          alt="LearningPhysics"
          width={compact ? 56 : 64}
          height={compact ? 56 : 64}
          className="relative"
          priority
        />
      </div>
      {showText && (
        <span className="font-bold tracking-tight text-slate-100 text-lg sm:text-2xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
            LearningPhysics
          </span>
        </span>
      )}
    </Link>
  );
}

