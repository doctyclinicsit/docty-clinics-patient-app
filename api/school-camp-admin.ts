import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function ensureSchema(sql: any) {
  await sql`
    create table if not exists educational_institutions (
      id text primary key,
      name text not null,
      short_name text,
      city text not null,
      contact_name text,
      contact_mobile text,
      logo_url text,
      organization_type text not null default 'school',
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table educational_institutions add column if not exists organization_type text not null default 'school'`;
  await sql`
    create table if not exists educational_camps (
      id text primary key,
      institution_id text not null references educational_institutions(id),
      name text not null,
      campus_name text,
      starts_on date not null,
      ends_on date not null,
      status text not null default 'planning',
      grades text[] not null default '{}',
      expected_students integer not null default 0,
      registered_students integer not null default 0,
      attended_students integer not null default 0,
      passports_generated integer not null default 0,
      report_status text not null default 'not_started',
      camp_category text not null default 'school',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table educational_camps add column if not exists camp_category text not null default 'school'`;
  await sql`create index if not exists educational_camps_institution_idx on educational_camps(institution_id)`;
  await sql`create index if not exists educational_camps_dates_idx on educational_camps(starts_on, ends_on)`;
  await sql`
    create table if not exists educational_camp_cohorts (
      id text primary key,
      camp_id text not null references educational_camps(id) on delete cascade,
      name text not null,
      starts_on date not null,
      ends_on date not null,
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists educational_camp_cohorts_camp_idx on educational_camp_cohorts(camp_id, sort_order)`;
  await sql`
    create table if not exists camp_stations (
      id text primary key,
      camp_id text not null references educational_camps(id) on delete cascade,
      cohort_id text not null references educational_camp_cohorts(id) on delete cascade,
      station_type text not null,
      station_name text not null,
      status text not null default 'ready',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(cohort_id, station_type)
    )
  `;
  await sql`create index if not exists camp_stations_camp_idx on camp_stations(camp_id, cohort_id, station_type)`;
  await sql`
    create table if not exists camp_station_assignments (
      id text primary key,
      station_id text not null references camp_stations(id) on delete cascade,
      staff_name text not null,
      staff_mobile text not null,
      staff_role text,
      shift_starts_at timestamptz,
      shift_ends_at timestamptz,
      status text not null default 'assigned',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(station_id, staff_mobile)
    )
  `;
  await sql`
    create table if not exists camp_expenses (
      id text primary key, camp_id text not null references educational_camps(id) on delete cascade,
      cohort_id text references educational_camp_cohorts(id) on delete set null,
      submitted_by_name text not null, submitted_by_mobile text not null,
      expense_category text not null, description text not null, amount numeric(12,2) not null,
      payment_mode text, receipt_url text, occurred_on date not null, status text not null default 'submitted',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists camp_sales (
      id text primary key, camp_id text not null references educational_camps(id) on delete cascade,
      cohort_id text references educational_camp_cohorts(id) on delete set null,
      submitted_by_name text not null, submitted_by_mobile text not null,
      sale_category text not null, description text not null, quantity integer not null default 1,
      gross_amount numeric(12,2) not null, discount_amount numeric(12,2) not null default 0,
      net_amount numeric(12,2) not null, payment_mode text, reference_number text,
      occurred_on date not null, status text not null default 'recorded',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    )
  `;
  await sql`
    insert into educational_institutions (id, name, short_name, city, logo_url)
    values ('inst_sri_gayathri_manikonda', 'Sri Gayathri Techno School', 'SGTS', 'Manikonda, Hyderabad', '/sri-gayathri-techno-school-logo.png')
    on conflict (id) do nothing
  `;
  await sql`
    insert into educational_camps (
      id, institution_id, name, campus_name, starts_on, ends_on, grades, expected_students
    ) values (
      'camp_sgts_little_champs_2026',
      'inst_sri_gayathri_manikonda',
      'Little Champs Wellness Camp',
      'Manikonda Campus',
      '2026-07-18',
      '2026-08-15',
      array['Pre-Primary', 'Grades 1-2', 'Grades 3-5', 'Grades 6-8', 'Grades 9-10'],
      250
    )
    on conflict (id) do nothing
  `;
  await sql`
    insert into educational_camp_cohorts (id, camp_id, name, starts_on, ends_on, sort_order)
    select
      'cohort_sgts_' || row_number() over (),
      'camp_sgts_little_champs_2026',
      grade,
      '2026-07-18'::date,
      '2026-08-15'::date,
      row_number() over () - 1
    from unnest(array['Pre-Primary', 'Grades 1-2', 'Grades 3-5', 'Grades 6-8', 'Grades 9-10']) as grade
    where not exists (select 1 from educational_camp_cohorts where camp_id = 'camp_sgts_little_champs_2026')
  `;
  await sql`
    insert into camp_stations (id, camp_id, cohort_id, station_type, station_name)
    select 'station_' || md5(c.id || station.station_type), c.camp_id, c.id, station.station_type, station.station_name
    from educational_camp_cohorts c
    cross join (values
      ('registration', 'Registration Desk'), ('nursing', 'Nursing Station'),
      ('hall', 'Hall 1 Assessment'), ('queue', 'Queue Manager'), ('participants', 'Participant Tracking'),
      ('finance', 'Camp Finance')
    ) as station(station_type, station_name)
    on conflict (cohort_id, station_type) do nothing
  `;
}

