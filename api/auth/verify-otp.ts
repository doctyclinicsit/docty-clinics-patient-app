import {
  createPatientSessionCookie,
  PATIENT_SESSION_PURPOSE,
  sealValue,
} from '../../server/patient-session.js';

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : undefined;
}

function createSession(mobile: string, secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 30;
  return {
    expiresAt,
    value: sealValue({ mobile, expiresAt }, secret, PATIENT_SESSION_PURPOSE),
  };
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const sessionSecret = process.env.PATIENT_SESSION_SECRET;
  const mobile = normalizeIndianMobile(request.body?.mobile);
  const otp = String(request.body?.otp || '').replace(/\D/g, '');

  if (!authKey || !sessionSecret) {
    return response.status(500).json({ message: 'OTP verification is not configured.' });
  }

  if (!mobile || !/^\d{4,8}$/.test(otp)) {
    return response.status(400).json({ message: 'Enter a valid mobile number and OTP.' });
  }

  const query = new URLSearchParams({ mobile, otp });

  try {
    const msg91Response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          authkey: authKey,
          Accept: 'application/json',
        },
      }
    );
    const body = await msg91Response.json().catch(() => null);

    if (!msg91Response.ok || body?.type === 'error') {
      return response.status(401).json({
        message: body?.message || 'The OTP is incorrect or has expired.',
      });
    }

    const session = createSession(mobile, sessionSecret);
    response.setHeader(
      'Set-Cookie',
      createPatientSessionCookie(session.value, 1800)
    );
    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ success: true, expiresAt: session.expiresAt });
  } catch {
    return response.status(502).json({ message: 'OTP verification is temporarily unavailable.' });
  }
}
