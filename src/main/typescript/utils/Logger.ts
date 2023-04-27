import { File } from '@gi-types/gio2';
import { free, get_user_data_dir } from '@gi-types/glib2';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

export enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export type LoggableParameter = number | string | bigint | symbol | object | unknown;

export class Logger {
    private static readonly ROOT_SCOPE: string = 'root';

    private static rootLogLevel: LogLevel = LogLevel.INFO;
    private static scopeLevelsMap: Map<string, LogLevel> = new Map<string, LogLevel>();

    private static EXT_PREFIX: string = `${getCurrentExtension().metadata.name} Extension`;

    private readonly loggerName: string;
    private readonly logLevel: LogLevel;

    static {
        Logger.rootLogLevel = LogLevel.INFO;
        Logger.scopeLevelsMap = new Map<string, LogLevel>();

        const configuration = File.new_for_path(`${get_user_data_dir()}/gnome-github-manager/logging.properties`);
        if (configuration.query_exists(null)) {
            const [success, bytes] = configuration.load_contents(null);
            if (success) {
                try {
                    const lines = new TextDecoder('utf-8').decode(bytes.buffer).split('\n');
                    lines.forEach((line) => {
                        // Remove any comments
                        if (line.includes('#')) {
                            line = line.substring(0, line.indexOf('#'));
                        }

                        if (line.match(/^\s*(\w+(::\w+)*)\s=\s(TRACE|DEBUG|INFO|WARN|ERROR)\s*$/) !== null) {
                            const [scope, level] = line.split('=').map((s) => s.trim());
                            if (scope === Logger.ROOT_SCOPE) {
                                this.rootLogLevel = LogLevel[level as keyof typeof LogLevel];
                            } else {
                                Logger.scopeLevelsMap.set(scope, LogLevel[level as keyof typeof LogLevel]);
                            }
                        }
                    });
                } finally {
                    free(bytes);
                }
            } else {
                log(`[${Logger.EXT_PREFIX}] Logger initialization ERROR Unable to load configuration file`);
            }
        }
    }

    private static findLogLevel(loggerName: string): LogLevel {
        if (Logger.scopeLevelsMap.size === 0) {
            return Logger.rootLogLevel;
        }

        const level = Logger.scopeLevelsMap.get(loggerName);
        if (level !== undefined) {
            return level;
        }

        if (loggerName.includes('::')) {
            return this.findLogLevel(loggerName.substring(0, loggerName.lastIndexOf('::')));
        }

        return Logger.rootLogLevel;
    }

    public constructor(loggerName: string) {
        this.loggerName = loggerName;
        this.logLevel = Logger.findLogLevel(loggerName);
    }

    public isTraceEnabled(): boolean {
        return this.isEnabled(LogLevel.TRACE);
    }

    public trace(format: string, ...args: LoggableParameter[]): void {
        this.addLog(LogLevel.TRACE, format, ...args);
    }

    public isDebugEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public debug(format: string, ...args: LoggableParameter[]): void {
        this.addLog(LogLevel.DEBUG, format, ...args);
    }

    public isInfoEnabled(): boolean {
        return this.isEnabled(LogLevel.INFO);
    }

    public info(format: string, ...args: LoggableParameter[]): void {
        this.addLog(LogLevel.INFO, format, ...args);
    }

    public isWarnEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public warn(format: string, ...args: LoggableParameter[]): void {
        this.addLog(LogLevel.WARN, format, ...args);
    }

    public isErrorEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public error(format: string, ...args: LoggableParameter[]): void {
        this.addLog(LogLevel.ERROR, format, ...args);
    }

    private isEnabled(levelToCheck: LogLevel): boolean {
        return levelToCheck >= this.logLevel;
    }

    private addLog(level: LogLevel, format: string, ...args: LoggableParameter[]): void {
        if (!this.isEnabled(level)) {
            return;
        }

        let err: unknown | undefined = undefined;
        if (this.hasErrorParameter(format, args.length)) {
            err = args.pop();
        }

        const message = this.format(format, ...args);
        const logMessage = `[${Logger.EXT_PREFIX}] ${this.loggerName} ${LogLevel[level]} ${message}`;

        if (err instanceof Error) {
            logError(err, logMessage);
        } else if (typeof err === 'string') {
            log(`${logMessage} - ${err}`);
        } else if (err !== undefined) {
            log(`${logMessage} - Additional object of type ${typeof err}: ${err?.toString() ?? '(n/a)'}`);
        } else {
            log(logMessage);
        }
    }

    private hasErrorParameter(message: string, numArguments: number): boolean {
        if (numArguments === 0) {
            return false;
        }

        return !message.includes(`{${numArguments - 1}}`);
    }

    private format(format: string, ...args: LoggableParameter[]): string {
        return format.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
    }
}
