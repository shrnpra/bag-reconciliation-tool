import { Country } from '@prisma/client';
import prisma from '../lib/prisma';
import { buildOverdueWhereClause, isOverdue, elapsedHours } from './overdueUtil';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverAccountabilityRow {
  driverId: string;
  driverName: string;
  totalBagsOut: number;
  overdueBags: number;
}

export interface DriverBagDetail {
  driverId: string;
  driverName: string;
  bags: Array<{
    barcode: string;
    pickupTime: Date;
    isOverdue: boolean;
    elapsedHours: number;
  }>;
}

export interface EndOfDaySummaryRow {
  driverName: string;
  driverId: string;
  overdueBags: Array<{
    barcode: string;
    pickupTime: Date;
    elapsedHours: number;
    orderReference: string | null;
  }>;
}

// ─── getDriverAccountability (Req 5.1, 5.2, 7.3, 7.4) ───────────────────────

export async function getDriverAccountability(
  country?: Country,
): Promise<DriverAccountabilityRow[]> {
  const now = new Date();
  const overdueClause = buildOverdueWhereClause(now);

  // Build store filter for country scoping
  const storeFilter = country
    ? { bag: { currentStore: { country } } }
    : {};

  // Get all active assignments grouped by driver
  const assignments = await prisma.bagAssignment.findMany({
    where: {
      returnTime: null,
      ...storeFilter,
    },
    include: {
      driver: { select: { id: true, name: true } },
    },
  });

  // Group by driver
  const driverMap = new Map<string, { name: string; total: number; overdue: number }>();

  for (const a of assignments) {
    const entry = driverMap.get(a.driverId) ?? { name: a.driver.name, total: 0, overdue: 0 };
    entry.total++;
    if (isOverdue(a.pickupTime, now)) {
      entry.overdue++;
    }
    driverMap.set(a.driverId, entry);
  }

  return Array.from(driverMap.entries()).map(([driverId, data]) => ({
    driverId,
    driverName: data.name,
    totalBagsOut: data.total,
    overdueBags: data.overdue,
  }));
}

// ─── getDriverBagDetail (Req 5.4) ────────────────────────────────────────────

export async function getDriverBagDetail(driverId: string): Promise<DriverBagDetail> {
  const now = new Date();

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    const err = new Error(`Driver '${driverId}' not found`) as any;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const assignments = await prisma.bagAssignment.findMany({
    where: { driverId, returnTime: null },
    include: { bag: { select: { barcode: true } } },
    orderBy: { pickupTime: 'asc' },
  });

  return {
    driverId,
    driverName: driver.name,
    bags: assignments.map((a) => ({
      barcode: a.bag.barcode,
      pickupTime: a.pickupTime,
      isOverdue: isOverdue(a.pickupTime, now),
      elapsedHours: elapsedHours(a.pickupTime, now),
    })),
  };
}

// ─── getEndOfDaySummary (Req 6.1, 6.2, 7.3, 7.4) ────────────────────────────

export async function getEndOfDaySummary(
  country?: Country,
): Promise<EndOfDaySummaryRow[]> {
  const now = new Date();
  const overdueClause = buildOverdueWhereClause(now);

  const storeFilter = country
    ? { bag: { currentStore: { country } } }
    : {};

  const overdueAssignments = await prisma.bagAssignment.findMany({
    where: {
      ...overdueClause,
      ...storeFilter,
    },
    include: {
      driver: { select: { id: true, name: true } },
      bag: { select: { barcode: true } },
    },
    orderBy: { pickupTime: 'asc' },
  });

  // Group by driver
  const driverMap = new Map<string, EndOfDaySummaryRow>();

  for (const a of overdueAssignments) {
    const existing = driverMap.get(a.driverId) ?? {
      driverName: a.driver.name,
      driverId: a.driverId,
      overdueBags: [],
    };
    existing.overdueBags.push({
      barcode: a.bag.barcode,
      pickupTime: a.pickupTime,
      elapsedHours: elapsedHours(a.pickupTime, now),
      orderReference: a.orderReference,
    });
    driverMap.set(a.driverId, existing);
  }

  return Array.from(driverMap.values());
}
