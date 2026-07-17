import { prisma } from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryEntry {
  id: string;
  bagInventory: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── Driver inventory ─────────────────────────────────────────────────────────

/**
 * Returns a single driver's id and current bagInventory.
 * Throws NOT_FOUND if the driver does not exist.
 *
 * Req 4.3, 4.6
 */
export async function getDriverInventory(id: string): Promise<InventoryEntry> {
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: { id: true, bagInventory: true },
  });

  if (!driver) {
    throw makeError('NOT_FOUND', `Driver with id '${id}' not found`);
  }

  return { id: driver.id, bagInventory: driver.bagInventory };
}

/**
 * Returns all drivers' id and current bagInventory sorted by id ascending.
 *
 * Req 4.1, 4.5
 */
export async function listDriverInventories(): Promise<InventoryEntry[]> {
  const drivers = await prisma.driver.findMany({
    select: { id: true, bagInventory: true },
    orderBy: { id: 'asc' },
  });

  return drivers.map((d) => ({ id: d.id, bagInventory: d.bagInventory }));
}

// ─── Store inventory ──────────────────────────────────────────────────────────

/**
 * Returns a single store's id and current bagInventory.
 * Throws NOT_FOUND if the store does not exist.
 *
 * Req 4.4, 4.6
 */
export async function getStoreInventory(id: string): Promise<InventoryEntry> {
  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, bagInventory: true },
  });

  if (!store) {
    throw makeError('NOT_FOUND', `Store with id '${id}' not found`);
  }

  return { id: store.id, bagInventory: store.bagInventory };
}

/**
 * Returns all stores' id and current bagInventory sorted by id ascending.
 *
 * Req 4.2, 4.5
 */
export async function listStoreInventories(): Promise<InventoryEntry[]> {
  const stores = await prisma.store.findMany({
    select: { id: true, bagInventory: true },
    orderBy: { id: 'asc' },
  });

  return stores.map((s) => ({ id: s.id, bagInventory: s.bagInventory }));
}
