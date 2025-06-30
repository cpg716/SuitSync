import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logStreams: Map<string, NodeJS.WritableStream> = new Map();
  private readonly logDir = join(process.cwd(), 'logs');
  private readonly isDevelopment = process.env.NODE_ENV === 'development';
  private readonly logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.ensureLogDirectory();
    this.setupLogStreams();
    this.setupGracefulShutdown();
  }

  private ensureLogDirectory() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private setupLogStreams() {
    const today = new Date().toISOString().split('T')[0];

    // Create log streams for different levels
    this.logStreams.set('combined', createWriteStream(
      join(this.logDir, `combined-${today}.log`),
      { flags: 'a' }
    ));

    this.logStreams.set('error', createWriteStream(
      join(this.logDir, `error-${today}.log`),
      { flags: 'a' }
    ));

    this.logStreams.set('access', createWriteStream(
      join(this.logDir, `access-${today}.log`),
      { flags: 'a' }
    ));
  }

  private setupGracefulShutdown() {
    const cleanup = () => {
      this.logStreams.forEach(stream => {
        if (stream && typeof stream.end === 'function') {
          stream.end();
        }
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('exit', cleanup);
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatLogEntry(level: LogLevel, message: string, meta?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      meta,
    };
  }

  private writeToFile(level: LogLevel, entry: LogEntry) {
    const logLine = JSON.stringify(entry) + '\n';

    // Write to combined log
    const combinedStream = this.logStreams.get('combined');
    if (combinedStream) {
      combinedStream.write(logLine);
    }

    // Write errors to separate error log
    if (level === 'error') {
      const errorStream = this.logStreams.get('error');
      if (errorStream) {
        errorStream.write(logLine);
      }
    }
  }

  private log(level: LogLevel, message: string, meta?: any) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLogEntry(level, message, meta);

    // Console output in development
    if (this.isDevelopment) {
      const consoleMethod = level === 'debug' ? 'debug' :
                           level === 'info' ? 'info' :
                           level === 'warn' ? 'warn' : 'error';

      console[consoleMethod](`[${entry.level}] ${entry.message}`, meta || '');
    }

    // File output in all environments
    this.writeToFile(level, entry);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  // HTTP access logging
  access(req: any, res: any, responseTime: number) {
    const entry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      contentLength: res.get('Content-Length'),
    };

    const accessStream = this.logStreams.get('access');
    if (accessStream) {
      accessStream.write(JSON.stringify(entry) + '\n');
    }
  }

  // Structured logging with context
  withContext(context: { requestId?: string; userId?: number; ip?: string; userAgent?: string }) {
    return {
      debug: (message: string, meta?: any) => this.log('debug', message, { ...meta, ...context }),
      info: (message: string, meta?: any) => this.log('info', message, { ...meta, ...context }),
      warn: (message: string, meta?: any) => this.log('warn', message, { ...meta, ...context }),
      error: (message: string, meta?: any) => this.log('error', message, { ...meta, ...context }),
    };
  }
}

const logger = new Logger();
export default logger;