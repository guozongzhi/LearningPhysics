"use client";

import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quiz-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api, authApi } from "@/lib/api";
import { SiteLogo } from "@/components/site-logo";

import { useAuthStore } from "@/store/auth-store";

type Topic = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  level: number;
  question_count: number;
};

export default function Home() {
  const router = useRouter();
  const { generateQuiz } = useQuizStore();
  const { isLoggedIn, username, token } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [questionCount, setQuestionCount] = useState(10);
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(true);
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
        const uniqueTopicsMap = new Map();
        data.forEach(topic => {
          if (!uniqueTopicsMap.has(topic.name)) {
            uniqueTopicsMap.set(topic.name, topic);
          }
        });
        const uniqueTopics = Array.from(uniqueTopicsMap.values());
        setTopics(uniqueTopics);
        setSelectedTopics(new Set(uniqueTopics.map((t: Topic) => t.id)));
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
    <div className="min-h-screen relative">
      {/* Top Bar — cosmic header */}
      <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SiteLogo compact />
            <span className="hidden sm:inline text-xs font-normal text-slate-400 tracking-wide">
              AI 驱动的物理练习
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {isLoggedIn && username && (
              <span className="text-xs text-slate-300">
                欢迎，<span className="font-medium text-sky-300">{username}</span>
              </span>
            )}
            {isLoggedIn ? (
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white">
                退出登录
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="border-sky-500/50 text-sky-300 hover:bg-sky-500/20">
                  <Link href="/login">登录</Link>
                </Button>
                <Button asChild size="sm" className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/25">
                  <Link href="/register">注册</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="relative text-center mb-10 sm:mb-14 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-cyan-500/5 rounded-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_55%)] rounded-2xl pointer-events-none" />
          <div className="relative py-8 sm:py-12 px-4">

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-100 mb-3 sm:mb-4">
              探索宇宙规律，从一道题开始
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8">
              选择你想练习的物理知识点，AI 将根据你的水平智能出题
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={handleStartQuiz}
                disabled={isLoading || selectedTopics.size === 0 || questionCount <= 0}
                size="lg"
                className="w-full sm:w-auto px-8 h-12 text-base font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/30 transition-all rounded-xl"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    生成中...
                  </>
                ) : selectedTopics.size === 0 ? (
                  "请至少选择一个主题"
                ) : questionCount <= 0 ? (
                  "输入有效题数"
                ) : (
                  "开始测评 →"
                )}
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-sky-500/50 text-sky-300 hover:bg-sky-500/20 rounded-xl">
                <Link href="#topics">查看主题</Link>
              </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.id);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`
                        relative p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-[2px] sm:backdrop-blur-none
                        ${isSelected
                          ? "border-sky-400 bg-sky-500/30 sm:bg-sky-500/20 shadow-lg shadow-sky-500/20"
                          : "border-slate-700/40 sm:border-slate-700 bg-slate-800/20 sm:bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800/80"
                        }
                      `}
                    >
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
                        <div className="mt-4 flex gap-2">
                          <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full ${isSelected ? "bg-sky-500/30 text-sky-100" : "bg-slate-700 text-slate-300"}`}>
                            Level {topic.level}
                          </span>
                          <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full ${isSelected ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-700/80 text-slate-400"}`}>
                            {topic.question_count || 0} 题
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiz Settings & Start — cosmic control bar */}
        <div className="sticky bottom-4 sm:bottom-6 z-20 mx-auto max-w-3xl">
          <Card className="bg-slate-900/90 border-sky-500/20 shadow-[0_0_40px_rgba(56,189,248,0.15)] backdrop-blur-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" />
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-300 whitespace-nowrap">题目数量</span>
                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    {[10, 20, 50].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setQuestionCount(n);
                          setIsCustomCount(false);
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer duration-200
                          ${questionCount === n && !isCustomCount
                            ? "bg-sky-500/30 text-sky-200 border border-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.3)]"
                            : "text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/80"
                          }
                        `}
                      >
                        {n}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 pl-1 pr-2">
                      <button
                        onClick={() => setIsCustomCount(true)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer duration-200
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
                          className="w-16 h-8 text-center bg-slate-900 border-slate-600 text-slate-200 focus-visible:ring-sky-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full sm:w-auto" />
                <Button
                  onClick={handleStartQuiz}
                  disabled={isLoading || selectedTopics.size === 0}
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 text-base font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/30 rounded-xl"
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
            <span>© 2025 LearningPhysics. All rights reserved.</span>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="text-slate-600">高中物理题库与智能测评</span>
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
