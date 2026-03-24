import type { CanvasAPI, EventBus } from '@netx/sdk';
import type { LabObjective } from './lab-types.js';

// CLI config registry — populated via events
const deviceConfigs = new Map<string, {
  hostname: string;
  interfaces: Map<string, { ip?: string; mask?: string; shutdown: boolean }>;
}>();

export function updateDeviceConfig(deviceId: string, config: {
  hostname: string;
  interfaces: Map<string, { ip?: string; mask?: string; shutdown: boolean }>;
}) {
  deviceConfigs.set(deviceId, config);
}

// Track successful pings
const successfulPings = new Set<string>();

export function recordPingSuccess(sourceId: string, targetIP: string) {
  successfulPings.add(`${sourceId}→${targetIP}`);
}

export function resetValidationState() {
  successfulPings.clear();
}

export function checkObjective(objective: LabObjective, canvasAPI: CanvasAPI): boolean {
  const { type, params } = objective;

  switch (type) {
    case 'device-exists': {
      const deviceType = params.deviceType as string;
      const devices = canvasAPI.getDevices();
      return devices.some((d) => d.type === deviceType);
    }

    case 'device-count': {
      const deviceType = params.deviceType as string;
      const minCount = params.count as number;
      const devices = canvasAPI.getDevices();
      const count = deviceType === 'any'
        ? devices.length
        : devices.filter((d) => d.type === deviceType).length;
      return count >= minCount;
    }

    case 'connection-exists': {
      const connections = canvasAPI.getConnections();
      return connections.length > 0;
    }

    case 'connection-count': {
      const minCount = params.count as number;
      const connections = canvasAPI.getConnections();
      return connections.length >= minCount;
    }

    case 'ip-configured': {
      const deviceType = params.deviceType as string | undefined;
      const devices = canvasAPI.getDevices();
      const targets = deviceType ? devices.filter((d) => d.type === deviceType) : devices;

      for (const device of targets) {
        const config = deviceConfigs.get(device.id);
        if (!config) return false;
        const hasIP = Array.from(config.interfaces.values()).some((i) => i.ip && i.mask);
        if (!hasIP) return false;
      }
      return targets.length > 0;
    }

    case 'interface-up': {
      const deviceType = params.deviceType as string | undefined;
      const devices = canvasAPI.getDevices();
      const targets = deviceType ? devices.filter((d) => d.type === deviceType) : devices;

      for (const device of targets) {
        const config = deviceConfigs.get(device.id);
        if (!config) return false;
        const hasUp = Array.from(config.interfaces.values()).some((i) => !i.shutdown && i.ip);
        if (!hasUp) return false;
      }
      return targets.length > 0;
    }

    case 'hostname-set': {
      const deviceType = params.deviceType as string | undefined;
      const devices = canvasAPI.getDevices();
      const targets = deviceType ? devices.filter((d) => d.type === deviceType) : devices;

      for (const device of targets) {
        const config = deviceConfigs.get(device.id);
        if (!config) return false;
        // Check if hostname was changed from default
        const defaultNames = ['Router', 'Switch', 'PC', 'Server'];
        const isDefault = defaultNames.some((n) => config.hostname.startsWith(n));
        if (isDefault) return false;
      }
      return targets.length > 0;
    }

    case 'ping-success': {
      return successfulPings.size > 0;
    }

    case 'custom': {
      // Custom objectives are always manually validated
      return false;
    }

    default:
      return false;
  }
}
