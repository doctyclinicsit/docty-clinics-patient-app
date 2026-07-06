import {
  itemDiscountedPrice,
  itemId,
  itemMrp,
  itemName,
  itemQuantity,
  pharmacyBillNo,
  pharmacyOrderAmountValue,
  pharmacyOrderDateText,
  pharmacyOrderId,
  pharmacyOrderItems,
  pharmacyPaymentMethod,
} from './pharmacy-invoice.js';
import { zohoCrmFetch } from '../../server/zoho-crm.js';

export interface ZohoCrmPharmacySaleSyncOptions {
  dryRun?: boolean;
}

function text(value: unknown) {
  return String(value || '').trim();
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstText(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], source);
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function crmModuleName() {
  return text(process.env.ZOHO_CRM_PHARMACY_SALES_MODULE) || 'Pharmacy_Sales';
}

function fieldName(envKey: string, fallback: string) {
  return text(process.env[envKey]) || fallback;
}

function dateForZoho(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

function referenceForOrder(order: any) {
  const billNo = text(order?.bill_no);
  const referenceNumber = text(order?.reference_number);
  return (
    (billNo && billNo !== '0' ? billNo : '') ||
    text(order?.order_number) ||
    (referenceNumber && referenceNumber !== '0' ? referenceNumber : '') ||
    pharmacyBillNo(order) ||
    pharmacyOrderId(order)
  );
}

function saleDateForOrder(order: any) {
  return (
    firstText(order, [
      'bill_date',
      'payment_date',
      'created_date',
      'order_delivery_datetime',
      'created_at',
      'order_date',
      'date',
    ]) || pharmacyOrderDateText(order)
  );
}

function cleanCriteriaValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');
}

function lineItemsForCrm(order: any) {
  return pharmacyOrderItems(order).map((item: any, index: number) => {
    const quantity = itemQuantity(item);
    const rate = itemDiscountedPrice(item) || itemMrp(item);
    const amount = numberValue(firstText(item, ['amount', 'total', 'net_amount', 'line_total'])) || rate * quantity;

    return {
      medicineId: itemId(item, index),
      name: itemName(item),
      quantity,
      mrp: itemMrp(item),
      rate,
      amount,
      gst: numberValue(item.gst),
      gstPercentage: numberValue(item.gstpercentage ?? item.gst_percentage),
      batch: firstText(item, ['batch_no', 'batch', 'batch_number']),
      expiry: firstText(item, ['expiry_date', 'expiry', 'exp']),
      packSize: firstText(item, ['packing_size', 'pack_size', 'pack']),
    };
  });
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
}

export function zohoCrmPharmacySalePayload(order: any) {
  const reference = referenceForOrder(order);
  const items = lineItemsForCrm(order);
  const patientName = firstText(order, ['patient_name', 'customer_name', 'user_name', 'patient.name'], 'Walk-in Customer');
  const patientMobile = firstText(order, ['patient_mobile', 'customer_mobile', 'mobile', 'patient.mobile']);
  const amount = pharmacyOrderAmountValue(order) || items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = items.reduce((sum, item) => sum + numberValue(item.gst), 0);
  const itemSummary = items
    .slice(0, 20)
    .map((item) => `${item.name} x ${item.quantity}${item.amount ? ` = ${item.amount}` : ''}`)
    .join('\n');

  return compactRecord({
    [fieldName('ZOHO_CRM_PHARMACY_SALE_NAME_FIELD', 'Name')]: `Pharmacy Sale ${reference}`,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_BILL_FIELD', 'Bill_Number')]: reference,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_ORDER_ID_FIELD', 'EVitalRx_Order_ID')]: pharmacyOrderId(order),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_DATE_FIELD', 'Sale_Date')]: dateForZoho(saleDateForOrder(order)),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_PATIENT_FIELD', 'Patient_Name')]: patientName,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_MOBILE_FIELD', 'Patient_Mobile')]: patientMobile,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_BILLING_FOR_FIELD', 'Billing_For')]: firstText(order, ['billing_for']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_BILLING_MOBILE_FIELD', 'Billing_For_Mobile')]: firstText(order, ['billing_for_mobile']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_DOCTOR_FIELD', 'Doctor_Name')]: firstText(order, ['doctor_name']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_AMOUNT_FIELD', 'Sale_Amount')]: amount,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_GST_FIELD', 'GST_Amount')]: gstAmount,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_PAYMENT_FIELD', 'Payment_Mode')]: pharmacyPaymentMethod(order),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_TRANSACTION_TYPE_FIELD', 'Transaction_Type')]: firstText(order, ['transaction_type']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_TRANSACTION_NATURE_FIELD', 'Transaction_Nature')]: firstText(order, ['transaction_nature']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_STATUS_FIELD', 'Order_Status')]: firstText(order, ['order_status']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_DELIVERY_FIELD', 'Delivery_Type')]: firstText(order, ['delivery_type']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_CHEMIST_CODE_FIELD', 'Chemist_Code')]: firstText(order, ['chemist_code']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_PAYMENT_URL_FIELD', 'Direct_Payment_URL')]: firstText(order, ['direct_payment_url']),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_ITEM_COUNT_FIELD', 'Item_Count')]: items.length,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_ITEMS_FIELD', 'Items_Summary')]: itemSummary,
    [fieldName('ZOHO_CRM_PHARMACY_SALE_ITEMS_JSON_FIELD', 'Items_JSON')]: JSON.stringify(items),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_RAW_PAYLOAD_FIELD', 'Raw_Payload')]: JSON.stringify(order),
    [fieldName('ZOHO_CRM_PHARMACY_SALE_SOURCE_FIELD', 'Source')]: 'eVitalRx',
  });
}

export async function syncPharmacySaleToZohoCrm(
  order: any,
  options: ZohoCrmPharmacySaleSyncOptions = {}
) {
  const dryRun = options.dryRun === true;
  const moduleName = crmModuleName();
  const reference = referenceForOrder(order);
  if (!reference) throw new Error('Sale payload is missing bill/order number.');

  const payload = zohoCrmPharmacySalePayload(order);
  const nameField = fieldName('ZOHO_CRM_PHARMACY_SALE_NAME_FIELD', 'Name');
  const nameValue = text(payload[nameField]);

  if (dryRun) {
    return {
      status: 'dry_run' as const,
      dryRun,
      moduleName,
      reference,
      payload,
    };
  }

  const search = await zohoCrmFetch(
    `/crm/v2/${encodeURIComponent(moduleName)}/search?criteria=(${encodeURIComponent(
      nameField
    )}:equals:${encodeURIComponent(cleanCriteriaValue(nameValue))})`
  ).catch(() => null);
  const existing = Array.isArray(search?.data) ? search.data[0] : null;
  if (existing?.id) {
    return {
      status: 'duplicate' as const,
      dryRun,
      moduleName,
      reference,
      recordId: text(existing.id),
      message: 'A Zoho CRM pharmacy sale record already exists for this sale.',
    };
  }

  const body = await zohoCrmFetch(`/crm/v2/${encodeURIComponent(moduleName)}`, {
    method: 'POST',
    body: JSON.stringify({ data: [payload] }),
  });
  const created = Array.isArray(body?.data) ? body.data[0] : null;
  const details = created?.details || {};

  if (created?.status !== 'success') {
    throw new Error(created?.message || created?.code || 'Zoho CRM could not create pharmacy sale.');
  }

  return {
    status: 'created' as const,
    dryRun,
    moduleName,
    reference,
    recordId: text(details.id),
  };
}
