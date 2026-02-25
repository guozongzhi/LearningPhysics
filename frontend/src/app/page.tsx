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
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      {/* Top Bar */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            ⚛ LeaningPhysics
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
                        relative p-4 rounded-xl border-2 text-left transition-all duration-200
                        hover:shadow-md cursor-pointer
                        ${isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-950/30"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                        }
                      `}
                    >
                      {/* Checkmark indicator */}
                      <div
                        className={`
                          absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                          transition-all duration-200
                          ${isSelected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300"
                          }
                        `}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      <div className="pr-8">
                        <div className="font-semibold mb-1">{topic.name}</div>
                        {topic.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {topic.description}
                          </div>
                        )}
                        <div className="mt-2">
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Level {topic.level}
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

        {/* Quiz Settings & Start */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Question Count */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  题目数量
                </span>
                <div className="flex items-center gap-1">
                  {[3, 5, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                        ${questionCount === n
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }
                      `}
                    >
                      {n} 题
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
                className="w-full sm:w-auto px-10 h-12 text-base font-medium"
              >
                {isLoading ? (
                  "正在生成题目..."
                ) : selectedTopics.size === 0 ? (
                  "请至少选择一个主题"
                ) : (
                  `开始测验 →`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
