import {
  mapEvitalRxMedicine,
  requestEvitalRx,
  type EvitalRxMedicine,
} from '../_lib/evitalrx.js';
import { get } from '@vercel/blob';
import {
  itemDiscountedPrice,
  itemId,
  itemMrp,
  itemName,
  itemPackText,
  itemQuantity,
  pharmacyOrderItems,
} from '../_lib/pharmacy-invoice.js';

function cartItemFromOrderItem(item: any, index: number) {
  const name = itemName(item);
  if (!name || name === 'Medicine') return null;

  return {
    id: itemId(item, index),
    name,
    imageUrl: item?.medicine_image || item?.image || item?.image_url,
    manufacturer:
      item?.manufacturer_name ||
      item?.manufacturer ||
      item?.mfg_name ||
      item?.medicine?.manufacturer_name ||
      item?.medicine?.manufacturer,
    composition:
      item?.content ||
      item?.composition ||
      item?.salt ||
      item?.medicine?.content ||
      item?.medicine?.composition,
    packSize: itemPackText(item),
    mrp: itemMrp(item) || undefined,
    salePrice: itemDiscountedPrice(item) || itemMrp(item) || undefined,
    available: true,
    quantity: itemQuantity(item),
  };
}

function parseMedicineRefs(value: unknown) {
  return String(value || '')
    .split(',')
    .map((entry) => {
      const [rawId, rawQuantity] = entry.split('.');
      const id = decodeURIComponent(String(rawId || '').trim());
      const quantity = Math.max(1, Math.round(Number(rawQuantity || 1) || 1));
      return id ? { id, quantity } : null;
    })
    .filter(Boolean) as Array<{ id: string; quantity: number }>;
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function loadItemsFromReorderToken(tokenValue: unknown) {
  const token = String(tokenValue || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 32);
  if (!token) return [];

  const blob = await get(`pharmacy-reorders/${token}.json`, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }).catch(() => null);
  if (!blob?.stream) return [];

  const payload = JSON.parse(await streamToText(blob.stream));
  if (Number(payload?.expiresAt || 0) < Date.now()) return [];
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function loadItemsFromMedicineRefs(refs: Array<{ id: string; quantity: number }>) {
  if (!refs.length) return [];

  const quantityById = new Map(refs.map((ref) => [ref.id, ref.quantity]));
  const medicineIds = refs.map((ref) => ref.id);
  const payload =
    medicineIds.length === 1
      ? { medicine_id: medicineIds[0] }
      : { medicine_ids: JSON.stringify(medicineIds) };
  const body = await requestEvitalRx<{ data?: EvitalRxMedicine[] | EvitalRxMedicine }>({
    endpoint: 'doctor/medicines/view',
    payload,
  });
  const medicines = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

  return medicines
    .map((medicine) => {
      const mapped = mapEvitalRxMedicine(medicine);
      if (!mapped) return null;
      return {
        ...mapped,
        available: mapped.available !== false,
        quantity: quantityById.get(mapped.id) || 1,
      };
    })
    .filter(Boolean);
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const reorderToken = String(request.query?.r || '').trim();
  const orderId = String(request.query?.orderId || '').trim();
  const medicineRefs = parseMedicineRefs(request.query?.m);
  if (!reorderToken && !orderId && !medicineRefs.length) {
    return response.status(400).json({ message: 'Reorder token, order ID, or medicine references are required.' });
  }

  try {
    let items: unknown[] = reorderToken ? await loadItemsFromReorderToken(reorderToken) : [];
    if (orderId) {
      const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
        endpoint: 'doctor/orders/view',
        payload: { order_id: orderId },
      }).catch(() => null);
      const order = body?.data || {};
      items = pharmacyOrderItems(order)
        .slice(0, 25)
        .map(cartItemFromOrderItem)
        .filter(Boolean);
    }

    if (!items.length && medicineRefs.length) {
      items = await loadItemsFromMedicineRefs(medicineRefs);
    }

    return response.status(200).json({ items, orderId });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load reorder medicines.',
    });
  }
}
