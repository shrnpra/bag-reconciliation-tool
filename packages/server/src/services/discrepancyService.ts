import { Discrepancy } from '@prisma/client';
import prisma from '../lib/prisma';

// ─── Error helper ─────────────────────────────────────────────────────────────

function makeError(code: string, message: string): Error {
  const err = new Error(message) as any;
  err.code = code;
  return err;
}

// ─── listOpenDiscrepancies ────────────────────────────────────────────────────

/**
 * Returns all Discrepancy records with status 'OPEN', sorted by timestamp
 * descending (newest first).
 *
 * Req 6.3
 */
export async function listOpenDiscrepancies(): Promise<Discrepancy[]> {
  return prisma.discrepancy.findMany({
    where: { status: 'OPEN' },
    orderBy: { timestamp: 'desc' },
  });
}

// ─── resolveDiscrepancy ───────────────────────────────────────────────────────

/**
 * Resolves an open discrepancy by id.
 * - Validates that resolutionNote is non-empty (throws VALIDATION_ERROR).
 * - Throws NOT_FOUND if the discrepancy does not exist.
 * - Updates status to 'RESOLVED', sets resolvedBy and resolvedAt.
 *
 * Req 6.4, 6.5
 */
export async function resolveDiscrepancy(
  id: string,
  resolutionNote: string,
  managerId: string,
): Promise<Discrepancy> {
  // Req 6.5: resolutionNote must be non-empty
  if (!resolutionNote || resolutionNote.trim().length === 0) {
    throw makeError('VALIDATION_ERROR', 'resolutionNote must be non-empty');
  }

  // Req 6.4: discrepancy must exist
  const existing = await prisma.discrepancy.findUnique({ where: { id } });
  if (!existing) {
    throw makeError('NOT_FOUND', `Discrepancy '${id}' not found`);
  }

  return prisma.discrepancy.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolutionNote,
      resolvedBy: managerId,
      resolvedAt: new Date(),
    },
  });
}
