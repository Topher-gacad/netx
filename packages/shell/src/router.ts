import { createStore } from 'zustand/vanilla';

export interface AppRoute {
  page: 'canvas' | 'lessons' | 'admin';
  moduleId?: string;
  lessonId?: string;
  view?: string;
}

export const routeStore = createStore<AppRoute>(() => parseHash());

// Parse hash into route: #/lessons/module-03/m03-l02
function parseHash(): AppRoute {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts[0] === 'lessons') {
    return {
      page: 'lessons',
      moduleId: parts[1] || undefined,
      lessonId: parts[2] || undefined,
      view: parts[3] || undefined,
    };
  }
  if (parts[0] === 'admin') {
    return { page: 'admin' };
  }
  return { page: 'canvas' };
}

// Navigate by updating hash
export function navigate(page: string, ...segments: (string | undefined)[]) {
  const path = ['', page, ...segments.filter(Boolean)].join('/');
  window.location.hash = path;
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  routeStore.setState(parseHash());
});

// Route helpers
export function navigateToCanvas() {
  navigate('canvas');
}

export function navigateToLessons(moduleId?: string, lessonId?: string, view?: string) {
  navigate('lessons', moduleId, lessonId, view);
}

export function navigateToAdmin() {
  navigate('admin');
}
