import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';
import { bearerToken, verifyCampStationSession } from './_lib/camp-station-session.js';

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
}

function clean(value: unknown, max = 160) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function mobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

async function sendCampOtp(participantMobile: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_CAMP_OTP_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) throw new Error('Camp OTP service is not configured.');
  const query = new URLSearchParams({ template_id: templateId, mobile: `91${participantMobile}`, otp_expiry: '5' });
  const sent = await fetch(`https://control.msg91.com/api/v5/otp?${query.toString()}`, { method: 'POST', headers: { authkey: authKey, Accept: 'application/json' } });
  const sentBody = await sent.json().catch(() => null);
  if (!sent.ok || sentBody?.type === 'error') throw new Error(sentBody?.message || 'Unable to send OTP.');
  const retryQuery = new URLSearchParams({ mobile: `91${participantMobile}`, retrytype: 'whatsapp' });
  const retried = await fetch(`https://control.msg91.com/api/v5/otp/retry?${retryQuery.toString()}`, { headers: { authkey: authKey, Accept: 'application/json' } });
  const retryBody = await retried.json().catch(() => null);
  if (!retried.ok || retryBody?.type === 'error') throw new Error(retryBody?.message || 'Unable to send WhatsApp OTP.');
}

async function verifyCampOtp(participantMobile: string, otp: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) throw new Error('Camp OTP service is not configured.');
  const query = new URLSearchParams({ mobile: `91${participantMobile}`, otp });
  const verified = await fetch(`https://control.msg91.com/api/v5/otp/verify?${query.toString()}`, { headers: { authkey: authKey, Accept: 'application/json' } });
  const body = await verified.json().catch(() => null);
  if (!verified.ok || body?.type === 'error') throw new Error(body?.message || 'The OTP is incorrect or has expired.');
}

async function ensureSchema(sql: any) {
  await sql`
    create table if not exists corporate_camp_visits (
      id text primary key,
      camp_id text not null references educational_camps(id) on delete cascade,
      cohort_id text not null references educational_camp_cohorts(id) on delete cascade,
      participant_type text not null default 'student',
      participant_name text not null,
      mobile text not null,
      guardian_name text,
      external_id text,
      age text,
      gender text,
      registration_sequence integer not null,
      token_number text not null,
      session_token text not null unique,
      journey_status text not null default 'registered',
      vitals_status text not null default 'pending',
      assessment_status text not null default 'pending',
      consultation_status text not null default 'pending',
      checked_in_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(camp_id, registration_sequence)
    )
  `;
  await sql`create index if not exists corporate_camp_visits_camp_idx on corporate_camp_visits(camp_id, cohort_id, registration_sequence)`;
  await sql`create index if not exists corporate_camp_visits_mobile_idx on corporate_camp_visits(mobile)`;
  await sql`
    create table if not exists corporate_camp_counters (
      camp_id text primary key references educational_camps(id) on delete cascade,
      next_registration_sequence integer not null default 1
    )
  `;
  await sql`
    create table if not exists corporate_camp_vitals (
      visit_id text primary key references corporate_camp_visits(id) on delete cascade,
      height_cm numeric(6,2), weight_kg numeric(6,2), bmi numeric(5,2), temperature_c numeric(4,1),
      pulse_bpm integer, spo2_percent integer, systolic integer, diastolic integer, respiratory_rate integer,
      observations text, escalation_required boolean not null default false,
      recorded_by text, recorded_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists corporate_camp_consultation_queue (
      id text primary key,
      visit_id text not null references corporate_camp_visits(id) on delete cascade,
      specialty text not null,
      room text,
      status text not null default 'waiting',
      priority integer not null default 0,
      queue_position integer not null,
      called_at timestamptz,
      started_at timestamptz,
      completed_at timestamptz,
      updated_at timestamptz not null default now(),
      unique(visit_id, specialty)
    )
  `;
  await sql`create index if not exists corporate_camp_queue_idx on corporate_camp_consultation_queue(specialty, status, priority desc, queue_position)`;
  await sql`
    create table if not exists corporate_camp_notifications (
      id text primary key,
      visit_id text not null references corporate_camp_visits(id) on delete cascade,
      event text not null,
      message text not null,
      channel text not null default 'in_app',
      delivery_status text not null default 'queued',
      created_at timestamptz not null default now()
    )
  `;
}

