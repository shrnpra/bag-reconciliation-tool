import { z } from 'zod';

// ─── Bag Registration ─────────────────────────────────────────────────────────
export const bagRegistrationSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(100, 'Barcode too long'),
  storeId: z.string().min(1, 'Store identifier is required'),
});
export type BagRegistrationInput = z.infer<typeof bagRegistrationSchema>;

// ─── Bag Pickup ───────────────────────────────────────────────────────────────
export const bagPickupSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  orderReference: z.string().max(200).optional(),
});
export type BagPickupInput = z.infer<typeof bagPickupSchema>;

// ─── Bag Return ───────────────────────────────────────────────────────────────
export const bagReturnSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  storeId: z.string().min(1, 'Store identifier is required'),
});
export type BagReturnInput = z.infer<typeof bagReturnSchema>;

// ─── Bag Status Change ────────────────────────────────────────────────────────
export const bagStatusChangeSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('LOST') }),
  z.object({
    status: z.literal('AVAILABLE'),
    storeId: z.string().min(1, 'Store identifier is required for reactivation'),
  }),
]);
export type BagStatusChangeInput = z.infer<typeof bagStatusChangeSchema>;

// ─── Country Filter ───────────────────────────────────────────────────────────
export const countryFilterSchema = z.object({
  country: z.enum(['UAE', 'SAUDI_ARABIA', 'EGYPT']).optional(),
});
export type CountryFilterInput = z.infer<typeof countryFilterSchema>;
