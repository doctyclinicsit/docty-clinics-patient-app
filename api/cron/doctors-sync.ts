import { refreshDoctorSnapshot } from '../_lib/doctor-cache.js';
import { safeWriteSystemLog } from '../_lib/system-logs.js';

function isAuthorized(request: any) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const headerValue = String(request.headers?.authorization || '');
  return headerValue === `Bearer ${cronSecret}`;
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ message: 'Unauthorized.' });
  }

  const token = process.env.EKA_AUTH_TOKEN;
  if (!token) {
    return response.status(500).json({ message: 'EKA_AUTH_TOKEN is not configured.' });
  }

  try {
    const snapshot = await refreshDoctorSnapshot(token);
    await safeWriteSystemLog({
      level: 'success',
      source: 'eka-doctors',
      event: 'doctors_sync_completed',
      message: `Eka doctors synced: ${snapshot.doctorCount} doctors.`,
      metadata: {
        syncedAt: snapshot.syncedAt,
        doctorCount: snapshot.doctorCount,
        profileFailureCount: snapshot.profileFailureCount,
        serviceFailureCount: snapshot.serviceFailureCount,
      },
    });

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      ok: true,
      syncedAt: snapshot.syncedAt,
      doctorCount: snapshot.doctorCount,
      profileFailureCount: snapshot.profileFailureCount,
      serviceFailureCount: snapshot.serviceFailureCount,
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'eka-doctors',
      event: 'doctors_sync_failed',
      message: error instanceof Error ? error.message : 'Unable to sync Eka doctors.',
    });

    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to sync Eka doctors.',
    });
  }
}
