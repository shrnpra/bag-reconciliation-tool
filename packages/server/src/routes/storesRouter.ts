import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { storeRegistrationSchema } from '../validation/schemas';
import {
  createStore,
  activateStore,
  getStore,
  listStores,
} from '../services/storeService';
import { getStoreInventory } from '../services/inventoryService';
import { getVisitsForStore } from '../services/visitHistoryService';
import { generateReport } from '../services/reportService';

const router = Router();

/**
 * GET /api/stores
 *
 * Returns all stores sorted by id ascending.
 * Requires authentication.
 */
router.get(
  '/',
  authMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stores = await listStores();
      return res.status(200).json(stores);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * POST /api/stores
 *
 * Creates a new store in DRAFT status.
 * Requires authentication + MANAGER role.
 * Body validated with storeRegistrationSchema.
 *
 * 422 — validation error (body shape)
 * 409 — duplicate identifier
 */
router.post(
  '/',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const parseResult = storeRegistrationSchema.safeParse(req.body);

    if (!parseResult.success) {
      const err = new Error(
        parseResult.error.errors.map((e) => e.message).join('; '),
      ) as NodeJS.ErrnoException;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    try {
      const store = await createStore(parseResult.data);
      return res.status(201).json(store);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/stores/:id
 *
 * Returns a single store by id.
 * Requires authentication.
 *
 * 404 — store not found
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await getStore(req.params.id);
      return res.status(200).json(store);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * PATCH /api/stores/:id
 *
 * Transitions a store from DRAFT → ACTIVE.
 * Requires authentication + MANAGER role.
 *
 * 404 — store not found
 * 422 — missing required fields for activation
 */
router.patch(
  '/:id',
  authMiddleware,
  roleGuard(Role.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await activateStore(req.params.id);
      return res.status(200).json(store);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/stores/:id/inventory
 *
 * Returns the current bag inventory for a single store.
 * Requires authentication.
 *
 * 404 — store not found
 */
router.get(
  '/:id/inventory',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventory = await getStoreInventory(req.params.id);
      return res.status(200).json(inventory);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/stores/:id/visits
 *
 * Returns visit history for a single store, newest-first.
 * Requires authentication.
 * Optional query params: ?from=<ISO date>&to=<ISO date>
 *
 * 200 — Visit[]
 * 404 — store not found
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

      const visits = await getVisitsForStore(
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
 * GET /api/stores/:id/report
 *
 * Generates a bag-reconciliation report for a store.
 * Requires authentication + MANAGER role.
 * Optional query params: ?from=<ISO date>&to=<ISO date>
 *
 * 200 — ReportResult
 * 404 — store not found
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
        'store',
        req.params.id,
        Object.keys(dateRange).length ? dateRange : undefined,
      );
      return res.status(200).json(report);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as storesRouter };
