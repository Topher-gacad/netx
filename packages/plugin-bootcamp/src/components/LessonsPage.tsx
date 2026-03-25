import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { bootcampStore, navigateTo, closeLessons } from '../bootcamp-store.js';
import { curriculum } from '../curriculum/index.js';
import { getModuleProgress, getOverallProgress } from '../progress-engine.js';
import { RoadmapView } from './RoadmapView.js';
import { ModuleView } from './ModuleView.js';
import { LessonViewer } from './LessonViewer.js';
import { QuizView } from './QuizView.js';

export function LessonsPage() {
  const { currentView, currentModuleId, currentLessonId, progress } = useStore(bootcampStore);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const module = currentModuleId ? curriculum.modules.find((m) => m.id === currentModuleId) : null;
  const lesson = module && currentLessonId ? module.lessons.find((l) => l.id === currentLessonId) : null;
  const overall = getOverallProgress(progress, curriculum.modules.length);

  // Find prev/next lesson for navigation
  const { prevLesson, nextLesson } = useMemo(() => {
    if (!module || !lesson) return { prevLesson: null, nextLesson: null };
    const idx = module.lessons.findIndex((l) => l.id === lesson.id);
    return {
      prevLesson: idx > 0 ? module.lessons[idx - 1] : null,
      nextLesson: idx < module.lessons.length - 1 ? module.lessons[idx + 1] : null,
    };
  }, [module, lesson]);

  return (
    <div style={{
      display: 'flex', height: '100%', width: '100%',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      {/* Sidebar — W3Schools style */}
      <div style={{
        width: sidebarCollapsed ? '44px' : '300px',
        minWidth: sidebarCollapsed ? '44px' : '300px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s, min-width 0.2s',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: sidebarCollapsed ? '10px 8px' : '16px 18px',
          borderBottom: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {!sidebarCollapsed && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>Lessons</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {overall}% complete
              </div>
              <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${overall}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              padding: '6px', background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px',
            }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Module list */}
        {!sidebarCollapsed && (
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
            {curriculum.modules.map((mod) => {
              const modProgress = getModuleProgress(progress, mod.id);
              const isActive = currentModuleId === mod.id;
              const isCompleted = modProgress.status === 'completed';
              const lessonsDone = modProgress.lessonsCompleted.length;
              const lessonsTotal = mod.lessons.length;

              return (
                <div key={mod.id} style={{ marginBottom: '4px' }}>
                  {/* Module header */}
                  <div
                    onClick={() => navigateTo('module', mod.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '6px',
                      background: isActive ? mod.color + '12' : 'transparent',
                      borderLeft: isActive ? `4px solid ${mod.color}` : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{
                      fontSize: '12px', fontWeight: 700, width: '26px', height: '26px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCompleted ? mod.color : isActive ? mod.color + '25' : 'var(--bg-tertiary)',
                      color: isCompleted ? '#fff' : isActive ? mod.color : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}>
                      {isCompleted ? '✓' : mod.number}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: isActive ? 600 : 400,
                        color: isActive ? mod.color : 'var(--text-primary)',
                        lineHeight: '1.3',
                      }}>
                        {mod.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {isCompleted ? '✓ Complete' : `${lessonsDone}/${lessonsTotal} lessons`}
                      </div>
                    </div>
                  </div>

                  {/* Expanded lesson list */}
                  {isActive && (
                    <div style={{ paddingLeft: '26px', marginTop: '4px', marginBottom: '8px' }}>
                      {mod.lessons.map((les) => {
                        const done = modProgress.lessonsCompleted.includes(les.id);
                        const isLessonActive = currentLessonId === les.id;

                        return (
                          <div
                            key={les.id}
                            onClick={() => navigateTo('lesson', mod.id, les.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '7px 12px', borderRadius: '4px',
                              background: isLessonActive ? mod.color + '15' : 'transparent',
                              cursor: 'pointer', marginBottom: '2px',
                            }}
                          >
                            <span style={{
                              fontSize: '12px', width: '16px', textAlign: 'center',
                              color: done ? 'var(--success)' : 'var(--text-secondary)',
                            }}>
                              {done ? '✓' : les.type === 'theory' ? '○' : '◇'}
                            </span>
                            <span style={{
                              fontSize: '13px',
                              color: isLessonActive ? mod.color : done ? 'var(--text-secondary)' : 'var(--text-primary)',
                              lineHeight: '1.4',
                            }}>
                              {les.title}
                            </span>
                          </div>
                        );
                      })}
                      {/* Quiz link */}
                      <div
                        onClick={() => navigateTo('quiz', mod.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '7px 12px', borderRadius: '4px',
                          background: currentView === 'quiz' && currentModuleId === mod.id ? mod.color + '15' : 'transparent',
                          cursor: 'pointer', marginTop: '2px',
                        }}
                      >
                        <span style={{ fontSize: '12px', width: '16px', textAlign: 'center', color: modProgress.quizPassed ? 'var(--success)' : 'var(--text-secondary)' }}>
                          {modProgress.quizPassed ? '✓' : '□'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: modProgress.quizPassed ? 'var(--success)' : 'var(--text-primary)' }}>
                          Module Quiz
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar — W3Schools style green bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: '44px', minHeight: '44px',
          background: 'var(--bg-secondary)',
          borderBottom: '2px solid var(--accent)',
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigateTo('roadmap')}>
              Home
            </span>
            {module && (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>/</span>
                <span style={{ color: currentView === 'module' ? 'var(--text-primary)' : 'var(--accent)', cursor: 'pointer' }}
                  onClick={() => navigateTo('module', module.id)}>
                  {module.title}
                </span>
              </>
            )}
            {lesson && (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>/</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{lesson.title}</span>
              </>
            )}
            {currentView === 'quiz' && (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>/</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Quiz</span>
              </>
            )}
          </div>

          {/* Back to canvas */}
          <button onClick={closeLessons} style={{
            padding: '6px 14px', background: 'var(--accent)',
            border: 'none', borderRadius: '4px', color: '#fff',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Simulator
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 32px' }}>
            {currentView === 'roadmap' && <RoadmapView />}
            {currentView === 'module' && module && <ModuleView module={module} />}
            {currentView === 'lesson' && module && lesson && (
              <>
                <LessonViewer module={module} lesson={lesson} />

                {/* W3Schools-style prev/next navigation */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0', marginTop: '24px',
                  borderTop: '1px solid var(--border-color)',
                }}>
                  {prevLesson ? (
                    <button onClick={() => navigateTo('lesson', module.id, prevLesson.id)}
                      style={{
                        padding: '10px 20px', background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)', borderRadius: '4px',
                        color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                      <span style={{ fontSize: '16px' }}>←</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Previous</div>
                        <div>{prevLesson.title}</div>
                      </div>
                    </button>
                  ) : <div />}

                  {nextLesson ? (
                    <button onClick={() => navigateTo('lesson', module.id, nextLesson.id)}
                      style={{
                        padding: '10px 20px', background: 'var(--accent)',
                        border: 'none', borderRadius: '4px',
                        color: '#fff', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>Next</div>
                        <div>{nextLesson.title}</div>
                      </div>
                      <span style={{ fontSize: '16px' }}>→</span>
                    </button>
                  ) : (
                    <button onClick={() => navigateTo('quiz', module.id)}
                      style={{
                        padding: '10px 20px', background: 'var(--accent)',
                        border: 'none', borderRadius: '4px',
                        color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
                      }}>
                      Take Quiz →
                    </button>
                  )}
                </div>
              </>
            )}
            {currentView === 'quiz' && module && <QuizView module={module} />}
          </div>
        </div>
      </div>
    </div>
  );
}
