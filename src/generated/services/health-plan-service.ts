import { getClient } from '../../../app-gen-sdk/data';
import type { HealthPlan } from '../models/health-plan-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'HealthPlan';

export class HealthPlanService {
  static async create(record: Omit<HealthPlan, 'id'>): Promise<HealthPlan> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as HealthPlan;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<HealthPlan, 'id'>>
  ): Promise<HealthPlan> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as HealthPlan;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<HealthPlan> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as HealthPlan;
  }

  static async getAll(options?: IOperationOptions): Promise<HealthPlan[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as HealthPlan[];
  }
}