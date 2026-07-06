import { readAdminStaffSession } from '../../server/staff-admin.js';

function cleanAmount(value: unknown) {
  const number = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : undefined;
}

function cleanPayout(body: any) {
  const payout = body?.payout || {};
  const fee = cleanAmount(payout.fee);
  const tests = cleanAmount(payout.tests);
  const daycare = cleanAmount(payout.daycare);
  const referral = cleanAmount(payout.referral);
  return {
    fee: fee ?? 0,
    tests: tests ?? 0,
    daycare: daycare ?? 0,
    referral: referral ?? 0,
  };
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) return response.status(adminSession.status).json({ message: adminSession.message });
  if (!ekaToken) return response.status(500).json({ message: 'Doctor payout update is not configured.' });

  const appointmentId = String(request.body?.appointmentId || '');
  const payout = cleanPayout(request.body);
  if (!appointmentId) {
    return response.status(400).json({ message: 'Appointment ID is required.' });
  }

  try {
    const detailsResponse = await fetch(
      `https://api.eka.care/dr/v1/appointment/${encodeURIComponent(appointmentId)}`,
      { headers: { auth: ekaToken, Accept: 'application/json' } }
    );
    const appointment = await detailsResponse.json().catch(() => null);
    if (!detailsResponse.ok) {
      return response.status(detailsResponse.status).json({
        message: appointment?.message || appointment?.error || 'Unable to verify this appointment.',
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
          partner_meta: {
            ...(appointment.partner_meta || {}),
            docty_share_fee: payout.fee,
            docty_share_tests: payout.tests,
            docty_share_daycare: payout.daycare,
            docty_share_referral: payout.referral,
            docty_doctor_share: payout.fee + payout.tests + payout.daycare + payout.referral,
          },
        }),
      }
    );
    const body = await updateResponse.text().catch(() => '');
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message: body || 'Unable to update payout details.',
      });
    }

    return response.status(200).json({
      appointmentId,
      payout,
      doctorShare: payout.fee + payout.tests + payout.daycare + payout.referral,
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Doctor payout update is temporarily unavailable.',
    });
  }
}
