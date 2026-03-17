import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      return null; // or throw an exception if you prefer
    }

    if (data) {
      return request.user[data as keyof typeof request.user];
    }
    return request.user;
  },
);
