import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DoctorService } from "../services/doctor-service";
import type { Doctor } from "../models/doctor-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Doctor records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, bio, consultationFee, experienceYears, imageURL, isAvailable, languages, nextAvailableSlot, qualifications, rating, registrationNumber, servicesOffered, specialty
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useDoctorList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["doctor-list", options],
    queryFn: () => DoctorService.getAll(options),
  });
}

/**
 * Retrieve a single Doctor record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useDoctor(id: string) {
  return useQuery({
    queryKey: ["doctor", id],
    queryFn: () => DoctorService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Doctor record.
 * @remarks Form validation: use CreateDoctorSchema with zodResolver for type-safe create forms
 */
export function useCreateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Doctor, "id">) => DoctorService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["doctor-list"] });
    },
  });
}

/**
 * Update an existing Doctor record.
 * @remarks Form validation: use UpdateDoctorSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Doctor, "id">>;
    }) => DoctorService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["doctor-list"] });
      client.invalidateQueries({ queryKey: ["doctor", variables.id] });
    },
  });
}

/**
 * Delete a Doctor record by its unique identifier.
 */
export function useDeleteDoctor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DoctorService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["doctor-list"] });
      client.invalidateQueries({ queryKey: ["doctor", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Doctor_DATA_SOURCE_TYPE = 'InMemory' as const;

export { DoctorSchema, CreateDoctorSchema, UpdateDoctorSchema } from "../validators/doctor-validator";
export type { DoctorInput, CreateDoctorInput, UpdateDoctorInput } from "../validators/doctor-validator";