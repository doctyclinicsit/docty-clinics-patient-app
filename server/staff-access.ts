import { neon } from '@neondatabase/serverless';
import { openValue, readCookie, sealValue } from './patient-session.js';
import { normalizeIndianMobile, SUPER_ADMIN_MOBILE } from './eka-staff.js';
import type { StaffSession } from './staff-session.js';

export const STAFF_ADMIN_COOKIE = 'docty_staff_admin_session';
const STAFF_ADMIN_PURPOSE = 'docty:staff-admin-session:v1';

export const STAFF_MODULES = [
  { key: 'clinic_management', label: 'Clinic Management', description: 'Manage appointments, walk-ins, and clinic queues.' },
  { key: 'cards', label: 'Subscriber Cards', description: 'View subscribers and issue Docty cards.' },
  { key: 'pharmacy_billing', label: 'Pharmacy Billing', description: 'Create and manage pharmacy bills.' },
  { key: 'leads', label: 'Leads', description: 'View and manage clinic leads.' },
  { key: 'corporate_camps', label: 'Corporate Camps', description: 'Manage educational and corporate camps.' },
  { key: 'doctor_payout', label: 'Doctor Payout', description: 'Review doctor payout and ledger data.' },
  { key: 'franchise_dashboard', label: 'Franchise Dashboard', description: 'Access franchise reporting and opportunities.' },
  { key: 'system_logs', label: 'System Logs', description: 'View operational logs and add staff notes.' },
  { key: 'social_media', label: 'Social Media', description: 'Plan, review and approve social content.' },
  { key: 'staff_administration', label: 'Staff Administration', description: 'Configure module access for staff.' },
] as const;

export type StaffModuleKey = typeof STAFF_MODULES[number]['key'];

const normalDefaults = new Set<StaffModuleKey>(['clinic_management', 'cards', 'pharmacy_billing', 'leads', 'corporate_camps']);
let ensured = false;

function connectionString() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

function sqlClient() {
  const url = connectionString();
  if (!url) throw new Error('Staff access database is not configured.');
  return neon(url);
}

async function ensureStaffAccessSchema() {
  if (ensured) return;
  const sql = sqlClient();
  await sql`
    create table if not exists staff_module_access (
      staff_mobile text not null,
      module_key text not null,
      allowed boolean not null default false,
      updated_by_mobile text,
      updated_by_name text,
      updated_at timestamptz not null default now(),
      primary key (staff_mobile, module_key)
    )
  `;
  await sql`
    create table if not exists staff_access_audit (
      id bigserial primary key,
      staff_mobile text not null,
      module_key text not null,
      previous_allowed boolean,
      allowed boolean not null,
      actor_mobile text,
      actor_name text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists staff_access_audit_created_idx on staff_access_audit (created_at desc)`;
  ensured = true;
}

function defaultAccess(session: Pick<StaffSession, 'mobile' | 'isAdmin'>) {
  const isSuperAdmin = normalizeIndianMobile(session.mobile) === configuredAdminMobile();
  return Object.fromEntries(STAFF_MODULES.map((module) => [
    module.key,
    isSuperAdmin || Boolean(session.isAdmin) || normalDefaults.has(module.key),
  ])) as Record<StaffModuleKey, boolean>;
}

export function configuredAdminMobile() {
  return normalizeIndianMobile(process.env.STAFF_ADMIN_MOBILE || SUPER_ADMIN_MOBILE) || SUPER_ADMIN_MOBILE;
}

export function maskAdminMobile() {
  const mobile = configuredAdminMobile();
  return `******${mobile.slice(-4)}`;
}

export function createStaffAdminCookie(value: string, maxAge: number) {
  return `${STAFF_ADMIN_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(maxAge))}; Priority=High`;
}

export function createStaffAdminSession(secret: string, verifiedBy: string, maxAgeSeconds = 10 * 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return {
    expiresAt,
    maxAge: maxAgeSeconds,
    token: sealValue({ role: 'staff_admin', mobile: configuredAdminMobile(), verifiedBy, expiresAt }, secret, STAFF_ADMIN_PURPOSE),
  };
}

export function readStaffAdminSession(cookieHeader: string | undefined, secret: string) {
  const session = openValue<{ role:string; mobile:string; verifiedBy:string; expiresAt:number }>(
    readCookie(cookieHeader, STAFF_ADMIN_COOKIE), secret, STAFF_ADMIN_PURPOSE
  );
  return session && session.role === 'staff_admin' && session.mobile === configuredAdminMobile() && session.expiresAt >= Math.floor(Date.now() / 1000)
    ? session
    : undefined;
}

export async function getStaffModuleAccess(session: Pick<StaffSession, 'mobile' | 'isAdmin'>) {
  const access = defaultAccess(session);
  const mobile = normalizeIndianMobile(session.mobile);
  if (!mobile || !connectionString()) return access;
  await ensureStaffAccessSchema();
  const sql = sqlClient();
  const rows = await sql`select module_key, allowed from staff_module_access where staff_mobile=${mobile}`;
  for (const row of rows) {
    if (STAFF_MODULES.some((module) => module.key === row.module_key)) access[row.module_key as StaffModuleKey] = Boolean(row.allowed);
  }
  if (mobile === configuredAdminMobile()) access.staff_administration = true;
  return access;
}

export async function hasStaffModuleAccess(session: Pick<StaffSession, 'mobile' | 'isAdmin'>, moduleKey: StaffModuleKey) {
  const access = await getStaffModuleAccess(session);
  return Boolean(access[moduleKey]);
}

export async function listStoredAccess() {
  await ensureStaffAccessSchema();
  const sql = sqlClient();
  return sql`select staff_mobile, module_key, allowed, updated_by_mobile, updated_by_name, updated_at from staff_module_access order by staff_mobile, module_key`;
}

export async function saveStaffModuleAccess(input: { staffMobile:string; access:Record<string,boolean> }, actor: StaffSession) {
  await ensureStaffAccessSchema();
  const mobile = normalizeIndianMobile(input.staffMobile);
  if (!mobile) throw new Error('A valid staff mobile number is required.');
  const sql = sqlClient();
  for (const module of STAFF_MODULES) {
    if (typeof input.access?.[module.key] !== 'boolean') continue;
    const previous = await sql`select allowed from staff_module_access where staff_mobile=${mobile} and module_key=${module.key}`;
    const allowed = module.key === 'staff_administration' && mobile === configuredAdminMobile()
      ? true
      : Boolean(input.access[module.key]);
    await sql`
      insert into staff_module_access (staff_mobile, module_key, allowed, updated_by_mobile, updated_by_name, updated_at)
      values (${mobile}, ${module.key}, ${allowed}, ${actor.mobile}, ${actor.name || null}, now())
      on conflict (staff_mobile, module_key) do update set
        allowed=excluded.allowed,
        updated_by_mobile=excluded.updated_by_mobile,
        updated_by_name=excluded.updated_by_name,
        updated_at=now()
    `;
    if (!previous[0] || Boolean(previous[0].allowed) !== allowed) {
      await sql`insert into staff_access_audit (staff_mobile, module_key, previous_allowed, allowed, actor_mobile, actor_name) values (${mobile}, ${module.key}, ${previous[0] ? Boolean(previous[0].allowed) : null}, ${allowed}, ${actor.mobile}, ${actor.name || null})`;
    }
  }
  return getStaffModuleAccess({ mobile, isAdmin: mobile === configuredAdminMobile() });
}
