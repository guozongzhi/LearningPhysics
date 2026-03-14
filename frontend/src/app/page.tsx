"use client";

import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quiz-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, authApi } from "@/lib/api";
import { SiteLogo } from "@/components/site-logo";
import { Rocket, Search, PencilLine, ArrowRight, Atom, Zap, Magnet, Activity, Orbit, Sparkles, Box, Microscope, Triangle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { motion, AnimatePresence } from "framer-motion";

const PhysicsMotifs = ({ id, isSelected, colorClass }: { id: number; isSelected?: boolean; colorClass: string }) => {
  // Constant SVG components for complex shapes
  const SaturnIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="5" />
      <path d="M2 12c0-3 5-6 10-6s10 3 10 6-5 6-10 6-10-3-10-6Z" />
    </svg>
  );

  const SlopeIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 20h18L12 4z" opacity="0.4" />
      <rect x="11" y="8" width="4" height="4" transform="rotate(30 13 10)" />
    </svg>
  );

  const SpringIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
      <path d="M4 14c2-4 4-4 6 0s4 4 6 0 4-4 6 0" transform="translate(0, -4)" />
    </svg>
  );

  const LensIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 4c4 4 4 12 0 16M16 4c-4 4-4 12 0 16" />
      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" opacity="0.5" />
    </svg>
  );

  const TelescopeIcon = Orbit; // Fallback

  // Pseudo-random selection and positioning based on ID
  const motifs = [
    { icon: Atom, label: null },
    { icon: Magnet, label: null },
    { icon: SaturnIcon, label: null },
    { icon: TelescopeIcon, label: null },
    { icon: Microscope, label: null },
    { icon: SlopeIcon, label: null },
    { icon: SpringIcon, label: null },
    { icon: LensIcon, label: null },
    { icon: Rocket, label: null },
    { icon: null, label: "E=mc²" },
    { icon: Orbit, label: null },
    { icon: Sparkles, label: null },
    { icon: Activity, label: null },
  ];

  const sectors = [
    "top-4 right-12",
    "bottom-10 left-12",
    "top-1/2 right-4 -translate-y-1/2",
    "bottom-4 right-20",
    "top-12 left-8",
  ];

  // Pick 4 unique indices based on id for more density
  const motifIndices = [(id * 7) % motifs.length, (id * 11 + 2) % motifs.length, (id * 13 + 5) % motifs.length, (id * 17 + 1) % motifs.length];
  const sectorIndices = [(id * 3) % sectors.length, (id * 5 + 1) % sectors.length, (id * 7 + 3) % sectors.length, (id * 2 + 4) % sectors.length];

  return (
    <>
      {motifIndices.map((mIdx, i) => {
        const motif = motifs[mIdx];
        const sector = sectors[sectorIndices[i]];
        const Icon = motif.icon;
        
        return (
          <motion.div
            key={`${id}-${i}`}
            animate={{ 
              y: [0, (i % 2 === 0 ? -10 : 10), 0], 
              x: [0, (i % 3 === 0 ? 6 : -6), 0],
              rotate: [0, (i % 2 === 0 ? 15 : -15), 0],
              opacity: isSelected ? [0.12, 0.22, 0.12] : [0.06, 0.12, 0.06]
            }}
            transition={{ 
              duration: 5 + (id % 5) + i, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.7
            }}
            className={`absolute ${sector} pointer-events-none transition-all duration-700 ${colorClass}`}
          >
            {Icon ? (
              <Icon className="w-10 h-10 sm:w-14 sm:h-14" />
            ) : (
              <span className="text-xl sm:text-2xl font-serif italic font-black select-none opacity-90 drop-shadow-sm">{motif.label}</span>
            )}
          </motion.div>
        );
      })}
    </>
  );
};

type Topic = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  level: number;
  question_count: number;
  difficulty_counts?: Record<string, number>;
};

