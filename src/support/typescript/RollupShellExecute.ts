import { spawnSync } from 'child_process';
import { Plugin, PluginContext } from 'rollup';

/**
 * Rollup plugin to execute a shell command. All the existing plugins do not prevent emitting the bundle
 * when the return value of the command is non-zero.
 */
export function shellExecute(args: string[]): Plugin {

    return {
        name: 'shell-execute',
        generateBundle: function(this: PluginContext) {
            for (const command of args) {
                const result = spawnSync(command, { shell: true, stdio: 'inherit' });
                if (result.status !== 0) {
                    this.error(`Execution of ${command} resulted in status ${result.status}`);
                }
            }
        },
    };
}
