import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import {
  listOpenDiscrepancies,
  resolveDiscrepancy,
} from '../services/discrepancyService';

const router = Router();

/**
 * GET /api/discrepancies?status=open
 *
 * Returns all open discrepancies, sorted by timestamp descending.
 * Requires authentication and MANAGER role.
 *
 * 200 — Discrepancy[]
 */
router.get(
  '/',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const discrepancies = await listOpenDiscrepancies();
      return res.status(200).json(discrepancies);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * PATCH /api/discrepancies/:id/resolve
 *
 * Resolves a discrepancy by id.
 * Requires authentication and MANAGER role.
 * Body must contain `resolutionNote` (non-empty string).
 *
 * 200 — resolved Discrepancy
 * 404 — discrepancy not found
 * 422 — resolutionNote missing or empty
 */
router.patch(
  '/:id/resolve',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const { resolutionNote } = req.body as { resolutionNote?: string };

    if (!resolutionNote || resolutionNote.trim().length === 0) {
      const err = new Error('resolutionNote is required') as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const discrepancy = await resolveDiscrepancy(
        req.params.id,
        resolutionNote,
        req.user!.id,
      );
      return res.status(200).json(discrepancy);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as discrepanciesRouter };
