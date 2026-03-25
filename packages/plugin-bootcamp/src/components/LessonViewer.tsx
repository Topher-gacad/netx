import { useStore } from 'zustand';
import { bootcampStore, navigateTo, updateProgress, closeLessons } from '../bootcamp-store.js';
import { markLessonComplete, checkModuleComplete, computeModuleStatuses } from '../progress-engine.js';
import { curriculum } from '../curriculum/index.js';
import type { BootcampModule, Lesson, TheorySection } from '../types.js';
import { DiagramRenderer } from './DiagramRenderer.js';

export function LessonViewer({ module, lesson }: { module: BootcampModule; lesson: Lesson }) {
  const { progress } = useStore(bootcampStore);
  const isDone = progress.modules[module.id]?.lessonsCompleted.includes(lesson.id);

  const handleComplete = () => {
    let p = markLessonComplete(progress, lesson.id, module.id, lesson.type);
    p = checkModuleComplete(p, module);
    p = computeModuleStatuses(p, curriculum);
    updateProgress(p);

    // Go to next lesson or back to module
    const idx = module.lessons.findIndex((l) => l.id === lesson.id);
    const next = module.lessons[idx + 1];
    if (next) {
      navigateTo('lesson', module.id, next.id);
    } else {
      navigateTo('module', module.id);
    }
  };

  const isCrimpingLab = lesson.labId === 'lab-19-cable-crimping';

  const handleOpenLab = () => {
    // Mark as complete
    let p = markLessonComplete(progress, lesson.id, module.id, 'lab');
    p = checkModuleComplete(p, module);
    p = computeModuleStatuses(p, curriculum);
    updateProgress(p);

    if (isCrimpingLab) {
      // Navigate to crimping simulator and start the lab
      closeLessons();
      setTimeout(() => {
        window.location.hash = '#/crimping?lab=1';
        window.dispatchEvent(new CustomEvent('bootcamp:launch-lab', { detail: { labId: lesson.labId } }));
      }, 100);
      return;
    }

    // Switch back to canvas mode
    closeLessons();

    // Tell the lab system to open this lab (small delay to let canvas render first)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bootcamp:launch-lab', { detail: { labId: lesson.labId } }));
    }, 100);
  };

  if (lesson.type === 'lab') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isCrimpingLab ? '🔌' : '🔧'}</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{lesson.title}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {isCrimpingLab
            ? 'Time to prove what you learned. Crimp an RJ45 cable from memory — no hints, no reference chart. Just you and the wires.'
            : 'This is a hands-on lab. Click below to open it in the Labs panel.'}
        </p>
        {isCrimpingLab && !isDone && (
          <div style={{
            maxWidth: '400px', margin: '0 auto 20px', padding: '14px 18px',
            background: 'var(--bg-secondary)', borderRadius: '8px',
            border: '1px solid var(--border-color)', textAlign: 'left',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Your challenge:</div>
            <div>1. Select T-568B standard</div>
            <div>2. Place all 8 wires in the correct pin order</div>
            <div>3. Crimp and test — all 8 pins must pass</div>
            <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--warning)' }}>
              No "Reveal Answer" allowed — rely on your memory!
            </div>
          </div>
        )}
        <button
          onClick={handleOpenLab}
          style={{
            padding: '12px 28px', background: module.color, border: 'none',
            borderRadius: '6px', color: '#fff', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isDone ? 'Open Lab Again' : (isCrimpingLab ? 'Start Crimping Challenge' : 'Start Lab')}
        </button>
        {isDone && (
          <div style={{ marginTop: '12px', color: 'var(--success)', fontSize: '13px' }}>✓ Lab completed</div>
        )}
      </div>
    );
  }

  // Theory lesson
  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      {lesson.content?.sections.map((section, i) => (
        <SectionRenderer key={i} section={section} moduleColor={module.color} />
      ))}

      {/* Complete button */}
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <button
          onClick={handleComplete}
          style={{
            padding: '12px 28px',
            background: isDone ? 'var(--bg-secondary)' : module.color,
            border: isDone ? '1px solid var(--border-color)' : 'none',
            borderRadius: '6px',
            color: isDone ? 'var(--text-secondary)' : '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {isDone ? '✓ Completed — Next Lesson' : 'Mark as Complete & Continue'}
        </button>
      </div>
    </div>
  );
}

