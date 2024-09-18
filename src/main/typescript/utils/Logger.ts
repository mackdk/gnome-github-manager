import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';

import { formatString, readonlyMap, removeAfter as stripAfter } from './utilities';

export enum LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export class Logger {
    private static readonly ROOT_SCOPE: string = 'root';

    private static readonly SCOPE_DEFINITION_REGEX: RegExp = /^\s*(\w+(::\w+)*)\s=\s(TRACE|DEBUG|INFO|WARN|ERROR)\s*$/;

    private static readonly DEFAULT_DOMAIN: string = 'DefaultDomain';

    private static rootLogLevel: LogLevel = LogLevel.INFO;
    private static scopeLevelsMap: Map<string, LogLevel> = new Map<string, LogLevel>();

    private static domainName: string = Logger.DEFAULT_DOMAIN;

    private readonly loggerName: string;
    private readonly logLevel: LogLevel;

    public static initialize(domain?: string): void {
        Logger.resetConfiguration();

        if (domain !== undefined) {
            Logger.domainName = domain;
        }

        const config = Gio.File.new_for_path(`${GLib.get_user_data_dir()}/gnome-github-manager/logging.properties`);
        if (!config.query_exists(null)) {
            // No configuration file, nothing to do
            return;
        }

        try {
            const [success, bytes] = config.load_contents(null);
            if (!success) {
                throw new Error('Loading data was not successfull');
            }

            const configurationFile = new TextDecoder('utf-8').decode(bytes.buffer);
            configurationFile
                .split('\n') // Divide into single lines
                .map((line) => stripAfter(line, '#')) // Remove any comments
                .filter((line) => Logger.SCOPE_DEFINITION_REGEX.exec(line) !== null) // Keep only lines that matches
                .forEach((line) => {
                    // Line is now in the form scope = LEVEL. Split it to extract the components
                    const [scope, level] = line.split('=').map((s) => s.trim());
                    if (scope === Logger.ROOT_SCOPE) {
                        this.rootLogLevel = LogLevel[level as keyof typeof LogLevel];
                    } else {
                        Logger.scopeLevelsMap.set(scope, LogLevel[level as keyof typeof LogLevel]);
                    }
                });
        } catch (error) {
            logError(error, `[${Logger.domainName}] Logger initialization error while loading configuration file`);
        }
    }

    public static get domain(): string {
        return Logger.domainName;
    }

    public static set domain(value: string | undefined) {
        if (value !== undefined) {
            this.domainName = value;
        } else {
            this.domainName = Logger.DEFAULT_DOMAIN;
        }
    }

    public static get rootLevel(): LogLevel {
        return Logger.rootLogLevel;
    }

    public static set rootLevel(value: LogLevel) {
        Logger.rootLogLevel = value;
    }

    public static setLevelForScope(scope: string, level: LogLevel): void {
        Logger.scopeLevelsMap.set(scope, level);
    }

    public static get scopeLevelsConfiguration(): ReadonlyMap<string, LogLevel> {
        return readonlyMap(Logger.scopeLevelsMap);
    }

    public static resetConfiguration(): void {
        Logger.rootLogLevel = LogLevel.INFO;
        Logger.scopeLevelsMap = new Map<string, LogLevel>();
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

    public constructor(loggerName: string, logLevel?: LogLevel) {
        this.loggerName = loggerName;
        this.logLevel = logLevel ?? Logger.findLogLevel(loggerName);
    }

    public isTraceEnabled(): boolean {
        return this.isEnabled(LogLevel.TRACE);
    }

    public trace(format: string, ...args: unknown[]): void {
        this.addLog(LogLevel.TRACE, format, ...args);
    }

    public isDebugEnabled(): boolean {
        return this.isEnabled(LogLevel.DEBUG);
    }

    public debug(format: string, ...args: unknown[]): void {
        this.addLog(LogLevel.DEBUG, format, ...args);
    }

    public isInfoEnabled(): boolean {
        return this.isEnabled(LogLevel.INFO);
    }

    public info(format: string, ...args: unknown[]): void {
        this.addLog(LogLevel.INFO, format, ...args);
    }

    public isWarnEnabled(): boolean {
        return this.isEnabled(LogLevel.WARN);
    }

    public warn(format: string, ...args: unknown[]): void {
        this.addLog(LogLevel.WARN, format, ...args);
    }

    public isErrorEnabled(): boolean {
        return this.isEnabled(LogLevel.ERROR);
    }

    public error(format: string, ...args: unknown[]): void {
        this.addLog(LogLevel.ERROR, format, ...args);
    }

    private isEnabled(levelToCheck: LogLevel): boolean {
        return levelToCheck >= this.logLevel;
    }

    private addLog(level: LogLevel, format: string, ...args: unknown[]): void {
        if (!this.isEnabled(level)) {
            return;
        }

        let err: unknown = undefined;
        if (this.hasErrorParameter(format, args.length)) {
            err = args.pop();
        }

        const message = formatString(format, ...args);
        const logMessage = `[${Logger.domainName}] ${this.loggerName} ${LogLevel[level]} ${message}`;

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
}
