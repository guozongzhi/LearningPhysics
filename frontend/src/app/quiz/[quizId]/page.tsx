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
    <main className="min-h-screen bg-[#050505] text-slate-100 flex flex-col">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col p-4 sm:p-6 md:p-10 relative">
        {/* Decorative subtle glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-32 opacity-20 blur-[100px]">
          <div className="mx-auto max-w-4xl h-full bg-sky-500 rounded-full" />
        </div>

        {/* Progress Header - Simplified */}
        <div className="mb-8 relative z-10">
          <div className="flex justify-between items-end mb-3">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-sky-500/80">Question Analysis</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">{String(currentQuestionIndex + 1).padStart(2, '0')} <span className="text-slate-600 text-lg">/ {questions.length}</span></span>
                <div className="h-4 w-px bg-slate-800" />
                <span className="text-xs font-bold text-slate-400">已作答 {Object.keys(answers).filter((k) => answers[k]).length} 题</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Elapsed Time</div>
              <div className="text-xl font-mono font-bold text-sky-400">{formatTime(elapsedSeconds)}</div>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(14,165,233,0.5)]"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 flex-1">
          {/* Left: Question Card - Professional Focus */}
          <div className="lg:col-span-7 flex flex-col min-h-0">
            <Card className="bg-white/[0.02] border-white/[0.05] shadow-2xl rounded-3xl h-full flex flex-col relative overflow-hidden group transition-all hover:bg-white/[0.03]">
              <CardHeader className="pb-4 border-b border-white/[0.03]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest">物理命题内容</CardTitle>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 uppercase tracking-tighter">
                    Lv {currentQuestion.difficulty || "3"} Physical
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-8 flex-1 overflow-y-auto">
                <div className="text-lg sm:text-xl font-medium leading-[1.6] text-slate-200">
                  <Latex>{currentQuestion.content_latex}</Latex>
                </div>
                {currentQuestion.image_url && (
                  <div className="mt-8 relative group/img">
                    <div className="absolute inset-0 bg-sky-500/10 blur-xl opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    <img
                      src={currentQuestion.image_url}
                      alt="题目示意图"
                      className="relative z-10 max-w-full rounded-2xl border border-white/5 max-h-72 w-full object-contain bg-black/20 p-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Answer Interaction Area */}
          <div className="lg:col-span-5 flex flex-col min-h-0">
            <Card className="bg-transparent border-none shadow-none flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">交互答题区</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {currentQuestion.question_type === "MULTIPLE_CHOICE"
                    ? "请选择所有符合物理规律的选项。"
                    : currentQuestion.question_type === "TRUE_FALSE"
                      ? "基于物理定律判断陈述的正误。"
                      : (currentQuestion.question_type === "CHOICE" || currentQuestion.question_type === "SINGLE_CHOICE")
                        ? "选择一个最科学的解释或结论。"
                        : currentQuestion.question_type === "BLANK"
                          ? "在下方输入经过推导的准确结果。"
                          : "写出最终数值并务必附带法定计量单位。"}
                </p>
              </div>

              <div className="flex-1 space-y-4">
                {(currentQuestion.question_type === "CHOICE" || currentQuestion.question_type === "SINGLE_CHOICE" || currentQuestion.question_type === "MULTIPLE_CHOICE") ? (
                  <div className="grid grid-cols-1 gap-2.5">
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
                          if (currentQuestionIndex < questions.length - 1) {
                            setTimeout(nextQuestion, 600);
                          }
                        }
                      };

                      return (
                        <Button
                          key={option.label}
                          variant="ghost"
                          onClick={handleToggle}
                          className={`h-auto min-h-[3.5rem] justify-start text-left px-5 py-4 rounded-2xl transition-all duration-300 border ${isSelected
                            ? "bg-sky-500/10 border-sky-500/40 text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
                            : "bg-white/[0.03] border-white/[0.05] text-slate-400 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-slate-200"
                            }`}
                        >
                          <div className="flex items-center gap-5 w-full">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${isSelected
                              ? "bg-sky-500 text-slate-950"
                              : "bg-slate-800 text-slate-500"
                              }`}>
                              {option.label}
                            </div>
                            <div className="flex-1 text-base font-medium leading-tight">
                              <Latex>{option.text}</Latex>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
                      { label: "true", text: "正确", icon: "✓", color: "emerald", activeClass: "bg-emerald-500/10 border-emerald-500/40 text-emerald-200" },
                      { label: "false", text: "错误", icon: "✕", color: "rose", activeClass: "bg-rose-500/10 border-rose-500/40 text-rose-200" }
                    ].map((opt) => {
                      const isSelected = studentAnswer.toLowerCase() === opt.label;
                      return (
                        <Button
                          key={opt.label}
                          variant="ghost"
                          onClick={() => {
                            setAnswer(currentQuestion.id, opt.label);
                            if (currentQuestionIndex < questions.length - 1) {
                              setTimeout(nextQuestion, 600);
                            }
                          }}
                          className={`h-32 flex-col gap-3 rounded-3xl border transition-all duration-300 ${isSelected
                            ? opt.activeClass
                            : "bg-white/[0.03] border-white/[0.05] text-slate-500 hover:bg-white/[0.06] hover:border-white/[0.1] hover:text-slate-300"
                            }`}
                        >
                          <span className="text-3xl font-black">{opt.icon}</span>
                          <span className="font-black text-sm tracking-widest uppercase">{opt.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500" />
                    <Input
                      type="text"
                      placeholder={currentQuestion.question_type === "BLANK" ? "输入经过推导的答案..." : "例如: 15 m/s"}
                      value={studentAnswer}
                      onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && currentQuestionIndex < questions.length - 1) {
                          nextQuestion();
                        }
                      }}
                      className="h-16 text-xl bg-white/[0.03] border-white/[0.08] rounded-2xl text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:border-sky-500/50 transition-all font-medium px-6"
                    />
                  </div>
                )}

                {/* Simplified Knowledge Fact - Bottom anchor */}
                <div className="pt-6 mt-4 flex items-center gap-3 border-t border-white/[0.03]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs animate-pulse text-sky-500">
                    ✨
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic font-medium">
                    {physicsFacts[factIndex]}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Footer - Cinematic Alignment */}
        <div className="mt-12 flex items-center justify-between border-t border-white/[0.03] pt-8">
          <Button
            disabled={currentQuestionIndex === 0}
            onClick={prevQuestion}
            variant="ghost"
            className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            <span className="mr-2">←</span> Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((q: { id: string }, i: number) => (
              <div
                key={q.id}
                className={`h-1 rounded-full transition-all duration-500 ${i === currentQuestionIndex
                  ? "w-8 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]"
                  : answers[q.id]
                    ? "w-2 bg-emerald-500/40"
                    : "w-2 bg-slate-800"
                  }`}
              />
            ))}
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={nextQuestion}
              variant="ghost"
              className="text-xs font-black uppercase tracking-widest text-sky-500 hover:text-sky-400 transition-colors"
            >
              Next <span className="ml-2">→</span>
            </Button>
          ) : (
            <Button
              onClick={handleSubmitWithTime}
              disabled={Object.keys(answers).filter((k) => answers[k]).length === 0}
              className="relative group h-12 px-8 rounded-2xl bg-white text-slate-950 font-black text-sm uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Submit Analysis</span>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
