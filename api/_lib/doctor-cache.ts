import { get, put } from '@vercel/blob';

const EKA_API_BASE_URL = 'https://api.eka.care';
const DOCTOR_SNAPSHOT_PATH = 'eka-doctors/latest.json';
const DOCTOR_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

interface DoctorSnapshot {
  syncedAt: string;
  source: 'eka';
  doctorCount: number;
  profileFailureCount: number;
  serviceFailureCount: number;
  doctors: Array<{
    summary: any;
    profile: any;
    services: any[];
  }>;
}

export function parseDoctorTop(value: unknown) {
  const requestedTop = Number(value);
  return Number.isFinite(requestedTop) && requestedTop > 0 ? requestedTop : undefined;
}

export function doctorsFromSnapshot(snapshot: DoctorSnapshot, top?: number) {
  return typeof top === 'number' ? snapshot.doctors.slice(0, top) : snapshot.doctors;
}

export function isFreshDoctorSnapshot(snapshot: DoctorSnapshot | null): snapshot is DoctorSnapshot {
  if (!snapshot?.syncedAt || !Array.isArray(snapshot.doctors)) return false;
  const syncedAt = new Date(snapshot.syncedAt).getTime();
  return Number.isFinite(syncedAt) && Date.now() - syncedAt <= DOCTOR_SNAPSHOT_MAX_AGE_MS;
}

export async function readDoctorSnapshot() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return null;

  const blob = await get(DOCTOR_SNAPSHOT_PATH, {
    access: 'private',
    token: blobToken,
  }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return null;

  const text = await new Response(blob.stream).text();
  const snapshot = JSON.parse(text || 'null') as DoctorSnapshot | null;
  if (!snapshot || !Array.isArray(snapshot.doctors)) return null;
  return snapshot;
}

export async function writeDoctorSnapshot(snapshot: DoctorSnapshot) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error('Doctor snapshot storage is not configured.');

  await put(DOCTOR_SNAPSHOT_PATH, JSON.stringify(snapshot), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken,
  });
}

async function ekaRequest(path: string, token: string) {
  const response = await fetch(`${EKA_API_BASE_URL}${path}`, {
    headers: {
      auth: token,
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.error || response.statusText);
  }

  return body;
}

export async function fetchEkaDoctorSnapshot(token: string) {
  const entitiesResponse = await ekaRequest('/dr/v1/business/entities', token);
  const entities = entitiesResponse.data || entitiesResponse;
  const summaries = Array.isArray(entities.doctors) ? entities.doctors : [];
  const doctors: DoctorSnapshot['doctors'] = [];
  let profileFailureCount = 0;
  let serviceFailureCount = 0;
  const batchSize = 6;

  for (let index = 0; index < summaries.length; index += batchSize) {
    const batch = summaries.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (summary: any) => {
        const [profileResult, servicesResult] = await Promise.allSettled([
          ekaRequest(`/dr/v1/doctor/${summary.doctor_id}`, token),
          ekaRequest(`/dr/v1/doctor/service/${summary.doctor_id}`, token),
        ]);

        if (profileResult.status === 'rejected') profileFailureCount += 1;
        if (servicesResult.status === 'rejected') serviceFailureCount += 1;

        const services =
          servicesResult.status === 'fulfilled'
            ? servicesResult.value?.data?.services
            : [];

        return {
          summary,
          profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
          services: Array.isArray(services) ? services : services ? [services] : [],
        };
      })
    );

    doctors.push(...results);
  }

  return {
    syncedAt: new Date().toISOString(),
    source: 'eka',
    doctorCount: doctors.length,
    profileFailureCount,
    serviceFailureCount,
    doctors,
  } satisfies DoctorSnapshot;
}

export async function refreshDoctorSnapshot(token: string) {
  const snapshot = await fetchEkaDoctorSnapshot(token);
  await writeDoctorSnapshot(snapshot);
  return snapshot;
}
