import { z } from 'zod';

/**
 * Zod schema for HealthPlan validation
 */
export const HealthPlanSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  benefits: z.string().min(1, { message: "Benefits is required" }),
  description: z.string().optional(),
  pricePerYearINR: z.number(),
});

/**
 * Schema for creating a new HealthPlan (omits system-generated ID)
 */
export const CreateHealthPlanSchema = HealthPlanSchema.omit({ id: true });

/**
 * Schema for updating an existing HealthPlan
 */
export const UpdateHealthPlanSchema = HealthPlanSchema;

export type HealthPlanInput = z.infer<typeof HealthPlanSchema>;
export type CreateHealthPlanInput = z.infer<typeof CreateHealthPlanSchema>;
export type UpdateHealthPlanInput = z.infer<typeof UpdateHealthPlanSchema>;