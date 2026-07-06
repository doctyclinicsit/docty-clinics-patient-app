import { requestEvitalRx, requestEvitalRxMultipart } from '../_lib/evitalrx.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { safeWriteSystemLog } from '../_lib/system-logs.js';

function normalizeMobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function decodePrescriptionImage(value: any) {
  if (!value?.data || !value?.name || !value?.type) return null;
  const data = String(value.data);
  const base64 = data.includes(',') ? data.split(',').pop() || '' : data;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;

  return {
    fieldName: 'image',
    fileName: String(value.name).replace(/[^\w.\- ]+/g, '').slice(0, 120) || 'prescription.jpg',
    contentType: String(value.type),
    buffer,
  };
}

function evitalRxPatientIdKey(index: number) {
  return `evRxPatId${String(index).padStart(2, '0')}`;
}

function setEvitalRxPatientIdExtras(extras: Record<string, unknown>, patientId: string) {
  for (let index = 1; index <= 10; index += 1) delete extras[evitalRxPatientIdKey(index)];
  delete extras.evitalRxPatientId;
  delete extras.evitalPatientId;
  delete extras.eVitalRxPatientId;

  for (let index = 0; index < patientId.length; index += 16) {
    extras[evitalRxPatientIdKey(index / 16 + 1)] = patientId.slice(index, index + 16);
  }
}

async function syncEvitalRxPatientId(ekaPatientId: string, evitalRxPatientId: string) {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken || !ekaPatientId || !evitalRxPatientId) return false;

  const headers = {
    Authorization: `Bearer ${ekaToken}`,
    ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const profileUrl = `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(ekaPatientId)}`;
  const profileResponse = await fetch(profileUrl, { headers });
  const profile = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok) return false;

  const extras = { ...(profile?.extras || profile?.patient_profile?.extras || {}) };
  setEvitalRxPatientIdExtras(extras, evitalRxPatientId);
  const updateResponse = await fetch(profileUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ extras }),
  });

  return updateResponse.ok;
}

