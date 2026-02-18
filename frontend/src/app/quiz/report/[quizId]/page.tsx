"use client";

import { useEffect } from "react";
import { useQuizStore } from "@/store/quiz-store";
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
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";


// Mock data for the radar chart, as this would come from another source in a real app
const mockKnowledgeMastery = [
    { subject: "牛顿定律", score: 85, fullMark: 100 },
    { subject: "洛伦兹力", score: 40, fullMark: 100 },
    { subject: "动量守恒", score: 90, fullMark: 100 },
    { subject: "能量守恒", score: 75, fullMark: 100 },
    { subject: "圆周运动", score: 60, fullMark: 100 },
];

export default function ReportPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const { status, report, questions, answers } = useQuizStore();

  useEffect(() => {
    // If the page is refreshed or visited directly, the report might not be in the store.
    // In a real app, you'd fetch the report from the API using the quizId.
    if (status !== 'finished') {
      // For now, redirect back to the quiz start if there's no report.
      // A better UX would be to fetch the report.
      // router.push('/quiz/start'); // Assuming a start page exists
      console.warn("No report found in store. Displaying with limited data.");
    }
  }, [status, router]);

  if (!report) {
    return <div>Loading report... (or redirecting)</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">测验分析报告</h1>
          <p className="text-muted-foreground text-center">
            这是对您本次测验的深度分析
          </p>
        </header>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>综合得分: {report.total_score.toFixed(1)} / 100</CardTitle>
                <CardDescription>知识点掌握情况雷达图</CardDescription>
            </CardHeader>
            <CardContent>
                <KnowledgeRadar data={mockKnowledgeMastery} />
            </CardContent>
        </Card>

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
                                            <Lightbulb className="mr-2 h-4 w-4 text-yellow-500"/> AI 深度解析
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
      </div>
    </main>
  );
}
