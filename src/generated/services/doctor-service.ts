import { getEkaDoctor, getEkaDoctors } from '@/lib/eka-api';
import { getClient } from '@/lib/api-client';
import type { Doctor } from '../models/doctor-model';
import type { IOperationOptions } from '@/lib/api-client';

const DATA_SOURCE_NAME = 'Doctor';

export class DoctorService {
  static async create(record: Omit<Doctor, 'id'>): Promise<Doctor> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as Doctor;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Doctor, 'id'>>
  ): Promise<Doctor> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as Doctor;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<Doctor> {
    return getEkaDoctor(id);
  }

  static async getAll(options?: IOperationOptions): Promise<Doctor[]> {
    return getEkaDoctors(options);
  }
}
