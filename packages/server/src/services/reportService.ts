import { Discrepancy, Visit, VisitType } from '@prisma/client';
import prisma from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface ReportResult {
  entityType: 'driver' | 'store';
  entityId: string;
  dateRange: { from: Date; to: Date };
  openingInventory: number;
  visits: Visit[];
  closingInventory: number;
  discrepancies: Discrepancy[];
  calculationError: boolean;
  expectedClosing?: number; // only present when calculationError=true
  actualClosing?: number;   // only present when calculationError=true
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns midnight (00:00:00.000) of the given date in local time. */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns 23:59:59.999 of the given date in local time. */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── generateReport ───────────────────────────────────────────────────────────

/**
 * Generates a bag-reconciliation report for a driver or store over a date range.
 *
 * Req 12.x:
 * - Default date range is the current calendar day if not provided.
 * - Throws NOT_FOUND if the driver/store does not exist.
 * - openingInventory = sum(CHECK_IN bagCounts) - sum(CHECK_OUT bagCounts) for
 *   all visits BEFORE dateRange.from for this entity.
 * - Collects all visits within the range in chronological order (asc).
 * - closingInventory = openingInventory + in-range CHECK_IN - in-range CHECK_OUT.
 * - Fetches stored bagInventory from the entity record.
 * - calculationError = storedInventory !== closingInventory.
 * - Discrepancies: all Discrepancy records with status=OPEN whose visitId is in
 *   the set of in-range visits.
 */
export async function generateReport(
  entityType: 'driver' | 'store',
  id: string,
  dateRange?: DateRange,
): Promise<ReportResult> {
  // ── 1. Resolve + validate entity ─────────────────────────────────────────

  let storedInventory: number;

  if (entityType === 'driver') {
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, bagInventory: true },
    });
    if (!driver) {
      throw makeError('NOT_FOUND', `Driver '${id}' not found`);
    }
    storedInventory = driver.bagInventory;
  } else {
    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true, bagInventory: true },
    });
    if (!store) {
      throw makeError('NOT_FOUND', `Store '${id}' not found`);
    }
    storedInventory = store.bagInventory;
  }

  // ── 2. Resolve date range ─────────────────────────────────────────────────

  const today = new Date();
  const resolvedFrom = dateRange?.from ? new Date(dateRange.from) : startOfDay(today);
  const resolvedTo = dateRange?.to ? endOfDay(new Date(dateRange.to)) : endOfDay(today);

  // ── 3. Build entity filter clause ────────────────────────────────────────

  const entityFilter =
    entityType === 'driver' ? { driverId: id } : { storeId: id };

  // ── 4. Compute openingInventory (all visits BEFORE rangeFrom) ────────────

  const preRangeVisits = await prisma.visit.findMany({
    where: {
      ...entityFilter,
      timestamp: { lt: resolvedFrom },
    },
    select: { type: true, bagCount: true },
  });

  const openingInventory = preRangeVisits.reduce((acc, v) => {
    if (v.type === VisitType.CHECK_IN) return acc + v.bagCount;
    if (v.type === VisitType.CHECK_OUT) return acc - v.bagCount;
    return acc;
  }, 0);

  // ── 5. Collect in-range visits (chronological asc) ────────────────────────

  const visits = await prisma.visit.findMany({
    where: {
      ...entityFilter,
      timestamp: { gte: resolvedFrom, lte: resolvedTo },
    },
    orderBy: { timestamp: 'asc' },
  });

  // ── 6. Compute closingInventory ───────────────────────────────────────────

  const inRangeDelta = visits.reduce((acc, v) => {
    if (v.type === VisitType.CHECK_IN) return acc + v.bagCount;
    if (v.type === VisitType.CHECK_OUT) return acc - v.bagCount;
    return acc;
  }, 0);

  const closingInventory = openingInventory + inRangeDelta;

  // ── 7. calculationError ───────────────────────────────────────────────────

  const calculationError = storedInventory !== closingInventory;

  // ── 8. Fetch open discrepancies for in-range visits ───────────────────────

  const visitIds = visits.map((v) => v.id);

  const discrepancies =
    visitIds.length > 0
      ? await prisma.discrepancy.findMany({
          where: {
            visitId: { in: visitIds },
            status: 'OPEN',
          },
        })
      : [];

  // ── 9. Build result ───────────────────────────────────────────────────────

  const result: ReportResult = {
    entityType,
    entityId: id,
    dateRange: { from: resolvedFrom, to: resolvedTo },
    openingInventory,
    visits,
    closingInventory,
    discrepancies,
    calculationError,
  };

  if (calculationError) {
    result.expectedClosing = closingInventory;
    result.actualClosing = storedInventory;
  }

  return result;
}
