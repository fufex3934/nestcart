/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, body } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId = request['correlationId'];

    const startTime = Date.now();

    // Log request (sanitize sensitive data)
    this.logger.log({
      correlationId,
      type: 'request',
      method,
      url,
      ip,
      userAgent,
      body: this.sanitizeData(body),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log response
          const duration = Date.now() - startTime;
          this.logger.log({
            correlationId,
            type: 'response',
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            response: this.sanitizeData(data),
          });
        },
        error: (error) => {
          // Error is already logged by exception filter
          const duration = Date.now() - startTime;
          this.logger.error({
            correlationId,
            type: 'error',
            method,
            url,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Create a copy to avoid modifying original
    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
