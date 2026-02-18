"use client";

import { useRouter } from "next/navigation";
import { useQuizStore } from "@/store/quiz-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const { generateQuiz, status } = useQuizStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartQuiz = async () => {
    setIsLoading(true);
    // In a real app, you would have a UI to select topics.
    // Here, we use the hardcoded IDs for the nodes we seeded.
    const topicIds = [101, 102]; // Corresponds to TEST-001 and potentially another test node
    const questionCount = 5;

    await generateQuiz(topicIds, questionCount);
    
    // The store's quizId is now populated. We can navigate.
    const quizId = useQuizStore.getState().quizId;
    if (quizId) {
      router.push(`/quiz/${quizId}`);
    } else {
      // Handle error case where quiz generation failed
      alert("Failed to start quiz. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            LeaningPhysics
          </CardTitle>
          <CardDescription className="text-center">
            AI 驱动的高中物理自适应学习平台
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartQuiz}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "正在生成题目..." : "开始新的测验"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
