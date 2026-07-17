import { Store } from '@prisma/client';
import prisma from '../lib/prisma';
import { StoreRegistrationInput } from '../validation/schemas';

// ─── Error Helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string, fields?: string[]): Error {
  const err = new Error(message) as any;
  err.code = code;
  if (fields) err.fields = fields;
  return err;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Create a new store in DRAFT status.
 * Req 1.2: id 1-50 chars, name 1-100 chars, address 1-200 chars.
 * Throws CONFLICT if a store with the given id already exists.
 */
export async function createStore(input: StoreRegistrationInput): Promise<Store> {
  const existing = await prisma.store.findUnique({ where: { id: input.id } });
  if (existing) {
    throw makeError('CONFLICT', `Store with id '${input.id}' already exists`);
  }

  return prisma.store.create({
    data: {
      id: input.id,
      name: input.name,
      address: input.address,
      status: 'DRAFT',
    },
  });
}

/**
 * Transition a store from DRAFT → ACTIVE.
 * Req 1.4: validate all required fields present before activation.
 * Req 1.5: throws NOT_FOUND if store doesn't exist.
 * Req 1.6: throws VALIDATION_ERROR listing missing fields.
 */
export async function activateStore(id: string): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    throw makeError('NOT_FOUND', `Store with id '${id}' not found`);
  }

  // Validate required fields are present and non-empty
  const missingFields: string[] = [];
  if (!store.id || store.id.trim() === '') missingFields.push('id');
  if (!store.name || store.name.trim() === '') missingFields.push('name');
  if (!store.address || store.address.trim() === '') missingFields.push('address');

  if (missingFields.length > 0) {
    throw makeError(
      'VALIDATION_ERROR',
      `Store is missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    );
  }

  return prisma.store.update({
    where: { id },
    data: { status: 'ACTIVE' },
  });
}

/**
 * Return a store by id.
 * Throws NOT_FOUND if no store exists with the given id.
 */
export async function getStore(id: string): Promise<Store> {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    throw makeError('NOT_FOUND', `Store with id '${id}' not found`);
  }
  return store;
}

/**
 * Return all stores sorted by id ascending.
 */
export async function listStores(): Promise<Store[]> {
  return prisma.store.findMany({
    orderBy: { id: 'asc' },
  });
}
