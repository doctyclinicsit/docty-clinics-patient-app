import { readAdminStaffSession } from '../../server/staff-admin.js';
import { readFranchiseOwnerSession } from '../../server/franchise-session.js';
import { listEkaDoctors, doctorDisplayName } from '../../server/eka-doctors.js';
import { resolveAppointmentPaymentAmount } from '../../server/eka-appointment-payments.js';
import { zohoCrmFetch } from '../../server/zoho-crm.js';

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

const COMPLETED_STATUSES = ['CM', 'CMNP'];
const DOCTOR_NON_COMPLETION_STATUSES = ['CNS'];
const CANCELLED_STATUSES = ['CN', 'CND', 'CNS', 'AB', 'NS'];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function displayText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(', ');
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    return text(object.name) || text(object.display_value) || text(object.value) || text(object.label) || text(object.title) || text(object.id);
  }
  return '';
}

function optionalNumberValue(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: unknown) {
  const date = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function daysBetween(startDate: string, endDate: string) {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function splitDateRange(startDate: string, endDate: string) {
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 7)) {
    const chunkEnd = addDays(cursor, 6);
    chunks.push({ startDate: cursor, endDate: chunkEnd > endDate ? endDate : chunkEnd });
  }
  return chunks;
}

function configuredList(name: string, fallback: string[]) {
  const configured = text(process.env[name]);
  return configured ? configured.split(',').map((item) => item.trim()).filter(Boolean) : fallback;
}

function firstText(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = displayText(record[field]);
    if (value) return value;
  }
  return '';
}

function normalizeSpecialty(value: unknown) {
  const raw = displayText(value);
  const key = normalizedKey(raw);
  if (!key) return '';
  if (/physio|physiotherapy|physical therapy|rehab/.test(key)) return 'Physiotherapy';
  if (/dental|dentist|orthodont|endodont|tooth|teeth|oral|root canal|scaling|implant/.test(key)) return 'Dental';
  return raw;
}

function resolveSpecialty(doctor: Record<string, unknown>, appointment: Record<string, any>) {
  const doctorName = normalizedKey([displayText(doctor.firstname), displayText(doctor.lastname)].filter(Boolean).join(' '));
  const doctorSpecialty = normalizeSpecialty(
    firstText(doctor, [
      'specialisation',
      'specialisations',
      'specialization',
      'specializations',
      'speciality',
      'specialities',
      'specialty',
      'specialties',
      'department',
      'category',
      'qualification',
    ]) ||
      firstText((doctor.profile || {}) as Record<string, unknown>, ['specialisation', 'specialization', 'speciality', 'specialty', 'department', 'category']) ||
      firstText((doctor.professional || {}) as Record<string, unknown>, ['specialisation', 'specialization', 'speciality', 'specialty', 'department', 'category'])
  );
  const serviceSpecialty = normalizeSpecialty(
    [
      displayText(appointment.service?.service_name),
      displayText(appointment.service?.name),
      displayText(appointment.service?.category),
      displayText(appointment.service?.speciality),
      displayText(appointment.service?.specialty),
      displayText(appointment.mode),
    ].filter(Boolean).join(' ')
  );
  if (doctorSpecialty && normalizedKey(doctorSpecialty) !== 'general') return doctorSpecialty;
  if (doctorName === 'mahima sharon m') return 'Physiotherapy';
  if (doctorName === 'asim ali mohd') return 'Dental';
  return serviceSpecialty || doctorSpecialty || 'General';
}

function firstNumber(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = optionalNumberValue(record[field]);
    if (value !== undefined) return value;
  }
  return 0;
}

function fuzzyField(record: Record<string, unknown>, patterns: RegExp[]) {
  const entry = Object.entries(record).find(([key, value]) => {
    if (value === null || value === undefined) return false;
    return patterns.some((pattern) => pattern.test(key));
  });
  return entry ? displayText(entry[1]) : '';
}

function dateKeyFromEpoch(epochSeconds: unknown) {
  const epoch = Number(epochSeconds || 0);
  if (!epoch) return '';
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}

function dateKeyFromZoho(value: unknown) {
  const raw = text(value);
  if (!raw) return '';
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? raw.slice(0, 10) : new Date(parsed).toISOString().slice(0, 10);
}

