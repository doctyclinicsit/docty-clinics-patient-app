import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requestEvitalRx } from './evitalrx.js';
import {
  readPatientSelectionToken,
  readPatientSession,
} from '../../server/patient-session.js';

export interface PharmacyInvoiceContext {
  order: any;
  patientName: string;
  patientMobile: string;
  evitalRxPatientId: string;
}

function ekaHeaders() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!ekaToken) return null;

  return {
    Authorization: `Bearer ${ekaToken}`,
    ...(process.env.EKA_CLIENT_ID ? { 'client-id': process.env.EKA_CLIENT_ID } : {}),
    Accept: 'application/json',
  };
}

async function getEkaProfile(patientId: string) {
  const headers = ekaHeaders();
  if (!headers) throw new Error('Eka patient directory is not configured.');

  const profileResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`,
    { headers }
  );
  const body = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok) {
    throw new Error(body?.message || body?.error?.message || 'Unable to retrieve Eka patient profile.');
  }

  return body;
}

function getEvitalRxPatientId(profile: any) {
  const extras =
    profile?.extras ||
    profile?.data?.extras ||
    profile?.patient_profile?.extras ||
    profile?.data?.patient_profile?.extras ||
    {};
  const chunks: string[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const value = String(extras[`evRxPatId${String(index).padStart(2, '0')}`] || '');
    if (!value) break;
    chunks.push(value);
  }

  return (
    chunks.join('') ||
    String(extras.evitalRxPatientId || extras.evitalPatientId || extras.eVitalRxPatientId || '')
  ).trim();
}

function isUsablePersonName(value: unknown) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text === '[object Object]') return '';
  if (/^(docty patient|patient|customer|not available|na|n\/a)$/i.test(text)) return '';
  if (!/[a-z]/i.test(text)) return '';
  if (/^\+?\d[\d\s-]{6,}$/.test(text)) return '';
  return text;
}

function findNestedText(source: any, keys: string[], fallback = ''): string {
  const direct = firstText(source, keys);
  const usableDirect = isUsablePersonName(direct);
  if (usableDirect) return usableDirect;

  const wantedKeys = new Set(keys.map((key) => key.toLowerCase()));
  const visited = new Set<any>();

  function walk(value: any, currentKey = '', depth = 0): string {
    if (!value || depth > 5 || visited.has(value)) return '';

    if (typeof value !== 'object') {
      if (wantedKeys.has(currentKey.toLowerCase())) return isUsablePersonName(value);
      return '';
    }

    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = walk(item, currentKey, depth + 1);
        if (found) return found;
      }
      return '';
    }

    for (const [key, child] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (wantedKeys.has(lowerKey)) {
        const found = isUsablePersonName(child);
        if (found) return found;
      }
      if (['patient', 'patient_details', 'patient_detail', 'customer', 'user', 'profile', 'patient_profile', 'data', 'order'].includes(lowerKey)) {
        const found = walk(child, lowerKey, depth + 1);
        if (found) return found;
      }
    }

    return '';
  }

  return walk(source) || fallback;
}

function patientNameFromProfile(profile: any) {
  return findNestedText(
    profile,
    [
      'name',
      'full_name',
      'first_name',
      'patient_name',
      'display_name',
    ],
    'Docty patient'
  );
}

function patientMobileFromProfile(profile: any) {
  return String(
    profile?.mobile ||
      profile?.phone ||
      profile?.data?.mobile ||
      profile?.data?.phone ||
      profile?.patient_profile?.mobile ||
      profile?.patient_profile?.phone ||
      profile?.data?.patient_profile?.mobile ||
      profile?.data?.patient_profile?.phone ||
      ''
  );
}

function requestPatientName(request: any) {
  return isUsablePersonName(request.body?.patientName || request.query?.patientName);
}

function firstText(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], source);
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== 'object' &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }
  return fallback;
}

function firstNumber(source: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const rawValue = key.split('.').reduce((current, part) => current?.[part], source);
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    const value = Number(String(rawValue).replace(/,/g, ''));
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

export function pharmacyOrderId(order: any) {
  return String(
    order?.order_id ||
      order?.id ||
      order?.orderId ||
      order?.bill_no ||
      order?.bill_number ||
      order?.order_number ||
      ''
  ).trim();
}

export function pharmacyBillNo(order: any) {
  return String(order?.bill_no || order?.bill_number || order?.order_number || pharmacyOrderId(order) || 'Invoice');
}

export function pharmacyPaymentMethod(order: any) {
  const value = firstText(
    order,
    [
      'payment_method_name',
      'payment_mode_label',
      'payment_type_name',
      'payment_method',
      'payment_mode',
      'payment_type',
      'payment_mode_name',
      'payment_status_label',
      'payment_status_text',
      'payment_status',
    ],
    'To be confirmed'
  );
  const numericMode = Number(value);
  if (!Number.isFinite(numericMode)) return value;

  const paymentModeLabels: Record<number, string> = {
    1: 'Cash',
    2: 'Credit',
    3: 'Debit Card',
    4: 'UPI',
    5: 'Wallet',
    6: 'Card (CC/DC)',
    7: 'Online Payment',
  };

  return paymentModeLabels[numericMode] || `Payment mode ${numericMode}`;
}

export function pharmacyOrderAmountValue(order: any) {
  return firstNumber(order, [
    'final_amount',
    'payable_amount',
    'net_amount',
    'net_payable',
    'bill_amount',
    'invoice_amount',
    'grand_total',
    'order_total',
    'total',
    'amount',
  ]);
}

export function pharmacyOrderDateText(order: any) {
  const value =
    order?.created_date ||
    order?.order_delivery_datetime ||
    order?.created_at ||
    order?.order_date ||
    order?.date ||
    '';
  const timestamp = Date.parse(String(value));
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(timestamp)
    : String(value || 'Not available');
}

export function pharmacyOrderItems(order: any) {
  const candidateKeys = new Set([
    'items',
    'order_items',
    'medicines',
    'medicine_details',
    'order_medicines',
    'products',
    'product_details',
    'bill_items',
    'invoice_items',
  ]);
  const wrapperKeys = new Set([
    'data',
    'order',
    'order_detail',
    'order_details',
    'details',
    'bill',
    'invoice',
    'result',
    'results',
  ]);
  const visited = new Set<any>();

  function looksLikeMedicineItem(value: any) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const name = firstText(value, [
      'medicine_name',
      'medicine.medicine_name',
      'medicine.name',
      'item_name',
      'product_name',
      'product.name',
      'name',
    ]);
    if (!name) return false;
    return Boolean(
      firstNumber(value, ['quantity', 'qty', 'order_quantity', 'billed_quantity']) ||
        firstNumber(value, ['mrp', 'price', 'rate', 'amount', 'total_amount']) ||
        firstText(value, ['batch', 'batch_no', 'packing_size', 'pack_size'])
    );
  }

  function walk(value: any, key = '', depth = 0): any[] {
    if (!value || depth > 6 || visited.has(value)) return [];
    if (Array.isArray(value)) {
      if (candidateKeys.has(key.toLowerCase()) || value.some(looksLikeMedicineItem)) {
        return value.filter((item) => item && typeof item === 'object');
      }
      for (const item of value) {
        const found = walk(item, key, depth + 1);
        if (found.length) return found;
      }
      return [];
    }
    if (typeof value !== 'object') return [];

    visited.add(value);
    for (const [childKey, childValue] of Object.entries(value)) {
      if (Array.isArray(childValue) && candidateKeys.has(childKey.toLowerCase())) {
        return childValue.filter((item) => item && typeof item === 'object');
      }
    }
    for (const [childKey, childValue] of Object.entries(value)) {
      const lowerKey = childKey.toLowerCase();
      if (wrapperKeys.has(lowerKey) || candidateKeys.has(lowerKey)) {
        const found = walk(childValue, lowerKey, depth + 1);
        if (found.length) return found;
      }
    }
    return [];
  }

  return walk(order);
}

export function itemName(item: any) {
  return firstText(
    item,
    [
      'medicine_name',
      'medicine.medicine_name',
      'medicine.name',
      'item_name',
      'product_name',
      'product.name',
      'name',
    ],
    'Medicine'
  );
}

export function itemId(item: any, index: number) {
  return String(
    item?.medicine_id ||
      item?.medicine?.medicine_id ||
      item?.medicine?.id ||
      item?.item_id ||
      item?.product_id ||
      item?.product?.id ||
      item?.id ||
      `invoice-item-${index + 1}`
  );
}

export function itemQuantity(item: any) {
  const value = firstNumber(item, ['quantity', 'qty', 'order_quantity', 'ordered_quantity', 'billed_quantity'], 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function itemMrp(item: any) {
  return firstNumber(item, ['mrp', 'medicine_mrp', 'medicine.mrp', 'price', 'rate', 'selling_price', 'unit_mrp']);
}

function itemAmount(item: any) {
  const value = firstNumber(item, [
    'amount',
    'total',
    'net_amount',
    'line_total',
    'item_total',
    'total_amount',
    'final_amount',
  ]);
  return Number.isFinite(value) && value > 0 ? value : itemMrp(item) * itemQuantity(item);
}

function itemDiscountText(item: any) {
  const explicitPercent = firstNumber(item, [
    'discount_percentage',
    'discount_percent',
    'sale_discount_percentage',
    'scheme_discount_percentage',
  ]);
  if (explicitPercent > 0 && explicitPercent <= 100) return `${Math.round(explicitPercent * 100) / 100}%`;

  const mrp = itemMrp(item);
  const netUnitPrice = itemDiscountedPrice(item);
  if (mrp > 0 && netUnitPrice > 0 && netUnitPrice < mrp) {
    const percent = ((mrp - netUnitPrice) / mrp) * 100;
    return `${Math.round(percent * 100) / 100}%`;
  }

  const text = firstText(item, ['discount_text', 'discount_label']);
  return text || '0%';
}

export function itemDiscountedPrice(item: any) {
  const quantity = itemQuantity(item);
  const amount = itemAmount(item);
  return (
    firstNumber(item, [
      'd_price',
      'discounted_price',
      'sale_price',
      'selling_price',
      'net_rate',
      'ptr',
      'effective_price',
    ]) || (quantity ? amount / quantity : itemMrp(item))
  );
}

function itemGstText(item: any, fallback = '-') {
  const rate = firstNumber(item, ['gst_percentage', 'tax_percentage', 'tax_rate', 'igst_percentage', 'cgst_percentage']);
  if (rate > 0 && rate <= 28) return `${rate}%`;
  const ambiguous = firstNumber(item, ['gst', 'tax', 'igst']);
  if (ambiguous > 0 && ambiguous <= 28) return `${ambiguous}%`;
  const text = firstText(item, ['gst_text', 'tax_text']);
  return text || fallback;
}

export function itemPackText(item: any) {
  return firstText(
    item,
    [
      'packing_size',
      'medicine.packing_size',
      'pack_size',
      'medicine.pack_size',
      'packing',
      'medicine.packing',
      'pack',
      'package_size',
      'packaging',
      'size',
      'unit',
      'unit_text',
      'medicine_unit',
    ],
    '-'
  );
}

function itemExpiryText(item: any) {
  const raw = firstText(item, [
    'expiry_date',
    'expiry',
    'exp',
    'expiry_month_year',
    'expiry_month',
    'exp_date',
    'batch_expiry',
  ]);
  if (!raw) return '-';

  const trimmed = raw.replace(/\s+/g, ' ').trim();
  const isoDate = Date.parse(trimmed);
  if (Number.isFinite(isoDate) && /\d{4}-\d{1,2}-\d{1,2}|[a-z]{3,}/i.test(trimmed)) {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(isoDate);
  }

  const monthYear = trimmed.match(/^(\d{1,2})[/-](\d{2,4})$/);
  if (monthYear) {
    const month = monthYear[1].padStart(2, '0');
    const year = monthYear[2].slice(-2);
    return `${month}/${year}`;
  }

  const yearMonth = trimmed.match(/^(\d{4})[/-](\d{1,2})$/);
  if (yearMonth) {
    return `${yearMonth[2].padStart(2, '0')}/${yearMonth[1].slice(-2)}`;
  }

  return trimmed;
}

function invoiceTotals(order: any, items: any[]) {
  const computedMrp = items.reduce((sum: number, item: any) => sum + itemMrp(item) * itemQuantity(item), 0);
  const total = pharmacyOrderAmountValue(order) || computedMrp;
  const totalMrp = firstNumber(order, ['total_mrp', 'mrp_total', 'total_medicine_mrp', 'gross_amount', 'gross_total'], computedMrp);
  const totalGstFromOrder = firstNumber(order, ['total_gst', 'gst_amount', 'total_tax', 'tax_amount']);
  const inferredGst = items.reduce((sum: number, item: any) => {
    const explicitAmount = firstNumber(item, [
      'gst_amount',
      'tax_amount',
      'item_gst_amount',
      'total_gst_amount',
      'cgst_amount',
      'sgst_amount',
    ]);
    if (explicitAmount > 0) return sum + explicitAmount;

    const ambiguousGst = firstNumber(item, ['gst', 'tax', 'igst']);
    if (ambiguousGst > 28) return sum + ambiguousGst;

    const gstRate =
      firstNumber(item, ['gst_percentage', 'tax_percentage', 'tax_rate', 'igst_percentage']) ||
      ambiguousGst;
    const amount = itemAmount(item);
    if (!Number.isFinite(gstRate) || gstRate <= 0 || !amount) return sum;
    return sum + (amount * gstRate) / (100 + gstRate);
  }, 0);
  const totalGst = totalGstFromOrder || inferredGst || (items.length && total ? (total * 5) / 105 : 0);
  const cgst = firstNumber(order, ['cgst', 'cgst_amount'], totalGst / 2);
  const sgst = firstNumber(order, ['sgst', 'sgst_amount'], totalGst / 2);
  const saving = firstNumber(
    order,
    ['total_saving', 'total_savings', 'saving_amount', 'discount_amount', 'total_discount'],
    Math.max(0, totalMrp - total)
  );
  const roundOff = firstNumber(order, ['round_off', 'roundoff', 'round_off_amount'], Math.round(total) - total);

  return {
    total,
    totalMrp,
    totalGst,
    cgst,
    sgst,
    saving,
    roundOff,
    remainingPoints: firstText(order, ['remaining_points', 'loyalty_points', 'points'], '0'),
    billedBy: firstText(order, ['billed_by', 'created_by_name', 'staff_name', 'chemist_staff_name'], 'Docty'),
  };
}

function rupees(value: number) {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`;
}

