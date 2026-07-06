import { sendLeadWhatsAppConfirmation } from './_lib/msg91-whatsapp.js';
import { submitZohoClinicLead } from './_lib/zoho-lead.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const lead = request.body;
  if (
    !lead?.patient?.name ||
    !/^[6-9]\d{9}$/.test(
      String(lead?.patient?.mobile || '').replace(/\D/g, '').slice(-10)
    ) ||
    !lead?.doctor?.id ||
    !lead?.clinic?.id ||
    !lead?.requestedDate
  ) {
    return response.status(400).json({ message: 'Required appointment request details are missing.' });
  }

  try {
    const crmResponse = await submitZohoClinicLead({
      ...lead,
      type: 'service',
      serviceCategory: 'Consultation',
      interest: lead?.interest || 'Request Appointment',
    });
    const whatsappResponse = await sendLeadWhatsAppConfirmation(
      lead.patient.mobile
    );

    response.setHeader('Cache-Control', 'no-store');
    return response.status(201).json({
      success: true,
      crmResponse,
      whatsappSent: true,
      whatsappResponse,
    });
  } catch (error) {
    return response.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : 'The appointment request service is temporarily unavailable.',
    });
  }
}
