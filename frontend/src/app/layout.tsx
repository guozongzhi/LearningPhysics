"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { CosmicDecorations } from "@/components/cosmic-decorations";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthStore } from "@/store/auth-store";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LearningPhysics",
  description: "An AI-powered platform for learning high school physics.",
  icons: {
    icon: "/logo-physics.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn, username } = useAuthStore();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <CosmicDecorations />

          {/* User ID display - fixed on all pages */}
          {isLoggedIn && username && (
            <div className="fixed top-4 right-4 z-50 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-3 py-1.5 rounded-full text-xs text-slate-300 shadow-lg">
              👤 {username}
            </div>
          )}

          <div className="relative z-10">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
