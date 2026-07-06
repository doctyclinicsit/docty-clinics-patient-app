export const ZOHO_SERVICE_LIST = [
  'Consultation',
  'Pharmacy',
  'Lab Tests',
  'Physiotherapy',
  'Dental',
  'Home Care',
  'Day Care',
] as const;

export type ZohoService = (typeof ZOHO_SERVICE_LIST)[number];

interface RawClinicLead {
  type?: string;
  patient?: {
    name?: string;
    mobile?: string;
  };
  interest?: string;
  serviceCategory?: string;
  location?: string;
  remarks?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  doctor?: {
    name?: string;
    specialty?: string;
  };
  clinic?: {
    name?: string;
  };
  requestedDate?: string;
  consultationMode?: string;
  consultationFee?: number;
  requestedAt?: string;
}

export interface ZohoClinicLead {
  Name: string;
  Contact_Number: string;
  Service: ZohoService;
  Location: string;
  Remarks: string;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function approvedService(value: unknown): ZohoService | undefined {
  const normalized = text(value).toLowerCase();
  return ZOHO_SERVICE_LIST.find(
    (service) => service.toLowerCase() === normalized
  );
}

function inferService(lead: RawClinicLead): ZohoService {
  const explicitService = approvedService(lead.serviceCategory);
  if (explicitService) return explicitService;

  const context = [
    lead.type,
    lead.interest,
    lead.doctor?.specialty,
    lead.source,
  ]
    .map(text)
    .join(' ')
    .toLowerCase();

  if (
    /(appointment|consultation|doctor profile|doctor consultation|request appointment|no slots|no slot|book appointment)/.test(
      context
    )
  ) {
    return 'Consultation';
  }
  if (/(pharmacy|medicine|medication)/.test(context)) return 'Pharmacy';
  if (/(lab|diagnostic|health check|package|blood test)/.test(context)) {
    return 'Lab Tests';
  }
  if (/(physio|rehab|physical therapy)/.test(context)) {
    return 'Physiotherapy';
  }
  if (/(dental|dentist|tooth|teeth|oral)/.test(context)) return 'Dental';
  if (/(home care|homecare|at home)/.test(context)) return 'Home Care';
  if (/(day care|daycare|admission|iv fluid|infusion)/.test(context)) {
    return 'Day Care';
  }

  return 'Consultation';
}

function metadataValue(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = text(metadata?.[key]);
    if (value) return value;
  }
  return '';
}

function metadataNumber(
  metadata: Record<string, unknown> | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function labTestLabels(metadata: Record<string, unknown> | undefined) {
  const tests = metadata?.labTests;
  if (!Array.isArray(tests)) return [];
  return tests
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const record = item as Record<string, unknown>;
      return (
        text(record.shortName) ||
        text(record.fullName) ||
        text(record.labTestSlug)
      );
    })
    .filter(Boolean);
}

function buildRemarks(lead: RawClinicLead) {
  const remarks: string[] = [];
  const doctorName = text(lead.doctor?.name);
  const requestedDate = text(lead.requestedDate);
  const interest = text(lead.interest);
  const source = text(lead.source);
  const mode = text(lead.consultationMode);
  const selectedLabTests = labTestLabels(lead.metadata);
  const addLabTestDetails = (labelPrefix = 'Lab Test') => {
    if (selectedLabTests.length === 0) return;
    remarks.push(`Lab Tests: ${selectedLabTests.join(', ')}`);
    const itemCount = metadataNumber(lead.metadata, 'itemCount') || selectedLabTests.length;
    const totalPrice = metadataNumber(lead.metadata, 'totalPrice');
    const offerTotal = metadataNumber(lead.metadata, 'offerTotal');
    const savings = metadataNumber(lead.metadata, 'savings');
    const pathologyCount = metadataNumber(lead.metadata, 'pathologyCount');
    const radiologyCount = metadataNumber(lead.metadata, 'radiologyCount');
    const discountRules = metadataValue(lead.metadata, 'discountRules');

    remarks.push(`${labelPrefix} Count: ${itemCount}`);
    if (pathologyCount > 0) remarks.push(`Pathology Tests: ${pathologyCount}`);
    if (radiologyCount > 0) remarks.push(`Radiology Tests: ${radiologyCount}`);
    if (discountRules) remarks.push(`Discount Rule: ${discountRules}`);
    if (totalPrice > 0) remarks.push(`With Others You Pay: INR ${totalPrice}`);
    if (offerTotal > 0 && offerTotal !== totalPrice) {
      remarks.push(`With Docty.Quick Labs: INR ${offerTotal}`);
    }
    if (savings > 0) remarks.push(`Potential Savings: INR ${savings}`);
  };

  if (doctorName) remarks.push(`Doctor Name: ${doctorName}`);
  if (requestedDate) remarks.push(`Requested Date: ${requestedDate}`);

  if (lead.type === 'health-package' && interest) {
    remarks.push(`Package Name: ${interest}`);
    addLabTestDetails('Package Test');
  } else if (
    (lead.type === 'subscription' ||
      lead.type === 'subscription-interest') &&
    interest
  ) {
    remarks.push(`Plan/Enquiry: ${interest}`);
  } else if (selectedLabTests.length > 0) {
    addLabTestDetails();
  } else if (interest) {
    remarks.push(`Requested Service: ${interest}`);
  }

  if (mode) {
    remarks.push(
      `Consultation Mode: ${mode === 'INCLINIC' ? 'In-clinic' : mode}`
    );
  }
  if (
    typeof lead.consultationFee === 'number' &&
    lead.consultationFee > 0
  ) {
    remarks.push(`Consultation Fee: INR ${lead.consultationFee}`);
  }

  const notes =
    text(lead.remarks) || metadataValue(lead.metadata, 'remarks', 'notes');
  if (notes) remarks.push(`Additional Notes: ${notes}`);
  if (source) remarks.push(`Lead Source: ${source}`);
  if (lead.requestedAt) remarks.push(`Requested At: ${lead.requestedAt}`);

  return remarks.join(' | ') || 'Clinic enquiry received from website.';
}

export function formatZohoClinicLead(rawLead: unknown): ZohoClinicLead {
  const lead = (rawLead || {}) as RawClinicLead;
  const mobile = text(lead.patient?.mobile).replace(/\D/g, '').slice(-10);
  const location =
    text(lead.clinic?.name) ||
    text(lead.location) ||
    metadataValue(
      lead.metadata,
      'location',
      'locationName',
      'clinic',
      'clinicName'
    );

  return {
    Name: text(lead.patient?.name),
    Contact_Number: mobile,
    Service: inferService(lead),
    Location: location || 'Not specified',
    Remarks: buildRemarks(lead),
  };
}

export async function submitZohoClinicLead(rawLead: unknown) {
  const endpoint = process.env.ZOHO_CRM_LEAD_ENDPOINT;

  if (!endpoint) {
    throw new Error('Zoho CRM lead service is not configured.');
  }

  const lead = formatZohoClinicLead(rawLead);
  const zohoResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lead),
  });
  const body = await zohoResponse.json().catch(() => null);

  if (!zohoResponse.ok || body?.status === 'failure' || body?.code === 'error') {
    throw new Error(
      body?.message ||
        body?.details?.message ||
        body?.data?.[0]?.message ||
        'Zoho CRM could not accept the clinic lead.'
    );
  }

  return body;
}
