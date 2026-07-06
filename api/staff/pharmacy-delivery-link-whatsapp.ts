import { sendPharmacyDeliveryLinkWhatsApp } from '../_lib/msg91-whatsapp.js';
import { readDeliveryLinkRecord } from '../_lib/pharmacy-delivery-link-store.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function siteOrigin(request: any) {
  const configured = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith('http') ? configured : `https://${configured}`;
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:5173';
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`;
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

  const record = await readDeliveryLinkRecord(request.body?.token).catch(() => null);
  if (!record) return response.status(404).json({ message: 'Delivery link not found or expired.' });

  try {
    const deliveryLink = `${siteOrigin(request)}/pharmacy/delivery/${encodeURIComponent(record.token)}`;
    const whatsappResponse = await sendPharmacyDeliveryLinkWhatsApp({
      mobileValue: record.patientMobile,
      patientName: record.patientName,
      deliveryLink,
    });
    return response.status(200).json({ success: true, whatsappResponse });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to send delivery link on WhatsApp.',
    });
  }
}
