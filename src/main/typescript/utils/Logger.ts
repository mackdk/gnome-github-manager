
const extensionName: string = imports.misc.extensionUtils.getCurrentExtension().metadata.name;

export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export class Logger {
    static GLOBAL_LOGGING_LEVEL : LogLevel = LogLevel.DEBUG;

    readonly loggerName: string;
    readonly logLevel: LogLevel;

    constructor(loggerName: string, logLevel : LogLevel = Logger.GLOBAL_LOGGING_LEVEL) {
        this.loggerName = loggerName;
        this.logLevel = logLevel;
    }

    debug(message: string, err? : Error) {
        this.log(LogLevel.DEBUG, message, err);
    }

    info(message: string, err? : Error) {
        this.log(LogLevel.INFO, message, err);
    }

    warn(message: string, err? : Error) {
        this.log(LogLevel.WARN, message, err);
    }

    error(message: string, err? : Error) {
        this.log(LogLevel.ERROR, message, err);
    }

    private log(level: LogLevel, message: string, err? : Error) {
        if (level < this.logLevel) {
            return;
        }

        const logMessage = `[${extensionName} Extension] ${this.loggerName} ${level} ${message}`;

        if (err) {
            logError(err, logMessage);
        } else {
            log(logMessage);
        }
    }
}
