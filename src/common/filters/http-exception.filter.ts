/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ConflictException,
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
    }
    // Check for MongoDB errors (they have a code property)
    else if (exception instanceof Error && 'code' in exception) {
      const mongoError = exception as any;

      // Handle duplicate key error (code 11000)
      if (mongoError.code === 11000) {
        status = HttpStatus.CONFLICT;
        error = 'DuplicateKeyError';
        message = 'Duplicate key error';
        details = this.extractDuplicateKeyError(mongoError);
      }
      // Handle other MongoDB errors
      else {
        status = HttpStatus.BAD_REQUEST;
        error = 'DatabaseError';
        message = mongoError.message || 'Database operation failed';
        details = {
          code: mongoError.code,
          name: mongoError.name,
        };
      }
    } else if (exception instanceof MongooseError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'MongooseError';
      message = exception.message;
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
      details,
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

  private extractDuplicateKeyError(error: any): any {
    try {
      // Extract the field and value from the error
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};

      const field = Object.keys(keyPattern)[0] || 'unknown';
      const value = keyValue[field] || 'unknown';

      return {
        field,
        value,
        message: `A category with ${field} "${value}" already exists`,
      };
    } catch (e) {
      return {
        message: error.message || 'Duplicate key error',
      };
    }
  }
}
