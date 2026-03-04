"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">学习分析报告</h1>
            <p className="text-slate-400">基于 AI 引擎的深度学情分析</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-400">
              {report.total_score} <span className="text-xl text-slate-400 font-normal">分</span>
            </div>
          </div>
        </div>

        <Card className="mb-8 bg-slate-900/70 border-sky-500/20 shadow-[0_0_30px_rgba(56,189,248,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <span>🤖</span> AI 综合评价
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 leading-relaxed">
            {report.overall_summary || "本次测验表现良好，继续保持！"}
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold text-slate-100 mb-4 mt-8">题目详细解析</h2>

        <div className="space-y-6">
          {questions.map((q, idx) => {
            const analysis = report.analysis[q.id];
            const studentInput = answers[q.id] || "未作答";
            const isCorrect = analysis?.is_correct;

            return (
              <Card
                key={q.id}
                className={`bg-slate-900/70 border-slate-700/60 overflow-hidden ${isCorrect ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"
                  }`}
              >
                <CardHeader className="pb-3 border-b border-slate-700/60">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <CardTitle className="text-lg text-slate-100">第 {idx + 1} 题</CardTitle>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${isCorrect ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        }`}
                    >
                      {isCorrect ? "完全正确" : "存在谬误"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm flex gap-2 flex-wrap">
                    <span className="bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded text-xs font-semibold">
                      难度: {q.difficulty || "未知"}
                    </span>
                    {analysis?.error_tag && analysis.error_tag !== "CORRECT" && (
                      <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs font-semibold border border-amber-500/30">
                        错误归因: {analysis.error_tag}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="text-slate-200 bg-slate-800/50 rounded-lg p-4 border border-slate-700/60">
                    <Latex>{q.content_latex}</Latex>
                    {q.image_url && (
                      <img src={q.image_url} alt="题目配图" className="mt-2 max-h-48 object-contain rounded border border-slate-700" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60 transition-all hover:bg-slate-800/80">
                      <p className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-[0.1em] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        你的答案
                      </p>
                      <p className={`text-base font-semibold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                        {studentInput || "未填"}
                      </p>
                    </div>
                    {analysis?.correct_answer_display && (
                      <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20 transition-all hover:bg-emerald-500/10">
                        <p className="text-[10px] text-emerald-500/70 font-bold mb-2 uppercase tracking-[0.1em] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          正确答案
                        </p>
                        <p className="text-base font-semibold text-emerald-400">
                          {analysis.correct_answer_display}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Options List for Choice Questions */}
                  {(q.question_type === "CHOICE" || q.question_type === "SINGLE_CHOICE" || q.question_type === "MULTIPLE_CHOICE") && q.answer_schema?.options && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">选项回顾</p>
                      <div className="grid grid-cols-1 gap-2">
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
                              className={`flex items-start gap-3 p-3 rounded-lg border text-sm transition-all ${isCorrectOption
                                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                                : isStudentSelected && !isCorrect
                                  ? "bg-rose-500/10 border-rose-500/40 text-rose-200"
                                  : "bg-slate-800/30 border-slate-700/40 text-slate-400"
                                }`}
                            >
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${isCorrectOption
                                ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                : "bg-slate-700 text-slate-400 border-slate-600"
                                }`}>
                                {opt.label}
                              </div>
                              <div className="flex-1">
                                <Latex>{opt.text}</Latex>
                              </div>
                              <div className="flex-shrink-0 flex gap-2">
                                {isCorrectOption && (
                                  <span className="text-emerald-400" title="正确选项">✓</span>
                                )}
                                {isStudentSelected && (
                                  <span className={isCorrect ? "text-emerald-400" : "text-rose-400"} title="你的选择">
                                    {isCorrect ? "" : "✕"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {analysis?.feedback && (
                    <div className="mt-4 bg-sky-500/10 p-5 rounded-lg border border-sky-500/20">
                      <p className="text-xs text-sky-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
                        👉 老师点评
                      </p>
                      <div className="text-slate-300 text-sm leading-relaxed">
                        <Latex>{analysis.feedback}</Latex>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center pb-12">
          <Button
            onClick={handleFinish}
            size="lg"
            className="px-10 h-12 text-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:opacity-90 shadow-lg shadow-sky-500/25"
          >
            返回首页，继续练习
          </Button>
        </div>
      </div>
    </main>
  );
}
