import { getEkaServices } from '@/lib/eka-api';
import { getClient } from '@/lib/api-client';
import type { Service } from '../models/service-model';
import type { IOperationOptions } from '@/lib/api-client';

const DATA_SOURCE_NAME = 'Service';

export class ServiceService {
  static async create(record: Omit<Service, 'id'>): Promise<Service> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as Service;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Service, 'id'>>
  ): Promise<Service> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as Service;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<Service> {
    const services = await getEkaServices();
    const service = services.find((item) => item.id === id);
    if (!service) throw new Error('Service not found');
    return service;
  }

  static async getAll(options?: IOperationOptions): Promise<Service[]> {
    return getEkaServices(options);
  }
}