function ellipsize(value: unknown, maxLength: number) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function writeClippedText(document: jsPDF, value: unknown, x: number, y: number, maxLength: number, options?: any) {
  document.text(ellipsize(value, maxLength), x, y, options);
}

function doctyBrandIconDataUrl() {
  const iconPath = join(process.cwd(), 'public', 'docty-logo-mark.png');
  if (!existsSync(iconPath)) return '';

  return `data:image/png;base64,${readFileSync(iconPath).toString('base64')}`;
}

function drawFallbackBrandIcon(document: jsPDF) {
  document.setFillColor(254, 6, 92);
  document.roundedRect(28, 28, 34, 22, 4, 4, 'F');
  document.setFillColor(11, 184, 252);
  document.roundedRect(28, 55, 34, 22, 4, 4, 'F');
  document.setFillColor(255, 255, 255);
  document.roundedRect(41, 39, 8, 28, 2, 2, 'F');
  document.roundedRect(31, 49, 28, 8, 2, 2, 'F');
}

function siteOrigin(request: any) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/g, '');
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'docty-clinics-patient-app-eta.vercel.app';
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
}

async function createReorderToken(order: any) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return '';

  const reorderItems = pharmacyOrderItems(order)
    .slice(0, 20)
    .map((item: any, index: number) => ({
      id: itemId(item, index),
      name: itemName(item),
      imageUrl: item?.medicine_image || item?.image || item?.image_url || item?.medicine?.medicine_image,
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
    }))
    .filter((item) => item.name && item.name !== 'Medicine');

  if (!reorderItems.length) return '';

  const token = randomBytes(6).toString('base64url');
  await put(
    `pharmacy-reorders/${token}.json`,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      orderId: pharmacyOrderId(order) || pharmacyBillNo(order),
      items: reorderItems,
    }),
    {
      access: 'private',
      contentType: 'application/json',
      token: blobToken,
    }
  );

  return token;
}

