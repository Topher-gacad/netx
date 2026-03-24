export type ObjectiveType =
  | 'device-exists'
  | 'connection-exists'
  | 'device-count'
  | 'connection-count'
  | 'ip-configured'
  | 'interface-up'
  | 'ping-success'
  | 'hostname-set'
  | 'custom';

export interface LabObjective {
  id: string;
  description: string;
  type: ObjectiveType;
  params: Record<string, unknown>;
  hint?: string;
}

export interface Lab {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  objectives: LabObjective[];
  instructions: string[];
}

export interface LabProgress {
  labId: string;
  completed: Set<string>;
  startedAt: number;
  completedAt?: number;
}
