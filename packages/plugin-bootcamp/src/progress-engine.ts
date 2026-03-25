import type { BootcampProgress, ModuleProgress, QuizAttempt, BootcampModule, Curriculum } from './types.js';

const XP = {
  THEORY_LESSON: 10,
  LAB_COMPLETE: 25,
  QUIZ_FIRST_PASS: 50,
  QUIZ_RETRY_PASS: 25,
  BADGE_EARNED: 100,
  MODULE_COMPLETE: 50,
};

export function initializeProgress(): BootcampProgress {
  return {
    startedAt: Date.now(),
    currentModuleId: null,
    modules: {},
    badges: [],
    totalXP: 0,
    quizAttempts: {},
  };
}

export function getModuleProgress(progress: BootcampProgress, moduleId: string): ModuleProgress {
  return progress.modules[moduleId] ?? {
    moduleId,
    status: 'locked',
    lessonsCompleted: [],
    quizPassed: false,
    quizHighScore: 0,
    xpEarned: 0,
  };
}

export function markLessonComplete(
  progress: BootcampProgress,
  lessonId: string,
  moduleId: string,
  lessonType: 'theory' | 'lab',
): BootcampProgress {
  const mod = getModuleProgress(progress, moduleId);

  if (mod.lessonsCompleted.includes(lessonId)) return progress;

  const xpGain = lessonType === 'theory' ? XP.THEORY_LESSON : XP.LAB_COMPLETE;

  return {
    ...progress,
    currentModuleId: moduleId,
    totalXP: progress.totalXP + xpGain,
    modules: {
      ...progress.modules,
      [moduleId]: {
        ...mod,
        status: mod.status === 'locked' ? 'in-progress' : mod.status === 'available' ? 'in-progress' : mod.status,
        lessonsCompleted: [...mod.lessonsCompleted, lessonId],
        startedAt: mod.startedAt ?? Date.now(),
        xpEarned: mod.xpEarned + xpGain,
      },
    },
  };
}

export function recordQuizAttempt(
  progress: BootcampProgress,
  attempt: QuizAttempt,
  moduleId: string,
): BootcampProgress {
  const mod = getModuleProgress(progress, moduleId);
  const existingAttempts = progress.quizAttempts[attempt.quizId] ?? [];
  const isFirstPass = attempt.passed && !mod.quizPassed;
  const isRetryPass = attempt.passed && existingAttempts.length > 0 && !mod.quizPassed;

  let xpGain = 0;
  if (isFirstPass && existingAttempts.length === 0) xpGain = XP.QUIZ_FIRST_PASS;
  else if (isRetryPass) xpGain = XP.QUIZ_RETRY_PASS;

  return {
    ...progress,
    totalXP: progress.totalXP + xpGain,
    quizAttempts: {
      ...progress.quizAttempts,
      [attempt.quizId]: [...existingAttempts, attempt],
    },
    modules: {
      ...progress.modules,
      [moduleId]: {
        ...mod,
        quizPassed: mod.quizPassed || attempt.passed,
        quizHighScore: Math.max(mod.quizHighScore, attempt.score),
        xpEarned: mod.xpEarned + xpGain,
      },
    },
  };
}

export function checkModuleComplete(
  progress: BootcampProgress,
  module: BootcampModule,
): BootcampProgress {
  const mod = getModuleProgress(progress, module.id);
  const allLessonsComplete = module.lessons.every((l) => mod.lessonsCompleted.includes(l.id));
  const quizPassed = mod.quizPassed;

  if (allLessonsComplete && quizPassed && mod.status !== 'completed') {
    const xpGain = XP.MODULE_COMPLETE + XP.BADGE_EARNED;
    return {
      ...progress,
      totalXP: progress.totalXP + xpGain,
      badges: [...progress.badges, module.badge.id],
      modules: {
        ...progress.modules,
        [module.id]: {
          ...mod,
          status: 'completed',
          completedAt: Date.now(),
          xpEarned: mod.xpEarned + xpGain,
        },
      },
    };
  }
  return progress;
}

export function computeModuleStatuses(
  progress: BootcampProgress,
  curriculum: Curriculum,
): BootcampProgress {
  let updated = { ...progress };

  for (const module of curriculum.modules) {
    const mod = getModuleProgress(updated, module.id);

    if (mod.status === 'completed') continue;

    // All modules are available (unlocked) — progress is still tracked
    if (mod.status === 'locked') {
      updated = {
        ...updated,
        modules: {
          ...updated.modules,
          [module.id]: { ...mod, status: 'available' },
        },
      };
    }
  }

  return updated;
}

export function getNextStep(
  progress: BootcampProgress,
  curriculum: Curriculum,
): { moduleId: string; lessonId?: string } | null {
  for (const module of curriculum.modules) {
    const mod = getModuleProgress(progress, module.id);
    if (mod.status === 'completed') continue;
    if (mod.status === 'locked') continue;

    // Find first incomplete lesson
    for (const lesson of module.lessons) {
      if (!mod.lessonsCompleted.includes(lesson.id)) {
        return { moduleId: module.id, lessonId: lesson.id };
      }
    }

    // All lessons done, quiz not passed
    if (!mod.quizPassed) {
      return { moduleId: module.id };
    }
  }
  return null;
}

export function getOverallProgress(progress: BootcampProgress, totalModules: number): number {
  const completed = Object.values(progress.modules).filter((m) => m.status === 'completed').length;
  return Math.round((completed / totalModules) * 100);
}
