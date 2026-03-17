import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from headers or generate a new one
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();

    // Attach to request for use in controllers/services
    req['correlationId'] = correlationId;

    // Set response header for client awareness
    res.setHeader('X-Correlation-ID', correlationId);

    // Add to logger context
    this.logger.log(
      `Request ${req.method} ${req.url} - Correlation ID: ${correlationId}`,
    );
    next();
  }
}
