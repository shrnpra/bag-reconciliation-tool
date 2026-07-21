/**
 * Overdue threshold utility for bag tracking.
 * Bags not returned within 4 hours of pickup are considered overdue.
 * All calculations happen at query time — no cron jobs or background processes.
 */

const OVERDUE_THRESHOLD_HOURS = 4;

/**
 * Builds a Prisma WHERE clause fragment for finding overdue BagAssignment records.
 * An assignment is overdue when:
 *   - returnTime is null (bag not returned)
 *   - pickupTime + 4 hours < now (threshold exceeded)
 *
 * @param now - current time (injectable for testing), defaults to Date.now()
 */
export function buildOverdueWhereClause(now: Date = new Date()) {
  const threshold = new Date(now.getTime() - OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);
  return {
    returnTime: null,
    pickupTime: { lt: threshold },
  };
}

/**
 * Returns true if the given pickup time exceeds the 4-hour overdue threshold.
 */
export function isOverdue(pickupTime: Date, now: Date = new Date()): boolean {
  const elapsed = now.getTime() - pickupTime.getTime();
  return elapsed > OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000;
}

/**
 * Returns the number of hours elapsed since pickup.
 */
export function elapsedHours(pickupTime: Date, now: Date = new Date()): number {
  return Math.round(((now.getTime() - pickupTime.getTime()) / (60 * 60 * 1000)) * 10) / 10;
}
