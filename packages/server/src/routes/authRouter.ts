import { Router, Request, Response, NextFunction } from 'express';
import { login } from '../services/authService';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Body: { email: string; password: string }
 * Returns: { token: string; user: { id, email, role } }
 *
 * 401 — invalid credentials
 * 422 — email or password missing
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    const err = new Error('email and password are required') as NodeJS.ErrnoException;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const result = await login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/auth/logout
 *
 * Stateless JWT — the server has no session to invalidate.
 * The client is responsible for discarding the token.
 * Always returns 200.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Logged out' });
});

export { router as authRouter };
