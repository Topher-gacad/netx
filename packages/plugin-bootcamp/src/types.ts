// ============================================================
// CURRICULUM STRUCTURE
// ============================================================

export interface Curriculum {
  id: string;
  title: string;
  modules: BootcampModule[];
}

export interface BootcampModule {
  id: string;
  number: number;
  title: string;
  description: string;
  color: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  prerequisites: string[];
  lessons: Lesson[];
  quiz: Quiz;
  badge: BadgeDefinition;
  labIds: string[];
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  type: 'theory' | 'lab';
  content?: TheoryContent;
  labId?: string;
  estimatedMinutes: number;
}

// ============================================================
// THEORY CONTENT
// ============================================================

export interface TheoryContent {
  sections: TheorySection[];
}

export type TheorySection =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'key-concept'; text: string }
  | { type: 'code-block'; code: string }
  | { type: 'key-term'; term: string; definition: string }
  | { type: 'comparison-table'; headers: string[]; rows: string[][] }
  | { type: 'analogy'; text: string }
  | { type: 'diagram'; diagram: DiagramDefinition };

export interface DiagramDefinition {
  type: 'network-topology' | 'osi-layers' | 'packet-flow' | 'subnet-visual' | 'custom';
  data: Record<string, unknown>;
  caption?: string;
}

// ============================================================
// QUIZZES
// ============================================================

export interface Quiz {
  id: string;
  moduleId: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  explanation: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

// ============================================================
// BADGES
// ============================================================

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// ============================================================
// PROGRESS TRACKING
// ============================================================

export interface BootcampProgress {
  startedAt: number;
  currentModuleId: string | null;
  modules: Record<string, ModuleProgress>;
  badges: string[];
  totalXP: number;
  quizAttempts: Record<string, QuizAttempt[]>;
}

export interface ModuleProgress {
  moduleId: string;
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  lessonsCompleted: string[];
  quizPassed: boolean;
  quizHighScore: number;
  startedAt?: number;
  completedAt?: number;
  xpEarned: number;
}

export interface QuizAttempt {
  quizId: string;
  attemptNumber: number;
  score: number;
  answers: Record<string, string>;
  timestamp: number;
  passed: boolean;
}
