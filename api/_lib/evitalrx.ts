const DEFAULT_EVITALRX_API_BASE_URL = 'https://api.evitalrx.in/v1/';

interface EvitalRxRequestOptions {
  endpoint: string;
  payload?: Record<string, unknown>;
}

interface EvitalRxMultipartRequestOptions {
  endpoint: string;
  fields?: Record<string, unknown>;
  files?: Array<{
    fieldName: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }>;
}

export interface EvitalRxMedicine {
  medicine_id?: string;
  id?: string;
  batch_id?: string;
  batchid?: string;
  batchId?: string;
  batch_no?: string;
  batch_number?: string;
  batch_num?: string;
  batch_code?: string;
  batchcode?: string;
  batch_name?: string;
  batchNo?: string;
  batchNumber?: string;
  batch?: string;
  medicine_name?: string;
  medicine_image?: string;
  thumb_medicine_image?: string;
  manufacturer_name?: string;
  content?: string;
  packing_size?: string;
  pack_size?: string;
  mrp?: number | string;
  price?: number | string;
  lp?: number | string;
  landing_price?: number | string;
  price_to_retailer?: number | string;
  purchase_price?: number | string;
  cost_price?: number | string;
  sale_discount?: number | string;
  gst?: number | string;
  gst_percentage?: number | string;
  gstPercent?: number | string;
  gst_percent?: number | string;
  tax?: number | string;
  tax_percentage?: number | string;
  is_inventory_available?: string;
  available_for_patient?: string;
  discontinued?: string;
  loose_quantity?: number | string;
  strip_quantity?: number | string;
  quantity?: number | string;
  stock?: number | string;
  stock_quantity?: number | string;
  available_quantity?: number | string;
  expiry?: string;
  expiry_label?: string;
  expiry_date?: string;
  exp_date?: string;
  exp?: string;
  expiryDate?: string;
  expiry_month?: string | number;
  expiry_year?: string | number;
  exp_month?: string | number;
  exp_year?: string | number;
  location?: string;
  rack?: string;
  batches?: EvitalRxMedicine[];
  batch_list?: EvitalRxMedicine[];
  batch_details?: EvitalRxMedicine[];
  batch_wise_stock?: EvitalRxMedicine[];
  batchwise_stock?: EvitalRxMedicine[];
  batch_stock?: EvitalRxMedicine[];
  batchStock?: EvitalRxMedicine[];
  stock_batches?: EvitalRxMedicine[];
  available_batches?: EvitalRxMedicine[];
  availableBatches?: EvitalRxMedicine[];
  inventory?: EvitalRxMedicine[];
  stock_details?: EvitalRxMedicine[];
  dosage_type?: string;
  medicine_type?: string;
  medicine_category?: string;
}

export interface PharmacyMedicineResult {
  id: string;
  medicineId: string;
  name: string;
  imageUrl?: string;
  manufacturer?: string;
  composition?: string;
  packSize?: string;
  mrp?: number;
  salePrice?: number;
  lpPrice?: number;
  gstPercentage?: number;
  available?: boolean;
  stockQuantity?: number;
  looseQuantity?: number;
  stripQuantity?: number;
  saleUnit?: string;
  packUnitCount?: number;
  batchNo?: string;
  batchId?: string;
  expiry?: string;
  location?: string;
  dosageType?: string;
  medicineType?: string;
}

function getEvitalRxConfig() {
  const apiKey = process.env.EVITALRX_API_KEY;
  if (!apiKey) throw new Error('eVitalRx API key is not configured.');

  const baseUrl = (process.env.EVITALRX_API_BASE_URL || DEFAULT_EVITALRX_API_BASE_URL).replace(
    /\/?$/,
    '/'
  );

  return { apiKey, baseUrl };
}

function toNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function compactId(value: string) {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeExpiry(medicine: EvitalRxMedicine) {
  const explicit = String(
    medicine.expiry ||
      medicine.expiry_date ||
      medicine.expiryDate ||
      medicine.exp_date ||
      medicine.expiry_label ||
      medicine.exp ||
      ''
  ).trim();
  if (explicit) return explicit;

  const month = String(medicine.exp_month || medicine.expiry_month || '').trim();
  const year = String(medicine.exp_year || medicine.expiry_year || '').trim();
  if (!month && !year) return undefined;
  return [month.padStart(2, '0'), year].filter(Boolean).join('/');
}

function batchRows(medicine: EvitalRxMedicine) {
  const explicitRows = [
    medicine.batches,
    medicine.batch_list,
    medicine.batch_details,
    medicine.batch_wise_stock,
    medicine.batchwise_stock,
    medicine.batch_stock,
    medicine.batchStock,
    medicine.stock_batches,
    medicine.available_batches,
    medicine.availableBatches,
    medicine.inventory,
    medicine.stock_details,
  ].find((value) => Array.isArray(value) && value.length > 0);

  if (explicitRows) return explicitRows;

  const discoveredRows = Object.entries(medicine)
    .filter(([key, value]) => /(batch|stock|inventory)/i.test(key) && Array.isArray(value))
    .flatMap(([, value]) => value as unknown[])
    .filter((value): value is EvitalRxMedicine => {
      if (!value || typeof value !== 'object') return false;
      const row = value as EvitalRxMedicine;
      return Boolean(
        row.batch ||
          row.batch_no ||
          row.batchNo ||
          row.batch_number ||
          row.batchNumber ||
          row.batch_code ||
          row.batchcode ||
          row.expiry ||
          row.expiry_date ||
          row.expiryDate ||
          row.exp ||
          row.stock ||
          row.stock_quantity ||
          row.loose_quantity ||
          row.strip_quantity
      );
    });

  return discoveredRows.length ? discoveredRows : undefined;
}

function packUnitCount(value?: string) {
  const match = String(value || '').match(/(\d+)\s*(tablets?|tabs?|capsules?|caps?)\b/i);
  return match ? Number(match[1]) : undefined;
}

function looseSaleUnit(medicine: EvitalRxMedicine) {
  const text = [
    medicine.dosage_type,
    medicine.medicine_type,
    medicine.medicine_category,
    medicine.packing_size,
    medicine.pack_size,
    medicine.medicine_name,
  ]
    .filter(Boolean)
    .join(' ');

  if (/(tablets?|tabs?)\b/i.test(text)) return 'tablet';
  if (/(capsules?|caps?)\b/i.test(text)) return 'capsule';
  return undefined;
}

export function isUsableEvitalRxImage(value?: string) {
  if (!value) return false;
  return !/(\/default\.jpg|placeholder|no[-_ ]?image|logo)/i.test(value);
}

export function mapEvitalRxMedicine(medicine: EvitalRxMedicine): PharmacyMedicineResult | null {
  const id = medicine.medicine_id || medicine.id;
  const name = medicine.medicine_name;
  if (!id || !name) return null;

  const mrp = toNumber(medicine.mrp ?? medicine.price);
  const lpPrice = toNumber(
    medicine.lp ??
      medicine.landing_price ??
      medicine.price_to_retailer ??
      medicine.purchase_price ??
      medicine.cost_price
  );
  const discount = toNumber(medicine.sale_discount) || 0;
  const gstPercentage =
    toNumber(
      medicine.gst_percentage ??
        medicine.gstPercent ??
        medicine.gst_percent ??
        medicine.gst ??
        medicine.tax_percentage ??
        medicine.tax
    ) || 0;
  const salePrice = typeof mrp === 'number' && discount > 0
    ? Math.max(0, Math.round((mrp - (mrp * discount) / 100) * 100) / 100)
    : mrp;
  const looseQuantity = toNumber(medicine.loose_quantity) || 0;
  const stripQuantity = toNumber(medicine.strip_quantity) || 0;
  const saleUnit = looseSaleUnit(medicine);
  const packCount = packUnitCount(medicine.packing_size || medicine.pack_size) || 1;
  const rawStockQuantity = toNumber(
    medicine.stock_quantity ??
      medicine.available_quantity ??
      medicine.stock ??
      medicine.quantity
  );
  const stockQuantity =
    saleUnit
      ? looseQuantity || rawStockQuantity || stripQuantity * packCount
      : rawStockQuantity || looseQuantity || stripQuantity;
  const batchNo = String(
    medicine.batch_no ||
      medicine.batchNo ||
      medicine.batch_number ||
      medicine.batchNumber ||
      medicine.batch_num ||
      medicine.batch_code ||
      medicine.batchcode ||
      medicine.batch_name ||
      medicine.batch ||
      ''
  ).trim();
  const batchId = String(medicine.batch_id || medicine.batchid || medicine.batchId || '').trim();
  const expiry = normalizeExpiry(medicine);
  const variantId = [id, batchId || batchNo, expiry].filter(Boolean).map(String).map(compactId).join('__');

  return {
    id: variantId || id,
    medicineId: id,
    name,
    imageUrl: isUsableEvitalRxImage(medicine.medicine_image)
      ? medicine.medicine_image
      : isUsableEvitalRxImage(medicine.thumb_medicine_image)
        ? medicine.thumb_medicine_image
        : undefined,
    manufacturer: medicine.manufacturer_name,
    composition: medicine.content,
    packSize: medicine.packing_size || medicine.pack_size,
    mrp,
    salePrice,
    lpPrice,
    gstPercentage,
    stockQuantity,
    looseQuantity,
    stripQuantity,
    saleUnit,
    packUnitCount: packCount,
    batchNo,
    batchId,
    expiry,
    location: String(medicine.location || medicine.rack || '').trim() || undefined,
    dosageType: medicine.dosage_type,
    medicineType: medicine.medicine_type || medicine.medicine_category,
    available:
      medicine.discontinued !== 'yes' &&
      medicine.available_for_patient !== 'no' &&
      (medicine.is_inventory_available === 'yes' ||
        stockQuantity > 0 ||
        looseQuantity > 0 ||
        stripQuantity > 0),
  };
}

export function mapEvitalRxMedicineVariants(medicine: EvitalRxMedicine): PharmacyMedicineResult[] {
  const rows = batchRows(medicine);
  if (!rows?.length) {
    const mapped = mapEvitalRxMedicine(medicine);
    return mapped ? [mapped] : [];
  }

  return rows
    .map((batch, index) =>
      mapEvitalRxMedicine({
        ...medicine,
        ...batch,
        batch_id:
          batch.batch_id ||
          batch.batchid ||
          batch.batchId ||
          batch.id ||
          batch.batch_no ||
          batch.batchNo ||
          batch.batch_number ||
          batch.batchNumber ||
          batch.batch_code ||
          batch.batchcode ||
          `batch-${index + 1}`,
        medicine_id: medicine.medicine_id || medicine.id || batch.medicine_id || batch.id,
        id: medicine.medicine_id || medicine.id || batch.medicine_id || batch.id,
        medicine_name: medicine.medicine_name || batch.medicine_name,
        medicine_image: medicine.medicine_image || batch.medicine_image,
        thumb_medicine_image: medicine.thumb_medicine_image || batch.thumb_medicine_image,
        manufacturer_name: medicine.manufacturer_name || batch.manufacturer_name,
        content: medicine.content || batch.content,
        packing_size: medicine.packing_size || batch.packing_size,
        pack_size: medicine.pack_size || batch.pack_size,
      })
    )
    .filter((item): item is PharmacyMedicineResult => Boolean(item));
}

export async function requestEvitalRx<T>({ endpoint, payload = {} }: EvitalRxRequestOptions) {
  const { apiKey, baseUrl } = getEvitalRxConfig();
  const response = await fetch(new URL(endpoint, baseUrl), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      apikey: apiKey,
    }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.status_code === '0') {
    throw new Error(body?.status_message || body?.message || 'eVitalRx request failed.');
  }

  return body as T;
}

export async function requestEvitalRxMultipart<T>({
  endpoint,
  fields = {},
  files = [],
}: EvitalRxMultipartRequestOptions) {
  const { apiKey, baseUrl } = getEvitalRxConfig();
  const formData = new FormData();

  Object.entries({ ...fields, apikey: apiKey }).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  files.forEach((file) => {
    const bytes = new Uint8Array(file.buffer);
    formData.append(
      file.fieldName,
      new Blob([bytes], { type: file.contentType }),
      file.fileName
    );
  });

  const response = await fetch(new URL(endpoint, baseUrl), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.status_code === '0') {
    throw new Error(body?.status_message || body?.message || 'eVitalRx request failed.');
  }

  return body as T;
}
