import type { PluginManifest } from '@netx/sdk';

export class PluginDependencyCycleError extends Error {
  constructor(public cycle: string[]) {
    super(`Plugin dependency cycle detected: ${cycle.join(' → ')}`);
    this.name = 'PluginDependencyCycleError';
  }
}

export class PluginMissingDependencyError extends Error {
  constructor(public pluginId: string, public missingDep: string) {
    super(`Plugin "${pluginId}" depends on "${missingDep}", which is not registered`);
    this.name = 'PluginMissingDependencyError';
  }
}

export function resolveDependencyOrder(manifests: PluginManifest[]): string[] {
  const ids = new Set(manifests.map((m) => m.id));
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const m of manifests) {
    adjList.set(m.id, []);
    inDegree.set(m.id, 0);
  }

  // Build graph: if A depends on B, B → A (B must load before A)
  for (const m of manifests) {
    for (const dep of m.dependencies ?? []) {
      if (!ids.has(dep)) {
        throw new PluginMissingDependencyError(m.id, dep);
      }
      adjList.get(dep)!.push(m.id);
      inDegree.set(m.id, (inDegree.get(m.id) ?? 0) + 1);
    }
  }

  // Kahn's algorithm — topological sort
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjList.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If we didn't visit all nodes, there's a cycle
  if (sorted.length !== manifests.length) {
    const remaining = manifests
      .filter((m) => !sorted.includes(m.id))
      .map((m) => m.id);
    throw new PluginDependencyCycleError(remaining);
  }

  return sorted;
}
