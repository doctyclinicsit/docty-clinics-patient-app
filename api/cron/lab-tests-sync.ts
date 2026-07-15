import { refreshLabTestsSnapshot } from '../_lib/lab-tests-cache.js';
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

  try {
    const snapshot = await refreshLabTestsSnapshot();
    await safeWriteSystemLog({
      level: 'success',
      source: 'lab-tests',
      event: 'lab_tests_sync_completed',
      message: `Lab tests synced: ${snapshot.testCount} tests, ${snapshot.categoryCount} categories.`,
      metadata: {
        syncedAt: snapshot.syncedAt,
        source: snapshot.source,
        testCount: snapshot.testCount,
        categoryCount: snapshot.categoryCount,
      },
    });

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      ok: true,
      syncedAt: snapshot.syncedAt,
      source: snapshot.source,
      testCount: snapshot.testCount,
      categoryCount: snapshot.categoryCount,
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'lab-tests',
      event: 'lab_tests_sync_failed',
      message: error instanceof Error ? error.message : 'Unable to sync lab tests.',
    });

    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to sync lab tests.',
    });
  }
}
