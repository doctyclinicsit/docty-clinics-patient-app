import {
  itemDiscountedPrice,
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

type ReceiptPayloadOptions = {
  patientName?: string;
  patientMobile?: string;
  documentStatus?: 'Draft' | 'Final';
  request?: any;
};

function firstText(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], source);
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function firstNumber(source: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const raw = key.split('.').reduce((current, part) => current?.[part], source);
    const parsed = Number(String(raw ?? '').replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function firstFiniteNumber(source: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const raw = key.split('.').reduce((current, part) => current?.[part], source);
    if (raw === undefined || raw === null || raw === '') continue;
    const parsed = Number(String(raw).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function siteOrigin(request: any) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/g, '');
  const host = request?.headers?.['x-forwarded-host'] || request?.headers?.host || 'docty-clinics-patient-app-eta.vercel.app';
  const protocol = request?.headers?.['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
}

function itemBatch(item: any) {
  return firstText(item, ['batch', 'batch_no', 'batch_number', 'batch_no_name', 'batch_details.batch_no'], '-');
}

function itemExpiry(item: any) {
  const raw = firstText(item, ['expiry_date', 'expiry', 'exp', 'expiry_month_year', 'exp_date', 'batch_expiry']);
  if (!raw) return '-';
  const monthYear = raw.match(/^(\d{1,2})[/-](\d{2,4})$/);
  if (monthYear) return `${monthYear[1].padStart(2, '0')}/${monthYear[2].slice(-2)}`;
  const yearMonth = raw.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/);
  if (yearMonth) return `${yearMonth[2].padStart(2, '0')}/${yearMonth[1].slice(-2)}`;
  return raw;
}

function itemGstPercentage(item: any) {
  const rate = firstNumber(item, ['gst_percentage', 'tax_percentage', 'tax_rate', 'igst_percentage', 'cgst_percentage']);
  if (rate > 0 && rate <= 28) return rate;
  const ambiguous = firstNumber(item, ['gst', 'tax', 'igst']);
  return ambiguous > 0 && ambiguous <= 28 ? ambiguous : 0;
}

function storeText(order: any, keys: string[], fallback = '') {
  return firstText(order, keys, fallback);
}

function packUnitFromText(value: string) {
  if (/(capsules?|caps?)\b/i.test(value)) return 'Caps';
  if (/(tablets?|tabs?)\b/i.test(value)) return 'Tabs';
  return '';
}

function itemPackQuantity(item: any, packSize: string) {
  const explicitSize = firstNumber(item, ['size', 'pack_size_quantity', 'pack_quantity']);
  if (explicitSize > 0) return explicitSize;
  const match = packSize.match(/(\d+)\s*(tablets?|tabs?|capsules?|caps?)\b/i);
  return match ? Number(match[1]) : 0;
}

export function buildPharmacyReceiptPayload(order: any, options: ReceiptPayloadOptions = {}) {
  const items = pharmacyOrderItems(order);
  const receiptItems = items.map((item: any) => {
    const packSize = firstText(item, ['packing_size', 'pack_size', 'packing', 'pack', 'package_size']);
    const packQuantity = itemPackQuantity(item, packSize);
    const looseQuantity = firstNumber(item, ['loose_quantity', 'loose_qty', 'billed_loose_quantity']);
    const stripQuantity = itemQuantity(item);
    const quantity = looseQuantity > 0 ? looseQuantity : stripQuantity;
    const mrp = itemMrp(item);
    const unit = looseQuantity > 0
      ? packUnitFromText(packSize) || firstText(item, ['quantity_unit', 'sale_unit', 'billing_unit'], 'Tabs')
      : firstText(item, ['quantity_unit', 'sale_unit', 'billing_unit', 'unit', 'unit_text', 'medicine_unit'], 'Strip');
    const rate = looseQuantity > 0 && packQuantity > 1 ? mrp / packQuantity : mrp || itemDiscountedPrice(item);
    const explicitDiscount = firstFiniteNumber(item, [
      'discount_percentage',
      'discount_percent',
      'sale_discount_percentage',
      'scheme_discount_percentage',
    ], NaN);
    const lineGross = rate * quantity;
    const amount = firstNumber(item, ['amount', 'total', 'net_amount', 'line_total', 'item_total', 'total_amount', 'final_amount']) ||
      (Number.isFinite(explicitDiscount) ? Math.max(0, lineGross - (lineGross * explicitDiscount) / 100) : lineGross);
    const gstPercentage = itemGstPercentage(item);
    const gstAmount =
      firstNumber(item, ['gst_amount', 'tax_amount', 'item_gst_amount', 'total_gst_amount', 'cgst_amount']) ||
      (gstPercentage > 0 ? (amount * gstPercentage) / (100 + gstPercentage) : 0);
    const taxableAmount = Math.max(0, amount - gstAmount);
    const discount = Number.isFinite(explicitDiscount)
      ? Math.max(0, explicitDiscount)
      : lineGross > 0 && amount < lineGross
        ? ((lineGross - amount) / lineGross) * 100
        : firstNumber(item, ['discount', 'discount_amount']) > 0 && lineGross > 0
          ? (firstNumber(item, ['discount', 'discount_amount']) / lineGross) * 100
          : 0;

    return {
      name: itemName(item),
      batch: itemBatch(item),
      expiry: itemExpiry(item),
      quantity,
      unit,
      packSize,
      rate,
      discount,
      gstPercentage,
      taxableAmount,
      gstAmount,
      amount,
    };
  });

  const gross = receiptItems.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const net = pharmacyOrderAmountValue(order) || receiptItems.reduce((sum, item) => sum + item.amount, 0);
  const gst = firstNumber(order, ['total_gst', 'gst_amount', 'total_tax', 'tax_amount']) || receiptItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const cgst = firstNumber(order, ['cgst', 'cgst_amount'], gst / 2);
  const sgst = firstNumber(order, ['sgst', 'sgst_amount'], gst / 2);
  const deliveryCharge = firstNumber(order, ['delivery_charge', 'delivery_charges', 'shipping_charge', 'shipping_amount']);
  const payable = net + deliveryCharge;
  const orderId = pharmacyOrderId(order) || pharmacyBillNo(order);

  return {
    brandName: 'Docty.Pharmacy',
    storeName: storeText(order, ['chemist_name', 'store_name', 'pharmacy_name', 'retailer_name'], 'Docty.Pharmacy'),
    storeAddress: storeText(order, ['chemist_address', 'store_address', 'pharmacy_address', 'address'], 'Hyderabad'),
    gstNumber: storeText(order, ['chemist_gstn', 'gst_number', 'gstin', 'gst_no', 'store_gst'], '36AAHCD7944A1ZQ'),
    documentStatus: options.documentStatus || 'Final',
    orderId,
    billNo: pharmacyBillNo(order),
    billDate: pharmacyOrderDateText(order),
    patientName: options.patientName || storeText(order, ['patient_name', 'customer_name', 'user_name'], 'Docty patient'),
    mobile: options.patientMobile || storeText(order, ['patient_mobile', 'mobile', 'customer_mobile']),
    paymentMethod: pharmacyPaymentMethod(order),
    fulfillment: storeText(order, ['delivery_type', 'fulfillment_type', 'order_type'], 'Pharmacy Order'),
    deliveryAddress: storeText(order, ['delivery_address', 'shipping_address', 'address_detail.address']),
    items: receiptItems,
    totals: {
      gross,
      discount: Math.max(0, gross - net),
      taxable: Math.max(0, net - gst),
      gst,
      cgst,
      sgst,
      net,
      deliveryCharge,
      payable,
    },
    reorderUrl: `${siteOrigin(options.request)}/pharmacy/${encodeURIComponent(orderId)}`,
  };
}
