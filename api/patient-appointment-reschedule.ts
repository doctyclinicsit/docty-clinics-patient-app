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
  if (request.method !== 'PATCH') {
    response.setHeader('Allow', 'PATCH');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const session = secret
    ? readPatientSession(request.headers.cookie, secret)
    : undefined;
  const appointmentId = String(request.body?.appointmentId || '');
  const start = String(request.body?.start || '');
  const end = String(request.body?.end || '');

  if (!session?.patientId) {
    return response.status(401).json({ message: 'Select a patient profile first.' });
  }
  if (!ekaToken) {
    return response.status(500).json({ message: 'Appointment modification is not configured.' });
  }
  if (
    !appointmentId ||
    Number.isNaN(new Date(start).getTime()) ||
    Number.isNaN(new Date(end).getTime()) ||
    new Date(start).getTime() <= Date.now() ||
    new Date(end).getTime() <= new Date(start).getTime()
  ) {
    return response.status(400).json({ message: 'Select a valid future appointment slot.' });
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

    const date = start.slice(0, 10);
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
    const slotsBody = await slotsResponse.json().catch(() => null);
    if (!slotsResponse.ok) {
      return response.status(slotsResponse.status).json({
        message: slotsBody?.message || slotsBody?.error || 'Unable to verify the selected slot.',
      });
    }
    const services = slotsBody?.data?.services || {};
    const appointmentMode = normalizeMode(appointment.mode);
    const slotExists = Object.values(slotsBody?.data?.schedule || {}).some(
      (groups: any) =>
        (groups || []).some((group: any) =>
          (group.slots || []).some(
            (slot: any) =>
              slot.available &&
              new Date(slot.s).getTime() === new Date(start).getTime() &&
              new Date(slot.e).getTime() === new Date(end).getTime() &&
              (
                !appointmentMode ||
                !Array.isArray(services[slot.conf_id]?.mode) ||
                services[slot.conf_id].mode.some(
                  (mode: unknown) => normalizeMode(mode) === appointmentMode
                )
              )
          )
        )
    );
    if (!slotExists) {
      return response.status(409).json({
        message: 'This slot is no longer available. Please choose another slot.',
      });
    }

    const updateResponse = await fetch(
      `https://api.eka.care/dr/v1/appointment/${encodeURIComponent(appointmentId)}`,
      {
        method: 'PATCH',
        headers: {
          auth: ekaToken,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: Math.floor(new Date(start).getTime() / 1000),
          end_time: Math.floor(new Date(end).getTime() / 1000),
        }),
      }
    );
    const updateBody = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message:
          updateBody?.error?.message ||
          updateBody?.message ||
          'Unable to modify the appointment.',
      });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ success: true });
  } catch (error) {
    return response.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : 'Appointment modification is temporarily unavailable.',
    });
  }
}
