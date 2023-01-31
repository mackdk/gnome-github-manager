
const extensionName: string = imports.misc.extensionUtils.getCurrentExtension().metadata.name;

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export class Logger {
    public static GLOBAL_LOGGING_LEVEL : LogLevel = LogLevel.INFO;

    private readonly loggerName: string;
    private readonly logLevel: LogLevel;

    public constructor(loggerName: string, logLevel : LogLevel = Logger.GLOBAL_LOGGING_LEVEL) {
        this.loggerName = loggerName;
        this.logLevel = logLevel;
    }

    public debug(message: string, err? : unknown) {
        this.log(LogLevel.DEBUG, message, err);
    }

    public info(message: string, err? : unknown) {
        this.log(LogLevel.INFO, message, err);
    }

    public warn(message: string, err? : unknown) {
        this.log(LogLevel.WARN, message, err);
    }

    public error(message: string, err? : unknown) {
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