function monthKey(value: string) {
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : 'Unknown';
}

function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${value}-01T00:00:00Z`)
  );
}

function startOfWeek(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  return current.toISOString().slice(0, 10);
}

function bucketLabel(value: string, bucket: string) {
  if (bucket === 'monthly') return monthLabel(value);
  if (bucket === 'weekly') {
    const end = addDays(value, 6);
    return `${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00Z`))} - ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${end}T00:00:00Z`))}`;
  }
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00Z`));
}

function chartBucketKey(date: string, bucket: string) {
  if (bucket === 'monthly') return monthKey(date);
  if (bucket === 'weekly') return startOfWeek(date);
  return date;
}

function safeId(value: unknown, fallback: string) {
  return text(value) || fallback;
}

function normalizedKey(value: unknown) {
  return text(value).toLowerCase();
}

function normalizedClinicKey(value: unknown) {
  return normalizedKey(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function doctorMatchesClinic(
  doctor: { clinics?: Array<{ id?: string; name?: string }> },
  allowedClinicIds: Set<string>,
  allowedClinicNames: Set<string>,
  selectedClinicId = '',
  selectedClinicName = ''
) {
  const clinics = doctor.clinics || [];
  if (!clinics.length) return false;
  return clinics.some((clinic) => {
    const clinicId = normalizedKey(clinic.id);
    const clinicName = normalizedKey(clinic.name);
    const isAssigned =
      (clinicId && allowedClinicIds.has(clinicId)) ||
      (clinicName && allowedClinicNames.has(clinicName));
    if (!isAssigned) return false;
    return selectedClinicId
      ? clinicId === normalizedKey(selectedClinicId) || clinicName === selectedClinicName
      : true;
  });
}

async function listAppointmentsForDoctor(doctorId: string, startDate: string, endDate: string, ekaToken: string) {
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
        throw new Error(body?.message || body?.error || 'Unable to retrieve appointments from Eka.');
      }
      const pageItems = Array.isArray(body?.appointments) ? body.appointments : [];
      appointments.push(...pageItems);
      if (pageItems.length < 50) break;
    }
  }
  return appointments;
}

async function listEkaClinics(ekaToken: string) {
  const entitiesResponse = await fetch('https://api.eka.care/dr/v1/business/entities', {
    headers: { auth: ekaToken, Accept: 'application/json' },
  });
  const entitiesBody = await entitiesResponse.json().catch(() => null);
  const entities = entitiesBody?.data || entitiesBody || {};
  return new Map((entities.clinics || []).map((clinic: any) => [clinic.clinic_id, clinic.name]));
}

async function resolveZohoReceiptFields(moduleName: string, configuredFields: string[]) {
  if (configuredFields.length) return configuredFields;

  try {
    const body = await zohoCrmFetch(`/crm/v7/settings/fields?module=${encodeURIComponent(moduleName)}`);
    const fieldNames = Array.isArray(body?.fields)
      ? body.fields
          .map((field: any) => text(field.api_name))
          .filter(Boolean)
      : [];
    const preferred = fieldNames.filter((field: string) =>
      /^(id|Name|Created_Time)$/i.test(field) ||
      /receipt|patient|doctor|clinic|location|branch|centre|center|appointment|amount|paid|total|net|status|date|payment|bill|invoice/i.test(field)
    );
    return Array.from(new Set(['id', ...preferred, 'Name', 'Created_Time'].filter((field) => fieldNames.includes(field))))
      .slice(0, 50);
  } catch {
    return ['id', 'Name', 'Created_Time'];
  }
}