function firstText(source: any, keys: string[]) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function findNestedText(source: any, patterns: RegExp[], depth = 0): string {
  if (!source || depth > 5) return '';
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findNestedText(item, patterns, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof source !== 'object') return '';

  for (const [key, value] of Object.entries(source)) {
    if (patterns.some((pattern) => pattern.test(key)) && (typeof value === 'string' || typeof value === 'number')) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  for (const value of Object.values(source)) {
    const found = findNestedText(value, patterns, depth + 1);
    if (found) return found;
  }
  return '';
}

function extractOrderInvoiceDetails(orderViewData: any, fallbackOrderNumber: string) {
  const source = orderViewData || {};
  const addressParts = [
    source.chemist_address,
    source.chemist_city,
    source.chemist_state,
    source.chemist_zipcode,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return {
    invoiceNumber:
      firstText(source, ['invoice_no', 'invoice_number', 'bill_no', 'bill_number', 'order_number']) ||
      findNestedText(source, [/invoice.*(no|number)/i, /bill.*(no|number)/i]) ||
      fallbackOrderNumber,
    gstNumber:
      firstText(source, ['gst_no', 'gst_number', 'gstin', 'chemist_gst_no', 'pharmacy_gst_no']) ||
      findNestedText(source, [/gst/i, /gstin/i]),
    storeAddress:
      addressParts.join(', ') ||
      firstText(source, ['store_address', 'chemist_address', 'pharmacy_address', 'billing_address', 'address']) ||
      findNestedText(source, [/(store|chemist|pharmacy).*address/i, /billing.*address/i]),
    storeName:
      firstText(source, ['pharmacy_name', 'store_name', 'chemist_name', 'chemist_shop_name']) ||
      findNestedText(source, [/(store|chemist|pharmacy).*name/i]),
    paymentUrl: firstText(source, ['payment_url', 'invoice_url', 'bill_url']),
  };
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePaymentStatus(value: unknown) {
  const paymentStatus = Number(value);
  return [1, 2, 3, 4, 5, 6, 7].includes(paymentStatus) ? paymentStatus : 3;
}

function evitalRxFallbackMobile(mobile: string, hasEvitalRxPatientId: boolean) {
  return hasEvitalRxPatientId ? mobile : `66000${mobile.slice(5)}`;
}

function saveQuantityForItem(item: any) {
  const quantity = Number(item.quantity) || 0;
  const packUnitCount = Number(item.packUnitCount) || 1;
  if (item.quantityUnit === 'strip' && packUnitCount > 1) return quantity * packUnitCount;
  return quantity;
}

function numeric(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemGstPercentage(item: any) {
  return numeric(
    item.gstPercentage ??
      item.gst_percentage ??
      item.gstPercent ??
      item.gst_percent ??
      item.tax_percentage ??
      item.taxPercent ??
      item.gst ??
      item.tax
  );
}

function productGstPercentage(product: any) {
  return numeric(
    product?.gst_percentage ??
      product?.gstPercentage ??
      product?.gst_percent ??
      product?.gstPercent ??
      product?.tax_percentage ??
      product?.taxPercent ??
      product?.gst ??
      product?.tax
  );
}

async function resolveMissingGst(items: any[]) {
  const missingMedicineIds = Array.from(
    new Set(
      items
        .filter((item) => (item.medicineId || item.id) && itemGstPercentage(item) <= 0)
        .map((item) => String(item.medicineId || item.id))
    )
  );
  if (!missingMedicineIds.length) return items;

  const gstByMedicineId = new Map<string, number>();
  await Promise.all(
    missingMedicineIds.map(async (medicineId) => {
      try {
        const view = await requestEvitalRx<{ data?: any[] | any }>({
          endpoint: 'doctor/medicines/view',
          payload: { medicine_id: medicineId },
        });
        const products = Array.isArray(view.data) ? view.data : view.data ? [view.data] : [];
        const gst = products.map(productGstPercentage).find((value) => value > 0) || 0;
        if (gst > 0) gstByMedicineId.set(medicineId, gst);
      } catch {
        try {
          const search = await requestEvitalRx<{ data?: { result?: any[] } }>({
            endpoint: 'doctor/medicines/search',
            payload: { searchstring: String(items.find((item) => String(item.medicineId || item.id) === medicineId)?.name || '').slice(0, 20) },
          });
          const product = (search.data?.result || []).find((item) => String(item.medicine_id || item.id || '') === medicineId);
          const gst = productGstPercentage(product);
          if (gst > 0) gstByMedicineId.set(medicineId, gst);
        } catch {
          // Keep the save flow moving; explicit zero remains visible if eVitalRx has no GST metadata.
        }
      }
    })
  );

  return items.map((item) => {
    const medicineId = String(item.medicineId || item.id || '');
    const fallbackGst = gstByMedicineId.get(medicineId) || 0;
    return itemGstPercentage(item) > 0 || fallbackGst <= 0
      ? item
      : { ...item, gstPercentage: fallbackGst, gst_percentage: fallbackGst };
  });
}

function buildSaveItems(items: any[]) {
  return items
    .filter((item: any) => (item.medicineId || item.id) && Number(item.quantity) > 0)
    .map((item: any) => ({
      medicine_id: item.medicineId || item.id,
      batch: item.batchNo || item.batchId || '',
      expiry: item.expiry || '',
      mrp: Number(item.mrp || item.salePrice || 0),
      quantity: saveQuantityForItem(item),
      discount: Number(item.discountPercentage) || 0,
      gst_percentage: itemGstPercentage(item),
      cess_percentage: Number(item.cessPercentage || item.cess_percentage || item.cess || 0),
    }));
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  const order = request.body || {};
  const mobile = normalizeMobile(order.patientMobile);
  const patientId = String(order.patientId || '').trim();
  const evitalRxPatientIdInput = String(order.evitalRxPatientId || '').trim();
  const patientName = String(order.patientName || '').trim();
  const prescriptionImage = decodePrescriptionImage(order.prescriptionImage);
  const deliveryType = order.deliveryType === 'delivery' ? 'delivery' : 'pickup';
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  const deliveryCharge = deliveryType === 'delivery' ? Math.max(0, Number(order.deliveryCharge) || 0) : 0;
  const deliveryDetails = order.deliveryDetails || {};
  const deliveryAddress = [
    deliveryDetails.address,
    deliveryDetails.area,
    deliveryDetails.city,
    deliveryDetails.pincode ? `PIN ${deliveryDetails.pincode}` : '',
    deliveryDetails.landmark,
  ]
    .filter(Boolean)
    .join(', ');
  const deliveryGps =
    deliveryDetails.latitude && deliveryDetails.longitude
      ? `${deliveryDetails.latitude}, ${deliveryDetails.longitude}`
      : '';
  const items = await resolveMissingGst(Array.isArray(order.items) ? order.items : []);
  const evitalRxItems = items
    .filter((item: any) => item.id && Number(item.quantity) > 0)
    .map((item: any) => ({
      medicine_id: item.medicineId || item.id,
      quantity: Number(item.quantity),
      discount_percentage: Number(item.discountPercentage) || 0,
      gst_percentage: itemGstPercentage(item),
      cess_percentage: Number(item.cessPercentage || item.cess_percentage || item.cess || 0),
      mrp: Number(item.mrp || item.salePrice || 0),
      ...(item.batchId ? { batch_id: item.batchId } : {}),
      ...(item.batchNo ? { batch_no: item.batchNo } : {}),
      ...(item.expiry ? { expiry: item.expiry } : {}),
      ...(item.quantityUnit || item.saleUnit ? { quantity_unit: item.quantityUnit || item.saleUnit } : {}),
    }));

  if (!patientName || !/^[6-9]\d{9}$/.test(mobile)) {
    return response.status(400).json({ message: 'Select a valid patient before pushing prescription.' });
  }
  if (evitalRxItems.length === 0 && !prescriptionImage && !String(order.prescriptionNotes || '').trim()) {
    return response.status(400).json({ message: 'Add medicines, notes, or a prescription image.' });
  }

  try {
    const evitalRxMobile = evitalRxFallbackMobile(mobile, Boolean(evitalRxPatientIdInput));
    const payload = {
      ...(evitalRxPatientIdInput ? { patient_id: evitalRxPatientIdInput } : {}),
      patient_name: patientName,
      ...(!evitalRxPatientIdInput ? { mobile: evitalRxMobile } : {}),
      items: JSON.stringify(evitalRxItems),
      doctor_name: order.doctorName || '',
      batch_with: 'yes',
      delivery_type: deliveryType,
      remark: [
        order.prescriptionNotes,
        order.billingNotes,
        deliveryType === 'delivery' && deliveryAddress ? `Delivery: ${deliveryAddress}` : '',
        deliveryType === 'delivery' && deliveryGps ? `GPS: ${deliveryGps}` : '',
        deliveryType === 'delivery' ? `Delivery charge: Rs ${deliveryCharge.toFixed(2)}` : '',
        patientId ? `Eka patient ID: ${patientId}` : '',
        !evitalRxPatientIdInput ? 'eVitalRx patient lookup used masked mobile fallback.' : '',
        `Bill total: Rs ${Number(order.totalAmount || 0).toFixed(2)}`,
      ]
        .filter(Boolean)
        .join('\n'),
      shipping: deliveryCharge,
    };

    const evitalRxResponse = prescriptionImage
      ? await requestEvitalRxMultipart<{
          data?: { order_id?: string; order_number?: string };
          status_message?: string;
        }>({
          endpoint: 'doctor/orders/push_prescription',
          fields: payload,
          files: [prescriptionImage],
        })
      : await requestEvitalRx<{
          data?: { order_id?: string; order_number?: string };
          status_message?: string;
        }>({
          endpoint: 'doctor/orders/push_prescription',
          payload,
        });

    const orderId = evitalRxResponse.data?.order_id || '';
    const orderView = orderId
      ? await requestEvitalRx<{ data?: { patient_id?: string } & Record<string, any> }>({
          endpoint: 'doctor/orders/view',
          payload: { order_id: orderId },
        }).catch(() => null)
      : null;
    const evitalRxPatientId = String(orderView?.data?.patient_id || evitalRxPatientIdInput || '').trim();
    if (!evitalRxPatientId) {
      throw new Error('eVitalRx Patient ID was not returned in order details.');
    }
    let saveResponse: any = null;
    if (orderId) {
      const saveItems = buildSaveItems(items);
      saveResponse = await requestEvitalRx<{
        data?: {
          order_id?: string;
          bill_no?: string;
          order_number?: string;
          amount?: string | number;
          print_url?: string;
          invoice_url?: string;
        };
        status_message?: string;
      }>({
        endpoint: 'doctor/orders/save',
        payload: {
          patient_id: evitalRxPatientId,
          patient_name: patientName,
          ...(!evitalRxPatientIdInput ? { mobile: evitalRxMobile } : {}),
          items: JSON.stringify(saveItems),
          shipping: String(deliveryCharge),
          delivery_type: deliveryType,
          remark: payload.remark,
          order_id: orderId,
          order_date: todayIsoDate(),
          payment_status: paymentStatus,
        },
      });
    }
    const orderInvoiceDetails = extractOrderInvoiceDetails(orderView?.data, evitalRxResponse.data?.order_number || '');
    const invoiceDetails = {
      ...orderInvoiceDetails,
      invoiceNumber:
        saveResponse?.data?.bill_no ||
        saveResponse?.data?.order_number ||
        orderInvoiceDetails.invoiceNumber,
      paymentUrl: saveResponse?.data?.print_url || saveResponse?.data?.invoice_url || orderInvoiceDetails.paymentUrl,
    };
    const ekaSynced = patientId && evitalRxPatientId
      ? await syncEvitalRxPatientId(patientId, evitalRxPatientId).catch(() => false)
      : false;

    await safeWriteSystemLog({
      level: 'success',
      source: 'pharmacy-billing',
      event: 'order_placed',
      message: `Pharmacy order placed for ${patientName}${invoiceDetails.invoiceNumber ? `, invoice ${invoiceDetails.invoiceNumber}` : ''}.`,
      actorName: staffSession.name || '',
      actorMobile: staffSession.mobile || '',
      metadata: {
        orderId,
        orderNumber: saveResponse?.data?.order_number || evitalRxResponse.data?.order_number || '',
        billNo: saveResponse?.data?.bill_no || '',
        patientId,
        evitalRxPatientId,
        itemCount: evitalRxItems.length,
        deliveryType,
        paymentStatus,
        totalAmount: Number(order.totalAmount || 0),
      },
    });

    return response.status(201).json({
      orderId,
      orderNumber: saveResponse?.data?.order_number || evitalRxResponse.data?.order_number || '',
      billNo: saveResponse?.data?.bill_no || '',
      saved: Boolean(saveResponse?.data),
      invoiceDetails,
      evitalRxPatientId,
      ekaSynced,
      message: saveResponse?.status_message || evitalRxResponse.status_message || 'Prescription pushed to eVitalRx.',
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'pharmacy-billing',
      event: 'order_place_failed',
      message: error instanceof Error ? error.message : 'Unable to push prescription to eVitalRx.',
      actorName: staffSession.name || '',
      actorMobile: staffSession.mobile || '',
      metadata: {
        patientId,
        evitalRxPatientId: evitalRxPatientIdInput,
        patientMobileLast4: mobile.slice(-4),
        itemCount: evitalRxItems.length,
        deliveryType,
        paymentStatus,
      },
    });
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to push prescription to eVitalRx.',
    });
  }
}
