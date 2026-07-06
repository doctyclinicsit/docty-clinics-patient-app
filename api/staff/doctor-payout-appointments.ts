import { readAdminStaffSession } from '../../server/staff-admin.js';
import { resolveAppointmentPaymentAmount } from '../../server/eka-appointment-payments.js';

const STATUS_LABELS: Record<string, string> = {
  BK: 'Booked',
  CK: 'Checked-in',
  RV: 'Reserved',
  IN: 'Initiated',
  PA: 'Parked',
  OG: 'Ongoing',
  CM: 'Completed',
  CMNP: 'Completed',
  AB: 'Aborted',
  NS: 'No show',
  CN: 'Cancelled',
  CND: 'Cancelled by doctor',
  CNS: 'Cancelled by clinic',
  RE: 'Rescheduled',
  RES: 'Rescheduled',
  RED: 'Rescheduled',
};

function parseDate(value: unknown) {
  const date = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function dateDiffDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

function splitDateRange(startDate: string, endDate: string) {
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    const chunkStart = cursor.toISOString().slice(0, 10);
    const chunkEndDate = new Date(cursor);
    chunkEndDate.setUTCDate(chunkEndDate.getUTCDate() + 6);
    const safeChunkEnd = chunkEndDate > end ? end : chunkEndDate;
    chunks.push({
      startDate: chunkStart,
      endDate: safeChunkEnd.toISOString().slice(0, 10),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return chunks;
}

async function enrichAppointmentsWithDetails(appointments: any[], ekaToken: string) {
  const details = new Map<string, any>();
  const batchSize = 8;

  for (let index = 0; index < appointments.length; index += batchSize) {
    const batch = appointments.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (appointment) => {
        const appointmentId = appointment.appointment_id;
        if (!appointmentId) return appointment;
        const detailsResponse = await fetch(
          `https://api.eka.care/dr/v1/appointment/${encodeURIComponent(appointmentId)}`,
          { headers: { auth: ekaToken, Accept: 'application/json' } }
        );
        const body = await detailsResponse.json().catch(() => null);
        const details = body?.data || body?.appointment || body;
        return detailsResponse.ok && details ? { ...appointment, ...details } : appointment;
      })
    );

    results.forEach((result, batchIndex) => {
      const fallback = batch[batchIndex];
      const appointment = result.status === 'fulfilled' ? result.value : fallback;
      if (appointment?.appointment_id) details.set(appointment.appointment_id, appointment);
    });
  }

  return Array.from(details.values());
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) return response.status(adminSession.status).json({ message: adminSession.message });
  if (!ekaToken) return response.status(500).json({ message: 'Doctor payout is not configured.' });

  const doctorId = String(request.query?.doctorId || '');
  const startDate = parseDate(request.query?.startDate);
  const endDate = parseDate(request.query?.endDate);
  if (!doctorId || !startDate || !endDate) {
    return response.status(400).json({ message: 'Doctor and date range are required.' });
  }
  const days = dateDiffDays(startDate, endDate);
  if (days < 0 || days > 31) {
    return response.status(400).json({ message: 'Select a date range up to 31 days.' });
  }

  try {
    const appointments: any[] = [];
    for (const chunk of splitDateRange(startDate, endDate)) {
      for (let page = 0; page < 10; page += 1) {
        const url = new URL('https://api.eka.care/dr/v1/appointment');
        url.searchParams.set('doctor_id', doctorId);
        url.searchParams.set('start_date', chunk.startDate);
        url.searchParams.set('end_date', chunk.endDate);
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
        if (pageItems.length < 50) break;
      }
    }

    const entitiesResponse = await fetch('https://api.eka.care/dr/v1/business/entities', {
      headers: { auth: ekaToken, Accept: 'application/json' },
    });
    const entitiesBody = await entitiesResponse.json().catch(() => null);
    const entities = entitiesBody?.data || entitiesBody || {};
    const clinicNames = new Map(
      (entities.clinics || []).map((clinic: any) => [clinic.clinic_id, clinic.name])
    );

    const uniqueAppointments = Array.from(
      new Map(appointments.map((appointment) => [appointment.appointment_id, appointment])).values()
    );
    const enrichedAppointments = await enrichAppointmentsWithDetails(uniqueAppointments, ekaToken);

    const result = await Promise.all(enrichedAppointments
      .map(async (appointment) => {
        const partnerMeta = appointment.partner_meta || {};
        const payment = await resolveAppointmentPaymentAmount(appointment, ekaToken);
        return {
          id: appointment.appointment_id,
          patientId: appointment.patient_id,
          clinicId: appointment.clinic_id,
          clinic: clinicNames.get(appointment.clinic_id) || 'Docty Clinic',
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          status: appointment.status,
          statusLabel: STATUS_LABELS[appointment.status] || appointment.status,
          mode: appointment.mode,
          channel: appointment.channel,
          serviceName: appointment.service?.service_name || 'Consultation',
          paymentAmount: payment.amount,
          paymentSource: payment.source,
          payout: {
            fee: Number(partnerMeta.docty_share_fee ?? partnerMeta.docty_doctor_share ?? 0) || 0,
            tests: Number(partnerMeta.docty_share_tests ?? 0) || 0,
            daycare: Number(partnerMeta.docty_share_daycare ?? 0) || 0,
            referral: Number(partnerMeta.docty_share_referral ?? 0) || 0,
          },
        };
      }));
    result.sort((a, b) => b.startTime - a.startTime);

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ appointments: result });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Doctor payout appointments are temporarily unavailable.',
    });
  }
}
