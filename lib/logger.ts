/**
 * Request/Response Logging Middleware
 * 
 * Provides structured logging with correlation IDs for debugging and monitoring.
 * Logs all API requests and responses with timing information.
 */

import { NextRequest, NextResponse } from 'next/server';

// Generate unique correlation ID for request tracking
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Structured log entry
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  message: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  error?: any;
  metadata?: Record<string, any>;
}

// Logger class
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty print for development
      return JSON.stringify(entry, null, 2);
    }
    // Single line JSON for production (easier for log aggregators)
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: any, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        message: error.message,
        stack: error.stack,
        ...error,
      } : undefined,
    });
  }

  // Log HTTP request
  logRequest(req: NextRequest, correlationId: string) {
    this.info('Incoming request', {
      correlationId,
      method: req.method,
      path: req.nextUrl.pathname,
      query: Object.fromEntries(req.nextUrl.searchParams),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    });
  }

  // Log HTTP response
  logResponse(
    req: NextRequest,
    res: NextResponse,
    correlationId: string,
    startTime: number
  ) {
    const duration = Date.now() - startTime;
    const statusCode = res.status;
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                  statusCode >= 400 ? LogLevel.WARN : 
                  LogLevel.INFO;

    this.log(level, 'Request completed', {
      correlationId,
      method: req.method,
      path: req.nextUrl.pathname,
      statusCode,
      duration,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Middleware wrapper for Next.js API routes
export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();

    // Add correlation ID to request headers
    req.headers.set('x-correlation-id', correlationId);

    logger.logRequest(req, correlationId);

    try {
      const response = await handler(req);
      
      // Add correlation ID to response headers
      response.headers.set('x-correlation-id', correlationId);
      
      logger.logResponse(req, response, correlationId, startTime);
      
      return response;
    } catch (error) {
      logger.error('Request failed', error, {
        correlationId,
        method: req.method,
        path: req.nextUrl.pathname,
      });

      const errorResponse = NextResponse.json(
        { error: 'Internal server error', correlationId },
        { status: 500 }
      );
      errorResponse.headers.set('x-correlation-id', correlationId);
      
      return errorResponse;
    }
  };
}
