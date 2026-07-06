import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { sendPharmacyReceiptWhatsApp } from '../_lib/msg91-whatsapp.js';
import {
  generatePharmacyInvoicePdf,
  getPatientPharmacyInvoiceContext,
  pharmacyBillNo,
  pharmacyOrderAmountValue,
  pharmacyOrderDateText,
  pharmacyPaymentMethod,
  safeInvoiceFilename,
} from '../_lib/pharmacy-invoice.js';

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return response.status(500).json({ message: 'Invoice document storage is not configured.' });
  }

  const orderId = String(request.body?.orderId || '').trim();
  if (!orderId) return response.status(400).json({ message: 'Order ID is required.' });

  try {
    const context = await getPatientPharmacyInvoiceContext(request, orderId);
    const recipientMobile = normalizeIndianMobile(request.body?.recipientMobile || context.patientMobile);
    if (!recipientMobile) {
      return response.status(400).json({ message: 'Enter a valid recipient mobile number.' });
    }

    const pdf = await generatePharmacyInvoicePdf(context, request);
    const filename = safeInvoiceFilename(context.order);
    const blob = await put(`pharmacy-invoices/${orderId}-${Date.now()}.pdf`, pdf, {
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
      mobileValue: recipientMobile,
      documentUrl: presignedUrl,
      filename,
      patientName: context.patientName,
      billNo: pharmacyBillNo(context.order),
      billDate: pharmacyOrderDateText(context.order),
      billAmount: String(Math.round(pharmacyOrderAmountValue(context.order))),
      paymentMethod: pharmacyPaymentMethod(context.order),
    });

    return response.status(200).json({ success: true, whatsappResponse });
  } catch (error) {
    return response.status((error as any)?.statusCode || 502).json({
      message: error instanceof Error ? error.message : 'Unable to send pharmacy invoice on WhatsApp.',
    });
  }
}
