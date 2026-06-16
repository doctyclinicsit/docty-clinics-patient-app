import { z } from 'zod';

/**
 * Zod schema for Location validation
 */
export const LocationSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  area: z.string().min(1, { message: "Area is required" }),
  imageUrl: z.string().optional(),
  open247: z.boolean(),
  phone: z.string().min(1, { message: "Phone is required" }),
  services: z.string().optional(),
});

/**
 * Schema for creating a new Location (omits system-generated ID)
 */
export const CreateLocationSchema = LocationSchema.omit({ id: true });

/**
 * Schema for updating an existing Location
 */
export const UpdateLocationSchema = LocationSchema;

export type LocationInput = z.infer<typeof LocationSchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;