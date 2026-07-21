import { Router, Request, Response, NextFunction } from 'express';
import { Role, Country } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import {
  getDriverAccountability,
  getDriverBagDetail,
  getEndOfDaySummary,
} from '../services/dashboardService';

const router = Router();

// All dashboard routes require authentication + MANAGER role
router.use(authMiddleware);
router.use(roleGuard(Role.MANAGER));

/**
 * GET /api/dashboard/accountability
 * Driver accountability summary. Optional ?country query param.
 */
router.get(
  '/accountability',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const country = req.query.country as Country | undefined;
      const data = await getDriverAccountability(country);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/dashboard/accountability/:driverId
 * Detailed bag list for a specific driver.
 */
router.get(
  '/accountability/:driverId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getDriverBagDetail(req.params.driverId);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/dashboard/end-of-day
 * End-of-day overdue summary. Optional ?country query param.
 */
router.get(
  '/end-of-day',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const country = req.query.country as Country | undefined;
      const data = await getEndOfDaySummary(country);
      return res.status(200).json(data);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as dashboardRouter };
