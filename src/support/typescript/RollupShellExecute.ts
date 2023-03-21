import { spawnSync } from 'child_process';

import { Plugin, PluginContext } from 'rollup';

/**
 * Rollup plugin to execute a shell command. All the existing plugins do not prevent emitting the bundle
 * when the return value of the command is non-zero.
 */
export function shellExecute(commandsMap: Record<string, string>): Plugin {
    return {
        name: 'shell-execute',
        generateBundle: function (this: PluginContext) {
            for (const key in commandsMap) {
                const command = commandsMap[key];
                const result = spawnSync(command, { shell: true, stdio: 'inherit' });
                if (result.status !== 0) {
                    this.error(`Execution of step '${key}' resulted in non-zero status`);
                }
            }
        },
    };
}
