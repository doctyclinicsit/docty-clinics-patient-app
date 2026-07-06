import { doctorSessionSecret, readDoctorSession } from '../../server/doctor-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = doctorSessionSecret();
  if (!secret) return response.status(500).json({ message: 'Doctor session is not configured.' });

  const session = readDoctorSession(request.headers.cookie, secret);
  if (!session) return response.status(401).json({ authenticated: false });

  return response.status(200).json({
    authenticated: true,
    expiresAt: session.expiresAt,
    doctor: {
      id: session.doctorId,
      name: session.name,
      mobile: session.mobile,
      specialisation: session.specialisation || '',
    },
  });
}
