import { readPatientSession } from '../server/patient-session.js';

function normalizeMode(value: unknown) {
  const mode = String(value || '').replace(/[^a-z]/gi, '').toUpperCase();
  if (mode === 'INCLINIC' || mode === 'CLINIC') return 'INCLINIC';
  if (mode === 'VIDEO' || mode === 'ONLINE') return 'VIDEO';
  return mode;
}

async function getPatientAppointment(
  appointmentId: string,
  patientId: string,
  token: string
) {
  const url = new URL('https://api.eka.care/dr/v1/appointment');
  url.searchParams.set('patient_id', patientId);

  for (let page = 0; page < 10; page += 1) {
    url.searchParams.set('page_no', String(page));
    const ekaResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = await ekaResponse.json().catch(() => null);
    if (!ekaResponse.ok) {
      throw new Error(body?.message || body?.error || 'Unable to verify the appointment.');
    }
    const appointments = Array.isArray(body?.appointments) ? body.appointments : [];
    const appointment = appointments.find(
      (item: any) => item.appointment_id === appointmentId
    );
    if (appointment) return appointment;
    if (appointments.length < 20) break;
  }

  return undefined;
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const session = secret
    ? readPatientSession(request.headers.cookie, secret)
    : undefined;
  const appointmentId = String(request.query?.appointmentId || '');
  const date = String(request.query?.date || '');

  if (!session?.patientId) {
    return response.status(401).json({ message: 'Select a patient profile first.' });
  }
  if (!ekaToken) {
    return response.status(500).json({ message: 'Appointment modification is not configured.' });
  }
  if (!appointmentId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return response.status(400).json({ message: 'Appointment and date are required.' });
  }

  try {
    const appointment = await getPatientAppointment(
      appointmentId,
      session.patientId,
      ekaToken
    );
    if (!appointment) {
      return response.status(404).json({ message: 'Appointment not found.' });
    }
    if (
      appointment.status !== 'BK' ||
      Number(appointment.start_time) * 1000 <= Date.now()
    ) {
      return response.status(409).json({ message: 'This appointment can no longer be modified.' });
    }

    const query = new URLSearchParams({
      start_date: `${date}T00:00:00+05:30`,
      end_date: `${date}T23:59:59+05:30`,
    });
    const slotsResponse = await fetch(
      `https://api.eka.care/dr/v1/doctor/${encodeURIComponent(
        appointment.doctor_id
      )}/clinic/${encodeURIComponent(
        appointment.clinic_id
      )}/appointment/slot?${query.toString()}`,
      { headers: { auth: ekaToken, Accept: 'application/json' } }
    );
    const body = await slotsResponse.json().catch(() => null);
    if (!slotsResponse.ok) {
      return response.status(slotsResponse.status).json({
        message: body?.message || body?.error || 'Unable to retrieve appointment slots.',
      });
    }

    const services = body?.data?.services || {};
    const appointmentMode = normalizeMode(appointment.mode);
    const schedule = body?.data?.schedule || {};
    const slots = Object.values(schedule).flatMap((groups: any) =>
      (groups || []).flatMap((group: any) =>
        (group.slots || [])
          .filter((slot: any) => {
            if (!slot.available || new Date(slot.s).getTime() <= Date.now()) return false;
            const serviceModes = services[slot.conf_id]?.mode;
            return (
              !appointmentMode ||
              !Array.isArray(serviceModes) ||
              serviceModes.some((mode: unknown) => normalizeMode(mode) === appointmentMode)
            );
          })
          .map((slot: any) => ({
            start: slot.s,
            end: slot.e,
            confId: slot.conf_id,
          }))
      )
    );

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ slots });
  } catch (error) {
    return response.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : 'Appointment slots are temporarily unavailable.',
    });
  }
}
