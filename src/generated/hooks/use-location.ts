import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LocationService } from "../services/location-service";
import type { Location } from "../models/location-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Location records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, address, area, imageUrl, open247, phone, services
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useLocationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["location-list", options],
    queryFn: () => LocationService.getAll(options),
  });
}

/**
 * Retrieve a single Location record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useLocation(id: string) {
  return useQuery({
    queryKey: ["location", id],
    queryFn: () => LocationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Location record.
 * @remarks Form validation: use CreateLocationSchema with zodResolver for type-safe create forms
 */
export function useCreateLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Location, "id">) => LocationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["location-list"] });
    },
  });
}

/**
 * Update an existing Location record.
 * @remarks Form validation: use UpdateLocationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Location, "id">>;
    }) => LocationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["location-list"] });
      client.invalidateQueries({ queryKey: ["location", variables.id] });
    },
  });
}

/**
 * Delete a Location record by its unique identifier.
 */
export function useDeleteLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => LocationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["location-list"] });
      client.invalidateQueries({ queryKey: ["location", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Location_DATA_SOURCE_TYPE = 'InMemory' as const;

export { LocationSchema, CreateLocationSchema, UpdateLocationSchema } from "../validators/location-validator";
export type { LocationInput, CreateLocationInput, UpdateLocationInput } from "../validators/location-validator";