export default function Home() {
  const router = useRouter();
  const { generateQuiz } = useQuizStore();
  const { isLoggedIn, username, token } = useAuthStore();
  const stepCardsRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [questionCount, setQuestionCount] = useState(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(true);

  // Auto-scroll step cards every 5 seconds
  useEffect(() => {
    const container = stepCardsRef.current;
    if (!container || window.innerWidth >= 640) return; // Only auto-scroll on mobile

    const cardWidth = container.offsetWidth * 0.8 + 16; // Card width (80vw) + gap (16px)
    let currentIndex = 0;
    const totalCards = 3;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % totalCards;
      container.scrollTo({
        left: currentIndex * cardWidth,
        behavior: "smooth"
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  const [lastQuizDate, setLastQuizDate] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.getLastQuizRecord()
        .then((data) => {
          if (data && data.last_quiz_at) {
            setLastQuizDate(data.last_quiz_at);
          }
        })
        .catch(console.error);
    }

    api.getTopics()
      .then((data: Topic[]) => {
        setTopics(data);
        setSelectedTopics(new Set(data.map((t: Topic) => t.id)));
      })
      .catch(console.error)
      .finally(() => setTopicsLoading(false));
  }, [token]);

  const toggleTopic = (id: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleStartQuiz = async () => {
    if (selectedTopics.size === 0) return;
    if (!isLoggedIn) {
      alert("请先登录，再生成测验！");
      router.push("/login");
      return;
    }

    setIsLoading(true);

    try {
      await generateQuiz(Array.from(selectedTopics), questionCount);
      const quizId = useQuizStore.getState().quizId;
      if (quizId) {
        router.push(`/quiz/${quizId}`);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        router.push("/login");
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleLogout = () => {
    authApi.logout();
    setLastQuizDate(null);
    router.refresh();
  };

  const formatDateBrief = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Top Bar — cosmic header */}
      <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <SiteLogo compact showText={false} />
            <span className="text-base sm:text-xl font-bold tracking-tight text-slate-100 truncate">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
                LearningPhysics
              </span>
            </span>
            <span className="hidden sm:inline text-xs font-normal text-slate-400 tracking-wide">
              AI 驱动的智能学习与共创
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {isLoggedIn && username && (
              <span className="hidden md:inline text-xs text-slate-300 max-w-[180px] truncate">
                欢迎，<span className="font-medium text-sky-300">{username}</span>
              </span>
            )}
            {isLoggedIn ? (
              <Button variant="outline" size="sm" onClick={handleLogout} className="h-9 px-3 sm:px-4 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white">
                退出登录
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="h-9 px-3 sm:px-4 border-sky-500/50 text-sky-300 hover:bg-sky-500/20">
                  <Link href="/login">登录</Link>
                </Button>
                <Button asChild size="sm" className="h-9 px-3 sm:px-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/25">
                  <Link href="/register">注册</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12 pb-28 sm:pb-12">
        {/* Hero Section */}
        <div className="relative text-center mb-2 sm:mb-4 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-500/5 rounded-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_55%)] rounded-2xl pointer-events-none" />
          <div className="relative py-3 sm:py-6 px-3 sm:px-4">

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-slate-100 mb-2 sm:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both ease-out">
              洞察物理本源，重塑深层学习场域
            </h2>
            <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto mb-5 sm:mb-8 leading-relaxed animate-in fade-in slide-in-from-bottom-4 delay-150 duration-700 fill-mode-both ease-out">
              由共创沉淀智慧，借 AI 实现进阶。在这场科学远征中，构建属于你的思维实验室。
            </p>
            <div className="mx-auto max-w-5xl w-full animate-in fade-in slide-in-from-bottom-5 delay-300 duration-1000 fill-mode-both ease-out px-4 sm:px-2">
              <div
                ref={stepCardsRef}
                className="flex flex-row items-center justify-start gap-4 sm:gap-6 sm:grid sm:grid-cols-3 sm:justify-center overflow-x-auto pb-8 sm:pb-0 sm:overflow-visible snap-x snap-mandatory sm:snap-none
                          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Step 01 */}
                <motion.div
                  initial={{ opacity: 0, x: -24, y: 12 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -12, scale: 1.05, zIndex: 50 }}
                  whileTap={{ scale: 0.98 }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.05)";
                    e.currentTarget.style.zIndex = "50";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "30";
                  }}
                  onTouchCancel={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "30";
                  }}
                  className="relative z-[30] flex-shrink-0 w-[80vw] sm:w-auto sm:flex-1 min-w-[260px] h-[240px] sm:h-auto flex -rotate-2 sm:rotate-0 snap-center touch-manipulation"
                  style={{ zIndex: 30 }}
                >
                  <SpotlightCard
                    spotlightColor="rgba(56, 189, 248, 0.2)"
                    className="flex-1 border-sky-500/10 sm:min-h-[220px] shadow-2xl sm:shadow-none bg-slate-900/25 sm:bg-slate-950/30 group/card overflow-hidden"
                    onClick={handleStartQuiz}
                  >
                    {/* Background Enrichment - Scattered Motifs */}
                    <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <PhysicsMotifs id={101} isSelected={true} colorClass="text-sky-400" />
                    <div className="absolute -right-4 -bottom-6 text-[100px] font-black text-white/[0.06] select-none pointer-events-none group-hover/card:text-sky-500/[0.1] transition-colors duration-700">01</div>
                    
                    <button
                      disabled={isLoading || selectedTopics.size === 0 || questionCount <= 0}
                      className="group relative w-full h-full text-left p-5 sm:p-6 text-slate-100 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[9px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">Step 01</div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-sky-500/20 blur-2xl rounded-full scale-125 animate-pulse pointer-events-none" />
                            <motion.div 
                              animate={isLoading ? { rotate: 360 } : {}}
                              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                              className="relative w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)] group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-300"
                            >
                              {isLoading ? (
                                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <Rocket className="w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-500" />
                              )}
                            </motion.div>
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-sky-500/40 vertical-rl tracking-widest hidden sm:block">CORE ENGINE</div>
                      </div>
                      <div>
                        <div className="text-lg sm:text-xl font-black leading-tight mb-1 tracking-tight group-hover:text-sky-300 transition-colors">{isLoading ? "生成中..." : "开始测评"}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400 text-xs sm:text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">快速定位知识盲区</div>
                          <ArrowRight className="w-3.5 h-3.5 text-sky-500/0 -translate-x-2 group-hover:text-sky-500/100 group-hover:translate-x-0 transition-all duration-300" />
                        </div>
                        <div className="mt-3 w-10 h-1 bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                      </div>
                    </button>
                  </SpotlightCard>
                </motion.div>

                {/* Step 02 */}
                <motion.div
                  initial={{ opacity: 0, x: -24, y: 12 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -12, scale: 1.05, zIndex: 50 }}
                  whileTap={{ scale: 0.98 }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.05)";
                    e.currentTarget.style.zIndex = "50";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "20";
                  }}
                  onTouchCancel={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "20";
                  }}
                  className="relative z-[20] flex-shrink-0 w-[80vw] sm:w-auto sm:flex-1 min-w-[260px] h-[240px] sm:h-auto flex rotate-0 snap-center touch-manipulation"
                  style={{ zIndex: 20 }}
                >
                  <SpotlightCard
                    spotlightColor="rgba(139, 92, 246, 0.18)"
                    className="flex-1 border-violet-500/10 sm:min-h-[220px] shadow-2xl sm:shadow-none bg-slate-900/25 sm:bg-slate-950/30 group/card overflow-hidden"
                    onClick={() => document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    {/* Background Enrichment - Scattered Motifs */}
                    <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <PhysicsMotifs id={102} isSelected={true} colorClass="text-violet-400" />
                    <div className="absolute -right-4 -bottom-6 text-[100px] font-black text-white/[0.06] select-none pointer-events-none group-hover/card:text-violet-500/[0.1] transition-colors duration-700">02</div>
                    
                    <button
                      className="group relative w-full h-full text-left p-5 sm:p-6 text-slate-100 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-[9px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">Step 02</div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-125 animate-pulse pointer-events-none" />
                            <div className="relative w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-300">
                              <Search className="w-6 h-6 group-hover:scale-125 transition-transform duration-500" />
                            </div>
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-violet-500/40 vertical-rl tracking-widest hidden sm:block">KNOWLEDGE BASE</div>
                      </div>
                      <div>
                        <div className="text-lg sm:text-xl font-black leading-tight mb-1 tracking-tight group-hover:text-violet-300 transition-colors">查看主题</div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400 text-xs sm:text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">探索全部核心知识</div>
                          <ArrowRight className="w-3.5 h-3.5 text-violet-500/0 -translate-x-2 group-hover:text-violet-500/100 group-hover:translate-x-0 transition-all duration-300" />
                        </div>
                        <div className="mt-3 w-10 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                      </div>
                    </button>
                  </SpotlightCard>
                </motion.div>

                {/* Step 03 */}
                <motion.div
                  initial={{ opacity: 0, x: -24, y: 12 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -12, scale: 1.05, zIndex: 50 }}
                  whileTap={{ scale: 0.98 }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.05)";
                    e.currentTarget.style.zIndex = "50";
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "10";
                  }}
                  onTouchCancel={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.zIndex = "10";
                  }}
                  className="relative z-[10] flex-shrink-0 w-[80vw] sm:w-auto sm:flex-1 min-w-[260px] h-[240px] sm:h-auto flex rotate-2 sm:rotate-0 snap-center touch-manipulation"
                  style={{ zIndex: 10 }}
                >
                  <SpotlightCard
                    spotlightColor="rgba(16, 185, 129, 0.18)"
                    className="flex-1 border-emerald-500/10 sm:min-h-[220px] shadow-2xl sm:shadow-none bg-slate-900/25 sm:bg-slate-950/30 group/card overflow-hidden"
                  >
                    {/* Background Enrichment - Scattered Motifs */}
                    <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <PhysicsMotifs id={103} isSelected={true} colorClass="text-emerald-400" />
                    <div className="absolute -right-4 -bottom-6 text-[100px] font-black text-white/[0.06] select-none pointer-events-none group-hover/card:text-emerald-500/[0.1] transition-colors duration-700">03</div>
                    
                    <Link href="/notes" className="group relative block w-full h-full text-left p-5 sm:p-6 text-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">Step 03</div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-125 animate-pulse pointer-events-none" />
                            <div className="relative w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                              <PencilLine className="w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-emerald-500/40 vertical-rl tracking-widest hidden sm:block">LAB VENTURE</div>
                      </div>
                      <div>
                        <div className="text-lg sm:text-xl font-black leading-tight mb-1 tracking-tight group-hover:text-emerald-300 transition-colors">主题共创</div>
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400 text-xs sm:text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">与社区共同创作</div>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500/0 -translate-x-2 group-hover:text-emerald-500/100 group-hover:translate-x-0 transition-all duration-300" />
                        </div>
                        <div className="mt-3 w-10 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      </div>
                    </Link>
                  </SpotlightCard>
                </motion.div>
              </div>

              {/* Mobile swipe hint */}
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs sm:hidden mt-2 animate-pulse">
                <span>左右滑动查看更多</span>
                <motion.div
                  animate={{ x: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* User summary card (only when logged in) */}
        {isLoggedIn && (
          <Card className="mb-8 bg-slate-900/80 border-slate-700/60 shadow-lg shadow-black/30">
            <CardHeader className="py-4 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg text-slate-100 flex items-center gap-2">
                <span>👤 学习概览</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                快速查看你的身份信息和最近一次练习时间
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 px-4 sm:px-6 pb-4 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-slate-400 w-14 sm:w-16">姓名</span>
                <span className="text-slate-100 font-medium">{username || "已登录用户"}</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-slate-400 w-20 sm:w-24">上次答题时间</span>
                <span className="text-slate-100 font-medium">
                  {lastQuizDate ? formatDateBrief(lastQuizDate) : "暂无记录"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Selection */}
        <Card id="topics" className="mb-8 bg-slate-900/70 border-slate-700/60 backdrop-blur shadow-xl shadow-black/20">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">📚 知识主题</CardTitle>
            <CardDescription className="text-slate-400">
              选择一个或多个主题来生成测验（已选 {selectedTopics.size}/{topics.length}）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topicsLoading ? (
              <div className="text-center py-12 text-slate-400">加载中...</div>
            ) : topics.length === 0 ? (
              <div className="text-center py-12 text-slate-400">暂无可用主题</div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
                          sm:overflow-visible overflow-x-auto pb-4 sm:pb-0
                          snap-x snap-mandatory sm:snap-none
                          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                {topics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.id);
                  return (
                    <motion.button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{
                        y: -5,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                        borderColor: isSelected ? "rgb(56, 189, 248)" : "rgb(71, 85, 105)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      animate={isSelected ? {
                        boxShadow: ["0 10px 25px -5px rgba(56, 189, 248, 0.2)", "0 10px 30px -5px rgba(56, 189, 248, 0.4)", "0 10px 25px -5px rgba(56, 189, 248, 0.2)"],
                      } : {}}
                      transition={isSelected ? {
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      } : {}}
                      className={`
                        relative p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-[2px] sm:backdrop-blur-none
                        w-[85vw] sm:w-auto flex-shrink-0 sm:flex-shrink snap-center touch-manipulation
                        ${isSelected
                          ? "border-sky-400 bg-gradient-to-br from-sky-500/30 via-sky-500/20 to-sky-600/20 shadow-lg shadow-sky-500/30"
                          : "border-slate-700/40 sm:border-slate-700 bg-gradient-to-br from-slate-800/30 via-slate-800/20 to-slate-900/30 hover:from-slate-800/50 hover:via-slate-800/40 hover:to-slate-900/50"
                        }
                      `}
                    >
                      {/* Background Aesthetics - Scattered Motifs */}
                      <div className={`absolute inset-0 opacity-[0.05] pointer-events-none transition-opacity duration-500 ${isSelected ? 'opacity-[0.1]' : 'opacity-[0.05]'}`}
                           style={{ backgroundImage: `radial-gradient(${isSelected ? '#38bdf8' : '#475569'} 1px, transparent 1px)`, backgroundSize: '16px 16px' }} 
                      />
                      
                      <PhysicsMotifs id={topic.id} isSelected={isSelected} colorClass={isSelected ? 'text-sky-300' : 'text-slate-500'} />

                      <div className="relative z-10">
                        <div
                          className={`
                            absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${isSelected
                              ? "border-sky-400 bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                              : "border-slate-500 bg-slate-800/80"
                            }
                          `}
                        >
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        <div className="pr-10 relative z-10">
                          <div className={`font-bold text-lg mb-1 leading-snug ${isSelected ? "text-sky-100" : "text-slate-200"}`}>
                            {topic.name}
                          </div>
                          {topic.description && (
                            <div className={`text-sm line-clamp-2 min-h-[2.5rem] mt-1 ${isSelected ? "text-sky-200/90" : "text-slate-400"}`}>
                              {topic.description}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {topic.difficulty_counts && Object.keys(topic.difficulty_counts).length > 0 ? (
                              Object.entries(topic.difficulty_counts)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([difficulty, count]) => (
                                  <span
                                    key={difficulty}
                                    className={`inline-flex items-center text-xs font-bold px-2 py-1 rounded-full ${isSelected ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-700/80 text-slate-400"}`}
                                    title={`难度 ${difficulty}`}
                                  >
                                    难度{difficulty}: {count}题
                                  </span>
                                ))
                            ) : (
                              <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full ${isSelected ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-700/80 text-slate-400"}`}>
                                {topic.question_count || 0} 题
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Quiz Settings & Start — cosmic control bar */}
        <div className="sticky bottom-2 sm:bottom-6 z-20 mx-auto max-w-3xl">
          <Card className="bg-slate-900/90 border-sky-500/20 shadow-[0_0_40px_rgba(56,189,248,0.15)] backdrop-blur-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" />
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-semibold text-slate-300 whitespace-nowrap">题目数量</span>
                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 w-full sm:w-auto overflow-x-auto">
                    {[10, 20, 50].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setQuestionCount(n);
                          setIsCustomCount(false);
                        }}
                        className={`
                          px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer duration-200 whitespace-nowrap
                          ${questionCount === n && !isCustomCount
                            ? "bg-sky-500/30 text-sky-200 border border-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.3)]"
                            : "text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/80"
                          }
                        `}
                      >
                        {n}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 pl-1 pr-1 sm:pr-2">
                      <button
                        onClick={() => setIsCustomCount(true)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer duration-200 whitespace-nowrap
                          ${isCustomCount
                            ? "bg-sky-500/30 text-sky-200 border border-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.3)]"
                            : "text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-700/80"
                          }
                        `}
                      >
                        自定义
                      </button>
                      {isCustomCount && (
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          value={questionCount || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setQuestionCount(isNaN(val) ? 0 : val);
                          }}
                          className="w-14 sm:w-16 h-8 text-center bg-slate-900 border-slate-600 text-slate-200 focus-visible:ring-sky-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 hidden sm:block" />
                <Button
                  onClick={handleStartQuiz}
                  disabled={isLoading || selectedTopics.size === 0}
                  size="lg"
                  className="w-full sm:w-auto px-5 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/30 rounded-xl"
                >
                  {isLoading ? "生成中..." : selectedTopics.size === 0 ? "请至少选择一个主题" : "开始智能测验 →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer — copyright */}
      <footer className="border-t border-slate-800 bg-slate-950/90 py-6 mt-4">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <span>© 2026 LearningPhysics. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="text-slate-600">高中物理智能学习与主题共创平台</span>
          </div>

          {/* Powered by AI Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/60 shadow-inner group transition-colors hover:border-sky-500/50">
            {/* Doubao Avatar */}
            <img
              src="https://unpkg.com/@lobehub/icons-static-png@1.83.0/dark/doubao.png"
              alt="Doubao"
              className="w-5 h-5 rounded-full object-cover drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            />
            <span className="text-xs font-medium text-slate-400">
              Powered by <span className="text-sky-300 font-bold tracking-wide group-hover:text-sky-200 transition-colors">豆包大模型</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
