import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { driverRegistrationSchema } from '../validation/schemas';
import {
  createDriver,
  activateDriver,
  getDriver,
  listDrivers,
} from '../services/driverService';
import { getDriverInventory, listDriverInventories } from '../services/inventoryService';
import { getVisitsForDriver } from '../services/visitHistoryService';
import { generateReport } from '../services/reportService';

const router = Router();

/**
 * GET /api/drivers
 *
 * Returns all drivers sorted by id ascending.
 * Requires authentication.
 */
router.get(
  '/',
  authMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const drivers = await listDrivers();
      return res.status(200).json(drivers);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /api/drivers
 *
 * Creates a new driver in DRAFT status.
 * Requires authentication + MANAGER role.
 * Body validated with driverRegistrationSchema.
 *
 * 422 — validation error (body shape)
 * 409 — duplicate identifier
 */
router.post(
  '/',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = driverRegistrationSchema.safeParse(req.body);

    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const driver = await createDriver({
        ...parseResult.data,
        userId: req.user!.id,
      });
      return res.status(201).json(driver);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/drivers/:id
 *
 * Returns a single driver by id.
 * Requires authentication.
 *
 * 404 — driver not found
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await getDriver(req.params.id);
      return res.status(200).json(driver);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * PATCH /api/drivers/:id
 *
 * Transitions a driver from DRAFT → ACTIVE.
 * Requires authentication + MANAGER role.
 *
 * 404 — driver not found
 * 422 — missing required fields for activation
 */
router.patch(
  '/:id',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await activateDriver(req.params.id);
      return res.status(200).json(driver);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/drivers/:id/inventory
 *
 * Returns the current bag inventory for a single driver.
 * Requires authentication.
 *
 * 404 — driver not found
 */
router.get(
  '/:id/inventory',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventory = await getDriverInventory(req.params.id);
      return res.status(200).json(inventory);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/drivers/:id/visits
 *
 * Returns visit history for a single driver, newest-first.
 * Requires authentication.
 * Optional query params: ?from=<ISO date>&to=<ISO date>
 *
 * 200 — Visit[]
 * 404 — driver not found
 */
router.get(
  '/:id/visits',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateRange: { from?: Date; to?: Date } = {};

      if (req.query.from) {
        const d = new Date(req.query.from as string);
        if (!isNaN(d.getTime())) dateRange.from = d;
      }
      if (req.query.to) {
        const d = new Date(req.query.to as string);
        if (!isNaN(d.getTime())) dateRange.to = d;
      }

      const visits = await getVisitsForDriver(
        req.params.id,
        Object.keys(dateRange).length ? dateRange : undefined,
      );
      return res.status(200).json(visits);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/drivers/:id/report
 *
 * Generates a bag-reconciliation report for a driver.
 * Requires authentication + MANAGER role.
 * Optional query params: ?from=<ISO date>&to=<ISO date>
 *
 * 200 — ReportResult
 * 404 — driver not found
 */
router.get(
  '/:id/report',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateRange: { from?: Date; to?: Date } = {};

      if (req.query.from) {
        const d = new Date(req.query.from as string);
        if (!isNaN(d.getTime())) dateRange.from = d;
      }
      if (req.query.to) {
        const d = new Date(req.query.to as string);
        if (!isNaN(d.getTime())) dateRange.to = d;
      }

      const report = await generateReport(
        'driver',
        req.params.id,
        Object.keys(dateRange).length ? dateRange : undefined,
      );
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as driversRouter };
