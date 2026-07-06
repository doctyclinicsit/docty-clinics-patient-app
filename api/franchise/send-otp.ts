import { findEkaStaffUserByMobile, isEkaFranchiseOwner, normalizeIndianMobile } from '../../server/eka-staff.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const mobile = normalizeIndianMobile(request.body?.mobile);

  if (!authKey || !templateId) {
    return response.status(500).json({ message: 'OTP service is not configured.' });
  }
  if (!mobile) {
    return response.status(400).json({ message: 'Enter a valid Franchise Owner mobile number.' });
  }

  try {
    const owner = await findEkaStaffUserByMobile(mobile);
    if (!owner || !isEkaFranchiseOwner(owner)) {
      return response.status(403).json({ message: 'This mobile number is not registered as a Franchise Owner in EKa app users.' });
    }
    if (!owner.assignedClinics?.length) {
      return response.status(403).json({ message: 'This Franchise Owner does not have an assigned clinic in EKa app users.' });
    }

    const query = new URLSearchParams({
      template_id: templateId,
      mobile: `91${mobile}`,
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
        message: body?.message || 'Unable to send OTP. Please try again.',
      });
    }

    return response.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Franchise verification is temporarily unavailable.',
    });
  }
}
