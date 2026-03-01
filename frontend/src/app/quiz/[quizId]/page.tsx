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

  // On component mount, generate the quiz (or fetch it if a real API was used)
  useEffect(() => {
    if (status === 'idle') {
      // Use default parameters to generate quiz
      generateQuiz([1], 10);
    }
  }, [status, generateQuiz]);

  // When submission is finished, navigate to the report page
  useEffect(() => {
    if (status === 'finished') {
      router.push(`/quiz/report/${quizId}`);
    }
  }, [status, router, quizId]);

  if (status !== 'in-progress' || questions.length === 0) {
    // You can add a loading spinner here
    return <div>Loading Quiz...</div>;
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
                <CardTitle>题目 ({currentQuestionIndex + 1}/{questions.length})</CardTitle>
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
