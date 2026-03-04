"use client";

import { useEffect, use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Latex } from "@/components/latex";
import { useQuizStore } from "@/store/quiz-store";

export default function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const {
    status,
    questions,
    answers,
    currentQuestionIndex,
    startedAt,
    gradingProgress,
    setAnswer,
    nextQuestion,
    prevQuestion,
    submitQuiz,
  } = useQuizStore();

  const [username, setUsername] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("username");
      if (storedName) setUsername(storedName);
    }
  }, []);

  useEffect(() => {
    if (status === "idle") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "finished") {
      router.push(`/quiz/report/${quizId}`);
    }
  }, [status, router, quizId]);

  const [factIndex, setFactIndex] = useState(0);
  const physicsFacts = [
    "你知道吗？光从太阳到达地球需要约 8 分 20 秒。",
    "在宇宙中，不存在绝对静止的物体。",
    "水在失重环境下会因为表面张力变成完美的球体。",
    "量子纠缠被爱因斯坦称为“鬼魅般的超距作用”。",
    "如果没有空气阻力，一根羽毛和一个保龄球会同时落地。",
    "中子星的密度极大，一茶匙中子星物质重约 10 亿吨。",
    "宇宙的温度仅仅比绝对零度高约 2.7 度。",
    "时间在强引力场中会流逝得更慢，这被称为引力时间膨胀。",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "submitting" || status === "in-progress") {
      interval = setInterval(() => {
        setFactIndex((prev: number) => (prev + 1) % physicsFacts.length);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, physicsFacts.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight" && currentQuestionIndex < questions.length - 1) {
        nextQuestion();
      } else if (e.key === "ArrowLeft" && currentQuestionIndex > 0) {
        prevQuestion();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestionIndex, questions.length, nextQuestion, prevQuestion]);

  // Update elapsed time based on startedAt from store
  useEffect(() => {
    if (status !== "in-progress" || !startedAt) return;
    const update = () => {
      const diff = Date.now() - startedAt;
      setElapsedSeconds(Math.max(0, Math.floor(diff / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status, startedAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
          <div className="absolute inset-0 border-4 border-sky-500 rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
        </div>
        <p className="text-lg font-medium text-slate-300">正在生成题目...</p>
        <p className="text-sm text-slate-500 mt-2">AI 正在为你挑选题目</p>
      </div>
    );
  }

  if (status === "submitting" || status === "finished") {
    const progressPercent = gradingProgress && gradingProgress.total > 0
      ? Math.round((gradingProgress.progress / gradingProgress.total) * 100)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-4">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-slate-700/50 rounded-full" />
          <div className="absolute inset-0 border-4 border-sky-400 rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 mb-2">AI 智能评分中</h2>

        <div className="w-full max-w-sm mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>评分进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-center mt-3 text-sm text-sky-400 font-medium">
            {!gradingProgress ? '准备中...' :
              gradingProgress.status === 'analyzing' && gradingProgress.currentIndex !== undefined ? `正在分析第 ${gradingProgress.currentIndex + 1} 题...` :
                gradingProgress.status === 'summarizing' ? '总结整体情况中，请稍等...' :
                  `已完成 ${gradingProgress.progress} / ${gradingProgress.total} 题`}
          </div>
        </div>

        <div className="text-center max-w-md min-h-[4rem]">
          <span className="block mb-2 text-sm text-sky-400/80 font-medium transition-opacity duration-500">
            {physicsFacts[factIndex]}
          </span>
        </div>
      </div>
    );
  }

  if (status !== "in-progress" || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-300">
        <p className="text-slate-400">无法加载测验，请尝试重新生成。</p>
        <Button onClick={() => router.push("/")} className="mt-4 bg-sky-500 hover:bg-sky-600 text-slate-950">
          返回首页
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const studentAnswer = answers[currentQuestion.id] || "";

  const handleSubmitWithTime = async () => {
    if (typeof window !== "undefined" && startedAt) {
      const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      localStorage.setItem("lastQuizSeconds", totalSeconds.toString());
    }
    await submitQuiz();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">
        {/* Decorative glow behind top bar */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-24 opacity-40 blur-3xl">
          <div className="mx-auto max-w-3xl h-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-sky-500/20 rounded-full" />
        </div>

        {/* Progress bar — cosmic style + name & timer */}
        <div className="mb-4 sm:mb-6 relative z-10">
          <div className="flex justify-between items-start gap-4 text-xs sm:text-sm text-slate-400 mb-2">
            <div className="flex flex-col">
              <span>第 {currentQuestionIndex + 1} / {questions.length} 题</span>
              <span className="mt-0.5">已作答 {Object.keys(answers).filter((k) => answers[k]).length} / {questions.length}</span>
            </div>
            <div className="flex flex-col items-end">
              {username && (
                <span className="text-slate-300">
                  姓名：<span className="font-medium text-sky-300">{username}</span>
                </span>
              )}
              <span className="mt-0.5">
                用时：<span className="font-mono text-sky-300">{formatTime(elapsedSeconds)}</span>
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8 flex-1">
          {/* Left: Question */}
          <div className="mb-6 md:mb-0">
            <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20 h-full flex flex-col relative overflow-hidden">
              {/* Decorative Watermark - Atom */}
              <div className="absolute -right-16 -top-16 w-64 h-64 opacity-[0.03] pointer-events-none text-sky-100">
                <svg viewBox="0 0 100 100" className="w-full h-full animate-orbit-slow" fill="currentColor">
                  <circle cx="50" cy="50" r="8" />
                  <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(30 50 50)" />
                  <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-30 50 50)" />
                  <ellipse cx="50" cy="50" rx="16" ry="42" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(90 50 50)" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <CardTitle className="text-lg text-slate-100">题目</CardTitle>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    难度: {currentQuestion.difficulty || "未知"}
                  </span>
                </div>
                <CardDescription className="text-slate-400">请仔细阅读题目并作答。</CardDescription>
              </CardHeader>
              <CardContent className="text-lg leading-relaxed text-slate-200 flex-1">
                <Latex>{currentQuestion.content_latex}</Latex>
                {currentQuestion.image_url && (
                  <div className="mt-4">
                    <img
                      src={currentQuestion.image_url}
                      alt="题目示意图"
                      className="max-w-full rounded-lg border border-slate-700 max-h-64 object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Answer */}
          <div className="flex flex-col">
            <Card className="bg-slate-900/70 border-slate-700/60 shadow-xl shadow-black/20 flex-1 flex flex-col relative overflow-hidden">
              {/* Decorative Watermark - Wave */}
              <div className="absolute -left-12 -bottom-10 w-64 h-40 opacity-[0.04] pointer-events-none text-cyan-200">
                <svg viewBox="0 0 100 50" className="w-full h-full animate-wave-drift">
                  <path d="M0 25 Q25 0 50 25 T100 25" fill="none" stroke="currentColor" strokeWidth="4" />
                  <path d="M0 25 Q25 50 50 25 T100 25" fill="none" stroke="currentColor" strokeWidth="4" opacity="0.5" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-lg text-slate-100">你的答案</CardTitle>
                <CardDescription className="text-slate-400">
                  {currentQuestion.question_type === "MULTIPLE_CHOICE"
                    ? "请选择所有正确选项。"
                    : currentQuestion.question_type === "TRUE_FALSE"
                      ? "请判断正误。"
                      : (currentQuestion.question_type === "CHOICE" || currentQuestion.question_type === "SINGLE_CHOICE")
                        ? "请选择一个最符合题意的选项。"
                        : currentQuestion.question_type === "BLANK"
                          ? "请在下方填入正确答案。"
                          : "对于计算题，请写出最终数值和单位。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(currentQuestion.question_type === "CHOICE" || currentQuestion.question_type === "SINGLE_CHOICE" || currentQuestion.question_type === "MULTIPLE_CHOICE") ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.answer_schema?.options?.map((option: any) => {
                      const isSelected = currentQuestion.question_type === "MULTIPLE_CHOICE"
                        ? studentAnswer.split(',').includes(option.label)
                        : studentAnswer === option.label;

                      const handleToggle = () => {
                        if (currentQuestion.question_type === "MULTIPLE_CHOICE") {
                          const currentSelected = studentAnswer ? studentAnswer.split(',') : [];
                          const newSelected = currentSelected.includes(option.label)
                            ? currentSelected.filter(l => l !== option.label)
                            : [...currentSelected, option.label].sort();
                          setAnswer(currentQuestion.id, newSelected.join(','));
                        } else {
                          setAnswer(currentQuestion.id, option.label);
                          // Auto-advance for single choice
                          if (currentQuestionIndex < questions.length - 1) {
                            setTimeout(nextQuestion, 600);
                          }
                        }
                      };

                      return (
                        <Button
                          key={option.label}
                          variant="outline"
                          onClick={handleToggle}
                          className={`h-auto min-h-[3rem] justify-start text-left px-4 py-3 relative overflow-hidden transition-all duration-200 border-slate-700 ${isSelected
                            ? "bg-sky-500/10 border-sky-500/50 text-sky-200 ring-1 ring-sky-500/30"
                            : "bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:border-slate-600"
                            }`}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border ${isSelected
                              ? "bg-sky-500 text-slate-950 border-sky-400"
                              : "bg-slate-700 text-slate-400 border-slate-600"
                              }`}>
                              {option.label}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm sm:text-base mb-1">
                                <Latex>{option.text}</Latex>
                              </div>
                              {option.image_url && (
                                <img
                                  src={option.image_url}
                                  alt={`选项 ${option.label}`}
                                  className="mt-2 max-h-32 rounded border border-slate-700"
                                />
                              )}
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0 text-sky-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ) : currentQuestion.question_type === "TRUE_FALSE" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "true", text: "正确", icon: "✓", color: "emerald" },
                      { label: "false", text: "错误", icon: "✕", color: "rose" }
                    ].map((opt) => {
                      const isSelected = studentAnswer.toLowerCase() === opt.label;
                      return (
                        <Button
                          key={opt.label}
                          variant="outline"
                          onClick={() => {
                            setAnswer(currentQuestion.id, opt.label);
                            // Auto-advance for true/false
                            if (currentQuestionIndex < questions.length - 1) {
                              setTimeout(nextQuestion, 600);
                            }
                          }}
                          className={`h-24 flex-col gap-2 border-2 transition-all duration-300 ${isSelected
                            ? opt.label === "true"
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300"
                              : "bg-rose-500/10 border-rose-500/50 text-rose-300"
                            : "bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800/80 hover:border-slate-600"
                            }`}
                        >
                          <span className={`text-2xl font-bold ${isSelected ? "" : "opacity-50"}`}>{opt.icon}</span>
                          <span className="font-bold text-lg">{opt.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <Input
                    type="text"
                    placeholder={currentQuestion.question_type === "BLANK" ? "输入答案..." : "例如: 15 m/s"}
                    value={studentAnswer}
                    onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                    className="text-lg bg-slate-800/80 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:ring-sky-500 focus-visible:border-sky-500"
                  />
                )}
                {/* Small rotating physics fact to enrich UI */}
                <div className="mt-2 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-sky-400/80 text-base leading-none">✦</span>
                  <p className="leading-relaxed">{physicsFacts[factIndex]}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation — fixed feel at bottom on mobile */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4">
          <Button
            disabled={currentQuestionIndex === 0}
            onClick={prevQuestion}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            上一题
          </Button>

          <div className="flex gap-1.5 flex-wrap justify-center">
            {questions.map((q: { id: string }, i: number) => (
              <div
                key={q.id}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${i === currentQuestionIndex
                  ? "bg-sky-400 scale-125 shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                  : answers[q.id]
                    ? "bg-emerald-400/80"
                    : "bg-slate-600"
                  }`}
              />
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-500 font-medium tracking-wider uppercase">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">← / →</span>
              <span>切换题目</span>
            </div>
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={nextQuestion}
              variant="outline"
              className="border-sky-500/50 text-sky-300 hover:bg-sky-500/20"
            >
              下一题
            </Button>
          ) : (
            <Button
              onClick={handleSubmitWithTime}
              disabled={Object.keys(answers).filter((k) => answers[k]).length === 0}
              className="bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/25"
            >
              提交并查看分析报告
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
