import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'node:crypto';
import { bearerToken, verifyCampStationSession } from './_lib/camp-station-session.js';

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
}
function clean(value: unknown, max = 180) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}
function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100) / 100) : 0;
}

async function ensureSchema(sql: any) {
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
  await sql`create index if not exists camp_expenses_camp_idx on camp_expenses(camp_id, occurred_on)`;
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
  await sql`create index if not exists camp_sales_camp_idx on camp_sales(camp_id, occurred_on)`;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const session = verifyCampStationSession(bearerToken(request));
  if (!session || session.stationType !== 'finance') return response.status(401).json({ message: 'Your Camp Finance session has expired.' });
  const url = databaseUrl();
  if (!url) return response.status(503).json({ message: 'Camp database is not configured.' });
  try {
    const sql = neon(url);
    await ensureSchema(sql);
    if (request.method === 'GET') {
      const expenses = await sql`select * from camp_expenses where camp_id = ${session.campId} and (cohort_id is null or cohort_id = any(${session.cohortIds})) order by occurred_on desc, created_at desc`;
      const sales = await sql`select * from camp_sales where camp_id = ${session.campId} and (cohort_id is null or cohort_id = any(${session.cohortIds})) order by occurred_on desc, created_at desc`;
      const expenseTotal = expenses.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const salesTotal = sales.reduce((sum: number, item: any) => sum + Number(item.net_amount || 0), 0);
      return response.status(200).json({ expenses, sales, summary: { expenses: expenseTotal, sales: salesTotal, net: salesTotal - expenseTotal }, staffName: session.staffName, expiresAt: session.expiresAt });
    }
    if (request.method !== 'POST') return response.status(405).json({ message: 'Method not allowed.' });
    const resource = clean(request.body?.resource, 20);
    const cohortId = clean(request.body?.cohortId, 100) || null;
    if (cohortId && !session.cohortIds.includes(cohortId)) return response.status(403).json({ message: 'You are not assigned to this cohort.' });
    const occurredOn = clean(request.body?.occurredOn, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return response.status(400).json({ message: 'A valid transaction date is required.' });
    if (resource === 'expense') {
      const amount = money(request.body?.amount);
      const description = clean(request.body?.description, 300);
      if (!amount || description.length < 2) return response.status(400).json({ message: 'Expense description and amount are required.' });
      const rows = await sql`
        insert into camp_expenses (id, camp_id, cohort_id, submitted_by_name, submitted_by_mobile, expense_category, description, amount, payment_mode, receipt_url, occurred_on)
        values (${`expense_${randomUUID()}`}, ${session.campId}, ${cohortId}, ${session.staffName}, ${session.mobile}, ${clean(request.body?.category, 80) || 'Other'}, ${description}, ${amount}, ${clean(request.body?.paymentMode, 40)}, ${clean(request.body?.receiptUrl, 500)}, ${occurredOn}) returning *
      `;
      return response.status(201).json({ expense: rows[0] });
    }
    if (resource === 'sale') {
      const gross = money(request.body?.grossAmount);
      const discount = Math.min(gross, money(request.body?.discountAmount));
      const net = Math.max(0, gross - discount);
      const description = clean(request.body?.description, 300);
      if (!gross || description.length < 2) return response.status(400).json({ message: 'Sale description and gross amount are required.' });
      const rows = await sql`
        insert into camp_sales (id, camp_id, cohort_id, submitted_by_name, submitted_by_mobile, sale_category, description, quantity, gross_amount, discount_amount, net_amount, payment_mode, reference_number, occurred_on)
        values (${`sale_${randomUUID()}`}, ${session.campId}, ${cohortId}, ${session.staffName}, ${session.mobile}, ${clean(request.body?.category, 80) || 'Other'}, ${description}, ${Math.max(1, Number(request.body?.quantity || 1))}, ${gross}, ${discount}, ${net}, ${clean(request.body?.paymentMode, 40)}, ${clean(request.body?.referenceNumber, 100)}, ${occurredOn}) returning *
      `;
      return response.status(201).json({ sale: rows[0] });
    }
    return response.status(400).json({ message: 'Unknown finance record type.' });
  } catch (error) {
    console.error('camp-finance', error);
    return response.status(500).json({ message: 'Unable to update camp finances.' });
  }
}
