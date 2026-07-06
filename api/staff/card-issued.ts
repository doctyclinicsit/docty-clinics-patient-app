import { sendPhysicalCardIssuedWhatsApp } from '../_lib/msg91-whatsapp.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function todayInIndia() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`;
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

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken || !ekaClientId) {
    return response.status(500).json({ message: 'Eka patient directory is not configured.' });
  }

  const patientId = String(request.body?.patientId || '');
  const mobile = normalizeIndianMobile(request.body?.mobile);
  const shouldMarkIssued = request.body?.cardIssued !== false;
  const issuedDate = shouldMarkIssued ? String(request.body?.issuedDate || todayInIndia()) : '';
  if (!patientId || (shouldMarkIssued && !/^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?$/.test(issuedDate))) {
    return response.status(400).json({ message: 'Patient ID and valid issued date/time are required.' });
  }

  const headers = {
    Authorization: `Bearer ${ekaToken}`,
    'client-id': ekaClientId,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const profileUrl = `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`;

  try {
    const profileResponse = await fetch(profileUrl, { headers });
    const profile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      return response.status(profileResponse.status).json({
        message:
          profile?.message ||
          profile?.error?.message ||
          'Unable to retrieve the patient profile.',
      });
    }

    const updateResponse = await fetch(profileUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        extras: {
          ...(profile?.extras || {}),
          cardIssued: shouldMarkIssued ? 'Yes' : 'No',
          cardIssueDt: issuedDate,
        },
      }),
    });
    const body = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          'Unable to update card issued status.',
      });
    }

    let whatsappSent = false;
    let whatsappMessage = '';
    if (shouldMarkIssued && mobile) {
      try {
        await sendPhysicalCardIssuedWhatsApp(mobile);
        whatsappSent = true;
      } catch (error) {
        whatsappMessage =
          error instanceof Error
            ? error.message
            : 'Unable to send the card issued WhatsApp notification.';
      }
    }

    return response.status(200).json({
      success: true,
      cardIssued: shouldMarkIssued,
      cardIssuedDate: issuedDate,
      whatsappSent,
      whatsappMessage,
    });
  } catch {
    return response.status(502).json({ message: 'Card issued status is temporarily unavailable.' });
  }
}
