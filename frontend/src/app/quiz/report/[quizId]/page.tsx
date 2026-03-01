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
        if (status === 'idle') {
            router.push("/");
        }
    }, [status, router]);

    if (status !== 'finished' || !report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-slate-500 mb-4">报告加载中或暂无数据...</p>
                <Button onClick={() => router.push("/")}>返回首页</Button>
            </div>
        );
    }

    const handleFinish = () => {
        reset();
        router.push("/");
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50">
            <div className="w-full max-w-4xl">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">学习分析报告</h1>
                        <p className="text-muted-foreground">基于 AI 引擎的深度学情分析</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-extrabold text-blue-600">
                            {report.total_score} <span className="text-xl text-slate-500 font-normal">分</span>
                        </div>
                    </div>
                </div>

                {/* Overall Summary */}
                <Card className="mb-8 border-blue-200 bg-blue-50/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span>🤖</span> AI 综合评价
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-700 leading-relaxed">
                        {report.overall_summary || "本次测验表现良好，继续保持！"}
                    </CardContent>
                </Card>

                <h2 className="text-2xl font-bold mb-4 mt-8">题目详细解析</h2>

                {/* Per-question analysis */}
                <div className="space-y-6">
                    {questions.map((q, idx) => {
                        const analysis = report.analysis[q.id];
                        const studentInput = answers[q.id] || "未作答";
                        const isCorrect = analysis?.is_correct;

                        return (
                            <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'} shadow-sm`}>
                                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">第 {idx + 1} 题</CardTitle>
                                        <div className="flex gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {isCorrect ? '完全正确' : '存在谬误'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-sm flex gap-2">
                                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                                            难度: {q.difficulty || "未知"}
                                        </span>
                                        {analysis?.error_tag && analysis.error_tag !== "CORRECT" && (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                                                错误归因: {analysis.error_tag}
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    {/* Question Content */}
                                    <div className="text-slate-800 bg-white rounded p-4 border border-slate-100 shadow-sm">
                                        <Latex>{q.content_latex}</Latex>
                                        {q.image_url && (
                                            <img src={q.image_url} alt="题目配图" className="mt-2 max-h-48 object-contain rounded" />
                                        )}
                                    </div>

                                    {/* Answer Comparison */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">你的答案</p>
                                            <p className={`font-mono font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                {studentInput}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detailed AI Feedback */}
                                    {analysis?.feedback && (
                                        <div className="mt-4 bg-indigo-50/50 p-5 rounded-lg border border-indigo-100">
                                            <p className="text-xs text-indigo-500 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
                                                👉 老师点评
                                            </p>
                                            <div className="text-slate-700 text-sm leading-relaxed">
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
                    <Button onClick={handleFinish} size="lg" className="px-10 h-12 text-lg shadow-md hover:shadow-lg transition-all">
                        返回首页，继续练习
                    </Button>
                </div>
            </div>
        </main>
    );
}
