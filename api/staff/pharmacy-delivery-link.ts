import {
  newDeliveryLinkRecord,
  normalizeIndianMobile,
  readDeliveryLinkRecord,
  writeDeliveryLinkRecord,
} from '../_lib/pharmacy-delivery-link-store.js';
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

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  if (request.method === 'GET') {
    const record = await readDeliveryLinkRecord(request.query?.token).catch(() => null);
    if (!record) return response.status(404).json({ message: 'Delivery link not found or expired.' });
    return response.status(200).json({
      record,
      url: `${siteOrigin(request)}/pharmacy/delivery/${encodeURIComponent(record.token)}`,
    });
  }

  const patientName = String(request.body?.patientName || '').trim();
  const patientMobile = normalizeIndianMobile(request.body?.patientMobile);
  const patientId = String(request.body?.patientId || '').trim();

  if (patientName.length < 2 || !patientMobile) {
    return response.status(400).json({ message: 'Select a valid patient before creating the delivery link.' });
  }

  try {
    const record = newDeliveryLinkRecord({
      staffMobile: staffSession.mobile,
      patientId,
      patientName,
      patientMobile,
    });
    await writeDeliveryLinkRecord(record);
    return response.status(201).json({
      token: record.token,
      expiresAt: record.expiresAt,
      url: `${siteOrigin(request)}/pharmacy/delivery/${encodeURIComponent(record.token)}`,
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to create delivery link.',
    });
  }
}
