import { normalizeIndianMobile } from '../../server/eka-staff.js';

const STAFF_OTP_DELIVERY_CHANNEL = 'whatsapp';

async function sendMsg91Otp({
  authKey,
  templateId,
  mobile,
}: {
  authKey: string;
  templateId: string;
  mobile: string;
}) {
  const query = new URLSearchParams({
    template_id: templateId,
    mobile: `91${mobile}`,
    otp_expiry: '5',
  });
  const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp?${query.toString()}`, {
    method: 'POST',
    headers: {
      authkey: authKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const body = await msg91Response.json().catch(() => null);

  return { msg91Response, body };
}

async function retryMsg91OtpOnWhatsApp({ authKey, mobile }: { authKey: string; mobile: string }) {
  const query = new URLSearchParams({
    mobile: `91${mobile}`,
    retrytype: 'whatsapp',
  });
  const msg91Response = await fetch(`https://control.msg91.com/api/v5/otp/retry?${query.toString()}`, {
    method: 'GET',
    headers: {
      authkey: authKey,
      Accept: 'application/json',
    },
  });
  const body = await msg91Response.json().catch(() => null);

  return { msg91Response, body };
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const mobile = normalizeIndianMobile(request.body?.mobile);

  if (!authKey || !templateId) {
    return response.status(500).json({ message: 'OTP service is not configured.' });
  }
  if (!mobile) {
    return response.status(400).json({ message: 'Enter a valid staff mobile number.' });
  }

  try {
    const { msg91Response, body } = await sendMsg91Otp({ authKey, templateId, mobile });
    console.info('MSG91 staff OTP send result', {
      status: msg91Response.status,
      type: body?.type,
      message: body?.message,
      requestId: body?.request_id || body?.requestId,
      mobileLast4: mobile.slice(-4),
    });
    if (!msg91Response.ok || body?.type === 'error') {
      return response.status(502).json({
        message: body?.message || 'Unable to send OTP. Please try again.',
      });
    }

    if (STAFF_OTP_DELIVERY_CHANNEL === 'whatsapp') {
      const { msg91Response: whatsappResponse, body: whatsappBody } = await retryMsg91OtpOnWhatsApp({
        authKey,
        mobile,
      });
      console.info('MSG91 staff OTP WhatsApp retry result', {
        status: whatsappResponse.status,
        type: whatsappBody?.type,
        message: whatsappBody?.message,
        requestId: whatsappBody?.request_id || whatsappBody?.requestId,
        mobileLast4: mobile.slice(-4),
      });
      if (!whatsappResponse.ok || whatsappBody?.type === 'error') {
        return response.status(502).json({
          message: whatsappBody?.message || 'Unable to send WhatsApp OTP. Please try again.',
        });
      }
    }

    return response.status(200).json({
      success: true,
      channel: STAFF_OTP_DELIVERY_CHANNEL,
      message: 'WhatsApp OTP sent successfully.',
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Staff verification is temporarily unavailable.',
    });
  }
}
