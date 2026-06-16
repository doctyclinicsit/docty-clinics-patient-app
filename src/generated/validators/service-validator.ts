import { z } from 'zod';

/**
 * Zod schema for Service validation
 */
export const ServiceSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  available247: z.boolean(),
  description: z.string().optional(),
  displayOrder: z.number().int(),
  iconName: z.string().optional(),
});

/**
 * Schema for creating a new Service (omits system-generated ID)
 */
export const CreateServiceSchema = ServiceSchema.omit({ id: true });

/**
 * Schema for updating an existing Service
 */
export const UpdateServiceSchema = ServiceSchema;

export type ServiceInput = z.infer<typeof ServiceSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;