async function createStationsForCohort(sql: any, campId: string, cohortId: string) {
  const stations = [
    ['registration', 'Registration Desk'], ['nursing', 'Nursing Station'],
    ['hall', 'Hall 1 Assessment'], ['queue', 'Queue Manager'], ['participants', 'Participant Tracking'], ['finance', 'Camp Finance'],
  ];
  for (const [stationType, stationName] of stations) {
    await sql`
      insert into camp_stations (id, camp_id, cohort_id, station_type, station_name)
      values (${`station_${randomUUID()}`}, ${campId}, ${cohortId}, ${stationType}, ${stationName})
      on conflict (cohort_id, station_type) do nothing
    `;
  }
}

function clean(value: unknown, max = 160) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function normalizeMobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

export default async function handler(request: any, response: any) {
  const url = databaseUrl();
  if (!url) return response.status(503).json({ message: 'Camp database is not configured.' });

  try {
    const sql = neon(url);
    await ensureSchema(sql);

    if (request.method === 'GET') {
      const institutions = await sql`
        select id, name, short_name, city, contact_name, contact_mobile, logo_url, organization_type, status, created_at
        from educational_institutions order by name
      `;
      const camps = await sql`
        select c.*, i.name as institution_name, i.short_name as institution_short_name, i.logo_url as institution_logo_url
        from educational_camps c join educational_institutions i on i.id = c.institution_id
        order by c.starts_on desc, c.created_at desc
      `;
      const cohorts = await sql`
        select id, camp_id, name, starts_on, ends_on, sort_order
        from educational_camp_cohorts order by camp_id, sort_order, name
      `;
      const stations = await sql`
        select s.*, c.name as cohort_name
        from camp_stations s join educational_camp_cohorts c on c.id = s.cohort_id
        order by c.sort_order, s.station_type
      `;
      const assignments = await sql`
        select a.* from camp_station_assignments a order by a.staff_name
      `;
      const finance = await sql`
        select c.id as camp_id, coalesce(s.sales, 0) as sales, coalesce(e.expenses, 0) as expenses
        from educational_camps c
        left join (select camp_id, sum(net_amount) as sales from camp_sales group by camp_id) s on s.camp_id = c.id
        left join (select camp_id, sum(amount) as expenses from camp_expenses group by camp_id) e on e.camp_id = c.id
      `;
      const campsWithCohorts = camps.map((camp: any) => ({
        ...camp,
        cohorts: cohorts.filter((cohort: any) => cohort.camp_id === camp.id),
        stations: stations.filter((station: any) => station.camp_id === camp.id).map((station: any) => ({
          ...station,
          assignments: assignments.filter((assignment: any) => assignment.station_id === station.id),
        })),
        finance_summary: (() => { const item = finance.find((value: any) => value.camp_id === camp.id); const sales = Number(item?.sales || 0); const expenses = Number(item?.expenses || 0); return { sales, expenses, net: sales - expenses }; })(),
      }));
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ institutions, camps: campsWithCohorts });
    }

    if (request.method === 'POST') {
      const resource = clean(request.body?.resource, 30);
      if (resource === 'institution') {
        const name = clean(request.body?.name);
        const city = clean(request.body?.city, 80);
        if (name.length < 3 || city.length < 2) return response.status(400).json({ message: 'Institution name and city are required.' });
        const id = `inst_${randomUUID()}`;
        const rows = await sql`
          insert into educational_institutions (id, name, short_name, city, contact_name, contact_mobile, logo_url, organization_type)
          values (${id}, ${name}, ${clean(request.body?.shortName, 40)}, ${city}, ${clean(request.body?.contactName, 100)}, ${normalizeMobile(request.body?.contactMobile)}, ${clean(request.body?.logoUrl, 300)}, ${['school', 'corporate_office', 'business', 'community', 'centre'].includes(clean(request.body?.organizationType, 30)) ? clean(request.body?.organizationType, 30) : 'community'})
          returning *
        `;
        return response.status(201).json({ institution: rows[0] });
      }

      if (resource === 'camp') {
        const institutionId = clean(request.body?.institutionId, 80);
        const name = clean(request.body?.name);
        const startsOn = clean(request.body?.startsOn, 10);
        const endsOn = clean(request.body?.endsOn || request.body?.startsOn, 10);
        const grades = Array.isArray(request.body?.grades) ? request.body.grades.map((grade: unknown) => clean(grade, 30)).filter(Boolean) : [];
        if (!institutionId || name.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
          return response.status(400).json({ message: 'Institution, camp name and dates are required.' });
        }
        const id = `camp_${randomUUID()}`;
        const rows = await sql`
          insert into educational_camps (id, institution_id, name, campus_name, starts_on, ends_on, grades, expected_students, camp_category)
          values (${id}, ${institutionId}, ${name}, ${clean(request.body?.campusName, 120)}, ${startsOn}, ${endsOn}, ${grades}, ${Math.max(0, Number(request.body?.expectedStudents || 0))}, ${['school', 'corporate', 'community', 'centre', 'outreach', 'other'].includes(clean(request.body?.campCategory, 30)) ? clean(request.body?.campCategory, 30) : 'other'})
          returning *
        `;
        const cohortNames = grades.length ? grades : ['General Cohort'];
        for (let index = 0; index < cohortNames.length; index += 1) {
          const cohortId = `cohort_${randomUUID()}`;
          await sql`
            insert into educational_camp_cohorts (id, camp_id, name, starts_on, ends_on, sort_order)
            values (${cohortId}, ${id}, ${cohortNames[index]}, ${startsOn}, ${endsOn}, ${index})
          `;
          await createStationsForCohort(sql, id, cohortId);
        }
        return response.status(201).json({ camp: rows[0], stationsCreated: cohortNames.length * 6 });
      }

      if (resource === 'station-assignment') {
        const stationId = clean(request.body?.stationId, 100);
        const staffName = clean(request.body?.staffName, 120);
        const staffMobile = normalizeMobile(request.body?.staffMobile);
        if (!stationId || staffName.length < 2 || !/^[6-9]\d{9}$/.test(staffMobile)) {
          return response.status(400).json({ message: 'Station, staff name and valid mobile are required.' });
        }
        const rows = await sql`
          insert into camp_station_assignments (id, station_id, staff_name, staff_mobile, staff_role, shift_starts_at, shift_ends_at)
          values (${`assignment_${randomUUID()}`}, ${stationId}, ${staffName}, ${staffMobile}, ${clean(request.body?.staffRole, 80)}, ${request.body?.shiftStartsAt || null}, ${request.body?.shiftEndsAt || null})
          on conflict (station_id, staff_mobile) do update set
            staff_name = excluded.staff_name, staff_role = excluded.staff_role,
            shift_starts_at = excluded.shift_starts_at, shift_ends_at = excluded.shift_ends_at,
            status = 'assigned', updated_at = now()
          returning *
        `;
        return response.status(201).json({ assignment: rows[0] });
      }

      return response.status(400).json({ message: 'Unknown administration resource.' });
    }

    if (request.method === 'PATCH') {
      const resource = clean(request.body?.resource, 30) || 'camp-estimate';
      if (resource === 'institution') {
        const institutionId = clean(request.body?.institutionId, 80);
        const name = clean(request.body?.name);
        const city = clean(request.body?.city, 80);
        if (!institutionId || name.length < 3 || city.length < 2) {
          return response.status(400).json({ message: 'Institution name and city are required.' });
        }
        const rows = await sql`
          update educational_institutions set
            name = ${name}, short_name = ${clean(request.body?.shortName, 40)}, city = ${city},
            contact_name = ${clean(request.body?.contactName, 100)}, contact_mobile = ${normalizeMobile(request.body?.contactMobile)},
            logo_url = ${clean(request.body?.logoUrl, 300)},
            organization_type = ${['school', 'corporate_office', 'business', 'community', 'centre'].includes(clean(request.body?.organizationType, 30)) ? clean(request.body?.organizationType, 30) : 'community'},
            updated_at = now()
          where id = ${institutionId} returning *
        `;
        if (!rows[0]) return response.status(404).json({ message: 'Institution not found.' });
        return response.status(200).json({ institution: rows[0] });
      }

      if (resource === 'camp') {
        const campId = clean(request.body?.campId, 80);
        const name = clean(request.body?.name);
        const startsOn = clean(request.body?.startsOn, 10);
        const endsOn = clean(request.body?.endsOn, 10);
        const expectedStudents = Number(request.body?.expectedStudents);
        const grades = Array.isArray(request.body?.grades) ? request.body.grades.map((grade: unknown) => clean(grade, 30)).filter(Boolean) : [];
        if (!campId || name.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || !Number.isInteger(expectedStudents) || expectedStudents < 0) {
          return response.status(400).json({ message: 'Camp name, dates and a valid estimate are required.' });
        }
        const rows = await sql`
          update educational_camps set
            name = ${name}, campus_name = ${clean(request.body?.campusName, 120)}, starts_on = ${startsOn}, ends_on = ${endsOn},
            grades = ${grades}, expected_students = ${expectedStudents}, status = ${clean(request.body?.status, 30) || 'planning'}, updated_at = now()
            , camp_category = ${['school', 'corporate', 'community', 'centre', 'outreach', 'other'].includes(clean(request.body?.campCategory, 30)) ? clean(request.body?.campCategory, 30) : 'other'}
          where id = ${campId} returning *
        `;
        if (!rows[0]) return response.status(404).json({ message: 'Camp not found.' });
        return response.status(200).json({ camp: rows[0] });
      }

      if (resource === 'cohorts') {
        const campId = clean(request.body?.campId, 80);
        const cohorts = Array.isArray(request.body?.cohorts) ? request.body.cohorts : [];
        if (!campId || cohorts.length === 0 || cohorts.length > 30) {
          return response.status(400).json({ message: 'Add at least one cohort schedule.' });
        }
        const normalized = cohorts.map((cohort: any, index: number) => ({
          id: clean(cohort?.id, 100) || `cohort_${randomUUID()}`,
          name: clean(cohort?.name, 80),
          startsOn: clean(cohort?.startsOn, 10),
          endsOn: clean(cohort?.endsOn, 10),
          sortOrder: index,
        }));
        if (normalized.some((cohort: any) => cohort.name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(cohort.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(cohort.endsOn) || cohort.endsOn < cohort.startsOn)) {
          return response.status(400).json({ message: 'Each cohort needs a name and valid start and end dates.' });
        }
        const retainedIds = normalized.map((cohort: any) => cohort.id);
        await sql`delete from educational_camp_cohorts where camp_id = ${campId} and not (id = any(${retainedIds}))`;
        for (const cohort of normalized) {
          await sql`
            insert into educational_camp_cohorts (id, camp_id, name, starts_on, ends_on, sort_order)
            values (${cohort.id}, ${campId}, ${cohort.name}, ${cohort.startsOn}, ${cohort.endsOn}, ${cohort.sortOrder})
            on conflict (id) do update set name = excluded.name, starts_on = excluded.starts_on,
              ends_on = excluded.ends_on, sort_order = excluded.sort_order, updated_at = now()
          `;
          await createStationsForCohort(sql, campId, cohort.id);
        }
        await sql`update educational_camps set grades = ${normalized.map((cohort: any) => cohort.name)}, updated_at = now() where id = ${campId}`;
        return response.status(200).json({ cohorts: normalized });
      }

      const campId = clean(request.body?.campId, 80);
      const expectedStudents = Number(request.body?.expectedStudents);
      if (!campId || !Number.isInteger(expectedStudents) || expectedStudents < 0 || expectedStudents > 100000) {
        return response.status(400).json({ message: 'Enter a valid estimated student count.' });
      }
      const rows = await sql`
        update educational_camps
        set expected_students = ${expectedStudents}, updated_at = now()
        where id = ${campId}
        returning *
      `;
      if (!rows[0]) return response.status(404).json({ message: 'Camp not found.' });
      return response.status(200).json({ camp: rows[0] });
    }

    if (request.method === 'DELETE') {
      const assignmentId = clean(request.query?.assignmentId || request.body?.assignmentId, 100);
      if (!assignmentId) return response.status(400).json({ message: 'Assignment is required.' });
      await sql`delete from camp_station_assignments where id = ${assignmentId}`;
      return response.status(200).json({ success: true });
    }

    response.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return response.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    console.error('school-camp-admin', error);
    return response.status(500).json({ message: 'Unable to update educational camp administration.' });
  }
}
