import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { CosmicDecorations } from "@/components/cosmic-decorations";

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
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          fontSans.variable
        )}
      >
        <CosmicDecorations />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
