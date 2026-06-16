import { z } from 'zod';

/**
 * Zod schema for Appointment validation
 */
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  appointmentName: z.string().min(1, { message: "Appointment Name is required" }),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Appointment Date is required" }),
  createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created Date is required" }),
  location: z.object({ id: z.string().uuid(), name1: z.string() }),
  notes: z.string().optional(),
  patientEmail: z.string().email().optional(),
  patientName: z.string().min(1, { message: "Patient Name is required" }),
  patientPhone: z.string().min(1, { message: "Patient Phone is required" }),
  service: z.object({ id: z.string().uuid(), name1: z.string() }),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2', 'StatusKey3']),
});

/**
 * Schema for creating a new Appointment (omits system-generated ID)
 */
export const CreateAppointmentSchema = AppointmentSchema.omit({ id: true });

/**
 * Schema for updating an existing Appointment
 */
export const UpdateAppointmentSchema = AppointmentSchema;

export type AppointmentInput = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;