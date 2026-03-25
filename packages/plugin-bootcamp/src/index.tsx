import type { PluginModule } from '@netx/sdk';
import { LessonsPage } from './components/LessonsPage.js';
import { ProgressPanel } from './components/ProgressPanel.js';
import { bootcampStore, openLessons, updateProgress } from './bootcamp-store.js';
import { curriculum } from './curriculum/index.js';
import { computeModuleStatuses } from './progress-engine.js';
import type { BootcampProgress } from './types.js';

// Export for Shell to render
export { LessonsPage } from './components/LessonsPage.js';
export { bootcampStore } from './bootcamp-store.js';

export const lessonsPlugin: PluginModule = {
  manifest: {
    id: 'netx.lessons',
    name: 'Networking Lessons',
    version: '0.1.0',
    description: 'Complete networking curriculum — zero to job-ready.',
    dependencies: ['netx.lab-system'],
  },

  activate(ctx) {
    let progress = bootcampStore.getState().progress;
    progress = computeModuleStatuses(progress, curriculum);
    updateProgress(progress);

    // Register progress panel in right slot
    ctx.onDispose(
      ctx.ui.registerPanel({
        id: 'lessons-progress',
        slot: 'right',
        label: 'Lessons',
        component: ProgressPanel,
        priority: -2,
      }),
    );

    // Toolbar button — switches to Lessons mode
    ctx.onDispose(
      ctx.ui.registerToolbarItem({
        id: 'lessons-open',
        group: 'learn',
        label: 'Lessons',
        icon: ({ size }: { size: number }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        ),
        onClick: () => openLessons(),
        tooltip: 'Open Networking Lessons',
        priority: 14,
      }),
    );

    // Status bar
    ctx.onDispose(
      ctx.ui.registerStatusBarItem({
        id: 'lessons-progress-status',
        align: 'right',
        component: () => {
          const p = bootcampStore.getState().progress;
          const done = Object.values(p.modules).filter((m) => m.status === 'completed').length;
          return (
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Lessons: <span style={{ color: 'var(--accent)' }}>{done}/{curriculum.modules.length}</span>
            </span>
          );
        },
        priority: 29,
      }),
    );

    // Listen for lab completions
    ctx.onDispose(
      ctx.events.on('lab:completed', (payload: unknown) => {
        const { labId } = payload as { labId: string };
        for (const module of curriculum.modules) {
          for (const lesson of module.lessons) {
            if (lesson.type === 'lab' && lesson.labId === labId) {
              let p = bootcampStore.getState().progress;
              const mod = p.modules[module.id];
              if (mod && !mod.lessonsCompleted.includes(lesson.id)) {
                p = {
                  ...p,
                  modules: {
                    ...p.modules,
                    [module.id]: {
                      ...mod,
                      lessonsCompleted: [...mod.lessonsCompleted, lesson.id],
                    },
                  },
                };
                p = computeModuleStatuses(p, curriculum);
                updateProgress(p);
              }
            }
          }
        }
      }),
    );

    // Listen for lab launch requests
    window.addEventListener('bootcamp:launch-lab', ((e: CustomEvent) => {
      ctx.events.emit('bootcamp:launch-lab', { labId: e.detail.labId });
    }) as EventListener);

    // Persistence
    ctx.onSave(() => bootcampStore.getState().progress);
    ctx.onRestore((data: unknown) => {
      if (data && typeof data === 'object' && 'startedAt' in (data as Record<string, unknown>)) {
        let p = data as BootcampProgress;
        p = computeModuleStatuses(p, curriculum);
        updateProgress(p);
      }
    });

    console.log('[Lessons] Plugin activated — 10 modules loaded');
  },
};
