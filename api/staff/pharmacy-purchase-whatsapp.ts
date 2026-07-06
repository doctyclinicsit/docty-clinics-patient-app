import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { requestEvitalRx } from '../_lib/evitalrx.js';
import { sendPharmacyReceiptWhatsApp } from '../_lib/msg91-whatsapp.js';
import { buildPharmacyReceiptPayload } from '../_lib/pharmacy-receipt-payload.js';
import {
  pharmacyBillNo,
  pharmacyOrderAmountValue,
  pharmacyOrderDateText,
  pharmacyPaymentMethod,
  safeInvoiceFilename,
} from '../_lib/pharmacy-invoice.js';
import { buildStaffThermalInvoicePdf } from './pharmacy-invoice-whatsapp.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function normalizeMobile(value: unknown) {
  const mobile = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(mobile) ? mobile : '';
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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return response.status(500).json({ message: 'Invoice document storage is not configured.' });

  const orderId = String(request.body?.orderId || '').trim();
  const patientName = String(request.body?.patientName || 'Docty patient').trim();
  const patientMobile = normalizeMobile(request.body?.recipientMobile || request.body?.patientMobile);
  if (!orderId) return response.status(400).json({ message: 'Order ID is required.' });
  if (!patientMobile) return response.status(400).json({ message: 'Enter a valid recipient mobile number.' });

  try {
    const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
      endpoint: 'doctor/orders/view',
      payload: { order_id: orderId },
    });
    const order = {
      ...(body?.data || {}),
      order_id: String((body?.data as any)?.order_id || orderId),
      id: String((body?.data as any)?.id || orderId),
    };
    const pdf = await buildStaffThermalInvoicePdf(
      buildPharmacyReceiptPayload(order, {
        patientName,
        patientMobile,
        documentStatus: 'Final',
        request,
      })
    );
    const filename = safeInvoiceFilename(order);
    const blob = await put(`staff-pharmacy-purchase-invoices/${orderId}-${Date.now()}.pdf`, pdf, {
      access: 'private',
      contentType: 'application/pdf',
      token: blobToken,
    });
    const validUntil = Date.now() + 60 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname: blob.pathname,
      operations: ['get'],
      validUntil,
      token: blobToken,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: 'private',
      operation: 'get',
      pathname: blob.pathname,
      validUntil,
    });
    const whatsappResponse = await sendPharmacyReceiptWhatsApp({
      mobileValue: patientMobile,
      documentUrl: presignedUrl,
      filename,
      patientName,
      billNo: pharmacyBillNo(order),
      billDate: pharmacyOrderDateText(order),
      billAmount: String(Math.round(pharmacyOrderAmountValue(order))),
      paymentMethod: pharmacyPaymentMethod(order),
    });

    return response.status(200).json({ success: true, whatsappResponse });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to send pharmacy invoice on WhatsApp.',
    });
  }
}
