import { Bag, BagAssignment, BagStatus } from '@prisma/client';
import prisma from '../lib/prisma';

// ─── Error helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── registerBag (Req 1.1–1.4) ───────────────────────────────────────────────

export async function registerBag(barcode: string, storeId: string): Promise<Bag> {
  // Verify store exists
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw makeError('NOT_FOUND', `Store '${storeId}' not found`);
  }

  // Check barcode uniqueness
  const existing = await prisma.bag.findUnique({ where: { barcode } });
  if (existing) {
    throw makeError('CONFLICT', `Bag with barcode '${barcode}' already exists`);
  }

  return prisma.bag.create({
    data: {
      barcode,
      status: BagStatus.AVAILABLE,
      currentStoreId: storeId,
    },
  });
}

// ─── pickupBag (Req 2.1–2.4) ─────────────────────────────────────────────────

export async function pickupBag(
  barcode: string,
  driverId: string,
  orderReference?: string,
): Promise<{ assignment: BagAssignment; bag: Bag }> {
  return prisma.$transaction(async (tx) => {
    const bag = await tx.bag.findUnique({ where: { barcode } });
    if (!bag) {
      throw makeError('NOT_FOUND', `Bag with barcode '${barcode}' not found`);
    }

    if (bag.status === BagStatus.ASSIGNED) {
      throw makeError('CONFLICT', `Bag '${barcode}' is already checked out`);
    }

    if (bag.status === BagStatus.LOST) {
      throw makeError('CONFLICT', `Bag '${barcode}' is marked as lost`);
    }

    // Create assignment
    const assignment = await tx.bagAssignment.create({
      data: {
        bagId: bag.id,
        driverId,
        orderReference: orderReference ?? null,
      },
    });

    // Update bag status
    const updatedBag = await tx.bag.update({
      where: { id: bag.id },
      data: { status: BagStatus.ASSIGNED },
    });

    return { assignment, bag: updatedBag };
  });
}

// ─── returnBag (Req 3.1–3.4) ─────────────────────────────────────────────────

export async function returnBag(
  barcode: string,
  storeId: string,
): Promise<{ assignment: BagAssignment; bag: Bag }> {
  return prisma.$transaction(async (tx) => {
    const bag = await tx.bag.findUnique({ where: { barcode } });
    if (!bag) {
      throw makeError('NOT_FOUND', `Bag with barcode '${barcode}' not found`);
    }

    if (bag.status !== BagStatus.ASSIGNED) {
      throw makeError('CONFLICT', `Bag '${barcode}' is not currently checked out`);
    }

    // Verify return store exists
    const store = await tx.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw makeError('NOT_FOUND', `Store '${storeId}' not found`);
    }

    // Find active assignment (no returnTime)
    const activeAssignment = await tx.bagAssignment.findFirst({
      where: { bagId: bag.id, returnTime: null },
      orderBy: { pickupTime: 'desc' },
    });

    if (!activeAssignment) {
      throw makeError('CONFLICT', `No active assignment found for bag '${barcode}'`);
    }

    // Complete assignment
    const assignment = await tx.bagAssignment.update({
      where: { id: activeAssignment.id },
      data: {
        returnTime: new Date(),
        returnStoreId: storeId,
      },
    });

    // Update bag — available at return store
    const updatedBag = await tx.bag.update({
      where: { id: bag.id },
      data: {
        status: BagStatus.AVAILABLE,
        currentStoreId: storeId,
      },
    });

    return { assignment, bag: updatedBag };
  });
}

// ─── markBagLost (Req 8.1–8.2) ───────────────────────────────────────────────

export async function markBagLost(barcode: string): Promise<Bag> {
  return prisma.$transaction(async (tx) => {
    const bag = await tx.bag.findUnique({ where: { barcode } });
    if (!bag) {
      throw makeError('NOT_FOUND', `Bag with barcode '${barcode}' not found`);
    }

    // Close any active assignment
    if (bag.status === BagStatus.ASSIGNED) {
      await tx.bagAssignment.updateMany({
        where: { bagId: bag.id, returnTime: null },
        data: { returnTime: new Date() },
      });
    }

    return tx.bag.update({
      where: { id: bag.id },
      data: { status: BagStatus.LOST },
    });
  });
}

// ─── reactivateBag (Req 8.3) ─────────────────────────────────────────────────

export async function reactivateBag(barcode: string, storeId: string): Promise<Bag> {
  const bag = await prisma.bag.findUnique({ where: { barcode } });
  if (!bag) {
    throw makeError('NOT_FOUND', `Bag with barcode '${barcode}' not found`);
  }

  if (bag.status !== BagStatus.LOST) {
    throw makeError('CONFLICT', `Bag '${barcode}' is not in LOST status`);
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) {
    throw makeError('NOT_FOUND', `Store '${storeId}' not found`);
  }

  return prisma.bag.update({
    where: { id: bag.id },
    data: {
      status: BagStatus.AVAILABLE,
      currentStoreId: storeId,
    },
  });
}

// ─── getBagHistory (Req 9.1–9.2) ─────────────────────────────────────────────

export async function getBagHistory(barcode: string) {
  const bag = await prisma.bag.findUnique({ where: { barcode } });
  if (!bag) {
    throw makeError('NOT_FOUND', `Bag with barcode '${barcode}' not found`);
  }

  return prisma.bagAssignment.findMany({
    where: { bagId: bag.id },
    include: { driver: { select: { id: true, name: true } } },
    orderBy: { pickupTime: 'desc' },
  });
}
