/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
  statusCode: number;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response<T>>();
    const correlationId = request['correlationId'];

    return next.handle().pipe(
      map((data) => {
        // Handle case where data already has a message
        let responseData = data;
        let message = 'Success';

        if (data && typeof data === 'object' && 'message' in data) {
          message = data.message;
          // Remove message from data to avoid duplication
          const { message: _, ...rest } = data;
          responseData = rest;
        }

        return {
          success: true,
          data: responseData,
          message,
          statusCode: response.statusCode,
          correlationId,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