export async function reorderUrlForOrder(order: any, request: any) {
  const token = await createReorderToken(order).catch(() => '');
  if (token) return `${siteOrigin(request)}/pharmacy?r=${encodeURIComponent(token)}`;

  const orderId = encodeURIComponent(pharmacyOrderId(order) || pharmacyBillNo(order));
  return `${siteOrigin(request)}/pharmacy?reorderOrderId=${orderId}`;
}

export async function getPatientPharmacyInvoiceContext(request: any, orderId: string): Promise<PharmacyInvoiceContext> {
  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) throw new Error('Patient session is not configured.');

  const session = readPatientSession(request.headers.cookie, secret);
  const selection = readPatientSelectionToken(String(request.query?.accessToken || request.body?.accessToken || ''), secret);
  const patientId = selection?.patientId || session?.patientId;
  if (!session || !patientId || (selection && selection.mobile !== session.mobile)) {
    const error = new Error('Patient selection is invalid or expired.');
    (error as any).statusCode = 401;
    throw error;
  }

  const ekaProfile = await getEkaProfile(patientId);
  const evitalRxPatientId = getEvitalRxPatientId(ekaProfile);
  if (!evitalRxPatientId) {
    const error = new Error('No eVitalRx patient ID is linked to this patient profile.');
    (error as any).statusCode = 404;
    throw error;
  }

  const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
    endpoint: 'doctor/orders/view',
    payload: { order_id: orderId },
  });
  const order = body?.data || {};
  const orderPatientId = String(
    (order as any).patient_id || (order as any).evital_patient_id || (order as any).patient?.id || ''
  ).trim();
  if (orderPatientId && orderPatientId !== evitalRxPatientId) {
    const error = new Error('This pharmacy order does not belong to the selected patient.');
    (error as any).statusCode = 403;
    throw error;
  }

  const profilePatientName = isUsablePersonName(patientNameFromProfile(ekaProfile));
  const fallbackPatientName = requestPatientName(request);

  return {
    order: {
      ...order,
      order_id: String((order as any).order_id || orderId),
      id: String((order as any).id || orderId),
    },
    patientName: profilePatientName || fallbackPatientName || 'Docty patient',
    patientMobile: patientMobileFromProfile(ekaProfile),
    evitalRxPatientId,
  };
}