async function notify(sql: any, visitId: string, event: string, message: string) {
  await sql`
    insert into corporate_camp_notifications (id, visit_id, event, message, channel, delivery_status)
    values (${`notification_${randomUUID()}`}, ${visitId}, ${event}, ${message}, 'in_app_whatsapp', 'queued')
  `;
}

async function dashboard(sql: any, campId: string) {
  const camps = await sql`
    select c.*, i.name as organization_name, i.organization_type
    from educational_camps c join educational_institutions i on i.id = c.institution_id
    where c.id = ${campId} limit 1
  `;
  const cohorts = await sql`select * from educational_camp_cohorts where camp_id = ${campId} order by sort_order, name`;
  const visits = await sql`
    select v.*, c.name as cohort_name, vt.height_cm, vt.weight_kg, vt.bmi, vt.temperature_c,
      vt.pulse_bpm, vt.spo2_percent, vt.systolic, vt.diastolic, vt.respiratory_rate,
      vt.observations, vt.escalation_required, vt.recorded_at
    from corporate_camp_visits v
    join educational_camp_cohorts c on c.id = v.cohort_id
    left join corporate_camp_vitals vt on vt.visit_id = v.id
    where v.camp_id = ${campId}
    order by v.registration_sequence
  `;
  const queues = await sql`
    select q.*, v.participant_name, v.token_number, v.mobile, v.registration_sequence, v.cohort_id
    from corporate_camp_consultation_queue q join corporate_camp_visits v on v.id = q.visit_id
    where v.camp_id = ${campId}
    order by q.specialty, q.priority desc, q.queue_position
  `;
  return { camp: camps[0] || null, cohorts, visits, queues };
}

