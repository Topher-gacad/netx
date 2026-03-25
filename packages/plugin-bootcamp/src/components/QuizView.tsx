import { useState } from 'react';
import { useStore } from 'zustand';
import { bootcampStore, navigateTo, updateProgress } from '../bootcamp-store.js';
import { recordQuizAttempt, checkModuleComplete, computeModuleStatuses, getModuleProgress } from '../progress-engine.js';
import { scoreQuiz, createQuizAttempt } from '../quiz-engine.js';
import { curriculum } from '../curriculum/index.js';
import type { BootcampModule } from '../types.js';

export function QuizView({ module }: { module: BootcampModule }) {
  const { progress } = useStore(bootcampStore);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; results: Array<{ questionId: string; isCorrect: boolean; correctOptionId: string; explanation: string }> } | null>(null);

  const quiz = module.quiz;
  const mod = getModuleProgress(progress, module.id);
  const attemptNum = (progress.quizAttempts[quiz.id]?.length ?? 0) + 1;

  const handleSelect = (questionId: string, optionId: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    const res = scoreQuiz(quiz, answers);
    setResult(res);
    setSubmitted(true);

    const attempt = createQuizAttempt(quiz.id, res.score, res.passed, answers, attemptNum);
    let p = recordQuizAttempt(progress, attempt, module.id);
    p = checkModuleComplete(p, module);
    p = computeModuleStatuses(p, curriculum);
    updateProgress(p);

    // Check if badge was just earned
    // If quiz passed and module complete, navigate back to module view
    if (res.passed && !mod.quizPassed) {
      const updatedMod = getModuleProgress(p, module.id);
      if (updatedMod.status === 'completed') {
        setTimeout(() => navigateTo('module', module.id), 1500);
      }
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
        Module {module.number} Quiz
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        {quiz.questions.length} questions · {quiz.passingScore}% to pass · Attempt #{attemptNum}
      </p>

      {/* Questions */}
      {quiz.questions.map((question, qi) => {
        const qResult = result?.results.find((r) => r.questionId === question.id);
        return (
          <div key={question.id} style={{
            padding: '14px', marginBottom: '12px', borderRadius: '6px',
            background: 'var(--bg-secondary)',
            border: `1px solid ${submitted ? (qResult?.isCorrect ? 'var(--success)' + '40' : 'var(--error)' + '40') : 'var(--border-color)'}`,
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
              {qi + 1}. {question.text}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                const isCorrectOption = submitted && option.id === qResult?.correctOptionId;
                const isWrongSelection = submitted && selected && !qResult?.isCorrect;

                return (
                  <div
                    key={option.id}
                    onClick={() => handleSelect(question.id, option.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '4px',
                      background: isCorrectOption ? 'var(--success)' + '15' : isWrongSelection ? 'var(--error)' + '15' : selected ? module.color + '15' : 'var(--bg-primary)',
                      border: `1px solid ${isCorrectOption ? 'var(--success)' + '50' : isWrongSelection ? 'var(--error)' + '50' : selected ? module.color + '50' : 'var(--border-color)'}`,
                      cursor: submitted ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${selected ? module.color : 'var(--border-color)'}`,
                      background: selected ? module.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#fff', flexShrink: 0,
                    }}>
                      {selected && '●'}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{option.text}</span>
                    {isCorrectOption && <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: '12px' }}>✓ Correct</span>}
                    {isWrongSelection && <span style={{ marginLeft: 'auto', color: 'var(--error)', fontSize: '12px' }}>✗ Wrong</span>}
                  </div>
                );
              })}
            </div>
            {/* Explanation */}
            {submitted && (
              <div style={{
                marginTop: '8px', padding: '8px 10px', borderRadius: '4px',
                background: 'var(--bg-primary)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5',
              }}>
                {question.explanation}
              </div>
            )}
          </div>
        );
      })}

      {/* Submit / Result */}
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding: '12px 32px', background: allAnswered ? module.color : 'var(--bg-tertiary)',
              border: 'none', borderRadius: '6px', color: allAnswered ? '#fff' : 'var(--text-secondary)',
              fontSize: '15px', fontWeight: 600, cursor: allAnswered ? 'pointer' : 'not-allowed',
            }}
          >
            Submit Quiz
          </button>
        ) : (
          <div>
            <div style={{
              fontSize: '28px', fontWeight: 700, marginBottom: '8px',
              color: result!.passed ? 'var(--success)' : 'var(--error)',
            }}>
              {result!.score}%
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: result!.passed ? 'var(--success)' : 'var(--error)' }}>
              {result!.passed ? 'You Passed!' : `Need ${quiz.passingScore}% — Try Again`}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {!result!.passed && (
                <button onClick={handleRetry} style={{
                  padding: '10px 24px', background: module.color, border: 'none',
                  borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Retry Quiz
                </button>
              )}
              <button onClick={() => navigateTo('module', module.id)} style={{
                padding: '10px 24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
              }}>
                Back to Module
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
