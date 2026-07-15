import { neon } from '@neondatabase/serverless';

const shareId = 'default';
let ensured = false;

export const EXECUTIVE_DASHBOARD_SHARE_TOKEN =
  process.env.EXECUTIVE_DASHBOARD_SHARE_TOKEN || 'dcty-investor-2026-6fb7b688c6fd4b8fbf61a95e8c1b35d2';

function sqlClient() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) throw new Error('Executive dashboard share storage is not configured.');
  return neon(databaseUrl);
}

function generateShareCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function shareCodeExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function isActiveShareCode(expiresAt: unknown) {
  return typeof expiresAt === 'string' || expiresAt instanceof Date
    ? new Date(expiresAt).getTime() > Date.now()
    : false;
}

function shareResponse(row: any) {
  const activeShareCode = row?.share_code && isActiveShareCode(row?.share_code_expires_at);
  return {
    shareToken: EXECUTIVE_DASHBOARD_SHARE_TOKEN,
    shareCode: activeShareCode ? row.share_code : '',
    shareCodeExpiresAt: activeShareCode ? row.share_code_expires_at : '',
    updatedBy: row?.updated_by || '',
    updatedAt: row?.updated_at || '',
  };
}

async function ensureTable(sql: any) {
  if (ensured) return;
  await sql`
    create table if not exists executive_dashboard_shares (
      id text primary key,
      share_code text,
      share_code_expires_at timestamptz,
      updated_by text,
      updated_at timestamptz default now()
    )
  `;
  ensured = true;
}

export async function readExecutiveDashboardShare() {
  const sql = sqlClient();
  await ensureTable(sql);
  const rows = await sql`
    insert into executive_dashboard_shares (id, updated_at)
    values (${shareId}, now())
    on conflict (id) do update
    set updated_at = executive_dashboard_shares.updated_at
    returning share_code, share_code_expires_at, updated_by, updated_at
  `;
  return shareResponse(rows[0]);
}

export async function generateExecutiveDashboardShareCode(updatedBy = '') {
  const sql = sqlClient();
  await ensureTable(sql);
  const shareCode = generateShareCode();
  const expiresAt = shareCodeExpiresAt();
  const rows = await sql`
    insert into executive_dashboard_shares (id, share_code, share_code_expires_at, updated_by, updated_at)
    values (${shareId}, ${shareCode}, ${expiresAt.toISOString()}, ${updatedBy || null}, now())
    on conflict (id) do update
    set
      share_code = excluded.share_code,
      share_code_expires_at = excluded.share_code_expires_at,
      updated_by = coalesce(excluded.updated_by, executive_dashboard_shares.updated_by),
      updated_at = now()
    returning share_code, share_code_expires_at, updated_by, updated_at
  `;
  return shareResponse(rows[0]);
}

export async function verifyExecutiveDashboardShareCode(shareToken: string, shareCode: string) {
  if (!shareToken || shareToken !== EXECUTIVE_DASHBOARD_SHARE_TOKEN) return false;
  if (!/^\d{6}$/.test(shareCode)) return false;
  const share = await readExecutiveDashboardShare();
  return Boolean(share.shareCode && share.shareCode === shareCode);
}
