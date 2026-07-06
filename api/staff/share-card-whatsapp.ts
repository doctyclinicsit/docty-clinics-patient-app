import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { sendSubscriptionCardWhatsApp } from '../_lib/msg91-whatsapp.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

const MAX_PDF_LENGTH = 6_500_000;
const PDF_DATA_URL_PATTERN = /^data:application\/pdf;base64,[a-z0-9+/=]+$/i;

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function safeFilename(value: unknown) {
  const filename = String(value || 'docty-subscription-card.pdf')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename || 'docty-subscription-card'}.pdf`;
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
  if (!blobToken) {
    return response.status(500).json({ message: 'Card document storage is not configured.' });
  }

  const recipientMobile = normalizeIndianMobile(request.body?.recipientMobile);
  const pdfDataUrl = String(request.body?.pdfDataUrl || '');
  const filename = safeFilename(request.body?.filename);
  const memberId = String(request.body?.memberId || 'card').replace(/[^a-z0-9-]+/gi, '').slice(0, 40);

  if (!recipientMobile) {
    return response.status(400).json({ message: 'Enter a valid recipient mobile number.' });
  }
  if (!pdfDataUrl || pdfDataUrl.length > MAX_PDF_LENGTH || !PDF_DATA_URL_PATTERN.test(pdfDataUrl)) {
    return response.status(400).json({ message: 'A valid subscription card PDF is required.' });
  }

  try {
    const pdfBuffer = Buffer.from(pdfDataUrl.slice(pdfDataUrl.indexOf(',') + 1), 'base64');
    const blob = await put(
      `subscription-cards/${memberId || Date.now()}-${Date.now()}.pdf`,
      pdfBuffer,
      {
        access: 'private',
        contentType: 'application/pdf',
        token: blobToken,
      }
    );
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

    const whatsappResponse = await sendSubscriptionCardWhatsApp({
      mobileValue: recipientMobile,
      documentUrl: presignedUrl,
      filename,
    });

    return response.status(200).json({
      success: true,
      documentUrl: presignedUrl,
      whatsappResponse,
    });
  } catch (error) {
    return response.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : 'Unable to send the subscription card on WhatsApp.',
    });
  }
}
