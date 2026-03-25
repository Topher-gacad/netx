import { createStore } from 'zustand/vanilla';
import type { BootcampProgress } from './types.js';
import { initializeProgress } from './progress-engine.js';

export interface BootcampState {
  progress: BootcampProgress;
  active: boolean;
  currentView: 'roadmap' | 'module' | 'lesson' | 'quiz';
  currentModuleId: string | null;
  currentLessonId: string | null;
}

// Check URL hash on init
function getInitialState(): Partial<BootcampState> {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'lessons') {
    return {
      active: true,
      currentModuleId: parts[1] || null,
      currentLessonId: parts[2] || null,
      currentView: parts[3] === 'quiz' ? 'quiz' : (parts[2] ? 'lesson' : (parts[1] ? 'module' : 'roadmap')),
    };
  }
  return { active: false };
}

const initial = getInitialState();

export const bootcampStore = createStore<BootcampState>(() => ({
  progress: initializeProgress(),
  active: initial.active ?? false,
  currentView: initial.currentView ?? 'roadmap',
  currentModuleId: initial.currentModuleId ?? null,
  currentLessonId: initial.currentLessonId ?? null,
}));

// Sync URL hash when navigation changes
function syncHash(state: BootcampState) {
  if (!state.active) {
    if (window.location.hash.startsWith('#/lessons')) {
      window.location.hash = '#/canvas';
    }
    return;
  }

  let path = '#/lessons';
  if (state.currentModuleId) {
    path += `/${state.currentModuleId}`;
    if (state.currentLessonId) {
      path += `/${state.currentLessonId}`;
    } else if (state.currentView === 'quiz') {
      path += '/quiz';
    }
  }

  if (window.location.hash !== path) {
    window.location.hash = path;
  }
}

bootcampStore.subscribe(syncHash);

// Listen for browser back/forward
window.addEventListener('hashchange', () => {
  const newState = getInitialState();
  const current = bootcampStore.getState();

  if (newState.active !== current.active ||
      newState.currentModuleId !== current.currentModuleId ||
      newState.currentLessonId !== current.currentLessonId) {
    bootcampStore.setState({
      active: newState.active ?? false,
      currentView: newState.currentView ?? 'roadmap',
      currentModuleId: newState.currentModuleId ?? null,
      currentLessonId: newState.currentLessonId ?? null,
    });
  }
});

export function openLessons() {
  bootcampStore.setState({ active: true, currentView: 'roadmap' });
}

export function closeLessons() {
  bootcampStore.setState({ active: false });
}

export function navigateTo(view: BootcampState['currentView'], moduleId?: string, lessonId?: string) {
  bootcampStore.setState({
    active: true,
    currentView: view,
    currentModuleId: moduleId ?? null,
    currentLessonId: lessonId ?? null,
  });
}

export function updateProgress(progress: BootcampProgress) {
  bootcampStore.setState({ progress });
}