async function listZohoReceipts(startDate: string, endDate: string) {
  const moduleName = text(process.env.ZOHO_CRM_RECEIPTS_MODULE) || 'Receipts';
  const fields = await resolveZohoReceiptFields(moduleName, configuredList('ZOHO_CRM_RECEIPT_FIELDS', [
    'id',
    'Name',
    'Eka_Receipt_ID',
    'Receipt_Status',
    'Receipt_Amount',
    'Amount_Due',
    'Net_Amount',
    'Amount_Paid',
    'Receipt_Number',
    'Business_Receipt_Number',
    'Receipt_Created_At',
    'Receipt_Updated_At',
    'Patient_Name',
    'Mobile',
    'Patient',
    'Clinic',
    'Doctor',
    'Appointment',
    'Transaction_ID',
    'Payment_ID',
    'Ref_Trx_ID',
    'Receipt_URL',
    'Created_Time',
    'Modified_Time',
  ]));
  const amountFields = configuredList('ZOHO_CRM_RECEIPT_AMOUNT_FIELDS', [
    'Net_Amount',
    'Receipt_Amount',
    'Amount_Paid',
    'Paid_Amount',
    'Amount',
    'Total_Amount',
  ]);
  const dateFields = configuredList('ZOHO_CRM_RECEIPT_DATE_FIELDS', [
    'Receipt_Created_At',
    'Receipt_Updated_At',
    'Receipt_Date',
    'Payment_Date',
    'Created_Time',
  ]);
  const clinicFields = configuredList('ZOHO_CRM_RECEIPT_CLINIC_FIELDS', ['Clinic', 'Location']);
  const patientFields = configuredList('ZOHO_CRM_RECEIPT_PATIENT_FIELDS', ['Patient_Name', 'Patient']);
  const doctorFields = configuredList('ZOHO_CRM_RECEIPT_DOCTOR_FIELDS', ['Doctor_Name', 'Doctor']);
  const appointmentFields = configuredList('ZOHO_CRM_RECEIPT_APPOINTMENT_FIELDS', ['Appointment_ID', 'Appointment_Id']);

  const receipts: Array<Record<string, unknown>> = [];
  for (let page = 1; page <= 5; page += 1) {
    const query = new URLSearchParams({
      page: String(page),
      per_page: '100',
    });
    query.set('fields', fields.join(','));
    const body = await zohoCrmFetch(`/crm/v7/${encodeURIComponent(moduleName)}?${query.toString()}`);
    const records = Array.isArray(body?.data) ? body.data : [];
    receipts.push(...records);
    if (!body?.info?.more_records || records.length < 100) break;
  }

  return receipts
    .map((record) => {
      const receiptDate = dateKeyFromZoho(
        firstText(record, dateFields) ||
          fuzzyField(record, [/receipt.*date/i, /payment.*date/i, /paid.*date/i, /created.*time/i, /date/i])
      );
      return {
        id: safeId(record.id, safeId(record.Name, `receipt-${receipts.indexOf(record)}`)),
        receiptNumber:
          firstText(record, ['Eka_Receipt_ID', 'Receipt_Number', 'Receipt_No', 'Business_Receipt_Number', 'Bill_Number', 'Invoice_Number', 'Name']) ||
          fuzzyField(record, [/receipt.*(number|no)/i, /bill.*(number|no)/i, /invoice.*(number|no)/i]) ||
          safeId(record.id, 'Receipt'),
        patientName: firstText(record, patientFields) || fuzzyField(record, [/patient/i]) || 'Patient not tagged',
        doctorName: firstText(record, doctorFields) || fuzzyField(record, [/doctor|physician|consultant/i]) || 'Doctor not tagged',
        clinic: firstText(record, clinicFields) || fuzzyField(record, [/clinic|location|branch|centre|center/i]) || 'Clinic not tagged',
        appointmentId: firstText(record, [...appointmentFields, 'Appointment']) || fuzzyField(record, [/appointment/i]),
        date: receiptDate,
        status: firstText(record, ['Receipt_Status', 'Payment_Status', 'Status']) || fuzzyField(record, [/status/i]) || 'Paid',
        amount: firstNumber(record, amountFields),
      };
    })
    .filter((receipt) => !receipt.date || (receipt.date >= startDate && receipt.date <= endDate));
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  const franchiseSession = readFranchiseOwnerSession(request.headers.cookie);
  if (adminSession.status !== 200 && franchiseSession.status !== 200) {
    return response.status(401).json({ message: 'Please sign in as a Franchise Owner.' });
  }
  const isFranchiseAccess = adminSession.status !== 200 && franchiseSession.status === 200;
  const franchiseOwnerSession = franchiseSession.status === 200 ? franchiseSession.session : undefined;
  const assignedClinics = isFranchiseAccess ? franchiseOwnerSession?.assignedClinics || [] : [];
  if (isFranchiseAccess && !assignedClinics.length) {
    return response.status(403).json({ message: 'No assigned clinic was found for this Franchise Owner.' });
  }

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!ekaToken) return response.status(500).json({ message: 'Eka Care is not configured.' });

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const startDate = parseDate(request.query?.startDate) || addDays(today, -29);
  const endDate = parseDate(request.query?.endDate) || today;
  const chartStartDate = parseDate(request.query?.chartStartDate) || startDate;
  const chartEndDate = parseDate(request.query?.chartEndDate) || endDate;
  const chartBucket = ['daily', 'weekly', 'monthly'].includes(text(request.query?.chartBucket))
    ? text(request.query?.chartBucket)
    : 'daily';
  const fetchStartDate = chartStartDate < startDate ? chartStartDate : startDate;
  const fetchEndDate = chartEndDate > endDate ? chartEndDate : endDate;
  const clinicFilter = text(request.query?.clinicId);
  const days = daysBetween(startDate, endDate);
  const chartDays = daysBetween(chartStartDate, chartEndDate);
  if (days < 0 || days > 366 || chartDays < 0 || chartDays > 366) {
    return response.status(400).json({ message: 'Select a date range up to 366 days.' });
  }

  try {
    const [doctors, clinicNames, receipts] = await Promise.all([
      listEkaDoctors(),
      listEkaClinics(ekaToken),
      listZohoReceipts(fetchStartDate, fetchEndDate).catch((error) => ({
        zohoError: error instanceof Error ? error.message : 'Zoho receipts are temporarily unavailable.',
        receipts: [],
      })),
    ]);

    const rawReceipts = Array.isArray(receipts) ? receipts : receipts.receipts;
    const zohoWarning = Array.isArray(receipts) ? '' : receipts.zohoError;
    const allowedClinicIds = new Set(assignedClinics.map((clinic) => normalizedKey(clinic.id)).filter(Boolean));
    const allowedClinicNames = new Set(assignedClinics.map((clinic) => normalizedKey(clinic.name)).filter(Boolean));
    assignedClinics.forEach((clinic) => {
      const nameFromEka = clinicNames.get(clinic.id);
      if (nameFromEka) allowedClinicNames.add(normalizedKey(nameFromEka));
    });
    const selectedAssignedClinic = isFranchiseAccess && clinicFilter && clinicFilter !== 'all'
      ? assignedClinics.find((clinic) => normalizedKey(clinic.id) === normalizedKey(clinicFilter))
      : undefined;
    if (isFranchiseAccess && clinicFilter && clinicFilter !== 'all' && !selectedAssignedClinic) {
      return response.status(403).json({ message: 'This clinic is not assigned to this Franchise Owner.' });
    }
    const selectedAssignedClinicName = selectedAssignedClinic
      ? normalizedKey(clinicNames.get(selectedAssignedClinic.id) || selectedAssignedClinic.name)
      : '';
    const doctorsForAppointments = isFranchiseAccess
      ? doctors.filter((doctor) =>
          doctor.id &&
          doctorMatchesClinic(
            doctor,
            allowedClinicIds,
            allowedClinicNames,
            selectedAssignedClinic?.id || '',
            selectedAssignedClinicName
          )
        )
      : doctors.filter((doctor) => doctor.id);
    const appointmentResults = await Promise.allSettled(
      doctorsForAppointments.map(async (doctor) => ({
        doctor,
        appointments: await listAppointmentsForDoctor(doctor.id, fetchStartDate, fetchEndDate, ekaToken),
      }))
    );
    const appointments = appointmentResults.flatMap((result) =>
      result.status === 'fulfilled'
        ? result.value.appointments.map((appointment) => ({ ...appointment, doctor: result.value.doctor }))
        : []
    );
    const appointmentFailures = appointmentResults.filter((result) => result.status === 'rejected').length;
    const uniqueAppointments = Array.from(
      new Map(appointments.map((appointment) => [appointment.appointment_id, appointment])).values()
    );

    const normalizedAppointments = await Promise.all(
      uniqueAppointments.map(async (appointment) => {
        const payment = await resolveAppointmentPaymentAmount(appointment, ekaToken);
        const doctor = appointment.doctor;
        return {
          id: safeId(appointment.appointment_id, ''),
          patientId: text(appointment.patient_id),
          doctorId: safeId(appointment.doctor_id, doctor.id),
          doctorName: doctorDisplayName(doctor),
          specialisation: resolveSpecialty(doctor as Record<string, unknown>, appointment),
          clinicId: text(appointment.clinic_id),
          clinic: text(clinicNames.get(appointment.clinic_id)) || 'Docty Clinic',
          date: dateKeyFromEpoch(appointment.start_time),
          startTime: Number(appointment.start_time || 0),
          status: text(appointment.status),
          statusLabel: STATUS_LABELS[text(appointment.status)] || text(appointment.status) || 'Unknown',
          serviceName: text(appointment.service?.service_name) || text(appointment.mode) || 'Consultation',
          paymentAmount: payment.amount,
          paymentSource: payment.source,
        };
      })
    );
    const filteredAppointments = normalizedAppointments.filter((appointment) => {
      if (isFranchiseAccess) {
        const isAssigned =
          allowedClinicIds.has(normalizedKey(appointment.clinicId)) ||
          allowedClinicNames.has(normalizedKey(appointment.clinic));
        if (!isAssigned) return false;
        return selectedAssignedClinic
          ? normalizedKey(appointment.clinicId) === normalizedKey(selectedAssignedClinic.id) ||
              normalizedKey(appointment.clinic) === selectedAssignedClinicName
          : true;
      }
      return clinicFilter && clinicFilter !== 'all' ? appointment.clinicId === clinicFilter : true;
    });
    const filteredReceipts = rawReceipts.filter((receipt) => {
      if (isFranchiseAccess) {
        const isAssigned =
          allowedClinicNames.has(normalizedKey(receipt.clinic)) ||
          allowedClinicIds.has(normalizedKey(receipt.clinic));
        if (!isAssigned) return false;
        return selectedAssignedClinic
          ? normalizedKey(receipt.clinic) === selectedAssignedClinicName ||
              normalizedKey(receipt.clinic) === normalizedKey(selectedAssignedClinic.id)
          : true;
      }
      return clinicFilter && clinicFilter !== 'all' ? receipt.clinic === (clinicNames.get(clinicFilter) || clinicFilter) : true;
    });
    const selectedAppointments = filteredAppointments.filter((appointment) => appointment.date >= startDate && appointment.date <= endDate);
    const selectedReceipts = filteredReceipts.filter((receipt) => !receipt.date || (receipt.date >= startDate && receipt.date <= endDate));
    const chartAppointments = filteredAppointments.filter((appointment) => appointment.date >= chartStartDate && appointment.date <= chartEndDate);
    const chartReceipts = filteredReceipts.filter((receipt) => receipt.date >= chartStartDate && receipt.date <= chartEndDate);
    const firstSeenByPatient = new Map<string, string>();
    filteredAppointments.forEach((appointment) => {
      if (!appointment.patientId || !appointment.date) return;
      const previous = firstSeenByPatient.get(appointment.patientId);
      if (!previous || appointment.date < previous) firstSeenByPatient.set(appointment.patientId, appointment.date);
    });

    const clinicAliases = new Map<string, { id: string; key: string; name: string }>();
    const rememberClinicAlias = (id: unknown, name: unknown) => {
      const clinicId = text(id);
      const clinicName = text(name);
      const displayName = clinicName || clinicId || 'Clinic not tagged';
      const key = normalizedClinicKey(displayName) || normalizedClinicKey(clinicId) || displayName;
      const identity = { id: clinicId || key, key, name: displayName };
      [clinicId, clinicName, key].filter(Boolean).forEach((alias) => {
        clinicAliases.set(normalizedKey(alias), identity);
        clinicAliases.set(normalizedClinicKey(alias), identity);
      });
      return identity;
    };

    clinicNames.forEach((name, id) => rememberClinicAlias(id, name));
    assignedClinics.forEach((clinic) => {
      rememberClinicAlias(clinic.id, clinicNames.get(clinic.id) || clinic.name);
    });

    const clinicIdentity = (id: unknown, name: unknown) => {
      const clinicId = text(id);
      const clinicName = text(name);
      const alias =
        clinicAliases.get(normalizedKey(clinicId)) ||
        clinicAliases.get(normalizedClinicKey(clinicId)) ||
        clinicAliases.get(normalizedKey(clinicName)) ||
        clinicAliases.get(normalizedClinicKey(clinicName));
      if (alias) return alias;
      return rememberClinicAlias(clinicId || clinicName, clinicName || clinicId);
    };

    const clinics = new Map<string, any>();
    const doctorsSummary = new Map<string, any>();
    const specialtiesSummary = new Map<string, any>();
    const monthly = new Map<string, any>();
    const trend = new Map<string, any>();
    const patients = new Set<string>();
    const newPatients = new Set<string>();
    const repeatPatients = new Set<string>();
    const seenPatientsInPeriod = new Set<string>();
    let repeatVisits = 0;

    for (let cursor = chartStartDate; cursor <= chartEndDate; cursor = addDays(cursor, 1)) {
      trend.set(cursor, { date: cursor, appointments: 0, completed: 0, patients: 0, ekaRevenue: 0, zohoReceipts: 0 });
      const key = chartBucketKey(cursor, chartBucket);
      if (!monthly.has(key)) {
        monthly.set(key, { month: key, label: bucketLabel(key, chartBucket), appointments: 0, completed: 0, patients: new Set<string>(), zohoReceipts: 0 });
      }
    }

    selectedAppointments
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime - b.startTime)
      .forEach((appointment) => {
      if (appointment.patientId) {
        patients.add(appointment.patientId);
        const firstSeen = firstSeenByPatient.get(appointment.patientId);
        if (firstSeen && firstSeen < startDate) repeatPatients.add(appointment.patientId);
        else newPatients.add(appointment.patientId);
        if ((firstSeen && firstSeen < startDate) || seenPatientsInPeriod.has(appointment.patientId)) {
          repeatVisits += 1;
        }
        seenPatientsInPeriod.add(appointment.patientId);
      }
      const identity = clinicIdentity(appointment.clinicId, appointment.clinic);
      const clinic = clinics.get(identity.key) || {
        id: identity.id,
        name: identity.name,
        appointments: 0,
        completed: 0,
        cancelled: 0,
        patients: new Set<string>(),
        doctors: new Set<string>(),
        ekaRevenue: 0,
        zohoReceipts: 0,
      };
      clinic.appointments += 1;
      clinic.completed += COMPLETED_STATUSES.includes(appointment.status) ? 1 : 0;
      clinic.cancelled += CANCELLED_STATUSES.includes(appointment.status) ? 1 : 0;
      if (appointment.patientId) clinic.patients.add(appointment.patientId);
      clinic.doctors.add(appointment.doctorId);
      clinic.ekaRevenue += appointment.paymentAmount;
      clinics.set(identity.key, clinic);

      const doctor = doctorsSummary.get(appointment.doctorId) || {
        id: appointment.doctorId,
        name: appointment.doctorName,
        appointments: 0,
        completed: 0,
        nonCompleted: 0,
        patients: new Set<string>(),
        revenue: 0,
      };
      doctor.appointments += 1;
      doctor.completed += COMPLETED_STATUSES.includes(appointment.status) ? 1 : 0;
      doctor.nonCompleted += DOCTOR_NON_COMPLETION_STATUSES.includes(appointment.status) ? 1 : 0;
      if (appointment.patientId) doctor.patients.add(appointment.patientId);
      doctor.revenue += appointment.paymentAmount;
      doctorsSummary.set(appointment.doctorId, doctor);

      const specialtyKey = normalizedKey(appointment.specialisation) || 'general';
      const specialty = specialtiesSummary.get(specialtyKey) || {
        id: specialtyKey,
        name: appointment.specialisation || 'General',
        appointments: 0,
        completed: 0,
        nonCompleted: 0,
        patients: new Set<string>(),
        doctors: new Set<string>(),
      };
      specialty.appointments += 1;
      specialty.completed += COMPLETED_STATUSES.includes(appointment.status) ? 1 : 0;
      specialty.nonCompleted += DOCTOR_NON_COMPLETION_STATUSES.includes(appointment.status) ? 1 : 0;
      if (appointment.patientId) specialty.patients.add(appointment.patientId);
      if (appointment.doctorId) specialty.doctors.add(appointment.doctorId);
      specialtiesSummary.set(specialtyKey, specialty);

    });

    selectedReceipts.forEach((receipt) => {
      const identity = clinicIdentity(receipt.clinic, receipt.clinic);
      const clinic = clinics.get(identity.key) || {
        id: identity.id,
        name: identity.name,
        appointments: 0,
        completed: 0,
        cancelled: 0,
        patients: new Set<string>(),
        doctors: new Set<string>(),
        ekaRevenue: 0,
        zohoReceipts: 0,
      };
      clinic.zohoReceipts += receipt.amount;
      clinics.set(identity.key, clinic);
    });

    chartAppointments.forEach((appointment) => {
      const day = trend.get(appointment.date);
      if (day) {
        day.appointments += 1;
        day.completed += COMPLETED_STATUSES.includes(appointment.status) ? 1 : 0;
        day.ekaRevenue += appointment.paymentAmount;
      }
      const bucket = monthly.get(chartBucketKey(appointment.date, chartBucket));
      if (bucket) {
        bucket.appointments += 1;
        bucket.completed += COMPLETED_STATUSES.includes(appointment.status) ? 1 : 0;
        if (appointment.patientId) bucket.patients.add(appointment.patientId);
      }
    });

    chartReceipts.forEach((receipt) => {
      const day = trend.get(receipt.date);
      if (day) day.zohoReceipts += receipt.amount;
      const bucket = monthly.get(chartBucketKey(receipt.date, chartBucket));
      if (bucket) bucket.zohoReceipts += receipt.amount;
    });

    const clinicRows = Array.from(clinics.values()).map((clinic) => ({
      ...clinic,
      patients: clinic.patients.size,
      doctors: clinic.doctors.size,
      variance: clinic.zohoReceipts - clinic.ekaRevenue,
    }));
    const doctorRows = Array.from(doctorsSummary.values())
      .map((doctor) => ({
        ...doctor,
        patients: doctor.patients.size,
        completionRate: doctor.completed + doctor.nonCompleted
          ? Math.round((doctor.completed / (doctor.completed + doctor.nonCompleted)) * 100)
          : 0,
      }))
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 10);
    const specialtyRows = Array.from(specialtiesSummary.values())
      .map((specialty) => ({
        ...specialty,
        patients: specialty.patients.size,
        doctors: specialty.doctors.size,
        completionRate: specialty.completed + specialty.nonCompleted
          ? Math.round((specialty.completed / (specialty.completed + specialty.nonCompleted)) * 100)
          : 0,
      }))
      .sort((a, b) => b.appointments - a.appointments || a.name.localeCompare(b.name))
      .slice(0, 8);

    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return response.status(200).json({
      startDate,
      endDate,
      warnings: [
        zohoWarning,
        isFranchiseAccess && !doctorsForAppointments.length
          ? 'No EKa doctors are mapped to the selected assigned clinic.'
          : '',
        appointmentFailures > 0 && (!isFranchiseAccess || appointmentFailures === appointmentResults.length)
          ? 'Some doctor appointments could not be loaded from Eka.'
          : '',
      ].filter(Boolean),
      clinics: clinicRows.sort((a, b) => b.appointments - a.appointments || a.name.localeCompare(b.name)),
      doctors: doctorRows,
      specialties: specialtyRows,
      receipts: selectedReceipts.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 25),
      chartBucket,
      monthly: Array.from(monthly.values()).map((month) => ({
        ...month,
        patients: month.patients.size,
        completionRate: month.appointments ? Math.round((month.completed / month.appointments) * 100) : 0,
      })),
      trend: Array.from(trend.values()).map((day) => ({
        ...day,
        patients: chartAppointments.filter((appointment) => appointment.date === day.date && appointment.patientId).length,
      })),
      totals: {
        appointments: selectedAppointments.length,
        completed: selectedAppointments.filter((appointment) => COMPLETED_STATUSES.includes(appointment.status)).length,
        cancelled: selectedAppointments.filter((appointment) => CANCELLED_STATUSES.includes(appointment.status)).length,
        patients: patients.size,
        newPatients: newPatients.size,
        repeatPatients: repeatPatients.size,
        repeatVisits,
        doctors: new Set(selectedAppointments.map((appointment) => appointment.doctorId).filter(Boolean)).size,
        ekaRevenue: selectedAppointments.reduce((sum, appointment) => sum + appointment.paymentAmount, 0),
        zohoReceipts: selectedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0),
      },
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Franchise dashboard data is temporarily unavailable.',
    });
  }
}
