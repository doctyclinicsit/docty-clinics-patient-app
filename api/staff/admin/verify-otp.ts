import { readStaffSession, staffSessionSecret } from '../../../server/staff-session.js';
import { configuredAdminMobile, createStaffAdminCookie, createStaffAdminSession } from '../../../server/staff-access.js';

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
  const otp = String(request.body?.otp || '').replace(/\D/g, '');
  if (!authKey || !secret) return response.status(500).json({ message: 'Administration OTP verification is not configured.' });
  if (!/^\d{4,8}$/.test(otp)) return response.status(400).json({ message: 'Enter a valid OTP.' });

  try {
    const query = new URLSearchParams({ mobile:`91${configuredAdminMobile()}`, otp });
    const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${query.toString()}`, { headers:{ authkey:authKey, Accept:'application/json' } });
    const body = await msg91Response.json().catch(() => null);
    if (!msg91Response.ok || body?.type === 'error') return response.status(401).json({ message:body?.message || 'The OTP is incorrect or has expired.' });
    const adminSession = createStaffAdminSession(secret, staff.mobile);
    response.setHeader('Set-Cookie', createStaffAdminCookie(adminSession.token, adminSession.maxAge));
    return response.status(200).json({ authenticated:true, expiresAt:adminSession.expiresAt });
  } catch (error) {
    return response.status(502).json({ message:error instanceof Error ? error.message : 'Administration OTP verification is temporarily unavailable.' });
  }
}
