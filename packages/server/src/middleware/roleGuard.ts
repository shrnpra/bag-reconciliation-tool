import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Factory that returns middleware enforcing a specific role.
 * Returns 403 if the authenticated user's role does not match.
 *
 * Must be used after `authMiddleware` so that `req.user` is populated.
 */
export function roleGuard(role: Role) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
