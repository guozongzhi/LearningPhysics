"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Latex } from "@/components/latex";
import { useQuizStore } from "@/store/quiz-store";

export default function QuizReportPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const { status, questions, answers, report, reset } = useQuizStore();

  useEffect(() => {
    if (status === "idle") {
      router.push("/");
    }
  }, [status, router]);

  if (status !== "finished" || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-300">
        <p className="text-slate-400 mb-4">报告加载中或暂无数据...</p>
        <Button onClick={() => router.push("/")} className="bg-sky-500 hover:bg-sky-600 text-slate-950">
          返回首页
        </Button>
      </div>
    );
  }

  const handleFinish = () => {
    reset();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#050505] text-slate-100 flex flex-col items-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-sky-900/20 to-transparent pointer-events-none" />
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 p-6 sm:p-10 md:p-12">
        {/* Header Section - Refined */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black tracking-[0.2em] uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
              </span>
              Analysis
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white/90">
              学习分析报告
            </h1>
            <p className="text-slate-500 text-base font-medium">深度推演与学情画像</p>
          </div>
          <div className="relative group">
            <div className="absolute inset-x-0 -bottom-2 h-8 bg-sky-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="relative flex flex-col items-end">
              <div className="text-5xl md:text-6xl font-black text-white leading-none flex items-baseline gap-1">
                {Math.round(report.total_score)}
                <span className="text-xl text-slate-600 font-bold uppercase tracking-tighter">pts</span>
              </div>
              <p className="text-sky-500/60 font-black text-[10px] mt-1.5 uppercase tracking-[0.25em]">Score Achievement</p>
            </div>
          </div>
        </div>

        {/* AI Summary Card - Cleaner Glassmorphism */}
        <div className="relative mb-14">
          <Card className="relative bg-white/[0.02] backdrop-blur-md border-white/[0.06] rounded-3xl shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50" />
            <CardHeader className="pb-0 flex flex-row items-center gap-3.5 pt-7 px-8">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-xl shadow-lg">
                🤖
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white/90 tracking-tight">AI 综合学情评价</CardTitle>
                <CardDescription className="text-slate-600 font-bold text-[9px] uppercase tracking-widest">Logic Generation Engine</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5 pb-8 px-8">
              <div className="relative pl-5 border-l border-white/5">
                <p className="text-slate-400 text-base leading-relaxed font-medium italic">
                  "{report.overall_summary || "本次测验表现良好，展现了扎实的基础知识与严谨的逻辑推理。"}"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg font-black text-slate-500 mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
          <span className="w-6 h-px bg-slate-800" />
          知识点解析
          <span className="text-[10px] bg-slate-900 border border-white/5 text-slate-500 px-2 py-0.5 rounded font-mono lowercase tracking-normal italic">{questions.length} items</span>
        </h2>

        {/* Question Cards List */}
        <div className="space-y-12">
          {questions.map((q, idx) => {
            const analysis = report.analysis[q.id];
            const studentInput = answers[q.id] || "未作答";
            const isCorrect = analysis?.is_correct;

            return (
              <div key={q.id} className="relative group">
                {/* Vertical Indicator Line */}
                <div className="absolute -left-5 top-0 h-full w-px bg-slate-900 group-hover:bg-slate-800 transition-colors" />
                <div className={`absolute -left-[22px] top-6 w-[3px] h-8 rounded-full transition-all duration-300 ${isCorrect ? "bg-emerald-500/80" : "bg-rose-500/80"}`} />

                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="p-0 mb-5">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Question</span>
                        <span className="text-xl font-black text-white/90">{String(idx + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                          Difficulty {q.difficulty || "3"}
                        </span>
                        <div className={`px-3 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border ${isCorrect
                          ? "bg-emerald-500/5 text-emerald-500/70 border-emerald-500/10"
                          : "bg-rose-500/5 text-rose-500/70 border-rose-500/10"
                          }`}>
                          {isCorrect ? "Parsed Correct" : "Error Logged"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-6 sm:p-7 group-hover:bg-white/[0.02] transition-colors">
                      <div className="text-slate-300 text-lg leading-relaxed mb-4">
                        <Latex>{q.content_latex}</Latex>
                      </div>
                      {q.image_url && (
                        <div className="relative rounded-xl overflow-hidden border border-white/5 bg-black/20 mt-4">
                          <img src={q.image_url} alt="题目配图" className="max-h-56 mx-auto object-contain p-2" />
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 space-y-8">
                    {/* Compact Answer Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                        <p className="text-[9px] text-slate-600 font-black mb-2 uppercase tracking-widest">你的答案</p>
                        <div className={`text-base font-bold ${isCorrect ? "text-emerald-500/90" : "text-rose-500/90"}`}>
                          {q.question_type === "TRUE_FALSE"
                            ? (studentInput === "true" ? "正确" : studentInput === "false" ? "错误" : studentInput)
                            : studentInput || "未填"}
                        </div>
                      </div>

                      {analysis?.correct_answer_display && q.question_type !== "CHOICE" && q.question_type !== "SINGLE_CHOICE" && q.question_type !== "MULTIPLE_CHOICE" && (
                        <div className="p-5 rounded-2xl bg-emerald-500/[0.01] border border-emerald-500/5">
                          <p className="text-[9px] text-emerald-500/50 font-black mb-2 uppercase tracking-widest">标准参照</p>
                          <div className="text-base font-bold text-emerald-500/70">
                            {q.question_type === "BLANK" ? (
                              <Latex>{analysis.correct_answer_display}</Latex>
                            ) : (
                              analysis.correct_answer_display
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Options Breakdown - Clean Grid */}
                    {(q.question_type === "CHOICE" || q.question_type === "SINGLE_CHOICE" || q.question_type === "MULTIPLE_CHOICE") && q.answer_schema?.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.answer_schema.options.map((opt: any) => {
                          const isCorrectOption = q.question_type === "MULTIPLE_CHOICE"
                            ? (analysis?.correct_answer_display?.split(",").map((s: string) => s.trim()).includes(opt.label))
                            : (analysis?.correct_answer_display === opt.label);

                          const isStudentSelected = q.question_type === "MULTIPLE_CHOICE"
                            ? (studentInput.split(",").map((s: string) => s.trim()).includes(opt.label))
                            : (studentInput === opt.label);

                          return (
                            <div
                              key={opt.label}
                              className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all ${isCorrectOption
                                ? "bg-emerald-500/[0.04] border-emerald-500/20"
                                : isStudentSelected && !isCorrect
                                  ? "bg-rose-500/[0.04] border-rose-500/20"
                                  : "bg-white/[0.01] border-white/5"
                                }`}
                            >
                              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] border ${isCorrectOption
                                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                : "bg-slate-900 text-slate-600 border-white/5"
                                }`}>
                                {opt.label}
                              </div>
                              <div className={`flex-1 text-[13px] font-medium leading-tight ${isCorrectOption ? "text-emerald-400/80" : isStudentSelected ? "text-rose-400/80" : "text-slate-500"}`}>
                                <Latex>{opt.text}</Latex>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Feedback - Concise Bubble */}
                    {analysis?.feedback && (
                      <div className="relative pt-2 pl-10">
                        <div className="absolute left-0 top-4 w-7 h-7 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-[15px] grayscale opacity-80 group-hover:opacity-100 transition-all">
                          👨‍🏫
                        </div>
                        <div className="relative bg-white/[0.01] p-5 rounded-2xl border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] text-sky-500 font-black uppercase tracking-widest">导师点评</span>
                          </div>
                          <div className="text-slate-400 text-[13px] leading-relaxed font-medium">
                            <Latex>{analysis.feedback}</Latex>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Final Action Bar - Simplified */}
        <div className="mt-20 mb-16 flex flex-col items-center gap-5">
          <div className="w-12 h-px bg-slate-800" />
          <Button
            onClick={handleFinish}
            size="lg"
            className="group relative h-14 px-10 rounded-2xl bg-white text-slate-950 font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/5"
          >
            Return Home
          </Button>
          <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest">Learning profile updated</p>
        </div>
      </div>
    </main>
  );
}
