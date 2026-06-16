import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HealthPlanService } from "../services/health-plan-service";
import type { HealthPlan } from "../models/health-plan-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all HealthPlan records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, benefits, description, pricePerYearINR
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useHealthPlanList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["healthPlan-list", options],
    queryFn: () => HealthPlanService.getAll(options),
  });
}

/**
 * Retrieve a single HealthPlan record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useHealthPlan(id: string) {
  return useQuery({
    queryKey: ["healthPlan", id],
    queryFn: () => HealthPlanService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new HealthPlan record.
 * @remarks Form validation: use CreateHealthPlanSchema with zodResolver for type-safe create forms
 */
export function useCreateHealthPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HealthPlan, "id">) => HealthPlanService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["healthPlan-list"] });
    },
  });
}

/**
 * Update an existing HealthPlan record.
 * @remarks Form validation: use UpdateHealthPlanSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateHealthPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<HealthPlan, "id">>;
    }) => HealthPlanService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["healthPlan-list"] });
      client.invalidateQueries({ queryKey: ["healthPlan", variables.id] });
    },
  });
}

/**
 * Delete a HealthPlan record by its unique identifier.
 */
export function useDeleteHealthPlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => HealthPlanService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["healthPlan-list"] });
      client.invalidateQueries({ queryKey: ["healthPlan", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const HealthPlan_DATA_SOURCE_TYPE = 'InMemory' as const;

export { HealthPlanSchema, CreateHealthPlanSchema, UpdateHealthPlanSchema } from "../validators/health-plan-validator";
export type { HealthPlanInput, CreateHealthPlanInput, UpdateHealthPlanInput } from "../validators/health-plan-validator";