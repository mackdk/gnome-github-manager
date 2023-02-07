import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

export enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export class Logger {
    public static globalLoggingLevel: LogLevel = LogLevel.INFO;

    private readonly loggerName: string;
    private readonly logLevel?: LogLevel;

    public constructor(loggerName: string, logLevel? : LogLevel) {
        this.loggerName = loggerName;
        this.logLevel = logLevel;
    }

    public isDebugEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public debug(format: string, ...args: any[]) {
        this.addLog(LogLevel.DEBUG, format, ...args);
    }

    public isInfoEnabled(): boolean {
        return this.isEnabled(LogLevel.INFO);
    }

    public info(format: string, ...args: any[]) {
        this.addLog(LogLevel.INFO, format, ...args);
    }

    public isWarnEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public warn(format: string, ...args: any[]) {
        this.addLog(LogLevel.WARN, format, ...args);
    }

    public isErrorEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public error(format: string, ...args: any[]) {
        this.addLog(LogLevel.ERROR, format, ...args);
    }

    private isEnabled(levelToCheck: LogLevel) {
        const currentLoggerLevel = this.logLevel || Logger.globalLoggingLevel;
        return levelToCheck >= currentLoggerLevel;
    }

    private addLog(level: LogLevel, format: string, ...args: any[]) {
        if (!this.isEnabled(level)) {
            return;
        }

        let err : unknown | undefined = undefined;
        if (this.hasErrorParameter(format, args?.length || 0)) {
            err = args.pop();
        }

        const message = this.format(format, ...args);
        const logMessage = `[${getCurrentExtension().metadata.name} Extension] ${this.loggerName} ${LogLevel[level]} ${message}`;

        if (err instanceof Error) {
            logError(err, logMessage);
        } else if (typeof err === 'string') {
            log(`${logMessage} - ${err}`);
        } else if (err !== undefined) {
            log(`${logMessage} - Additional object of type ${typeof err}: ${err}`);
        } else {
            log(logMessage);
        }
    }

    private hasErrorParameter(message: string, numArguments: number): boolean {
        if (numArguments == 0) {
            return false;
        }

        return message.indexOf(`{${numArguments - 1}}`) == -1;
    }

    private format(format: string, ...args: any[]): string {
        return format.replace(/{(\d+)}/g, function(match, number) {
            return args[number] || match;
        });
    }
}
