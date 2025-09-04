// Logger class with levels similar to backend
export class Logger {
  private currentLevel: string = 'info';
  
  // Log level hierarchy (higher levels include lower levels)
  private readonly levels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4
  };

  setLevel(level: string): void {
    this.currentLevel = level.toLowerCase();
  }

  private shouldLog(level: string): boolean {
    const currentLevelNum = this.levels[this.currentLevel as keyof typeof this.levels] ?? 2;
    const messageLevelNum = this.levels[level as keyof typeof this.levels] ?? 2;
    return messageLevelNum >= currentLevelNum;
  }

  private formatMessage(message: any): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message === null) {
      return 'null';
    }
    if (message === undefined) {
      return 'undefined';
    }
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2);
      } catch {
        return String(message);
      }
    }
    return String(message);
  }

  log(level: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    // Format timestamp without milliseconds (like backend: 2025-08-25T06:39:50Z)
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + 'T' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0') + ':' + 
                     String(now.getSeconds()).padStart(2, '0') + 'Z';
    
    const levelUpper = level.toUpperCase();
    
    // ANSI color codes
    const colors = {
      trace: '\x1b[90m',    // Gray
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m'      // Reset
    };
    
    const color = colors[level as keyof typeof colors] || colors.reset;
    
    // Format all arguments
    const formattedArgs = args.map(arg => this.formatMessage(arg)).join(' ');
    
    console.log(`[${timestamp} ${color}${levelUpper.padEnd(5)}\x1b[0m] ${formattedArgs}`);
  }

  trace(...args: any[]): void {
    this.log('trace', ...args);
  }

  debug(...args: any[]): void {
    this.log('debug', ...args);
  }

  info(...args: any[]): void {
    this.log('info', ...args);
  }

  warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  error(...args: any[]): void {
    this.log('error', ...args);
  }
}

// Global logger instance
export const logger = new Logger();
