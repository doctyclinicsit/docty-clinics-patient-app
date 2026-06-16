import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HealthPackageService } from "../services/health-package-service";
import type { HealthPackage } from "../models/health-package-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all HealthPackage records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, description, imageUrl, priceINR, targetAudienceKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useHealthPackageList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["healthPackage-list", options],
    queryFn: () => HealthPackageService.getAll(options),
  });
}

/**
 * Retrieve a single HealthPackage record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useHealthPackage(id: string) {
  return useQuery({
    queryKey: ["healthPackage", id],
    queryFn: () => HealthPackageService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new HealthPackage record.
 * @remarks Form validation: use CreateHealthPackageSchema with zodResolver for type-safe create forms
 */
export function useCreateHealthPackage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HealthPackage, "id">) => HealthPackageService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["healthPackage-list"] });
    },
  });
}

/**
 * Update an existing HealthPackage record.
 * @remarks Form validation: use UpdateHealthPackageSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateHealthPackage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<HealthPackage, "id">>;
    }) => HealthPackageService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["healthPackage-list"] });
      client.invalidateQueries({ queryKey: ["healthPackage", variables.id] });
    },
  });
}

/**
 * Delete a HealthPackage record by its unique identifier.
 */
export function useDeleteHealthPackage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => HealthPackageService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["healthPackage-list"] });
      client.invalidateQueries({ queryKey: ["healthPackage", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const HealthPackage_DATA_SOURCE_TYPE = 'InMemory' as const;

export { HealthPackageSchema, CreateHealthPackageSchema, UpdateHealthPackageSchema } from "../validators/health-package-validator";
export type { HealthPackageInput, CreateHealthPackageInput, UpdateHealthPackageInput } from "../validators/health-package-validator";