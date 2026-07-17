import { Visit } from '@prisma/client';
import prisma from '../lib/prisma';

// ─── Error helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── recordCheckIn ────────────────────────────────────────────────────────────

/**
 * Records a bag check-in: transfers `bagCount` bags from a store's inventory
 * to a driver's inventory and creates a Visit + optional Discrepancy + AuditLog
 * record atomically.
 *
 * Req 3.1: check-in increases driver bag inventory by bagCount.
 * Req 3.2: check-in decreases store bag inventory by bagCount.
 * Req 3.3: operation is atomic — all changes commit or all roll back.
 * Req 3.4: if bagCount exceeds store inventory, a Discrepancy record is created.
 * Req 3.5: driverId, storeId, and bagCount (1–999) are required.
 * Req 3.6: driver and store must exist; throws NOT_FOUND otherwise.
 * Req 3.7: a Visit record with type CHECK_IN and an AuditLog entry are created.
 */
export async function recordCheckIn(
  driverId: string,
  storeId: string,
  bagCount: number,
  performedBy: string,
): Promise<{
  visit: Visit;
  driverInventory: number;
  storeInventory: number;
  hasDiscrepancy: boolean;
}> {
  // Req 3.5: validate inputs
  if (!driverId || !storeId || bagCount < 1 || bagCount > 999) {
    throw makeError(
      'VALIDATION_ERROR',
      'driverId and storeId must be non-empty and bagCount must be between 1 and 999',
    );
  }

  return prisma.$transaction(async (tx) => {
    // Req 3.6: store must exist
    const store = await tx.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw makeError('NOT_FOUND', `Store '${storeId}' not found`);
    }

    // Req 3.6: driver must exist
    const driver = await tx.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw makeError('NOT_FOUND', `Driver '${driverId}' not found`);
    }

    // Req 3.4: determine whether a discrepancy exists
    const hasDiscrepancy = bagCount > store.bagInventory;
    const visitStatus = hasDiscrepancy ? 'REQUIRES_REVIEW' : 'PENDING';

    // Req 3.7: create Visit record
    const visit = await tx.visit.create({
      data: {
        type: 'CHECK_IN',
        driverId,
        storeId,
        bagCount,
        performedBy,
        status: visitStatus,
      },
    });

    // Req 3.4: upsert Discrepancy when bagCount exceeds store inventory
    if (hasDiscrepancy) {
      await tx.discrepancy.upsert({
        where: { visitId: visit.id },
        create: {
          visitId: visit.id,
          driverId,
          storeId,
          expectedCount: store.bagInventory,
          actualCount: bagCount,
          difference: bagCount - store.bagInventory,
          status: 'OPEN',
        },
        update: {
          actualCount: bagCount,
          difference: bagCount - store.bagInventory,
        },
      });
    }

    // Req 3.2: decrement store inventory
    const updatedStore = await tx.store.update({
      where: { id: storeId },
      data: { bagInventory: { decrement: bagCount } },
    });

    // Req 3.1: increment driver inventory
    const updatedDriver = await tx.driver.update({
      where: { id: driverId },
      data: { bagInventory: { increment: bagCount } },
    });

    // Req 3.7: create AuditLog entry
    await tx.auditLog.create({
      data: {
        action: 'CHECK_IN',
        performedBy,
        visitId: visit.id,
      },
    });

    return {
      visit,
      driverInventory: updatedDriver.bagInventory,
      storeInventory: updatedStore.bagInventory,
      hasDiscrepancy,
    };
  });
}

// ─── recordCheckOut ───────────────────────────────────────────────────────────

/**
 * Records a bag check-out: transfers `bagCount` bags from a driver's inventory
 * to a store's inventory and creates a Visit + AuditLog record atomically.
 *
 * Req 2.1: check-out reduces driver bag inventory by bagCount.
 * Req 2.2: check-out increases store bag inventory by bagCount.
 * Req 2.3: operation is atomic — all changes commit or all roll back.
 * Req 2.4: driverId, storeId, and bagCount (> 0) are required.
 * Req 2.5: driver must exist; throws NOT_FOUND otherwise.
 * Req 2.6: driver must have sufficient inventory; throws INSUFFICIENT_INVENTORY otherwise.
 * Req 2.7: a Visit record with type CHECK_OUT and an AuditLog entry are created.
 */
export async function recordCheckOut(
  driverId: string,
  storeId: string,
  bagCount: number,
  performedBy: string,
): Promise<{ visit: Visit; driverInventory: number; storeInventory: number }> {
  // Req 2.4: validate inputs
  if (!driverId || !storeId || bagCount <= 0) {
    throw makeError('VALIDATION_ERROR', 'driverId and storeId must be non-empty and bagCount must be greater than 0');
  }

  return prisma.$transaction(async (tx) => {
    // Req 2.5: driver must exist
    const driver = await tx.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw makeError('NOT_FOUND', `Driver '${driverId}' not found`);
    }

    // Req 2.6: driver must have sufficient inventory
    if (driver.bagInventory < bagCount) {
      throw makeError(
        'INSUFFICIENT_INVENTORY',
        `Driver '${driverId}' has insufficient inventory (${driver.bagInventory}) to check out ${bagCount} bag(s)`,
      );
    }

    // Req 2.1: decrement driver inventory
    const updatedDriver = await tx.driver.update({
      where: { id: driverId },
      data: { bagInventory: { decrement: bagCount } },
    });

    // Req 2.2: increment store inventory
    const updatedStore = await tx.store.update({
      where: { id: storeId },
      data: { bagInventory: { increment: bagCount } },
    });

    // Req 2.7: create Visit record
    const visit = await tx.visit.create({
      data: {
        type: 'CHECK_OUT',
        driverId,
        storeId,
        bagCount,
        performedBy,
        status: 'PENDING',
      },
    });

    // Req 2.7: create AuditLog entry
    await tx.auditLog.create({
      data: {
        action: 'CHECK_OUT',
        performedBy,
        visitId: visit.id,
      },
    });

    return {
      visit,
      driverInventory: updatedDriver.bagInventory,
      storeInventory: updatedStore.bagInventory,
    };
  });
}
