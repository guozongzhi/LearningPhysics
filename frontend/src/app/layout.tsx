import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { CosmicDecorations } from "@/components/cosmic-decorations";
import { ThemeProvider } from "@/components/theme-provider";

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
          <div className="relative z-10">
            {children}
          </div>
          <div className="fixed bottom-2 right-3 z-50 flex items-center gap-2 text-[10px] text-slate-500/50 pointer-events-none font-mono">
            <span>{process.env.NEXT_PUBLIC_APP_VERSION ? `v${process.env.NEXT_PUBLIC_APP_VERSION}` : "local"}</span>
            <span>{process.env.NEXT_PUBLIC_BUILD_TIME || "dev mode"}</span>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