export default async function handler(request: any, response: any) {
  const url = databaseUrl();
  if (!url) return response.status(503).json({ message: 'Camp database is not configured.' });
  try {
    const sql = neon(url);
    await ensureSchema(sql);

    if (request.method === 'GET') {
      const sessionToken = clean(request.query?.session, 100);
      if (sessionToken) {
        const visits = await sql`
          select v.*, c.name as cohort_name, cp.name as camp_name, i.name as organization_name,
            vt.height_cm, vt.weight_kg, vt.bmi, vt.temperature_c, vt.pulse_bpm, vt.spo2_percent,
            vt.systolic, vt.diastolic, vt.escalation_required
          from corporate_camp_visits v
          join educational_camp_cohorts c on c.id = v.cohort_id
          join educational_camps cp on cp.id = v.camp_id
          join educational_institutions i on i.id = cp.institution_id
          left join corporate_camp_vitals vt on vt.visit_id = v.id
          where v.session_token = ${sessionToken} limit 1
        `;
        if (!visits[0]) return response.status(404).json({ message: 'Camp session not found.' });
        const queues = await sql`select * from corporate_camp_consultation_queue where visit_id = ${visits[0].id} order by queue_position`;
        const notifications = await sql`select * from corporate_camp_notifications where visit_id = ${visits[0].id} order by created_at desc limit 20`;
        response.setHeader('Cache-Control', 'no-store');
        return response.status(200).json({ visit: visits[0], queues, notifications });
      }
      const campId = clean(request.query?.campId, 100);
      if (!campId) return response.status(400).json({ message: 'Camp ID is required.' });
      const stationType = clean(request.query?.station, 30);
      const stationSession = stationType ? verifyCampStationSession(bearerToken(request)) : null;
      if (stationType && (!stationSession || stationSession.campId !== campId || stationSession.stationType !== stationType)) {
        return response.status(401).json({ message: 'Your station session has expired. Verify your assigned mobile again.' });
      }
      response.setHeader('Cache-Control', 'no-store');
      const result = await dashboard(sql, campId);
      if (stationSession) {
        const allowed = new Set(stationSession.cohortIds);
        result.cohorts = result.cohorts.filter((cohort: any) => allowed.has(cohort.id));
        result.visits = result.visits.filter((visit: any) => allowed.has(visit.cohort_id));
        result.queues = result.queues.filter((queue: any) => allowed.has(queue.cohort_id));
        return response.status(200).json({ ...result, stationSession: { staffName: stationSession.staffName, expiresAt: stationSession.expiresAt } });
      }
      return response.status(200).json(result);
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      return response.status(405).json({ message: 'Method not allowed.' });
    }

    const action = clean(request.body?.action, 40);
    const stationType = clean(request.body?.station, 30);
    const stationSession = stationType ? verifyCampStationSession(bearerToken(request)) : null;
    if (stationType && (!stationSession || stationSession.stationType !== stationType)) {
      return response.status(401).json({ message: 'Your station session has expired. Verify your assigned mobile again.' });
    }
    const actionStation: Record<string, string> = {
      register: 'registration', 'record-vitals': 'nursing',
      'assessment-complete-cohort': 'hall', 'assessment-complete': 'hall', 'queue-update': 'queue',
    };
    if (stationSession && actionStation[action] !== stationType) {
      return response.status(403).json({ message: 'This action is not available at your assigned station.' });
    }
    if (action === 'send-join-otp' || action === 'verify-join-otp') {
      const campId = clean(request.body?.campId, 100);
      const cohortId = clean(request.body?.cohortId, 100);
      const participantMobile = mobile(request.body?.mobile);
      if (!campId || !cohortId || !/^[6-9]\d{9}$/.test(participantMobile)) {
        return response.status(400).json({ message: 'Enter the mobile number used at registration.' });
      }
      const visits = await sql`
        select * from corporate_camp_visits
        where camp_id = ${campId} and cohort_id = ${cohortId} and mobile = ${participantMobile}
        order by registration_sequence desc limit 1
      `;
      const visit = visits[0];
      if (!visit) return response.status(404).json({ message: 'No registration was found for this mobile in the selected cohort.' });
      if (visit.vitals_status !== 'completed') return response.status(403).json({ message: 'Please complete the Nursing Station vital checks before joining Hall 1.' });
      if (visit.journey_status === 'clinical_review') return response.status(403).json({ message: 'Please complete the requested clinical review before joining Hall 1.' });
      if (action === 'send-join-otp') {
        await sendCampOtp(participantMobile);
        return response.status(200).json({ success: true, message: 'WhatsApp OTP sent.' });
      }
      const otp = String(request.body?.otp || '').replace(/\D/g, '');
      if (!/^\d{4,8}$/.test(otp)) return response.status(400).json({ message: 'Enter the OTP sent to WhatsApp.' });
      await verifyCampOtp(participantMobile, otp);
      await sql`update corporate_camp_visits set journey_status = 'assessment_waiting', updated_at = now() where id = ${visit.id}`;
      await notify(sql, visit.id, 'hall_1_joined', 'Mobile verified. You have joined the Hall 1 assessment. Please wait for the presenter to begin.');
      return response.status(200).json({
        success: true,
        visit: {
          id: visit.id, participantName: visit.participant_name, guardianName: visit.guardian_name,
          mobile: visit.mobile, age: visit.age, externalId: visit.external_id,
          tokenNumber: visit.token_number, sessionToken: visit.session_token,
        },
      });
    }

    if (action === 'register') {
      const campId = clean(request.body?.campId, 100);
      const cohortId = clean(request.body?.cohortId, 100);
      const participantName = clean(request.body?.participantName, 120);
      const participantMobile = mobile(request.body?.mobile);
      if (!campId || !cohortId || participantName.length < 2 || !/^\d{10}$/.test(participantMobile)) {
        return response.status(400).json({ message: 'Camp, cohort, participant name and mobile are required.' });
      }
      if (stationSession && (stationSession.campId !== campId || !stationSession.cohortIds.includes(cohortId))) {
        return response.status(403).json({ message: 'You are not assigned to this cohort.' });
      }
      await sql`
        insert into corporate_camp_counters (camp_id, next_registration_sequence)
        values (${campId}, (select coalesce(max(registration_sequence), 0) + 1 from corporate_camp_visits where camp_id = ${campId}))
        on conflict (camp_id) do nothing
      `;
      const sequenceRows = await sql`
        update corporate_camp_counters
        set next_registration_sequence = next_registration_sequence + 1
        where camp_id = ${campId}
        returning next_registration_sequence - 1 as sequence
      `;
      const sequence = Number(sequenceRows[0]?.sequence || 1);
      const visitId = `visit_${randomUUID()}`;
      const sessionToken = randomUUID().replace(/-/g, '');
      const tokenNumber = `C-${String(sequence).padStart(3, '0')}`;
      const rows = await sql`
        insert into corporate_camp_visits (
          id, camp_id, cohort_id, participant_type, participant_name, mobile, guardian_name,
          external_id, age, gender, registration_sequence, token_number, session_token
        ) values (
          ${visitId}, ${campId}, ${cohortId}, ${clean(request.body?.participantType, 20) || 'student'},
          ${participantName}, ${participantMobile}, ${clean(request.body?.guardianName, 120)},
          ${clean(request.body?.externalId, 80)}, ${clean(request.body?.age, 20)}, ${clean(request.body?.gender, 10)},
          ${sequence}, ${tokenNumber}, ${sessionToken}
        ) returning *
      `;
      await sql`update educational_camps set registered_students = (select count(*) from corporate_camp_visits where camp_id = ${campId}), updated_at = now() where id = ${campId}`;
      await notify(sql, visitId, 'registration_confirmed', `Registration complete. Token ${tokenNumber}. Please proceed to the Nursing Station.`);
      return response.status(201).json({ visit: rows[0], participantUrl: `/Corporate/journey?session=${sessionToken}` });
    }

    if (action === 'assessment-complete-cohort') {
      const cohortId = clean(request.body?.cohortId, 100);
      const specialties = Array.isArray(request.body?.specialties) && request.body.specialties.length
        ? request.body.specialties.map((item: unknown) => clean(item, 80)).filter(Boolean)
        : ['General Consultation'];
      if (!cohortId) return response.status(400).json({ message: 'Cohort is required.' });
      if (stationSession && !stationSession.cohortIds.includes(cohortId)) return response.status(403).json({ message: 'You are not assigned to this cohort.' });
      const cohortVisits = await sql`
        select id, registration_sequence from corporate_camp_visits
        where cohort_id = ${cohortId} and vitals_status = 'completed'
          and journey_status <> 'clinical_review' and assessment_status <> 'completed'
      `;
      for (const visit of cohortVisits) {
        for (const specialty of specialties) {
          await sql`
            insert into corporate_camp_consultation_queue (id, visit_id, specialty, queue_position)
            values (${`queue_${randomUUID()}`}, ${visit.id}, ${specialty}, ${Number(visit.registration_sequence)})
            on conflict (visit_id, specialty) do nothing
          `;
        }
        await sql`update corporate_camp_visits set assessment_status = 'completed', journey_status = 'consultation_waiting', consultation_status = 'waiting', updated_at = now() where id = ${visit.id}`;
        await notify(sql, visit.id, 'assessment_completed', 'Assessment completed. Please remain in the waiting room while we prepare your consultations.');
      }
      return response.status(200).json({ success: true, updated: cohortVisits.length });
    }

    const visitId = clean(request.body?.visitId, 100);
    if (!visitId) return response.status(400).json({ message: 'Participant visit is required.' });

    if (action === 'record-vitals') {
      if (stationSession) {
        const allowedVisits = await sql`select cohort_id from corporate_camp_visits where id = ${visitId} limit 1`;
        if (!allowedVisits[0] || !stationSession.cohortIds.includes(allowedVisits[0].cohort_id)) return response.status(403).json({ message: 'You are not assigned to this participant cohort.' });
      }
      const numberOrNull = (value: unknown) => value === '' || value == null ? null : Number(value);
      const height = numberOrNull(request.body?.heightCm);
      const weight = numberOrNull(request.body?.weightKg);
      const bmi = height && weight ? Number((weight / ((height / 100) ** 2)).toFixed(1)) : null;
      const escalation = request.body?.escalationRequired === true;
      await sql`
        insert into corporate_camp_vitals (
          visit_id, height_cm, weight_kg, bmi, temperature_c, pulse_bpm, spo2_percent,
          systolic, diastolic, respiratory_rate, observations, escalation_required, recorded_by
        ) values (
          ${visitId}, ${height}, ${weight}, ${bmi}, ${numberOrNull(request.body?.temperatureC)},
          ${numberOrNull(request.body?.pulseBpm)}, ${numberOrNull(request.body?.spo2Percent)},
          ${numberOrNull(request.body?.systolic)}, ${numberOrNull(request.body?.diastolic)},
          ${numberOrNull(request.body?.respiratoryRate)}, ${clean(request.body?.observations, 500)}, ${escalation}, ${clean(request.body?.recordedBy, 100)}
        ) on conflict (visit_id) do update set
          height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, bmi = excluded.bmi,
          temperature_c = excluded.temperature_c, pulse_bpm = excluded.pulse_bpm, spo2_percent = excluded.spo2_percent,
          systolic = excluded.systolic, diastolic = excluded.diastolic, respiratory_rate = excluded.respiratory_rate,
          observations = excluded.observations, escalation_required = excluded.escalation_required,
          recorded_by = excluded.recorded_by, recorded_at = now(), updated_at = now()
      `;
      const nextStatus = escalation ? 'clinical_review' : 'hall_1_waiting';
      await sql`update corporate_camp_visits set vitals_status = 'completed', journey_status = ${nextStatus}, updated_at = now() where id = ${visitId}`;
      await notify(sql, visitId, 'vitals_completed', escalation ? 'Vitals completed. Please wait for clinical review.' : 'Vitals completed. Please proceed to Hall 1 for the assessment.');
      return response.status(200).json({ success: true, journeyStatus: nextStatus });
    }

    if (action === 'assessment-complete') {
      const specialties = Array.isArray(request.body?.specialties) && request.body.specialties.length
        ? request.body.specialties.map((item: unknown) => clean(item, 80)).filter(Boolean)
        : ['General Consultation'];
      const visits = await sql`select registration_sequence from corporate_camp_visits where id = ${visitId} limit 1`;
      const queuePosition = Number(visits[0]?.registration_sequence || 1);
      for (const specialty of specialties) {
        await sql`
          insert into corporate_camp_consultation_queue (id, visit_id, specialty, queue_position)
          values (${`queue_${randomUUID()}`}, ${visitId}, ${specialty}, ${queuePosition})
          on conflict (visit_id, specialty) do nothing
        `;
      }
      await sql`update corporate_camp_visits set assessment_status = 'completed', journey_status = 'consultation_waiting', consultation_status = 'waiting', updated_at = now() where id = ${visitId}`;
      await notify(sql, visitId, 'assessment_completed', 'Assessment completed. Please remain in the waiting room while we prepare your consultations.');
      return response.status(200).json({ success: true });
    }

    if (action === 'queue-update') {
      const queueId = clean(request.body?.queueId, 100);
      const status = clean(request.body?.status, 30);
      if (!queueId || !['waiting', 'called', 'in_progress', 'completed', 'no_show', 'declined', 'not_required'].includes(status)) {
        return response.status(400).json({ message: 'Valid queue and status are required.' });
      }
      if (stationSession) {
        const allowedQueues = await sql`select v.cohort_id from corporate_camp_consultation_queue q join corporate_camp_visits v on v.id = q.visit_id where q.id = ${queueId} limit 1`;
        if (!allowedQueues[0] || !stationSession.cohortIds.includes(allowedQueues[0].cohort_id)) return response.status(403).json({ message: 'You are not assigned to this participant cohort.' });
      }
      const room = clean(request.body?.room, 80);
      const priority = Math.max(0, Math.min(9, Number(request.body?.priority || 0)));
      await sql`
        update corporate_camp_consultation_queue set
          status = ${status}, room = ${room}, priority = ${priority},
          called_at = case when ${status} = 'called' then now() else called_at end,
          started_at = case when ${status} = 'in_progress' then now() else started_at end,
          completed_at = case when ${status} in ('completed', 'declined', 'not_required') then now() else completed_at end,
          updated_at = now()
        where id = ${queueId}
      `;
      const queueRows = await sql`select specialty from corporate_camp_consultation_queue where id = ${queueId} limit 1`;
      const specialty = clean(queueRows[0]?.specialty, 80) || 'consultation';
      if (status === 'called') {
        await sql`update corporate_camp_visits set journey_status = 'called_for_consultation', updated_at = now() where id = ${visitId}`;
        await notify(sql, visitId, 'consultation_called', `Please proceed to ${specialty}${room ? ` at ${room}` : ''}.`);
      } else if (status === 'in_progress') {
        await sql`update corporate_camp_visits set journey_status = 'consultation_in_progress', updated_at = now() where id = ${visitId}`;
      } else if (['completed', 'declined', 'not_required'].includes(status)) {
        const pending = await sql`
          select count(*)::int as count from corporate_camp_consultation_queue
          where visit_id = ${visitId} and status not in ('completed', 'declined', 'not_required')
        `;
        const allDone = Number(pending[0]?.count || 0) === 0;
        await sql`update corporate_camp_visits set journey_status = ${allDone ? 'report_pending' : 'consultation_waiting'}, consultation_status = ${allDone ? 'completed' : 'in_progress'}, updated_at = now() where id = ${visitId}`;
        await notify(sql, visitId, allDone ? 'consultations_completed' : 'consultation_completed', allDone ? 'All consultations are complete. Your Health Passport is being prepared.' : `${specialty} consultation completed. Please return to the waiting room.`);
      }
      return response.status(200).json({ success: true });
    }

    return response.status(400).json({ message: 'Unknown camp operation.' });
  } catch (error) {
    console.error('camp-operations', error);
    return response.status(500).json({ message: 'Unable to update the camp journey.' });
  }
}
