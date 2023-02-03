import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

const extensionName: string = getCurrentExtension().metadata.name;

export enum LogLevel {
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

    public debug(message: string, err? : unknown) {
        this.addLog(LogLevel.DEBUG, message, err);
    }

    public info(message: string, err? : unknown) {
        this.addLog(LogLevel.INFO, message, err);
    }

    public warn(message: string, err? : unknown) {
        this.addLog(LogLevel.WARN, message, err);
    }

    public error(message: string, err? : unknown) {
        this.addLog(LogLevel.ERROR, message, err);
    }

    private addLog(level: LogLevel, message: string, err? : unknown) {
        const minimumAllowedLevel = this.logLevel || Logger.globalLoggingLevel;
        if (level < minimumAllowedLevel) {
            return;
        }

        const logMessage = `[${extensionName} Extension] ${this.loggerName} ${LogLevel[level]} ${message}`;

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
}
