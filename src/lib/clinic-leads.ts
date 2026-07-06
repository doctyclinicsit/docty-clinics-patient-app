export type ClinicLeadType =
  | 'service'
  | 'pharmacy'
  | 'health-package'
  | 'subscription'
  | 'subscription-interest';

export type ClinicLeadService =
  | 'Consultation'
  | 'Pharmacy'
  | 'Lab Tests'
  | 'Physiotherapy'
  | 'Dental'
  | 'Home Care'
  | 'Day Care';

interface ClinicLeadInput {
  type: ClinicLeadType;
  patientName: string;
  patientMobile: string;
  interest: string;
  serviceCategory?: ClinicLeadService;
  location?: string;
  remarks?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export async function submitClinicLead(input: ClinicLeadInput) {
  const response = await fetch('/api/clinic-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: input.type,
      patient: {
        name: input.patientName.trim(),
        mobile: input.patientMobile.replace(/\D/g, '').slice(-10),
      },
      interest: input.interest,
      serviceCategory: input.serviceCategory,
      location: input.location,
      remarks: input.remarks,
      source: input.source,
      metadata: input.metadata,
      requestedAt: new Date().toISOString(),
    }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || 'Unable to submit your request.');
  }

  return body;
}
