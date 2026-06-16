import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ServiceService } from "../services/service-service";
import type { Service } from "../models/service-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Service records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, available247, description, displayOrder, iconName
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useServiceList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["service-list", options],
    queryFn: () => ServiceService.getAll(options),
  });
}

/**
 * Retrieve a single Service record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useService(id: string) {
  return useQuery({
    queryKey: ["service", id],
    queryFn: () => ServiceService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Service record.
 * @remarks Form validation: use CreateServiceSchema with zodResolver for type-safe create forms
 */
export function useCreateService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Service, "id">) => ServiceService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["service-list"] });
    },
  });
}

/**
 * Update an existing Service record.
 * @remarks Form validation: use UpdateServiceSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Service, "id">>;
    }) => ServiceService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["service-list"] });
      client.invalidateQueries({ queryKey: ["service", variables.id] });
    },
  });
}

/**
 * Delete a Service record by its unique identifier.
 */
export function useDeleteService() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ServiceService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["service-list"] });
      client.invalidateQueries({ queryKey: ["service", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Service_DATA_SOURCE_TYPE = 'InMemory' as const;

export { ServiceSchema, CreateServiceSchema, UpdateServiceSchema } from "../validators/service-validator";
export type { ServiceInput, CreateServiceInput, UpdateServiceInput } from "../validators/service-validator";