
const extensionName: string = imports.misc.extensionUtils.getCurrentExtension().metadata.name;

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export class Logger {
    static GLOBAL_LOGGING_LEVEL : LogLevel = LogLevel.DEBUG;

    readonly loggerName: string;
    readonly logLevel: LogLevel;

    constructor(loggerName: string, logLevel : LogLevel = Logger.GLOBAL_LOGGING_LEVEL) {
        this.loggerName = loggerName;
        this.logLevel = logLevel;
    }

    debug(message: string, err? : unknown) {
        this.log(LogLevel.DEBUG, message, err);
    }

    info(message: string, err? : unknown) {
        this.log(LogLevel.INFO, message, err);
    }

    warn(message: string, err? : unknown) {
        this.log(LogLevel.WARN, message, err);
    }

    error(message: string, err? : unknown) {
        this.log(LogLevel.ERROR, message, err);
    }

    private log(level: LogLevel, message: string, err? : unknown) {
        if (level < this.logLevel) {
            return;
        }

        const logMessage = `[${extensionName} Extension] ${this.loggerName} ${level} ${message}`;

        if (err instanceof Error) {
            logError(err, logMessage);
        } else if (typeof err === 'string') {
            log(`${logMessage} - ${err}`);
        } else {
            log(logMessage);
        }
    }
}
