import { readStaffSession, staffSessionSecret } from '../../../server/staff-session.js';
import { configuredAdminMobile, maskAdminMobile } from '../../../server/staff-access.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }
  const secret = staffSessionSecret();
  const staff = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staff) return response.status(401).json({ message: 'Please sign in as staff first.' });
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) return response.status(500).json({ message: 'Administration OTP is not configured.' });

  try {
    const query = new URLSearchParams({ template_id: templateId, mobile: `91${configuredAdminMobile()}`, otp_expiry: '5' });
    const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp?${query.toString()}`, {
      method: 'POST', headers: { authkey: authKey, Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    const body = await msg91Response.json().catch(() => null);
    if (!msg91Response.ok || body?.type === 'error') return response.status(502).json({ message: body?.message || 'Unable to send administration OTP.' });
    return response.status(200).json({ success:true, maskedMobile:maskAdminMobile(), message:`OTP sent to ${maskAdminMobile()}.` });
  } catch (error) {
    return response.status(502).json({ message: error instanceof Error ? error.message : 'Administration OTP is temporarily unavailable.' });
  }
}
