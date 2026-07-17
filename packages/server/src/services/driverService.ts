import { Driver, RecordStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { DriverRegistrationInput } from '../validation/schemas';

// ─── Error helpers ────────────────────────────────────────────────────────────

function makeError(code: string, message: string, fields?: string[]): Error {
  const err = new Error(message) as any;
  err.code = code;
  if (fields) err.fields = fields;
  return err;
}

// ─── Field-length guards (service-level, mirrors Zod schema) ──────────────────

function validateFieldLengths(input: DriverRegistrationInput): void {
  const invalid: string[] = [];

  if (input.id.length < 1 || input.id.length > 50) invalid.push('id');
  if (input.name.length < 1 || input.name.length > 100) invalid.push('name');
  if (input.email !== undefined && input.email.length > 254) invalid.push('email');
  if (input.phone !== undefined && (input.phone.length < 1 || input.phone.length > 50))
    invalid.push('phone');

  if (invalid.length > 0) {
    throw makeError('VALIDATION_ERROR', 'One or more fields have invalid length', invalid);
  }
}

// ─── createDriver ─────────────────────────────────────────────────────────────

/**
 * Creates a new Driver record in DRAFT status.
 *
 * Req 1.1: id 1-50 chars, name 1-100 chars, at least one contact field.
 * Req 1.3: reject duplicate id with CONFLICT error.
 * Req 1.5: records may be saved as drafts.
 *
 * Note: the Driver model requires a linked User (userId unique FK). At the
 * service layer we accept an optional `userId`; callers that create a driver
 * without a linked User must supply a pre-created User id. If no userId is
 * provided we create a placeholder — but typically the route handler will
 * supply one from the auth context.
 *
 * For simplicity the service accepts an extended input type that carries
 * the userId alongside the standard DriverRegistrationInput fields.
 */
export async function createDriver(
  input: DriverRegistrationInput & { userId: string },
): Promise<Driver> {
  validateFieldLengths(input);

  // Req 1.3: reject duplicate identifier
  const existing = await prisma.driver.findUnique({ where: { id: input.id } });
  if (existing) {
    throw makeError(
      'CONFLICT',
      `Driver with identifier '${input.id}' already exists`,
    );
  }

  return prisma.driver.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      status: RecordStatus.DRAFT,
      userId: input.userId,
    },
  });
}

// ─── activateDriver ───────────────────────────────────────────────────────────

/**
 * Transitions a Driver from DRAFT → ACTIVE.
 *
 * Req 1.6: validates all required fields are present before activation.
 *          Required: id (implicit), name, at least one of email/phone.
 *          Returns VALIDATION_ERROR (with missing field names) if any are absent.
 *          Returns NOT_FOUND if the driver does not exist.
 */
export async function activateDriver(id: string): Promise<Driver> {
  const driver = await prisma.driver.findUnique({ where: { id } });

  if (!driver) {
    throw makeError('NOT_FOUND', `Driver '${id}' not found`);
  }

  // Validate required fields for activation
  const missingFields: string[] = [];

  if (!driver.name || driver.name.trim().length === 0) missingFields.push('name');
  if (!driver.email && !driver.phone) missingFields.push('email', 'phone');

  if (missingFields.length > 0) {
    throw makeError(
      'VALIDATION_ERROR',
      'Missing required fields for activation',
      missingFields,
    );
  }

  return prisma.driver.update({
    where: { id },
    data: { status: RecordStatus.ACTIVE },
  });
}

// ─── getDriver ────────────────────────────────────────────────────────────────

/**
 * Returns a single Driver by id.
 * Throws NOT_FOUND if no driver exists with that identifier.
 */
export async function getDriver(id: string): Promise<Driver> {
  const driver = await prisma.driver.findUnique({ where: { id } });

  if (!driver) {
    throw makeError('NOT_FOUND', `Driver '${id}' not found`);
  }

  return driver;
}

// ─── listDrivers ──────────────────────────────────────────────────────────────

/**
 * Returns all Driver records sorted by id ascending.
 *
 * Req 4.5: list results sorted by identifier in ascending order.
 */
export async function listDrivers(): Promise<Driver[]> {
  return prisma.driver.findMany({
    orderBy: { id: 'asc' },
  });
}
