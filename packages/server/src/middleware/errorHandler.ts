import { Request, Response, NextFunction } from 'express';

/**
 * Normalised error shape returned to API clients.
 */
interface AppError extends Error {
  code?: string;
  fields?: string[];
  statusCode?: number;
}

/**
 * Maps a custom error code to an HTTP status code.
 */
function statusForCode(code: string | undefined): number {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 401;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 422;
    case 'CONFLICT':
      return 409;
    default:
      return 500;
  }
}

/**
 * Express error-handler middleware (4-parameter signature).
 * Normalises all errors to `{ error: string, fields?: string[] }`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const status = err.statusCode ?? statusForCode(err.code);
  const body: { error: string; fields?: string[] } = {
    error: err.message || 'Internal server error',
  };

  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.fields)) {
    body.fields = err.fields;
  }

  res.status(status).json(body);
}
