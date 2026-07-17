import { Request, Response, NextFunction } from 'express';

/**
 * Logs each request's method, path, HTTP status code, and duration in ms
 * once the response has finished.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`,
    );
  });

  next();
}
