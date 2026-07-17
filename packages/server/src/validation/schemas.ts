import { z } from 'zod';

// ─── Driver Registration ───────────────────────────────────────────────────────
// Req 1.1: id 1-50 chars, name 1-100 chars, at least one of email/phone required

export const driverRegistrationSchema = z
  .object({
    id: z
      .string()
      .min(1, 'Driver identifier must be at least 1 character')
      .max(50, 'Driver identifier must be at most 50 characters'),
    name: z
      .string()
      .min(1, 'Driver name must be at least 1 character')
      .max(100, 'Driver name must be at most 100 characters'),
    email: z.string().email('Must be a valid email address').optional(),
    phone: z.string().min(1, 'Phone must not be empty').optional(),
    status: z.enum(['DRAFT', 'ACTIVE']).optional(),
  })
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    message: 'At least one contact field (email or phone) is required',
    path: ['email'],
  });

export type DriverRegistrationInput = z.infer<typeof driverRegistrationSchema>;

// ─── Store Registration ────────────────────────────────────────────────────────
// Req 1.2: id 1-50 chars, name 1-100 chars, address 1-200 chars

export const storeRegistrationSchema = z.object({
  id: z
    .string()
    .min(1, 'Store identifier must be at least 1 character')
    .max(50, 'Store identifier must be at most 50 characters'),
  name: z
    .string()
    .min(1, 'Store name must be at least 1 character')
    .max(100, 'Store name must be at most 100 characters'),
  address: z
    .string()
    .min(1, 'Address must be at least 1 character')
    .max(200, 'Address must be at most 200 characters'),
  status: z.enum(['DRAFT', 'ACTIVE']).optional(),
});

export type StoreRegistrationInput = z.infer<typeof storeRegistrationSchema>;

// ─── Check-Out Request ─────────────────────────────────────────────────────────
// Req 2.4: driverId and storeId required, bagCount must be > 0

export const checkOutRequestSchema = z.object({
  driverId: z.string().min(1, 'Driver identifier is required'),
  storeId: z.string().min(1, 'Store identifier is required'),
  bagCount: z
    .number()
    .int('Bag count must be an integer')
    .positive('Bag count must be greater than 0'),
});

export type CheckOutRequestInput = z.infer<typeof checkOutRequestSchema>;

// ─── Check-In Request ─────────────────────────────────────────────────────────
// Req 3.5: driverId and storeId required, bagCount must be in range 1-999

export const checkInRequestSchema = z.object({
  driverId: z.string().min(1, 'Driver identifier is required'),
  storeId: z.string().min(1, 'Store identifier is required'),
  bagCount: z
    .number()
    .int('Bag count must be an integer')
    .min(1, 'Bag count must be at least 1')
    .max(999, 'Bag count must be at most 999'),
});

export type CheckInRequestInput = z.infer<typeof checkInRequestSchema>;

// ─── Discrepancy Resolution ────────────────────────────────────────────────────
// Req 6.5: resolution note must be present and non-empty

export const discrepancyResolutionSchema = z.object({
  resolutionNote: z
    .string()
    .min(1, 'Resolution note must not be empty'),
});

export type DiscrepancyResolutionInput = z.infer<typeof discrepancyResolutionSchema>;

// ─── Date Range Query ─────────────────────────────────────────────────────────
// Req 5.6: both from and to are optional ISO date strings; defaults handled at service layer

export const dateRangeQuerySchema = z.object({
  from: z
    .string()
    .datetime({ message: 'from must be a valid ISO date string' })
    .optional(),
  to: z
    .string()
    .datetime({ message: 'to must be a valid ISO date string' })
    .optional(),
});

export type DateRangeQueryInput = z.infer<typeof dateRangeQuerySchema>;

// ─── Inventory Query ──────────────────────────────────────────────────────────
// Req 4.7: id must not be missing or malformed

export const inventoryQuerySchema = z.object({
  id: z.string().min(1, 'Identifier must not be empty or missing'),
});

export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
