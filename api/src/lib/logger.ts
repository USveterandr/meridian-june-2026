export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }

  private format(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data,
    };
    // In Workers, JSON.stringify is the best way to ensure logs are structured
    // for log aggregators like Axiom or Cloudflare Logs.
    return JSON.stringify(logObj);
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) console.log(this.format('debug', message, data));
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) console.log(this.format('info', message, data));
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) console.warn(this.format('warn', message, data));
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) console.error(this.format('error', message, data));
  }
}

export const logger = new Logger();
