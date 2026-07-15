import { neon } from '@neondatabase/serverless';
import { createCampStationSession } from './_lib/camp-station-session.js';

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
}
function clean(value: unknown, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}
function mobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

async function sendOtp(staffMobile: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_CAMP_OTP_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) throw new Error('Camp staff OTP is not configured.');
  const query = new URLSearchParams({ template_id: templateId, mobile: `91${staffMobile}`, otp_expiry: '5' });
  const sent = await fetch(`https://control.msg91.com/api/v5/otp?${query}`, { method: 'POST', headers: { authkey: authKey, Accept: 'application/json' } });
  const body = await sent.json().catch(() => null);
  if (!sent.ok || body?.type === 'error') throw new Error(body?.message || 'Unable to send OTP.');
  const retry = new URLSearchParams({ mobile: `91${staffMobile}`, retrytype: 'whatsapp' });
  const retried = await fetch(`https://control.msg91.com/api/v5/otp/retry?${retry}`, { headers: { authkey: authKey, Accept: 'application/json' } });
  const retryBody = await retried.json().catch(() => null);
  if (!retried.ok || retryBody?.type === 'error') throw new Error(retryBody?.message || 'Unable to send WhatsApp OTP.');
}

async function verifyOtp(staffMobile: string, otp: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) throw new Error('Camp staff OTP is not configured.');
  const query = new URLSearchParams({ mobile: `91${staffMobile}`, otp });
  const verified = await fetch(`https://control.msg91.com/api/v5/otp/verify?${query}`, { headers: { authkey: authKey, Accept: 'application/json' } });
  const body = await verified.json().catch(() => null);
  if (!verified.ok || body?.type === 'error') throw new Error(body?.message || 'The OTP is incorrect or expired.');
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'POST') return response.status(405).json({ message: 'Method not allowed.' });
  const url = databaseUrl();
  if (!url) return response.status(503).json({ message: 'Camp database is not configured.' });
  const campId = clean(request.body?.campId);
  const stationType = clean(request.body?.stationType, 30);
  const staffMobile = mobile(request.body?.mobile);
  const action = clean(request.body?.action, 20);
  if (!campId || !['registration', 'nursing', 'hall', 'queue', 'participants', 'finance'].includes(stationType) || !/^[6-9]\d{9}$/.test(staffMobile)) {
    return response.status(400).json({ message: 'Camp, station and assigned staff mobile are required.' });
  }
  try {
    const sql = neon(url);
    const assignments = await sql`
      select a.*, s.id as station_id, s.cohort_id, s.station_type, c.name as cohort_name,
        cp.ends_on as camp_ends_on
      from camp_station_assignments a
      join camp_stations s on s.id = a.station_id
      join educational_camp_cohorts c on c.id = s.cohort_id
      join educational_camps cp on cp.id = s.camp_id
      where s.camp_id = ${campId} and s.station_type = ${stationType}
        and a.staff_mobile = ${staffMobile} and a.status = 'assigned'
      order by c.sort_order
    `;
    if (!assignments.length) return response.status(403).json({ message: 'This mobile is not assigned to the selected camp station.' });
    if (action === 'send-otp') {
      await sendOtp(staffMobile);
      return response.status(200).json({ success: true, message: 'WhatsApp OTP sent.' });
    }
    if (action !== 'verify-otp') return response.status(400).json({ message: 'Unknown authentication action.' });
    const otp = String(request.body?.otp || '').replace(/\D/g, '');
    if (!/^\d{4,8}$/.test(otp)) return response.status(400).json({ message: 'Enter the OTP sent to WhatsApp.' });
    await verifyOtp(staffMobile, otp);
    const shiftEnds = assignments.map((item: any) => item.shift_ends_at ? new Date(item.shift_ends_at).getTime() : 0).filter(Boolean);
    const eightHours = Date.now() + 8 * 60 * 60 * 1000;
    const expiresAt = shiftEnds.length ? Math.min(eightHours, Math.max(...shiftEnds)) : eightHours;
    const token = createCampStationSession({
      campId, stationType, mobile: staffMobile, staffName: assignments[0].staff_name,
      stationIds: assignments.map((item: any) => item.station_id),
      cohortIds: assignments.map((item: any) => item.cohort_id), expiresAt,
    });
    return response.status(200).json({ token, expiresAt, staffName: assignments[0].staff_name, cohorts: assignments.map((item: any) => ({ id: item.cohort_id, name: item.cohort_name })) });
  } catch (error) {
    return response.status(500).json({ message: error instanceof Error ? error.message : 'Unable to authenticate camp staff.' });
  }
}
