export declare enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
}
export declare class Logger {
    private level;
    private prefix;
    constructor(level?: LogLevel, prefix?: string);
    setLevel(level: LogLevel): void;
    private shouldLog;
    private formatMessage;
    trace(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    info(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, context?: string): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map