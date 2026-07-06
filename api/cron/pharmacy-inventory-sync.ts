import { refreshInventorySnapshot } from '../_lib/pharmacy-inventory-cache.js';
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
    const snapshot = await refreshInventorySnapshot();
    await safeWriteSystemLog({
      level: 'success',
      source: 'pharmacy-inventory',
      event: 'inventory_sync_completed',
      message: `Pharmacy inventory synced: ${snapshot.itemCount} medicines, ${snapshot.variantCount} stock variants.`,
      metadata: {
        syncedAt: snapshot.syncedAt,
        itemCount: snapshot.itemCount,
        variantCount: snapshot.variantCount,
      },
    });
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      ok: true,
      syncedAt: snapshot.syncedAt,
      itemCount: snapshot.itemCount,
      variantCount: snapshot.variantCount,
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'pharmacy-inventory',
      event: 'inventory_sync_failed',
      message: error instanceof Error ? error.message : 'Unable to sync pharmacy inventory.',
    });
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to sync pharmacy inventory.',
    });
  }
}
