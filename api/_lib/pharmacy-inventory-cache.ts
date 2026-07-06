import { get, put } from '@vercel/blob';
import {
  mapEvitalRxMedicine,
  mapEvitalRxMedicineVariants,
  requestEvitalRx,
  type EvitalRxMedicine,
  type PharmacyMedicineResult,
} from './evitalrx.js';

const INVENTORY_SNAPSHOT_PATH = 'pharmacy-inventory/latest.json';
const INVENTORY_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface PharmacyInventorySnapshot {
  syncedAt: string;
  source: 'evitalrx';
  itemCount: number;
  variantCount: number;
  items: PharmacyMedicineResult[];
  variants: PharmacyMedicineResult[];
}

function isPharmacyMedicineResult(
  medicine: PharmacyMedicineResult | null
): medicine is PharmacyMedicineResult {
  return Boolean(medicine);
}

function uniqueById(items: PharmacyMedicineResult[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sortInventoryFirst(items: PharmacyMedicineResult[]) {
  return [...items].sort((a, b) => {
    const aStocked = a.available !== false && (a.stockQuantity || 0) > 0 ? 1 : 0;
    const bStocked = b.available !== false && (b.stockQuantity || 0) > 0 ? 1 : 0;
    if (aStocked !== bStocked) return bStocked - aStocked;
    return (b.stockQuantity || 0) - (a.stockQuantity || 0);
  });
}

export function isFreshInventorySnapshot(snapshot: PharmacyInventorySnapshot | null) {
  if (!snapshot?.syncedAt) return false;
  const syncedAt = new Date(snapshot.syncedAt).getTime();
  return Number.isFinite(syncedAt) && Date.now() - syncedAt <= INVENTORY_MAX_AGE_MS;
}

export async function readInventorySnapshot() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return null;

  const blob = await get(INVENTORY_SNAPSHOT_PATH, {
    access: 'private',
    token: blobToken,
  }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return null;

  const text = await new Response(blob.stream).text();
  const snapshot = JSON.parse(text) as PharmacyInventorySnapshot;
  if (!Array.isArray(snapshot.items) || !Array.isArray(snapshot.variants)) return null;
  return snapshot;
}

export async function writeInventorySnapshot(snapshot: PharmacyInventorySnapshot) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error('Pharmacy inventory storage is not configured.');

  await put(INVENTORY_SNAPSHOT_PATH, JSON.stringify(snapshot), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken,
  });
}

export async function fetchEvitalInventorySnapshot() {
  const body = await requestEvitalRx<{ data?: EvitalRxMedicine[] }>({
    endpoint: 'doctor/medicines/get_inventory_items',
  });
  const rawItems = body.data || [];
  const items = sortInventoryFirst(
    uniqueById(rawItems.map(mapEvitalRxMedicine).filter(isPharmacyMedicineResult))
  );
  const variants = sortInventoryFirst(uniqueById(rawItems.flatMap(mapEvitalRxMedicineVariants)));

  return {
    syncedAt: new Date().toISOString(),
    source: 'evitalrx',
    itemCount: items.length,
    variantCount: variants.length,
    items,
    variants,
  } satisfies PharmacyInventorySnapshot;
}

export async function getFreshInventorySnapshot() {
  const snapshot = await readInventorySnapshot();
  return isFreshInventorySnapshot(snapshot) ? snapshot : null;
}

export async function refreshInventorySnapshot() {
  const snapshot = await fetchEvitalInventorySnapshot();
  await writeInventorySnapshot(snapshot);
  return snapshot;
}
