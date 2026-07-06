import {
  getFreshInventorySnapshot,
  refreshInventorySnapshot,
} from '../_lib/pharmacy-inventory-cache.js';
import { safeWriteSystemLog } from '../_lib/system-logs.js';
import { syncPharmacyInventoryToZohoBooks } from '../_lib/zoho-books-pharmacy-inventory.js';

function isAuthorized(request: any) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const headerValue = String(request.headers?.authorization || '');
  return headerValue === `Bearer ${cronSecret}`;
}

function parseLimit(value: unknown) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;
}

export default async function handler(request: any, response: any) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ message: 'Unauthorized.' });
  }

  const dryRun = String(request.query?.dryRun ?? '1') !== '0';
  const forceRefresh = String(request.query?.refresh || '') === '1';
  const updateExisting = String(request.query?.updateExisting ?? '1') !== '0';
  const limit = parseLimit(request.query?.limit);

  try {
    const snapshot = forceRefresh
      ? await refreshInventorySnapshot()
      : (await getFreshInventorySnapshot()) || (await refreshInventorySnapshot());
    const syncResult = await syncPharmacyInventoryToZohoBooks(snapshot.items, {
      dryRun,
      limit,
      updateExisting,
    });

    await safeWriteSystemLog({
      level: syncResult.failed > 0 ? 'warning' : 'success',
      source: 'zoho-books-inventory',
      event: dryRun ? 'inventory_sync_dry_run_completed' : 'inventory_sync_completed',
      message: dryRun
        ? `Zoho Books inventory dry run: ${syncResult.created} creates, ${syncResult.updated} updates, ${syncResult.skipped} skipped.`
        : `Zoho Books inventory sync: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.skipped} skipped.`,
      metadata: {
        syncedAt: snapshot.syncedAt,
        itemType: syncResult.itemType,
        scanned: syncResult.scanned,
        created: syncResult.created,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        failed: syncResult.failed,
        dryRun,
      },
    });

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      ok: syncResult.failed === 0,
      inventorySyncedAt: snapshot.syncedAt,
      ...syncResult,
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'zoho-books-inventory',
      event: 'inventory_sync_failed',
      message: error instanceof Error ? error.message : 'Unable to sync inventory to Zoho Books.',
      metadata: { dryRun, limit, updateExisting },
    });
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to sync inventory to Zoho Books.',
    });
  }
}
