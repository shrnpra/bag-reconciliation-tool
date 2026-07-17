import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/authMiddleware';
import { checkOutRequestSchema, checkInRequestSchema } from '../validation/schemas';
import { recordCheckOut, recordCheckIn } from '../services/visitService';

const router = Router();

/**
 * POST /api/visits/checkout
 *
 * Records a bag check-out from a driver to a store.
 * Requires authentication.
 * Body validated with checkOutRequestSchema.
 *
 * 201 — { visit, driverInventory, storeInventory }
 * 404 — driver or store not found
 * 409 — driver has insufficient inventory
 * 422 — validation error
 */
router.post(
  '/checkout',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = checkOutRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const { driverId, storeId, bagCount } = parseResult.data;
      const result = await recordCheckOut(driverId, storeId, bagCount, req.user!.id);
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /api/visits/checkin
 *
 * Records a bag check-in from a store to a driver.
 * Requires authentication.
 * Body validated with checkInRequestSchema.
 *
 * 201 — { visit, driverInventory, storeInventory, hasDiscrepancy }
 * 404 — driver or store not found
 * 422 — validation error
 */
router.post(
  '/checkin',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = checkInRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const { driverId, storeId, bagCount } = parseResult.data;
      const result = await recordCheckIn(driverId, storeId, bagCount, req.user!.id);
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/visits/:id
 *
 * Returns a single visit by id, including any associated discrepancy.
 * Requires authentication.
 *
 * 200 — visit with discrepancy (if present)
 * 404 — visit not found
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visit = await prisma.visit.findUnique({
        where: { id: req.params.id },
        include: { discrepancy: true },
      });

      if (!visit) {
        const err = new Error(`Visit '${req.params.id}' not found`) as NodeJS.ErrnoException;
        err.code = 'NOT_FOUND';
        return next(err);
      }

      return res.status(200).json(visit);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as visitsRouter };
