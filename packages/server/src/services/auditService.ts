import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';

/**
 * Centralized audit log helper.
 *
 * Logs an action taken by an authenticated user, linking it to the affected
 * Visit or Discrepancy record.
 *
 * Req 8.1: UTC timestamp recorded automatically via @default(now()) in schema.
 * Req 8.5: performedBy records the authenticated user's identifier.
 * Req 8.6: visitId/discrepancyId links the entry to the affected record.
 *
 * @param action         - Action name, e.g. 'CHECK_IN', 'CHECK_OUT', 'RESOLVE_DISCREPANCY'
 * @param performedBy    - User.id of the authenticated user
 * @param visitId        - Optional: id of the affected Visit record
 * @param discrepancyId  - Optional: id of the affected Discrepancy record
 * @param tx             - Optional: Prisma transaction client (use when inside $transaction)
 */
export async function logAction(
  action: string,
  performedBy: string,
  visitId?: string,
  discrepancyId?: string,
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
): Promise<void> {
  const client = tx ?? prisma;

  await client.auditLog.create({
    data: {
      action,
      performedBy,
      visitId: visitId ?? null,
      discrepancyId: discrepancyId ?? null,
    },
  });
}
