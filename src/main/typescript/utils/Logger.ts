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
    public static globalLoggingLevel: LogLevel = LogLevel.INFO;

    private static EXT_PREFIX: string = `${getCurrentExtension().metadata.name} Extension`;

    private readonly loggerName: string;
    private readonly logLevel?: LogLevel;

    public constructor(loggerName: string, logLevel?: LogLevel) {
        this.loggerName = loggerName;
        this.logLevel = logLevel;
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
        const currentLoggerLevel = this.logLevel ?? Logger.globalLoggingLevel;
        return levelToCheck >= currentLoggerLevel;
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
        if (numArguments == 0) {
            return false;
        }

        return !message.includes(`{${numArguments - 1}}`);
    }

    private format(format: string, ...args: LoggableParameter[]): string {
        return format.replace(/{(\d+)}/g, (match: string, number: number) => args[number]?.toString() ?? match);
    }
}
