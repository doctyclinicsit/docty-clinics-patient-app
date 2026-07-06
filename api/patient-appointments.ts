import { readPatientSession } from '../server/patient-session.js';

const STATUS_LABELS: Record<string, string> = {
  BK: 'Booked',
  CM: 'Completed',
  CMNP: 'Completed',
  AB: 'Aborted',
  CN: 'Cancelled',
  CND: 'Cancelled by doctor',
  CNS: 'Cancelled by clinic',
  RE: 'Rescheduled',
  RES: 'Rescheduled',
  RED: 'Rescheduled',
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!secret || !ekaToken) {
    return response.status(500).json({ message: 'Appointments are not configured.' });
  }

  const session = readPatientSession(request.headers.cookie, secret);
  if (!session?.patientId) {
    return response.status(401).json({ message: 'Select a patient profile first.' });
  }

  try {
    const appointments: any[] = [];
    for (let page = 0; page < 10; page += 1) {
      const url = new URL('https://api.eka.care/dr/v1/appointment');
      url.searchParams.set('patient_id', session.patientId);
      url.searchParams.set('page_no', String(page));
      const ekaResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${ekaToken}`,
          Accept: 'application/json',
        },
      });
      const body = await ekaResponse.json().catch(() => null);
      if (!ekaResponse.ok) {
        return response.status(ekaResponse.status).json({
          message: body?.message || body?.error || 'Unable to retrieve appointments.',
        });
      }
      const pageItems = Array.isArray(body?.appointments) ? body.appointments : [];
      appointments.push(...pageItems);
      if (pageItems.length < 20) break;
    }

    const entitiesResponse = await fetch('https://api.eka.care/dr/v1/business/entities', {
      headers: { auth: ekaToken, Accept: 'application/json' },
    });
    const entitiesBody = await entitiesResponse.json().catch(() => null);
    const entities = entitiesBody?.data || entitiesBody || {};
    const doctorNames = new Map(
      (entities.doctors || []).map((doctor: any) => [doctor.doctor_id, doctor.name])
    );
    const clinicNames = new Map(
      (entities.clinics || []).map((clinic: any) => [clinic.clinic_id, clinic.name])
    );

    const result = appointments
      .map((appointment) => ({
        id: appointment.appointment_id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        doctor: doctorNames.get(appointment.doctor_id) || 'Doctor',
        clinicId: appointment.clinic_id,
        clinic: clinicNames.get(appointment.clinic_id) || 'Docty Clinic',
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        mode: appointment.mode,
        channel: appointment.channel,
        status: appointment.status,
        statusLabel: STATUS_LABELS[appointment.status] || appointment.status,
        prescriptionId: appointment.prescription_id,
        prescriptionUrl: appointment.prescription_url,
        paymentAmount:
          appointment.amount_paid ??
          appointment.receipt_amount ??
          appointment.payment_amount ??
          null,
        editable: appointment.status === 'BK' && appointment.start_time * 1000 > Date.now(),
      }))
      .sort((a, b) => b.startTime - a.startTime);

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ appointments: result });
  } catch {
    return response.status(502).json({ message: 'Eka appointments are temporarily unavailable.' });
  }
}
