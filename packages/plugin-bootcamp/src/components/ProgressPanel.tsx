import { useStore } from 'zustand';
import { bootcampStore } from '../bootcamp-store.js';
import { curriculum } from '../curriculum/index.js';
import { getModuleProgress, getOverallProgress, getNextStep } from '../progress-engine.js';

export function ProgressPanel() {
  const { progress } = useStore(bootcampStore);
  const overall = getOverallProgress(progress, curriculum.modules.length);
  const completedCount = Object.values(progress.modules).filter((m) => m.status === 'completed').length;
  const next = getNextStep(progress, curriculum);
  const nextModule = next ? curriculum.modules.find((m) => m.id === next.moduleId) : null;
  const nextLesson = nextModule && next?.lessonId ? nextModule.lessons.find((l) => l.id === next.lessonId) : null;

  return (
    <div>
      <h3 style={{
        fontSize: '14px', fontWeight: 600, color: 'var(--accent)',
        marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        Lessons Progress
      </h3>

      {/* Overall */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall</span>
          <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>
            {completedCount}/{curriculum.modules.length} modules ({overall}%)
          </span>
        </div>
        <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${overall}%`, height: '100%', background: 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Module list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        {curriculum.modules.map((module) => {
          const mod = getModuleProgress(progress, module.id);
          const isCompleted = mod.status === 'completed';
          const isLocked = mod.status === 'locked';
          const isInProgress = mod.status === 'in-progress';

          return (
            <div key={module.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '4px 0', opacity: isLocked ? 0.4 : 1,
            }}>
              <span style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: isCompleted ? 'var(--success)' : isInProgress ? module.color : 'var(--text-secondary)' }}>
                {isCompleted ? '✓' : isLocked ? '🔒' : isInProgress ? '▸' : '○'}
              </span>
              <span style={{
                fontSize: '12px', flex: 1,
                color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}>
                {module.number}. {module.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Next step */}
      {nextModule && (
        <div style={{
          padding: '10px', background: 'var(--bg-primary)', borderRadius: '6px',
          border: `1px solid ${nextModule.color}30`,
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Up Next:</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: nextModule.color }}>{nextModule.title}</div>
          {nextLesson && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{nextLesson.title}</div>
          )}
        </div>
      )}

      {overall === 100 && (
        <div style={{
          padding: '12px', background: 'var(--success)10', borderRadius: '6px',
          border: '1px solid var(--success)30', textAlign: 'center',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>Lessons Complete!</div>
        </div>
      )}
    </div>
  );
}
