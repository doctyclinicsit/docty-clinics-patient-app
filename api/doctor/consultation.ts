import { doctorSessionSecret, readDoctorSession } from '../../server/doctor-session.js';
import { approveConsultation, getConsultation, saveConsultation } from '../../server/doctor-consultations.js';

async function appointmentDetails(id: string, token: string) {
  const upstream = await fetch(`https://api.eka.care/dr/v1/appointment/${encodeURIComponent(id)}`, { headers: { auth: token, Accept: 'application/json' } });
  const body = await upstream.json().catch(() => null);
  if (!upstream.ok) throw Object.assign(new Error(body?.message || 'Unable to retrieve appointment.'), { status: upstream.status });
  return body?.data || body?.appointment || body;
}

async function patientDetails(id: string, token: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  if (process.env.EKA_CLIENT_ID) headers['client-id'] = process.env.EKA_CLIENT_ID;
  const upstream = await fetch(`https://api.eka.care/profiles/v1/patient/${encodeURIComponent(id)}`, { headers });
  if (!upstream.ok) return null;
  return upstream.json().catch(() => null);
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const secret = doctorSessionSecret();
  const session = secret ? readDoctorSession(request.headers.cookie, secret) : undefined;
  const token = process.env.EKA_AUTH_TOKEN || '';
  if (!session) return response.status(401).json({ message: 'Please sign in as doctor.' });
  if (!token) return response.status(500).json({ message: 'Eka appointments are not configured.' });
  const appointmentId = String(request.query?.appointmentId || request.body?.appointmentId || '').trim();
  if (!appointmentId) return response.status(400).json({ message: 'Appointment ID is required.' });

  try {
    const appointment = await appointmentDetails(appointmentId, token);
    if (String(appointment?.doctor_id) !== session.doctorId) return response.status(403).json({ message: 'This appointment does not belong to the signed-in doctor.' });
    if (request.method === 'GET') {
      const [consultation, patient] = await Promise.all([getConsultation(appointmentId, session.doctorId), patientDetails(appointment.patient_id, token)]);
      return response.status(200).json({ consultation, appointment, patient });
    }
    if (request.method === 'PUT') {
      const consultation = await saveConsultation({ appointmentId, doctorId: session.doctorId, patientId: appointment.patient_id, clinicId: appointment.clinic_id, draft: request.body?.draft });
      return response.status(200).json({ consultation });
    }
    if (request.method === 'POST' && request.body?.action === 'approve') {
      const existing = await getConsultation(appointmentId, session.doctorId);
      if (!existing?.draft?.diagnosis) return response.status(400).json({ message: 'Add a diagnosis or clinical assessment before approval.' });
      if (existing.draft.medications.some((item: any) => !item.name || !item.dose || !item.frequency || !item.duration)) return response.status(400).json({ message: 'Complete medicine, dose, frequency and duration for every medication.' });
      const consultation = await approveConsultation(appointmentId, session.doctorId);
      return response.status(200).json({ consultation });
    }
    response.setHeader('Allow', 'GET, PUT, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  } catch (error: any) {
    return response.status(error?.status || 502).json({ message: error instanceof Error ? error.message : 'Consultation is temporarily unavailable.' });
  }
}
