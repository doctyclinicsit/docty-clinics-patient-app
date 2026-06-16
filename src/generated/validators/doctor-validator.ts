import { z } from 'zod';

/**
 * Zod schema for Doctor validation
 */
export const DoctorSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  bio: z.string().optional(),
  consultationFee: z.number().optional(),
  experienceYears: z.number().int(),
  imageURL: z.string().optional(),
  isAvailable: z.boolean(),
  languages: z.string().optional(),
  location: z.object({ id: z.string().uuid(), name1: z.string() }).optional(),
  nextAvailableSlot: z.string().optional(),
  qualifications: z.string().optional(),
  rating: z.number().optional(),
  registrationNumber: z.string().optional(),
  servicesOffered: z.string().optional(),
  specialty: z.string().min(1, { message: "Specialty is required" }),
});

/**
 * Schema for creating a new Doctor (omits system-generated ID)
 */
export const CreateDoctorSchema = DoctorSchema.omit({ id: true });

/**
 * Schema for updating an existing Doctor
 */
export const UpdateDoctorSchema = DoctorSchema;

export type DoctorInput = z.infer<typeof DoctorSchema>;
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;