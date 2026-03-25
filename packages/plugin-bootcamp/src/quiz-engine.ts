import type { Quiz, QuizQuestion, QuizAttempt } from './types.js';

export interface QuestionResult {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
}

export function scoreQuiz(
  quiz: Quiz,
  answers: Record<string, string>,
): { score: number; passed: boolean; results: QuestionResult[] } {
  const results: QuestionResult[] = [];

  for (const question of quiz.questions) {
    const selected = answers[question.id] ?? '';
    const correctOption = question.options.find((o) => o.correct);
    const isCorrect = correctOption?.id === selected;

    results.push({
      questionId: question.id,
      selectedOptionId: selected,
      correctOptionId: correctOption?.id ?? '',
      isCorrect,
      explanation: question.explanation,
    });
  }

  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  return { score, passed, results };
}

export function createQuizAttempt(
  quizId: string,
  score: number,
  passed: boolean,
  answers: Record<string, string>,
  attemptNumber: number,
): QuizAttempt {
  return {
    quizId,
    attemptNumber,
    score,
    answers,
    timestamp: Date.now(),
    passed,
  };
}
