import { getClient } from '../../../app-gen-sdk/data';
import type { Appointment } from '../models/appointment-model';
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const DATA_SOURCE_NAME = 'Appointment';

export class AppointmentService {
  static async create(record: Omit<Appointment, 'id'>): Promise<Appointment> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as Appointment;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Appointment, 'id'>>
  ): Promise<Appointment> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as Appointment;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<Appointment> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as Appointment;
  }

  static async getAll(options?: IOperationOptions): Promise<Appointment[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as Appointment[];
  }
}