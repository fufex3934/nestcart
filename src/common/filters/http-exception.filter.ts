/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request['correlationId'];

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Unknown error';
    let details: any = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).details || null;
      }
      error = exception.name;
    } else if (exception instanceof MongooseError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      // Handle MongoDB specific errors
      // Note: MongooseError doesn't have 'code' property directly
      const mongoError = exception as any;
      switch (mongoError.code) {
        case 11000:
          message = 'Duplicate key error';
          details = this.extractDuplicateKeyError(exception.message);
          break;
        default:
          message = 'Database operation failed';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log the error with correlation ID
    this.logger.error({
      correlationId,
      status,
      error,
      message,
      path: request.url,
      method: request.method,
      ip: request.ip,
      stack: exception instanceof Error ? exception.stack : null,
    });

    // Send error response
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      details,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractDuplicateKeyError(message: string): any {
    // Parse MongoDB duplicate key error
    const match = message.match(/index: (.+?) dup key: (.+)/);
    if (match) {
      return {
        index: match[1],
        key: match[2],
      };
    }
    return null;
  }
}
