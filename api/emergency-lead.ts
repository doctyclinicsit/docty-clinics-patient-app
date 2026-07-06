import { sendLeadWhatsAppConfirmation } from './_lib/msg91-whatsapp.js';
import { submitZohoClinicLead } from './_lib/zoho-lead.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const lead = request.body;
  const mobile = String(lead?.patient?.mobile || '').replace(/\D/g, '').slice(-10);

  if (!lead?.patient?.name?.trim() || !/^[6-9]\d{9}$/.test(mobile)) {
    return response.status(400).json({ message: 'Patient name and valid contact number are required.' });
  }

  try {
    const crmResponse = await submitZohoClinicLead({
      type: 'emergency',
      patient: {
        name: lead.patient.name,
        mobile,
      },
      interest: 'Emergency callback request',
      serviceCategory: 'Consultation',
      location: lead.location || 'Emergency',
      remarks: [
        'Emergency chatbot lead',
        lead.summary ? `Concern: ${lead.summary}` : '',
        Array.isArray(lead.redFlags) && lead.redFlags.length
          ? `Red flags: ${lead.redFlags.join(', ')}`
          : '',
        'Patient was instructed to call emergency services immediately.',
      ]
        .filter(Boolean)
        .join(' | '),
      source: 'Patient Chatbot Emergency Flow',
      requestedAt: new Date().toISOString(),
    });
    const whatsappResponse = await sendLeadWhatsAppConfirmation(mobile);

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
          : 'The emergency lead service is temporarily unavailable.',
    });
  }
}
