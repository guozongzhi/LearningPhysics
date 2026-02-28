"use client";

import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quiz-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api, authApi } from "@/lib/api";

type Topic = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  level: number;
};

export default function Home() {
  const router = useRouter();
  const { generateQuiz } = useQuizStore();
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [questionCount, setQuestionCount] = useState(5);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check login status
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    setIsLoggedIn(!!token);

    // Fetch topics
    api.getTopics()
      .then((data: Topic[]) => {
        setTopics(data);
        // Select all by default
        setSelectedTopics(new Set(data.map((t: Topic) => t.id)));
      })
      .catch(console.error)
      .finally(() => setTopicsLoading(false));
  }, []);

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
    setIsLoggedIn(false);
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      {/* Top Bar */}
      <header className="border-b bg-white/60 backdrop-blur-md sticky top-0 z-10 dark:bg-gray-900/60 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
            ⚛ LearningPhysics
          </h1>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                退出登录
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">登录</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">注册</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            选择主题，开始测验
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            选择你想练习的物理知识点，AI 将根据你的水平智能出题
          </p>
        </div>

        {/* Topic Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">📚 知识主题</CardTitle>
            <CardDescription>
              选择一个或多个主题来生成测验（已选 {selectedTopics.size}/{topics.length}）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topicsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无可用主题
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.id);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`
                        relative p-5 rounded-2xl border-2 text-left transition-all duration-300
                        cursor-pointer overflow-hidden group
                        ${isSelected
                          ? "border-blue-600 bg-blue-100 shadow-md transform -translate-y-1 dark:bg-blue-900/60 dark:border-blue-400"
                          : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-500"
                        }
                      `}
                    >
                      {/* Checkmark indicator */}
                      <div
                        className={`
                          absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center
                          transition-all duration-300
                          ${isSelected
                            ? "border-blue-600 bg-blue-600 text-white scale-110 dark:border-blue-400 dark:bg-blue-500"
                            : "border-slate-300 bg-slate-50 text-transparent scale-90 group-hover:border-slate-400 dark:border-slate-600 dark:bg-slate-700"
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
                        <div className={`font-bold text-lg mb-1 leading-snug ${isSelected ? "text-blue-950 dark:text-blue-50" : "text-slate-800 dark:text-slate-100"}`}>
                          {topic.name}
                        </div>
                        {topic.description && (
                          <div className={`text-sm line-clamp-2 min-h-[2.5rem] mt-1 ${isSelected ? "text-blue-800 font-medium dark:text-blue-200" : "text-slate-600 dark:text-slate-300"}`}>
                            {topic.description}
                          </div>
                        )}
                        <div className="mt-4">
                          <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full tracking-wide ${isSelected ? "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100" : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"}`}>
                            Level {topic.level}
                          </span>
                        </div>
                      </div>

                      {/* Decorative background accent */}
                      <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-white/30 to-transparent dark:from-white/5 rounded-tl-full -z-10 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiz Settings & Start */}
        <div className="sticky bottom-6 z-20 mx-auto max-w-3xl">
          <Card className="shadow-2xl border-blue-100/50 dark:border-gray-800 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 overflow-hidden">
            {/* Top gradient line */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-cyan-400" />
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Question Count */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    题目数量
                  </span>
                  <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl">
                    {[3, 5, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuestionCount(n)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer duration-200
                          ${questionCount === n
                            ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          }
                        `}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Start Button */}
                <Button
                  onClick={handleStartQuiz}
                  disabled={isLoading || selectedTopics.size === 0}
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 text-base font-bold shadow-md hover:shadow-lg transition-all rounded-xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-cyan-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="relative text-white flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        生成中...
                      </>
                    ) : selectedTopics.size === 0 ? (
                      "请至少选择一个主题"
                    ) : (
                      <>开始智能测验 <span className="text-xl leading-none translate-y-[1px]">→</span></>
                    )}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
