"use client";

import { useEffect, use } from "react";
import { useQuizStore } from "@/store/quiz-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { KnowledgeRadar } from "@/components/knowledge-radar";
import { Latex } from "@/components/latex";
import { CheckCircle, XCircle, Lightbulb, RotateCcw, Home } from "lucide-react";
import { useRouter } from "next/navigation";


// Mock data for the radar chart
const mockKnowledgeMastery = [
  { subject: "牛顿定律", score: 85, fullMark: 100 },
  { subject: "洛伦兹力", score: 40, fullMark: 100 },
  { subject: "动量守恒", score: 90, fullMark: 100 },
  { subject: "能量守恒", score: 75, fullMark: 100 },
  { subject: "圆周运动", score: 60, fullMark: 100 },
];

export default function ReportPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const { status, report, questions, answers, reset } = useQuizStore();

  useEffect(() => {
    if (status !== 'finished') {
      console.warn("No report found in store. Displaying with limited data.");
    }
  }, [status, router]);

  if (!report) {
    return <div>Loading report... (or redirecting)</div>;
  }

  const correctCount = questions.filter(
    (q) => report.analysis[q.id as keyof typeof report.analysis]?.is_correct
  ).length;

  const handleRetry = () => {
    reset();
    router.push("/");
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">测验分析报告</h1>
          <p className="text-muted-foreground text-center">
            这是对您本次测验的深度分析
          </p>
        </header>

        {/* Score Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>综合得分: {report.total_score.toFixed(1)} / 100</CardTitle>
            <CardDescription>
              答对 {correctCount}/{questions.length} 题
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgeRadar data={mockKnowledgeMastery} />
          </CardContent>
        </Card>

        {/* AI Overall Summary */}
        {report.overall_summary && (
          <Card className="mb-8 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI 整体分析报告
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">{report.overall_summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Per-question detail */}
        {questions.map((q) => {
          const analysis = report.analysis[q.id as keyof typeof report.analysis];
          const studentInput = answers[q.id] || "未作答";

          if (!analysis) return null;

          return (
            <Card key={q.id} className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>题目回顾</span>
                  {analysis.is_correct ? (
                    <span className="flex items-center text-emerald-600">
                      <CheckCircle className="mr-2 h-5 w-5" /> 正确
                    </span>
                  ) : (
                    <span className="flex items-center text-rose-600">
                      <XCircle className="mr-2 h-5 w-5" /> 错误
                    </span>
                  )}
                </CardTitle>
                <div className="text-muted-foreground pt-2">
                  <Latex>{q.content_latex}</Latex>
                  {/* Show question image if present */}
                  {q.image_url && (
                    <div className="mt-3">
                      <img
                        src={q.image_url}
                        alt="题目示意图"
                        className="max-w-full rounded-lg border max-h-64 object-contain"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">你的答案:</h4>
                    <p className="text-muted-foreground p-3 bg-slate-100 dark:bg-slate-800 rounded-md">{studentInput}</p>
                  </div>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" /> AI 深度解析
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <p><strong>[归因标签: {analysis.error_tag}]</strong> {analysis.feedback}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-8 mb-12">
          <Button
            onClick={handleRetry}
            size="lg"
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            再次测试
          </Button>
          <Button
            onClick={() => { reset(); router.push("/"); }}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Button>
        </div>
      </div>
    </main>
  );
}
