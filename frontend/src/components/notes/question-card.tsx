"use client";

import { useEffect, useState } from "react";
import { Latex } from "@/components/latex";
import { api } from "@/lib/api";

type QuestionData = {
    id: string;
    content_latex: string;
    question_type: string;
    difficulty: number;
    answer_schema: Record<string, unknown>;
    solution_steps: string;
    primary_node_id: number;
};

const TYPE_LABELS: Record<string, string> = {
    calculation: "计算",
    choice: "选择",
    true_false: "判断",
    fill_blank: "填空",
};

type QuestionCardProps = {
    questionId: string;
};

export function QuestionCard({ questionId }: QuestionCardProps) {
    const [question, setQuestion] = useState<QuestionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSolution, setShowSolution] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api.getQuestionEmbed(questionId)
            .then((data) => setQuestion(data))
            .catch(() => setError("题目加载失败"))
            .finally(() => setLoading(false));
    }, [questionId]);

    if (loading) {
        return (
            <div className="animate-pulse rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
                <div className="h-4 w-1/3 rounded bg-slate-700" />
                <div className="mt-3 h-12 rounded bg-slate-700/50" />
            </div>
        );
    }

    if (error || !question) {
        return (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-300">
                ⚠️ {error || "题目数据为空"}
                <span className="ml-2 text-xs text-slate-500">ID: {questionId}</span>
            </div>
        );
    }

    const difficultyStars = "★".repeat(question.difficulty) + "☆".repeat(5 - question.difficulty);

    return (
        <div className="rounded-xl border border-sky-500/25 bg-gradient-to-br from-sky-950/30 to-slate-950/50 p-5 transition-all hover:border-sky-400/40">
            <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                    📝 {TYPE_LABELS[question.question_type] || question.question_type}
                </span>
                <span className="text-xs text-amber-400/80">{difficultyStars}</span>
            </div>
            <div className="text-sm leading-7 text-slate-200">
                <Latex>{question.content_latex}</Latex>
            </div>
            {question.solution_steps && (
                <div className="mt-3">
                    <button
                        onClick={() => setShowSolution(!showSolution)}
                        className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                    >
                        {showSolution ? "▼ 收起解析" : "▶ 查看解析"}
                    </button>
                    {showSolution && (
                        <div className="mt-2 rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 text-xs leading-6 text-slate-300">
                            <Latex>{question.solution_steps}</Latex>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
