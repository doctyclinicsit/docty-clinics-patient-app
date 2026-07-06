import { findEkaStaffUserByMobile, isEkaFranchiseOwner, normalizeIndianMobile } from '../../server/eka-staff.js';
import {
  createFranchiseSessionCookie,
  createFranchiseSessionToken,
  franchiseSessionSecret,
} from '../../server/franchise-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const secret = franchiseSessionSecret();
  const mobile = normalizeIndianMobile(request.body?.mobile);
  const otp = String(request.body?.otp || '').replace(/\D/g, '');

  if (!authKey || !secret) {
    return response.status(500).json({ message: 'Franchise OTP verification is not configured.' });
  }
  if (!mobile || !/^\d{4,8}$/.test(otp)) {
    return response.status(400).json({ message: 'Enter a valid Franchise Owner mobile number and OTP.' });
  }

  try {
    const owner = await findEkaStaffUserByMobile(mobile);
    if (!owner || !isEkaFranchiseOwner(owner)) {
      return response.status(403).json({ message: 'This mobile number is not registered as a Franchise Owner in EKa app users.' });
    }
    if (!owner.assignedClinics?.length) {
      return response.status(403).json({ message: 'This Franchise Owner does not have an assigned clinic in EKa app users.' });
    }

    const query = new URLSearchParams({ mobile: `91${mobile}`, otp });
    const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${query.toString()}`, {
      method: 'GET',
      headers: {
        authkey: authKey,
        Accept: 'application/json',
      },
    });
    const body = await msg91Response.json().catch(() => null);
    if (!msg91Response.ok || body?.type === 'error') {
      return response.status(401).json({
        message: body?.message || 'The OTP is incorrect or has expired.',
      });
    }

    const session = createFranchiseSessionToken(secret, {
      mobile,
      name: owner.name,
      ekaRole: owner.role,
      assignedClinics: owner.assignedClinics,
    });
    response.setHeader('Set-Cookie', createFranchiseSessionCookie(session.token, session.maxAge));
    return response.status(200).json({
      authenticated: true,
      expiresAt: session.expiresAt,
      owner: {
        name: owner.name || '',
        mobile,
        role: owner.role || '',
        assignedClinics: owner.assignedClinics || [],
      },
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Franchise OTP verification is temporarily unavailable.',
    });
  }
}
