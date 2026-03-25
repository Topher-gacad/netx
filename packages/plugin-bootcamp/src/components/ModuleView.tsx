import { useStore } from 'zustand';
import { bootcampStore, navigateTo } from '../bootcamp-store.js';
import { getModuleProgress } from '../progress-engine.js';
import type { BootcampModule } from '../types.js';

export function ModuleView({ module }: { module: BootcampModule }) {
  const { progress } = useStore(bootcampStore);
  const mod = getModuleProgress(progress, module.id);
  const allLessonsDone = module.lessons.every((l) => mod.lessonsCompleted.includes(l.id));
  const lessonsDone = mod.lessonsCompleted.length;
  const lessonsTotal = module.lessons.length;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', background: module.color + '20',
            color: module.color, fontSize: '16px', fontWeight: 700,
          }}>
            {module.number}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{module.title}</h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: '1.5' }}>
          {module.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, maxWidth: '200px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0}%`, height: '100%', background: module.color, borderRadius: '2px' }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {mod.status === 'completed' ? 'Complete' : `${lessonsDone}/${lessonsTotal} lessons`}
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Lessons
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
        {module.lessons.map((lesson) => {
          const done = mod.lessonsCompleted.includes(lesson.id);
          return (
            <div
              key={lesson.id}
              onClick={() => navigateTo('lesson', module.id, lesson.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: 'var(--bg-secondary)',
                border: `1px solid ${done ? module.color + '30' : 'var(--border-color)'}`,
                borderRadius: '6px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '14px', color: done ? 'var(--success)' : 'var(--text-secondary)' }}>
                {done ? '✓' : lesson.type === 'theory' ? '📖' : '🔧'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 500,
                  color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {lesson.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {lesson.type === 'theory' ? 'Theory' : 'Hands-on Lab'} · {lesson.estimatedMinutes} min
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Module Quiz
      </h3>
      <div
        onClick={() => allLessonsDone ? navigateTo('quiz', module.id) : undefined}
        style={{
          padding: '14px', background: 'var(--bg-secondary)',
          border: `1px solid ${mod.quizPassed ? 'var(--success)40' : allLessonsDone ? module.color + '40' : 'var(--border-color)'}`,
          borderRadius: '6px', cursor: allLessonsDone ? 'pointer' : 'not-allowed',
          opacity: allLessonsDone ? 1 : 0.5,
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
          {mod.quizPassed ? '✅ Quiz Passed!' : allLessonsDone ? '📝 Take Quiz' : '🔒 Complete all lessons first'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {module.quiz.questions.length} questions · {module.quiz.passingScore}% to pass
          {mod.quizHighScore > 0 && ` · Best: ${mod.quizHighScore}%`}
        </div>
      </div>

      {mod.status === 'completed' && (
        <div style={{
          marginTop: '16px', padding: '14px', textAlign: 'center',
          background: module.color + '10', border: `1px solid ${module.color}40`, borderRadius: '6px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: module.color }}>Module Complete!</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Next module unlocked.
          </div>
        </div>
      )}
    </div>
  );
}
