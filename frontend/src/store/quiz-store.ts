import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/lib/api';

// --- Store Definition ---

type QuizState = {
  status: 'idle' | 'loading' | 'submitting' | 'in-progress' | 'finished';
  quizId: string | null;
  questions: any[];
  answers: Record<string, string>;
  report: any | null;
  currentQuestionIndex: number;
  startedAt: number | null;
  gradingProgress: { progress: number; total: number; status?: string; currentIndex?: number } | null;
};

type QuizActions = {
  generateQuiz: (topicIds: number[], count: number) => Promise<void>;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<void>;
  reset: () => void;
};

export const useQuizStore = create<QuizState & QuizActions>()(
  immer((set, get) => ({
    status: 'idle',
    quizId: null,
    questions: [],
    answers: {},
    report: null,
    currentQuestionIndex: 0,
    startedAt: null,
    gradingProgress: null,

    generateQuiz: async (topicIds, count) => {
      set({ status: 'loading' });
      try {
        const data = await api.generateQuiz(topicIds, count);
        set((state) => {
          state.status = 'in-progress';
          state.quizId = data.quiz_id;
          state.questions = data.questions;
          state.answers = {};
          state.report = null;
          state.currentQuestionIndex = 0;
          state.startedAt = Date.now();
          state.gradingProgress = null;
        });
      } catch (error) {
        console.error("Failed to generate quiz", error);
        set({ status: 'idle' });
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('401')) {
          // Show auth error to user
          alert("认证失败，请重新登录");
        }
      }
    },

    setAnswer: (questionId, answer) => {
      set((state) => {
        state.answers[questionId] = answer;
      });
    },

    nextQuestion: () => {
      if (get().currentQuestionIndex < get().questions.length - 1) {
        set((state) => {
          state.currentQuestionIndex += 1;
        });
      }
    },

    prevQuestion: () => {
      if (get().currentQuestionIndex > 0) {
        set((state) => {
          state.currentQuestionIndex -= 1;
        });
      }
    },

    submitQuiz: async () => {
      set({ status: 'submitting' });
      const { quizId, answers, startedAt, questions } = get();
      if (!quizId) return;

      const now = Date.now();
      const totalMs = startedAt ? now - startedAt : 0;

      // Transform answers into the format the API expects
      // Ensure we send ALL questions, even if there is NO answer in the state
      const apiAnswers = questions.map((q) => ({
        question_id: q.id,
        student_input: answers[q.id] || "",
        time_spent_ms: totalMs,
      }));

      try {
        const reportData = await api.submitQuiz(quizId, apiAnswers, (progressData) => {
          set((state) => {
            state.gradingProgress = progressData;
          });
        });
        set((state) => {
          state.status = 'finished';
          state.report = reportData;
        });
      } catch (error) {
        console.error("Failed to submit quiz", error);
        set({ status: 'in-progress' }); // Revert status on failure
        // Check if it's an authentication error
        if (error instanceof Error && error.message.includes('401')) {
          // Show auth error to user
          alert("认证失败，请重新登录");
        }
      }
    },

    reset: () => {
      set({
        status: 'idle',
        quizId: null,
        questions: [],
        answers: {},
        report: null,
        currentQuestionIndex: 0,
        startedAt: null,
        gradingProgress: null,
      });
    }
  }))
);
