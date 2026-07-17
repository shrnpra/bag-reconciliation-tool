import { Visit } from '@prisma/client';
import prisma from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  from?: Date;
  to?: Date;
}

// ─── Error helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── Date range helpers ───────────────────────────────────────────────────────

/**
 * Builds a Prisma timestamp filter from an optional DateRange.
 * - from is inclusive (>=)
 * - to   is inclusive end-of-day (the to Date is treated as the end of that day,
 *   but callers can also pass an exact timestamp; we treat it as <= to)
 */
function buildTimestampFilter(
  dateRange?: DateRange,
): Record<string, Date> | undefined {
  if (!dateRange || (!dateRange.from && !dateRange.to)) {
    return undefined;
  }

  const filter: Record<string, Date> = {};

  if (dateRange.from) {
    filter.gte = dateRange.from;
  }

  if (dateRange.to) {
    // End-of-day: set time to 23:59:59.999 of the given date
    const endOfDay = new Date(dateRange.to);
    endOfDay.setHours(23, 59, 59, 999);
    filter.lte = endOfDay;
  }

  return filter;
}

// ─── getVisitsForDriver ───────────────────────────────────────────────────────

/**
 * Returns all visits for a driver, newest-first.
 *
 * Req 11.x:
 * - Throws NOT_FOUND if the driver does not exist.
 * - Optionally filters by dateRange (from inclusive, to inclusive end-of-day).
 * - Returns [] if the driver exists but has no visits.
 * - No date-range filter means all visits are returned (365+ day retention).
 */
export async function getVisitsForDriver(
  id: string,
  dateRange?: DateRange,
): Promise<Visit[]> {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) {
    throw makeError('NOT_FOUND', `Driver '${id}' not found`);
  }

  const timestampFilter = buildTimestampFilter(dateRange);

  return prisma.visit.findMany({
    where: {
      driverId: id,
      ...(timestampFilter ? { timestamp: timestampFilter } : {}),
    },
    orderBy: { timestamp: 'desc' },
  });
}

// ─── getVisitsForStore ────────────────────────────────────────────────────────

/**
 * Returns all visits for a store, newest-first.
 *
 * Req 11.x:
 * - Throws NOT_FOUND if the store does not exist.
 * - Optionally filters by dateRange (from inclusive, to inclusive end-of-day).
 * - Returns [] if the store exists but has no visits.
 * - No date-range filter means all visits are returned (365+ day retention).
 */
export async function getVisitsForStore(
  id: string,
  dateRange?: DateRange,
): Promise<Visit[]> {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    throw makeError('NOT_FOUND', `Store '${id}' not found`);
  }

  const timestampFilter = buildTimestampFilter(dateRange);

  return prisma.visit.findMany({
    where: {
      storeId: id,
      ...(timestampFilter ? { timestamp: timestampFilter } : {}),
    },
    orderBy: { timestamp: 'desc' },
  });
}
