import {
  doctorDisplayName,
  findEkaDoctorByMobile,
  normalizeIndianMobile,
} from '../../server/eka-doctors.js';
import {
  createDoctorSessionCookie,
  createDoctorSessionToken,
  doctorSessionSecret,
} from '../../server/doctor-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const secret = doctorSessionSecret();
  const mobile = normalizeIndianMobile(request.body?.mobile);
  const otp = String(request.body?.otp || '').replace(/\D/g, '');

  if (!authKey || !secret) {
    return response.status(500).json({ message: 'Doctor OTP verification is not configured.' });
  }
  if (!mobile || !/^\d{4,8}$/.test(otp)) {
    return response.status(400).json({ message: 'Enter a valid doctor mobile number and OTP.' });
  }

  try {
    const doctor = await findEkaDoctorByMobile(mobile);
    if (!doctor) {
      return response.status(403).json({ message: 'This mobile number is not listed as a Docty doctor.' });
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
      return response.status(401).json({ message: body?.message || 'The OTP is incorrect or has expired.' });
    }

    const session = createDoctorSessionToken(secret, {
      doctorId: doctor.id,
      mobile,
      name: doctorDisplayName(doctor),
      specialisation: doctor.specialisation,
    });
    response.setHeader('Set-Cookie', createDoctorSessionCookie(session.token, session.maxAge));
    return response.status(200).json({
      authenticated: true,
      expiresAt: session.expiresAt,
      doctor: {
        id: doctor.id,
        name: doctorDisplayName(doctor),
        mobile,
        specialisation: doctor.specialisation || '',
      },
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Doctor OTP verification is temporarily unavailable.',
    });
  }
}
