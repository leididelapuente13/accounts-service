import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainException } from '../../../domain/exceptions/DomainExceptions';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const timestamp = new Date().toISOString();

  // 1. Domain Exceptions
  if (err instanceof DomainException) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      timestamp,
    });
    return;
  }

  // 2. Schema Validation Errors (Zod)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request body or parameters',
      issues: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      timestamp,
    });
    return;
  }

  // 3. Syntax error (e.g. malformed JSON body)
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({
      error: 'MalformedJsonError',
      message: 'Request payload contains malformed JSON',
      timestamp,
    });
    return;
  }

  // 4. Default Internal Server Error
  console.error('[Unhandled Exception]:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : err.message,
    timestamp,
  });
}
