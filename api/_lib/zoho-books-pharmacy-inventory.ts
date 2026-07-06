import type { PharmacyMedicineResult } from './evitalrx.js';
import {
  createZohoBooksItem,
  listZohoBooksItems,
  updateZohoBooksItem,
  zohoBooksInventoryItemConfig,
  type ZohoBooksItemRecord,
} from '../../server/zoho-books.js';

export interface ZohoBooksInventorySyncOptions {
  dryRun?: boolean;
  limit?: number;
  updateExisting?: boolean;
}

export interface ZohoBooksInventorySyncResult {
  dryRun: boolean;
  itemType: string;
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: Array<{
    status: 'create' | 'update' | 'skip' | 'error';
    sku: string;
    medicineId: string;
    name: string;
    zohoItemId?: string;
    message?: string;
    payload?: Record<string, unknown>;
  }>;
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return Math.max(0, Math.round(numberOrZero(value) * 100) / 100);
}

function text(value: unknown) {
  return String(value || '').trim();
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

export function zohoBooksSkuForMedicine(medicine: Pick<PharmacyMedicineResult, 'medicineId'>) {
  return `EVRX-${text(medicine.medicineId).replace(/[^\w.-]+/g, '-').slice(0, 80)}`;
}

function itemDescription(medicine: PharmacyMedicineResult) {
  return truncate(
    [
      medicine.composition ? `Composition: ${medicine.composition}` : '',
      medicine.manufacturer ? `Manufacturer: ${medicine.manufacturer}` : '',
      medicine.packSize ? `Pack: ${medicine.packSize}` : '',
      medicine.gstPercentage ? `GST: ${medicine.gstPercentage}%` : '',
      `eVitalRx Medicine ID: ${medicine.medicineId}`,
    ]
      .filter(Boolean)
      .join('\n'),
    2000
  );
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

export function zohoBooksItemPayloadFromMedicine(medicine: PharmacyMedicineResult) {
  const config = zohoBooksInventoryItemConfig();
  const stockQuantity = Math.max(0, Math.floor(numberOrZero(medicine.stockQuantity)));
  const rate = money(medicine.salePrice || medicine.mrp || 0);
  const purchaseRate = money(medicine.lpPrice || 0);
  const customFields = config.sourceCustomFieldId
    ? [
        {
          customfield_id: config.sourceCustomFieldId,
          value: medicine.medicineId,
        },
      ]
    : [];

  return compactPayload({
    name: truncate(medicine.name, 100),
    sku: zohoBooksSkuForMedicine(medicine),
    rate,
    description: itemDescription(medicine),
    product_type: 'goods',
    item_type: config.itemType,
    account_id: config.accountId,
    purchase_rate: purchaseRate || undefined,
    purchase_description: itemDescription(medicine),
    purchase_account_id: config.itemType === 'inventory' ? config.purchaseAccountId : undefined,
    inventory_account_id: config.itemType === 'inventory' ? config.inventoryAccountId : undefined,
    initial_stock: config.itemType === 'inventory' && stockQuantity > 0 ? String(stockQuantity) : undefined,
    initial_stock_rate: config.itemType === 'inventory' && purchaseRate > 0 ? String(purchaseRate) : undefined,
    is_taxable: numberOrZero(medicine.gstPercentage) > 0 ? true : undefined,
    tax_percentage: numberOrZero(medicine.gstPercentage) > 0 ? String(medicine.gstPercentage) : undefined,
    custom_fields: customFields,
  });
}

function shouldSkipMedicine(medicine: PharmacyMedicineResult) {
  if (!medicine.medicineId || !medicine.name) return 'Missing eVitalRx medicine id or name.';
  if (!money(medicine.salePrice || medicine.mrp || 0)) return 'Missing sale price/MRP.';
  return '';
}

export async function syncPharmacyInventoryToZohoBooks(
  medicines: PharmacyMedicineResult[],
  options: ZohoBooksInventorySyncOptions = {}
): Promise<ZohoBooksInventorySyncResult> {
  const dryRun = options.dryRun !== false;
  const updateExisting = options.updateExisting !== false;
  const selectedMedicines = medicines
    .filter((medicine) => medicine.available !== false)
    .slice(0, Math.max(1, Math.min(Number(options.limit) || medicines.length, medicines.length)));
  const existingItems = dryRun ? [] : await listZohoBooksItems();
  const existingBySku = new Map(existingItems.map((item) => [item.sku, item]));
  const result: ZohoBooksInventorySyncResult = {
    dryRun,
    itemType: zohoBooksInventoryItemConfig().itemType,
    scanned: selectedMedicines.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  for (const medicine of selectedMedicines) {
    const sku = zohoBooksSkuForMedicine(medicine);
    const payload = zohoBooksItemPayloadFromMedicine(medicine);
    const skipReason = shouldSkipMedicine(medicine);
    const existing = existingBySku.get(sku) as ZohoBooksItemRecord | undefined;

    if (skipReason) {
      result.skipped += 1;
      result.results.push({
        status: 'skip',
        sku,
        medicineId: medicine.medicineId,
        name: medicine.name,
        message: skipReason,
        payload: dryRun ? payload : undefined,
      });
      continue;
    }

    if (existing && !updateExisting) {
      result.skipped += 1;
      result.results.push({
        status: 'skip',
        sku,
        medicineId: medicine.medicineId,
        name: medicine.name,
        zohoItemId: existing.itemId,
        message: 'Item already exists in Zoho Books.',
        payload: dryRun ? payload : undefined,
      });
      continue;
    }

    try {
      if (!existing) {
        result.created += 1;
        const created = dryRun ? undefined : await createZohoBooksItem(payload);
        result.results.push({
          status: 'create',
          sku,
          medicineId: medicine.medicineId,
          name: medicine.name,
          zohoItemId: created?.itemId,
          payload: dryRun ? payload : undefined,
        });
      } else {
        result.updated += 1;
        const updatePayload = { ...payload };
        delete updatePayload.initial_stock;
        delete updatePayload.initial_stock_rate;
        const updated = dryRun ? undefined : await updateZohoBooksItem(existing.itemId, updatePayload);
        result.results.push({
          status: 'update',
          sku,
          medicineId: medicine.medicineId,
          name: medicine.name,
          zohoItemId: updated?.itemId || existing.itemId,
          payload: dryRun ? updatePayload : undefined,
        });
      }
    } catch (error) {
      result.failed += 1;
      result.results.push({
        status: 'error',
        sku,
        medicineId: medicine.medicineId,
        name: medicine.name,
        zohoItemId: existing?.itemId,
        message: error instanceof Error ? error.message : 'Zoho Books item sync failed.',
        payload: dryRun ? payload : undefined,
      });
    }
  }

  return result;
}
