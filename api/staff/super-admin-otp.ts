import { readAdminStaffSession } from '../../server/staff-admin.js';
import { SUPER_ADMIN_MOBILE } from '../../server/eka-staff.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) return response.status(adminSession.status).json({ message: adminSession.message });

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    return response.status(500).json({ message: 'Super Admin OTP service is not configured.' });
  }

  try {
    const query = new URLSearchParams({
      template_id: templateId,
      mobile: `91${SUPER_ADMIN_MOBILE}`,
      otp_expiry: '5',
    });
    const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp?${query.toString()}`, {
      method: 'POST',
      headers: {
        authkey: authKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const body = await msg91Response.json().catch(() => null);
    if (!msg91Response.ok || body?.type === 'error') {
      return response.status(502).json({
        message: body?.message || 'Unable to send Super Admin OTP. Please try again.',
      });
    }

    return response.status(200).json({
      success: true,
      maskedMobile: `••••••${SUPER_ADMIN_MOBILE.slice(-4)}`,
      message: 'Super Admin OTP sent successfully.',
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Super Admin OTP is temporarily unavailable.',
    });
  }
}
