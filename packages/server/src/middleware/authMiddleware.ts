import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

/**
 * Validates the Bearer JWT in the Authorization header.
 * On success, attaches `req.user = { id, role }` and calls next().
 * On failure, returns 401 with a JSON error message.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const { userId, role } = verifyToken(token);
    req.user = { id: userId, role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
