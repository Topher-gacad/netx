import { useStore } from 'zustand';
import { bootcampStore, navigateTo } from '../bootcamp-store.js';
import { curriculum } from '../curriculum/index.js';
import { getModuleProgress, getOverallProgress } from '../progress-engine.js';

export function RoadmapView() {
  const { progress } = useStore(bootcampStore);
  const overall = getOverallProgress(progress, curriculum.modules.length);
  const completedCount = Object.values(progress.modules).filter((m) => m.status === 'completed').length;

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)', margin: '0 0 8px' }}>
          Networking Lessons
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          From absolute beginner to job-ready network engineer
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ width: '200px', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${overall}%`, height: '100%', background: 'var(--accent)', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{overall}%</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            ({completedCount}/{curriculum.modules.length} modules)
          </span>
        </div>
      </div>

      {/* Module cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px', margin: '0 auto' }}>
        {curriculum.modules.map((module, i) => {
          const mod = getModuleProgress(progress, module.id);
          const isLocked = mod.status === 'locked';
          const isCompleted = mod.status === 'completed';
          const isInProgress = mod.status === 'in-progress';
          const lessonsTotal = module.lessons.length;
          const lessonsDone = mod.lessonsCompleted.length;
          const pct = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

          return (
            <div key={module.id}>
              {i > 0 && (
                <div style={{ width: '2px', height: '16px', background: isLocked ? 'var(--border-color)' : module.color, margin: '0 auto', opacity: isLocked ? 0.3 : 0.6 }} />
              )}

              <div
                onClick={() => !isLocked && navigateTo('module', module.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 16px',
                  background: isCompleted ? module.color + '10' : 'var(--bg-secondary)',
                  border: `1px solid ${isCompleted ? module.color + '40' : isInProgress ? module.color + '60' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted ? module.color : isInProgress ? module.color + '30' : 'var(--bg-tertiary)',
                  color: isCompleted ? '#fff' : isInProgress ? module.color : 'var(--text-secondary)',
                  fontSize: isCompleted ? '16px' : '15px', fontWeight: 700, flexShrink: 0,
                }}>
                  {isLocked ? '🔒' : isCompleted ? '✓' : module.number}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    Module {module.number}: {module.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {module.description}
                  </div>
                  {!isLocked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: module.color, borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isCompleted ? 'Complete' : `${lessonsDone}/${lessonsTotal}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
