import { useState, useEffect, useCallback } from 'react';
import type { CanvasAPI } from '@netx/sdk';
import type { Lab, LabProgress } from './lab-types.js';
import { LABS } from './labs.js';
import { checkObjective } from './lab-validator.js';

let labCanvasAPI: CanvasAPI | null = null;
let forceUpdateFn: (() => void) | null = null;
let activeLab: Lab | null = null;
let labProgress: LabProgress | null = null;

export function setLabCanvasAPI(api: CanvasAPI) {
  labCanvasAPI = api;
}

export function triggerLabCheck() {
  forceUpdateFn?.();
}

export function startLabById(labId: string) {
  const lab = LABS.find((l) => l.id === labId);
  if (!lab) return;
  activeLab = lab;
  labProgress = {
    labId: lab.id,
    completed: new Set(),
    startedAt: Date.now(),
  };
  forceUpdateFn?.();
}

export function LabPanel() {
  const [, setTick] = useState(0);
  const [view, setView] = useState<'list' | 'active'>(activeLab ? 'active' : 'list');

  useEffect(() => {
    forceUpdateFn = () => {
      setTick((t) => t + 1);
      // Sync view when lab is started externally (from Lessons page)
      if (activeLab) setView('active');
    };
    return () => { forceUpdateFn = null; };
  }, []);

  const startLab = useCallback((lab: Lab) => {
    activeLab = lab;
    labProgress = {
      labId: lab.id,
      completed: new Set(),
      startedAt: Date.now(),
    };
    setView('active');
  }, []);

  const exitLab = useCallback(() => {
    activeLab = null;
    labProgress = null;
    setView('list');
  }, []);

  if (view === 'list' || !activeLab) {
    return <LabList onStart={startLab} />;
  }

  return <ActiveLab lab={activeLab} progress={labProgress!} onExit={exitLab} />;
}

function LabList({ onStart }: { onStart: (lab: Lab) => void }) {
  const diffColors = { beginner: '#00ff88', intermediate: '#ffaa00', advanced: '#ff4444' };
  const onCrimpingPage = window.location.hash.startsWith('#/crimping');
  const visibleLabs = onCrimpingPage
    ? LABS.filter((l) => l.id.includes('crimping'))
    : LABS.filter((l) => !l.id.includes('crimping'));

  return (
    <div>
      <h3 style={{
        fontSize: '14px', fontWeight: 600, color: 'var(--accent)',
        marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {onCrimpingPage ? 'Crimping Labs' : 'Labs'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleLabs.map((lab) => (
          <button
            key={lab.id}
            onClick={() => onStart(lab)}
            style={{
              padding: '12px', background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)', borderRadius: '6px',
              color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{lab.title}</span>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '3px',
                background: diffColors[lab.difficulty] + '20',
                color: diffColors[lab.difficulty],
                fontWeight: 600, textTransform: 'uppercase',
              }}>
                {lab.difficulty}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {lab.description}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {lab.objectives.length} objectives
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveLab({ lab, progress, onExit }: { lab: Lab; progress: LabProgress; onExit: () => void }) {
  const results = lab.objectives.map((obj) => {
    const passed = labCanvasAPI ? checkObjective(obj, labCanvasAPI) : false;
    if (passed && !progress.completed.has(obj.id)) {
      progress.completed.add(obj.id);
    }
    return { objective: obj, passed: progress.completed.has(obj.id) };
  });

  const completedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allDone = completedCount === totalCount;

  if (allDone && !progress.completedAt) {
    progress.completedAt = Date.now();
  }

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent)' }}>
          {lab.title}
        </h3>
        <button
          onClick={onExit}
          style={{
            fontSize: '12px', padding: '4px 10px', background: 'transparent',
            border: '1px solid var(--border-color)', borderRadius: '3px',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          Exit Lab
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '6px', background: 'var(--bg-primary)', borderRadius: '3px',
        marginBottom: '12px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${progressPercent}%`,
          background: allDone ? '#00ff88' : 'var(--accent)',
          borderRadius: '3px', transition: 'width 0.3s',
        }} />
      </div>

      {/* Completion badge */}
      {allDone && (
        <div style={{
          padding: '10px 14px', background: '#00ff8815', border: '1px solid #00ff8840',
          borderRadius: '6px', marginBottom: '12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: 700 }}>
            Lab Complete!
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {Math.round((progress.completedAt! - progress.startedAt) / 1000)}s elapsed
          </div>
        </div>
      )}

      {/* Score */}
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
        Progress: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{completedCount}/{totalCount}</span> objectives
      </div>

      {/* Objectives checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {results.map(({ objective, passed }) => (
          <div
            key={objective.id}
            style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              padding: '8px 10px', background: 'var(--bg-primary)',
              borderRadius: '4px', border: `1px solid ${passed ? '#00ff8830' : 'var(--border-color)'}`,
            }}
          >
            <span style={{
              fontSize: '14px', flexShrink: 0, marginTop: '1px',
              color: passed ? '#00ff88' : 'var(--text-secondary)',
            }}>
              {passed ? '\u2714' : '\u25CB'}
            </span>
            <div>
              <div style={{
                fontSize: '13px',
                color: passed ? '#00ff88' : 'var(--text-primary)',
                textDecoration: passed ? 'line-through' : 'none',
                opacity: passed ? 0.7 : 1,
                lineHeight: '1.4',
              }}>
                {objective.description}
              </div>
              {!passed && objective.hint && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic', lineHeight: '1.4' }}>
                  Hint: {objective.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '10px', background: 'var(--bg-primary)',
        borderRadius: '6px', border: '1px solid var(--border-color)',
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
          Instructions:
        </div>
        <ol style={{
          padding: '0 0 0 18px', margin: 0, fontSize: '12px',
          color: 'var(--text-secondary)', lineHeight: '1.7',
          display: 'flex', flexDirection: 'column', gap: '3px',
        }}>
          {lab.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
