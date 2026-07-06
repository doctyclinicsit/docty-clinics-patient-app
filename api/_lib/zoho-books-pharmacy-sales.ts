import {
  itemDiscountedPrice,
  itemId,
  itemName,
  itemQuantity,
  pharmacyBillNo,
  pharmacyOrderAmountValue,
  pharmacyOrderDateText,
  pharmacyOrderId,
  pharmacyOrderItems,
  pharmacyPaymentMethod,
} from './pharmacy-invoice.js';
import { zohoBooksSkuForMedicine } from './zoho-books-pharmacy-inventory.js';
import {
  createZohoBooksInvoice,
  listZohoBooksInvoicesByReference,
  listZohoBooksItems,
  type ZohoBooksInvoiceRecord,
} from '../../server/zoho-books.js';

export interface ZohoBooksPharmacySaleSyncOptions {
  dryRun?: boolean;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function dateForZoho(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

function customerId() {
  return text(process.env.ZOHO_BOOKS_PHARMACY_CUSTOMER_ID || process.env.ZOHO_BOOKS_WALKIN_CUSTOMER_ID);
}

function firstText(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], source);
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function referenceForOrder(order: any) {
  return pharmacyBillNo(order) || pharmacyOrderId(order);
}

function normalizeOrderLineItem(item: any, index: number, itemIdBySku: Map<string, string>) {
  const medicineId = itemId(item, index);
  const sku = zohoBooksSkuForMedicine({ medicineId });
  const zohoItemId = itemIdBySku.get(sku);
  const quantity = itemQuantity(item);
  const rate = Math.max(0, Math.round((itemDiscountedPrice(item) || 0) * 100) / 100);

  return {
    sku,
    medicineId,
    zohoItemId,
    payload: {
      item_id: zohoItemId,
      name: itemName(item),
      description: [
        firstText(item, ['batch_no', 'batch', 'batch_number']) ? `Batch: ${firstText(item, ['batch_no', 'batch', 'batch_number'])}` : '',
        firstText(item, ['expiry_date', 'expiry', 'exp']) ? `Expiry: ${firstText(item, ['expiry_date', 'expiry', 'exp'])}` : '',
        `eVitalRx Medicine ID: ${medicineId}`,
      ]
        .filter(Boolean)
        .join('\n'),
      quantity,
      rate,
    },
  };
}

export async function syncPharmacySaleToZohoBooks(
  order: any,
  options: ZohoBooksPharmacySaleSyncOptions = {}
) {
  const dryRun = options.dryRun !== false;
  const referenceNumber = referenceForOrder(order);
  if (!referenceNumber) throw new Error('Sale payload is missing bill/order number.');

  const zohoCustomerId = customerId();
  if (!dryRun && !zohoCustomerId) {
    throw new Error('ZOHO_BOOKS_PHARMACY_CUSTOMER_ID or ZOHO_BOOKS_WALKIN_CUSTOMER_ID is not configured.');
  }

  const existingInvoices: ZohoBooksInvoiceRecord[] = dryRun
    ? []
    : await listZohoBooksInvoicesByReference(referenceNumber);
  const exactExistingInvoice = existingInvoices.find(
    (invoice) => invoice.referenceNumber === referenceNumber
  );
  if (exactExistingInvoice) {
    return {
      status: 'duplicate' as const,
      dryRun,
      referenceNumber,
      invoice: exactExistingInvoice,
      message: 'A Zoho Books invoice already exists for this pharmacy sale.',
    };
  }

  const items = dryRun ? [] : await listZohoBooksItems();
  const itemIdBySku = new Map(items.map((item) => [item.sku, item.itemId]));
  const lines = pharmacyOrderItems(order).map((item: any, index: number) =>
    normalizeOrderLineItem(item, index, itemIdBySku)
  );
  const missingItems = lines.filter((line) => !line.zohoItemId);
  if (!dryRun && missingItems.length) {
    throw new Error(
      `Missing Zoho Books item mapping for ${missingItems
        .slice(0, 5)
        .map((line) => line.sku)
        .join(', ')}. Run inventory sync first.`
    );
  }

  const payload = {
    customer_id: zohoCustomerId || 'ZOHO_CUSTOMER_ID_REQUIRED',
    date: dateForZoho(pharmacyOrderDateText(order)),
    reference_number: referenceNumber,
    salesperson_name: 'eVitalRx',
    notes: [
      `eVitalRx Order ID: ${pharmacyOrderId(order) || referenceNumber}`,
      `Payment: ${pharmacyPaymentMethod(order)}`,
      pharmacyOrderAmountValue(order) ? `eVitalRx total: ${pharmacyOrderAmountValue(order)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    line_items: lines.map((line) => ({
      ...line.payload,
      item_id: line.zohoItemId || `ZOHO_ITEM_ID_FOR_${line.sku}`,
    })),
  };

  if (dryRun) {
    return {
      status: 'dry_run' as const,
      dryRun,
      referenceNumber,
      missingItems: lines.map((line) => ({ sku: line.sku, medicineId: line.medicineId })),
      payload,
    };
  }

  const invoice = await createZohoBooksInvoice(payload);
  return {
    status: 'created' as const,
    dryRun,
    referenceNumber,
    invoice,
  };
}
