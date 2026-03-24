import type { PluginModule } from '@netx/sdk';

/**
 * Plugin Registry
 *
 * To install a new plugin:
 * 1. Add the package as a dependency in shell/package.json
 * 2. Import the plugin module below
 * 3. Add it to the plugins array
 *
 * That's it — the core app discovers and loads everything automatically.
 * No need to edit Shell.tsx, main.tsx, or any other core file.
 */

import { basicDevicesPlugin } from '@netx/plugin-basic-devices';
import { cliSimulatorPlugin } from '@netx/plugin-cli-simulator';
import { packetEnginePlugin } from '@netx/plugin-packet-engine';
import { labSystemPlugin } from '@netx/plugin-lab-system';
import { helloWorldPlugin } from '@netx/plugin-hello-world';

export const plugins: PluginModule[] = [
  basicDevicesPlugin,
  cliSimulatorPlugin,
  packetEnginePlugin,
  labSystemPlugin,
  helloWorldPlugin,
];
