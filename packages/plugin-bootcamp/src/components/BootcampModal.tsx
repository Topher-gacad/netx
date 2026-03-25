import { useStore } from 'zustand';
import { bootcampStore, navigateTo } from '../bootcamp-store.js';
import { curriculum } from '../curriculum/index.js';
import { RoadmapView } from './RoadmapView.js';
import { ModuleView } from './ModuleView.js';
import { LessonViewer } from './LessonViewer.js';
import { QuizView } from './QuizView.js';

export function BootcampModal() {
  const { currentView, currentModuleId, currentLessonId } = useStore(bootcampStore);

  const module = currentModuleId ? curriculum.modules.find((m) => m.id === currentModuleId) : null;
  const lesson = module && currentLessonId ? module.lessons.find((l) => l.id === currentLessonId) : null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Breadcrumb nav */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
        borderBottom: '1px solid var(--border-color)', fontSize: '13px', flexWrap: 'wrap',
      }}>
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={() => navigateTo('roadmap')}
        >
          Lessons
        </span>
        {module && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>&rsaquo;</span>
            <span
              style={{ color: currentView === 'module' ? 'var(--text-primary)' : 'var(--accent)', cursor: 'pointer' }}
              onClick={() => navigateTo('module', module.id)}
            >
              {module.title}
            </span>
          </>
        )}
        {lesson && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>&rsaquo;</span>
            <span style={{ color: 'var(--text-primary)' }}>{lesson.title}</span>
          </>
        )}
        {currentView === 'quiz' && module && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>&rsaquo;</span>
            <span style={{ color: 'var(--text-primary)' }}>Quiz</span>
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {currentView === 'roadmap' && <RoadmapView />}
        {currentView === 'module' && module && <ModuleView module={module} />}
        {currentView === 'lesson' && module && lesson && <LessonViewer module={module} lesson={lesson} />}
        {currentView === 'quiz' && module && <QuizView module={module} />}
      </div>
    </div>
  );
}
