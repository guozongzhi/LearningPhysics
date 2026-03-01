"use client";

import { useEffect, use } from "react";
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
    generateQuiz,
    setAnswer,
    nextQuestion,
    prevQuestion,
    submitQuiz,
  } = useQuizStore();

  // On component mount, we only show an error if status is idle (meaning direct access without generation)
  useEffect(() => {
    if (status === 'idle') {
      router.push('/');
    }
  }, [status, router]);

  // When submission is finished, navigate to the report page
  useEffect(() => {
    if (status === 'finished') {
      router.push(`/quiz/report/${quizId}`);
    }
  }, [status, router, quizId]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg font-medium text-slate-600">正在生成题目...</p>
      </div>
    );
  }

  if (status === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">AI 智能评分中</h2>
        <p className="text-slate-600 animate-pulse">正在深度分析您的解题过程，请稍候...</p>
      </div>
    );
  }

  if (status !== 'in-progress' || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-slate-500">无法加载测验，请尝试重新生成。</p>
        <Button onClick={() => router.push('/')} className="mt-4">返回首页</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const studentAnswer = answers[currentQuestion.id] || "";

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">高中物理测验</h1>
        <p className="text-muted-foreground mb-6">Quiz ID: {quizId}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">

          {/* Left Panel: Question Display */}
          <div className="mb-8 md:mb-0">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>题目 ({currentQuestionIndex + 1}/{questions.length})</CardTitle>
                  <div className="flex items-center gap-1 text-sm font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    难度: {currentQuestion.difficulty || "未知"}
                  </div>
                </div>
                <CardDescription>请仔细阅读题目并作答。</CardDescription>
              </CardHeader>
              <CardContent className="text-lg leading-relaxed">
                <Latex>{currentQuestion.content_latex}</Latex>
                {currentQuestion.image_url && (
                  <div className="mt-4">
                    <img
                      src={currentQuestion.image_url}
                      alt="题目示意图"
                      className="max-w-full rounded-lg border max-h-64 object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Workspace */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>你的答案</CardTitle>
                <CardDescription>
                  对于计算题，请写出最终数值和单位。
                  <span className="block mt-1 text-xs">
                    已作答 {Object.keys(answers).filter(k => answers[k]).length}/{questions.length} 题
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  placeholder="例如: 15 m/s"
                  value={studentAnswer}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  className="text-lg"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <Button
            disabled={currentQuestionIndex === 0}
            onClick={prevQuestion}
            variant="outline"
          >
            上一题
          </Button>

          {/* Question dots */}
          <div className="flex gap-1.5">
            {questions.map((q: { id: string }, i: number) => (
              <div
                key={q.id}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentQuestionIndex
                  ? "bg-primary scale-125"
                  : answers[q.id]
                    ? "bg-green-500"
                    : "bg-gray-300"
                  }`}
              />
            ))}
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={nextQuestion} variant="outline">
              下一题
            </Button>
          ) : (
            <Button
              onClick={submitQuiz}
              disabled={Object.keys(answers).filter(k => answers[k]).length === 0}
            >
              提交并查看分析报告
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