function SectionRenderer({ section, moduleColor }: { section: TheorySection; moduleColor: string }) {
  switch (section.type) {
    case 'heading':
      return section.level === 1
        ? <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 16px', color: moduleColor, lineHeight: '1.3' }}>{section.text}</h1>
        : <h2 style={{ fontSize: '22px', fontWeight: 600, margin: '28px 0 12px', color: 'var(--text-primary)', lineHeight: '1.3' }}>{section.text}</h2>;

    case 'paragraph':
      return <p style={{ fontSize: '16px', lineHeight: '1.8', color: 'var(--text-primary)', margin: '0 0 16px' }}>{section.text}</p>;

    case 'bullet-list':
      return (
        <ul style={{ padding: '0 0 0 24px', margin: '0 0 16px', fontSize: '16px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
          {section.items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
        </ul>
      );

    case 'numbered-list':
      return (
        <ol style={{ padding: '0 0 0 24px', margin: '0 0 16px', fontSize: '16px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
          {section.items.map((item, i) => <li key={i} style={{ marginBottom: '6px' }}>{item}</li>)}
        </ol>
      );

    case 'callout': {
      const colors = { info: '#00bceb', warning: '#ffaa00', tip: '#00ff88', 'key-concept': '#aa66ff' };
      const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡', 'key-concept': '🔑' };
      return (
        <div style={{
          padding: '16px 18px', margin: '16px 0', borderRadius: '8px',
          background: colors[section.variant] + '10',
          borderLeft: `4px solid ${colors[section.variant]}`,
          fontSize: '15px', lineHeight: '1.7', color: 'var(--text-primary)',
        }}>
          <span style={{ marginRight: '8px', fontSize: '18px' }}>{icons[section.variant]}</span>
          {section.text}
        </div>
      );
    }

    case 'code-block':
      return (
        <div style={{ margin: '14px 0', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {/* W3Schools-style code header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 14px', background: '#1a1a28', borderBottom: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>CLI / Config</span>
            <button
              onClick={() => { closeLessons(); }}
              style={{
                padding: '5px 14px', background: 'var(--accent)', border: 'none',
                borderRadius: '3px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Try it in Simulator →
            </button>
          </div>
          <pre style={{
            padding: '16px 18px', margin: 0,
            background: '#0a0a14',
            fontSize: '14px', fontFamily: '"Cascadia Code", "Consolas", monospace', color: '#00ff88',
            overflow: 'auto', lineHeight: '1.8',
          }}>
            {section.code}
          </pre>
        </div>
      );

    case 'key-term':
      return (
        <div style={{
          padding: '14px 18px', margin: '10px 0', borderRadius: '6px',
          borderLeft: `4px solid ${moduleColor}`, background: 'var(--bg-secondary)',
        }}>
          <span style={{ fontWeight: 700, color: moduleColor, fontSize: '16px' }}>{section.term}</span>
          <span style={{ fontSize: '15px', color: 'var(--text-primary)', marginLeft: '10px', lineHeight: '1.6' }}>— {section.definition}</span>
        </div>
      );

    case 'comparison-table':
      return (
        <div style={{ margin: '16px 0', overflow: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                {section.headers.map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left', background: 'var(--bg-tertiary)',
                    borderBottom: '2px solid var(--border-color)', color: 'var(--accent)', fontWeight: 600,
                    fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', lineHeight: '1.5',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'analogy':
      return (
        <div style={{
          padding: '18px 20px', margin: '16px 0', borderRadius: '8px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          fontStyle: 'italic', fontSize: '16px', lineHeight: '1.8', color: 'var(--text-primary)',
        }}>
          <span style={{ marginRight: '8px', fontSize: '20px' }}>💡</span>{section.text}
        </div>
      );

    case 'diagram':
      return (
        <div style={{
          padding: '16px', margin: '16px 0', borderRadius: '8px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        }}>
          <DiagramRenderer diagram={section.diagram} moduleColor={moduleColor} />
          {section.diagram.caption && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
              {section.diagram.caption}
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}
