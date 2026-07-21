import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import {
  bagRegistrationSchema,
  bagPickupSchema,
  bagReturnSchema,
  bagStatusChangeSchema,
} from '../validation/bagSchemas';
import {
  registerBag,
  pickupBag,
  returnBag,
  markBagLost,
  reactivateBag,
  getBagHistory,
} from '../services/bagService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/bags
 * Register a new bag. Requires MANAGER role.
 */
router.post(
  '/',
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = bagRegistrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const bag = await registerBag(parseResult.data.barcode, parseResult.data.storeId);
      return res.status(201).json(bag);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /api/bags/pickup
 * Record a bag pickup. Requires DRIVER role.
 */
router.post(
  '/pickup',
  roleGuard(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = bagPickupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const result = await pickupBag(
        parseResult.data.barcode,
        req.user!.id,
        parseResult.data.orderReference,
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /api/bags/return
 * Record a bag return. Requires DRIVER role.
 */
router.post(
  '/return',
  roleGuard(Role.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = bagReturnSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const result = await returnBag(
        parseResult.data.barcode,
        parseResult.data.storeId,
      );
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * PATCH /api/bags/:barcode/status
 * Mark a bag as LOST or reactivate it. Requires MANAGER role.
 */
router.patch(
  '/:barcode/status',
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = bagStatusChangeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const { barcode } = req.params;
      const input = parseResult.data;
      let bag;

      if (input.status === 'LOST') {
        bag = await markBagLost(barcode);
      } else {
        bag = await reactivateBag(barcode, input.storeId);
      }

      return res.status(200).json(bag);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/bags/:barcode/history
 * Get assignment history for a bag. Requires MANAGER role.
 */
router.get(
  '/:barcode/history',
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await getBagHistory(req.params.barcode);
      return res.status(200).json(history);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as bagsRouter };
