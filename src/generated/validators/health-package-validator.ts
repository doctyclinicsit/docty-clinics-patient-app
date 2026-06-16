import { z } from 'zod';

/**
 * Zod schema for HealthPackage validation
 */
export const HealthPackageSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  priceINR: z.number(),
  targetAudienceKey: z.enum(['TargetAudienceKey0', 'TargetAudienceKey1', 'TargetAudienceKey2', 'TargetAudienceKey3', 'TargetAudienceKey4']),
});

/**
 * Schema for creating a new HealthPackage (omits system-generated ID)
 */
export const CreateHealthPackageSchema = HealthPackageSchema.omit({ id: true });

/**
 * Schema for updating an existing HealthPackage
 */
export const UpdateHealthPackageSchema = HealthPackageSchema;

export type HealthPackageInput = z.infer<typeof HealthPackageSchema>;
export type CreateHealthPackageInput = z.infer<typeof CreateHealthPackageSchema>;
export type UpdateHealthPackageInput = z.infer<typeof UpdateHealthPackageSchema>;