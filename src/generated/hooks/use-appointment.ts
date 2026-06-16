import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentService } from "../services/appointment-service";
import type { Appointment } from "../models/appointment-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Appointment records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, appointmentName, appointmentDate, createdDate, notes, patientEmail, patientName, patientPhone, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useAppointmentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["appointment-list", options],
    queryFn: () => AppointmentService.getAll(options),
  });
}

/**
 * Retrieve a single Appointment record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useAppointment(id: string) {
  return useQuery({
    queryKey: ["appointment", id],
    queryFn: () => AppointmentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Appointment record.
 * @remarks Form validation: use CreateAppointmentSchema with zodResolver for type-safe create forms
 */
export function useCreateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Appointment, "id">) => AppointmentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["appointment-list"] });
    },
  });
}

/**
 * Update an existing Appointment record.
 * @remarks Form validation: use UpdateAppointmentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Appointment, "id">>;
    }) => AppointmentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["appointment-list"] });
      client.invalidateQueries({ queryKey: ["appointment", variables.id] });
    },
  });
}

/**
 * Delete a Appointment record by its unique identifier.
 */
export function useDeleteAppointment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AppointmentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["appointment-list"] });
      client.invalidateQueries({ queryKey: ["appointment", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Appointment_DATA_SOURCE_TYPE = 'InMemory' as const;

export { AppointmentSchema, CreateAppointmentSchema, UpdateAppointmentSchema } from "../validators/appointment-validator";
export type { AppointmentInput, CreateAppointmentInput, UpdateAppointmentInput } from "../validators/appointment-validator";