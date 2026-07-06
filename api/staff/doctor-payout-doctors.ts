import { listEkaDoctors, doctorDisplayName } from '../../server/eka-doctors.js';
import { readAdminStaffSession } from '../../server/staff-admin.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) return response.status(adminSession.status).json({ message: adminSession.message });

  try {
    const doctors = await listEkaDoctors();
    return response.status(200).json({
      doctors: doctors
        .map((doctor) => ({
          id: doctor.id,
          name: doctorDisplayName(doctor),
          mobile: doctor.mobile || '',
          specialisation: doctor.specialisation || '',
          clinics: doctor.clinics || [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to load doctors.',
    });
  }
}