export async function generatePharmacyInvoicePdf(context: PharmacyInvoiceContext, request: any) {
  const order = context.order;
  const items = pharmacyOrderItems(order);
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const billNo = pharmacyBillNo(order);
  const brandIcon = doctyBrandIconDataUrl();
  const chemistName = firstText(order, ['chemist_name', 'pharmacy_name', 'store_name'], 'Docty Pharmacy');
  const chemistAddress = firstText(
    order,
    ['chemist_address', 'store_address', 'pharmacy_address', 'billing_address'],
    'Cxp Building, Alkapoor Township, Puppalaguda, Manikonda, K.V.Rangareddy'
  );
  const chemistMobile = firstText(order, ['chemist_mobile', 'store_mobile', 'pharmacy_mobile'], '9014945356');
  const license20 = firstText(order, ['license20', 'license_20', 'dl_no_20', 'drug_license_20'], 'TG/RR/2025-135781');
  const license21 = firstText(order, ['license21', 'license_21', 'dl_no_21', 'drug_license_21'], 'TG/RR/2025-135781');
  const gstin = firstText(order, ['gstin', 'gst_no', 'chemist_gstin', 'store_gstin'], '36AAHCD7944A1ZQ');
  const pan = firstText(order, ['pan', 'pan_no', 'chemist_pan', 'store_pan'], 'AAHCD7944A');
  const doctorName = firstText(order, ['doctor_name', 'doctor', 'ref_by', 'referred_by'], 'Docty Pharmacy');
  const patientName = findNestedText(
    order,
    [
      'patient_name',
      'customer_name',
      'patient',
      'customer',
      'customer.full_name',
      'customer.name',
      'patient.full_name',
      'patient.name',
      'patient.patient_name',
      'patient_details.patient_name',
      'patient_details.name',
      'patient_details.full_name',
      'user.name',
      'user.full_name',
    ],
    context.patientName
  ) || context.patientName;
  const patientMobile = firstText(
    order,
    [
      'patient_mobile',
      'mobile',
      'customer_mobile',
      'customer.mobile',
      'patient.mobile',
      'patient.mobile_number',
      'patient_details.mobile',
      'patient_details.mobile_number',
      'user.mobile',
    ],
    context.patientMobile
  );
  const paymentReference = firstText(order, ['payment_reference', 'payment_ref_no', 'transaction_id', 'txn_id']);
  const qrDataUrl = await QRCode.toDataURL(await reorderUrlForOrder(order, request), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 120,
  });
  const totals = invoiceTotals(order, items);

  document.setProperties({
    title: `Docty Pharmacy Invoice ${billNo}`,
    subject: 'Docty Pharmacy invoice',
    creator: 'Docty Clinics',
  });

  const margin = 28;
  const contentWidth = pageWidth - margin * 2;
  const primary = [254, 6, 92] as const;
  const ink = [9, 26, 38] as const;
  const muted = [71, 85, 105] as const;
  const border = [226, 232, 240] as const;
  const soft = [248, 250, 252] as const;

  document.setFillColor(255, 255, 255);
  document.rect(0, 0, pageWidth, pageHeight, 'F');

  document.setDrawColor(...border);
  document.setLineWidth(1);
  document.roundedRect(margin, 24, contentWidth, 86, 10, 10, 'S');
  document.setFillColor(254, 6, 92);
  document.rect(margin, 24, 5, 86, 'F');
  document.setDrawColor(11, 184, 252);
  document.setLineWidth(1.2);
  document.line(margin + 18, 104, pageWidth - margin - 18, 104);

  if (brandIcon) {
    document.addImage(brandIcon, 'PNG', margin + 18, 44, 42, 42);
  } else {
    drawFallbackBrandIcon(document);
  }

  document.setTextColor(...ink);
  document.setFont('helvetica', 'bold');
  document.setFontSize(21);
  writeClippedText(document, chemistName, margin + 72, 48, 34);
  document.setFontSize(8);
  document.setFont('helvetica', 'normal');
  document.text(ellipsize(chemistAddress, 88), margin + 72, 64);
  document.text(`Mobile ${chemistMobile}`, margin + 72, 79);
  document.text(`GSTIN ${ellipsize(gstin, 20)}   PAN ${ellipsize(pan, 16)}`, margin + 72, 94);

  const invoiceInfoX = pageWidth - margin - 246;
  const qrBoxX = pageWidth - margin - 72;

  document.setFont('helvetica', 'bold');
  document.setFontSize(22);
  document.text('INVOICE', invoiceInfoX, 50);
  document.setFontSize(8);
  document.setFont('helvetica', 'normal');
  document.text(`Bill No: ${ellipsize(billNo, 24)}`, invoiceInfoX, 68);
  document.text(`Date: ${pharmacyOrderDateText(order)}`, invoiceInfoX, 82);
  document.text(`Payment: ${ellipsize(pharmacyPaymentMethod(order), 20)}`, invoiceInfoX, 96);

  document.setFillColor(255, 255, 255);
  document.setDrawColor(...border);
  document.roundedRect(qrBoxX, 38, 54, 54, 6, 6, 'FD');
  document.addImage(qrDataUrl, 'PNG', qrBoxX + 4, 42, 46, 46);
  document.setTextColor(...muted);
  document.setFont('helvetica', 'bold');
  document.setFontSize(6.5);
  document.text('Scan to reorder', qrBoxX - 3, 101);

  const infoTop = 124;
  const cardGap = 12;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  const infoCards = [
    {
      title: 'Patient',
      lines: [patientName, patientMobile || 'Mobile not available', `Ref: ${doctorName}`],
    },
    {
      title: 'Pharmacy Details',
      lines: [`License 20: ${license20}`, `License 21: ${license21}`, `Order: ${pharmacyOrderId(order) || billNo}`],
    },
    {
      title: 'Reorder',
      lines: ['Scan the QR code in the header', 'Items will be added to cart', paymentReference ? `Ref: ${paymentReference}` : 'Docty Pharmacy'],
    },
  ];
  infoCards.forEach((card, index) => {
    const left = margin + index * (cardWidth + cardGap);
    document.setFillColor(...soft);
    document.setDrawColor(...border);
    document.roundedRect(left, infoTop, cardWidth, 70, 8, 8, 'FD');
    document.setTextColor(...primary);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text(card.title.toUpperCase(), left + 12, infoTop + 17);
    document.setTextColor(...ink);
    document.setFont('helvetica', 'bold');
    document.setFontSize(10);
    writeClippedText(document, card.lines[0], left + 12, infoTop + 34, 30);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    writeClippedText(document, card.lines[1], left + 12, infoTop + 49, 36);
    writeClippedText(document, card.lines[2], left + 12, infoTop + 62, 36);
  });

  const tableTop = 214;
  document.setFillColor(...soft);
  document.setDrawColor(...border);
  document.roundedRect(margin, tableTop, contentWidth, 26, 7, 7, 'FD');
  const headers = ['#', 'Medicine', 'Mfr', 'Pack', 'Batch', 'Exp', 'MRP', 'Qty', 'Disc', 'Net', 'GST', 'Amount'];
  const widths = [22, 194, 56, 74, 66, 50, 54, 36, 44, 56, 38, 66];
  const numericColumnIndexes = new Set([6, 7, 8, 9, 10, 11]);
  let x = margin + 10;
  document.setTextColor(...ink);
  document.setFont('helvetica', 'bold');
  document.setFontSize(7.5);
  headers.forEach((header, index) => {
    if (numericColumnIndexes.has(index)) {
      document.text(header, x + widths[index] - 4, tableTop + 17, { align: 'right' });
    } else {
      document.text(header, x, tableTop + 17);
    }
    x += widths[index];
  });

  let y = tableTop + 44;
  document.setFont('helvetica', 'normal');
  document.setFontSize(7);
  items.slice(0, 12).forEach((item: any, index: number) => {
    const mrp = itemMrp(item);
    const amount = itemAmount(item);
    const quantity = itemQuantity(item);
    const discount = itemDiscountText(item);
    const dPrice = itemDiscountedPrice(item);
    const gstRate = itemGstText(item, totals.totalGst ? '5%' : '-');
    if (index % 2 === 0) {
      document.setFillColor(251, 253, 255);
      document.rect(margin, y - 12, contentWidth, 26, 'F');
    }
    const row = [
      String(index + 1),
      ellipsize(itemName(item), 34),
      ellipsize(firstText(item, ['manufacturer_name', 'manufacturer', 'mfg_name'], '-'), 10),
      ellipsize(itemPackText(item), 12),
      ellipsize(firstText(item, ['batch_no', 'batch', 'batch_number'], '-'), 11),
      ellipsize(itemExpiryText(item), 8),
      mrp ? mrp.toFixed(2) : '-',
      String(quantity),
      ellipsize(discount, 7),
      dPrice ? dPrice.toFixed(2) : '-',
      ellipsize(gstRate, 7),
      amount ? amount.toFixed(2) : '-',
    ];
    x = margin + 10;
    document.setTextColor(...ink);
    row.forEach((cell, cellIndex) => {
      if (numericColumnIndexes.has(cellIndex)) {
        document.text(cell, x + widths[cellIndex] - 4, y, { align: 'right' });
      } else {
        document.text(cell, x, y);
      }
      x += widths[cellIndex];
    });
    document.setDrawColor(...border);
    document.line(margin, y + 10, pageWidth - margin, y + 10);
    y += 26;
  });

  if (!items.length) {
    document.setTextColor(...muted);
    document.text('Order item details will be confirmed by the pharmacy.', margin + 12, y);
  }

  if (brandIcon) {
    try {
      const GState = (document as any).GState;
      document.setGState(new GState({ opacity: 0.08 }));
      document.addImage(brandIcon, 'PNG', pageWidth / 2 - 68, 318, 136, 136);
      document.setGState(new GState({ opacity: 1 }));
    } catch {
      document.addImage(brandIcon, 'PNG', pageWidth / 2 - 48, 338, 96, 96);
    }
  }

  const footerTop = pageHeight - 132;
  document.setFillColor(...soft);
  document.setDrawColor(...border);
  document.roundedRect(margin, footerTop, 340, 86, 8, 8, 'FD');
  document.setTextColor(...ink);
  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.text('Notes', margin + 14, footerTop + 20);
  document.setFont('helvetica', 'normal');
  document.setTextColor(...muted);
  document.setFontSize(8);
  document.text('Prescription validation, availability and substitutions are confirmed by the pharmacy.', margin + 14, footerTop + 38);
  document.text('Thank you for choosing Docty Clinics. Wish you a speedy recovery.', margin + 14, footerTop + 54);
  document.text(`Billed by: ${ellipsize(totals.billedBy, 26)}`, margin + 14, footerTop + 70);

  document.setFillColor(255, 255, 255);
  document.setDrawColor(...border);
  document.roundedRect(pageWidth - margin - 360, footerTop, 170, 86, 8, 8, 'FD');
  document.setTextColor(...ink);
  document.setFont('helvetica', 'bold');
  document.setFontSize(8);
  const taxLeft = pageWidth - margin - 344;
  const taxRight = pageWidth - margin - 206;
  [
    ['Items', String(items.length)],
    ['Total MRP', totals.totalMrp.toFixed(2)],
    ['CGST', totals.cgst.toFixed(2)],
    ['SGST', totals.sgst.toFixed(2)],
  ].forEach(([label, value], index) => {
    const rowY = footerTop + 18 + index * 16;
    document.setFont('helvetica', index === 1 ? 'bold' : 'normal');
    document.text(label, taxLeft, rowY);
    document.text(value, taxRight, rowY, { align: 'right' });
  });

  document.setFillColor(255, 255, 255);
  document.setDrawColor(...border);
  document.roundedRect(pageWidth - margin - 178, footerTop, 178, 86, 8, 8, 'FD');
  document.setTextColor(...ink);
  document.setFont('helvetica', 'bold');
  document.setFontSize(9);
  document.text('NET PAYABLE', pageWidth - margin - 162, footerTop + 20);
  document.setFontSize(22);
  document.text(rupees(totals.total || totals.totalMrp), pageWidth - margin - 16, footerTop + 46, { align: 'right' });
  document.setFontSize(7.5);
  document.setFont('helvetica', 'normal');
  document.text(`Saving ${rupees(totals.saving)}`, pageWidth - margin - 162, footerTop + 64);
  document.text(`Round off ${totals.roundOff.toFixed(2)}`, pageWidth - margin - 16, footerTop + 64, { align: 'right' });
  document.text(`Points ${totals.remainingPoints}`, pageWidth - margin - 162, footerTop + 78);

  document.setTextColor(...muted);
  document.setFontSize(8);
  document.setFont('helvetica', 'bold');
  document.text('www.doctyclinics.com', pageWidth / 2, pageHeight - 18, { align: 'center' });

  return Buffer.from(document.output('arraybuffer'));
}

export function safeInvoiceFilename(order: any) {
  return `${pharmacyBillNo(order)}.pdf`
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
