import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

export type ConsultationStatus = 'draft' | 'approved';

export interface MedicationDraft {
  id: string;
  name: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface ConsultationDraft {
  chiefComplaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  investigations: string;
  advice: string;
  followUp: string;
  privateNotes: string;
  medications: MedicationDraft[];
}

const EMPTY_DRAFT: ConsultationDraft = {
  chiefComplaint: '', history: '', examination: '', diagnosis: '', investigations: '',
  advice: '', followUp: '', privateNotes: '', medications: [],
};

let ensured = false;

function client() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) throw new Error('Consultation database is not configured.');
  return neon(url);
}

async function ensure(sql: any) {
  if (ensured) return;
  await sql`
    create table if not exists doctor_consultations (
      id uuid primary key,
      appointment_id text not null unique,
      doctor_id text not null,
      patient_id text not null,
      clinic_id text,
      status text not null default 'draft',
      draft jsonb not null default '{}'::jsonb,
      scribe_session_id text,
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists doctor_consultations_doctor_idx on doctor_consultations (doctor_id, updated_at desc)`;
  ensured = true;
}

function normalizeDraft(value: any): ConsultationDraft {
  const text = (input: unknown) => String(input || '').trim().slice(0, 10000);
  return {
    chiefComplaint: text(value?.chiefComplaint), history: text(value?.history),
    examination: text(value?.examination), diagnosis: text(value?.diagnosis),
    investigations: text(value?.investigations), advice: text(value?.advice),
    followUp: text(value?.followUp), privateNotes: text(value?.privateNotes),
    medications: Array.isArray(value?.medications) ? value.medications.slice(0, 50).map((item: any) => ({
      id: text(item?.id) || randomUUID(), name: text(item?.name), strength: text(item?.strength),
      dose: text(item?.dose), frequency: text(item?.frequency), duration: text(item?.duration),
      instructions: text(item?.instructions),
    })) : [],
  };
}

function map(row: any) {
  return {
    id: row.id, appointmentId: row.appointment_id, doctorId: row.doctor_id,
    patientId: row.patient_id, clinicId: row.clinic_id || '', status: row.status as ConsultationStatus,
    draft: { ...EMPTY_DRAFT, ...(row.draft || {}) }, scribeSessionId: row.scribe_session_id || '',
    approvedAt: row.approved_at || null, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function getConsultation(appointmentId: string, doctorId: string) {
  const sql = client(); await ensure(sql);
  const rows = await sql`select * from doctor_consultations where appointment_id=${appointmentId} and doctor_id=${doctorId} limit 1`;
  return rows[0] ? map(rows[0]) : null;
}

export async function saveConsultation(input: { appointmentId: string; doctorId: string; patientId: string; clinicId?: string; draft: unknown }) {
  const sql = client(); await ensure(sql); const draft = JSON.stringify(normalizeDraft(input.draft));
  const rows = await sql`
    insert into doctor_consultations (id, appointment_id, doctor_id, patient_id, clinic_id, draft)
    values (${randomUUID()}, ${input.appointmentId}, ${input.doctorId}, ${input.patientId}, ${input.clinicId || null}, ${draft}::jsonb)
    on conflict (appointment_id) do update set draft=excluded.draft, updated_at=now()
    where doctor_consultations.doctor_id=excluded.doctor_id and doctor_consultations.status='draft'
    returning *
  `;
  if (!rows[0]) throw new Error('Approved consultations cannot be edited.');
  return map(rows[0]);
}

export async function approveConsultation(appointmentId: string, doctorId: string) {
  const sql = client(); await ensure(sql);
  const rows = await sql`
    update doctor_consultations set status='approved', approved_at=now(), updated_at=now()
    where appointment_id=${appointmentId} and doctor_id=${doctorId} and status='draft' returning *
  `;
  if (!rows[0]) throw new Error('Consultation is missing or already approved.');
  return map(rows[0]);
}
