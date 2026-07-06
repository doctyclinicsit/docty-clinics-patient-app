import {
  readCookie,
  openValue,
  sealValue,
} from './patient-session.js';

export interface StaffSession {
  role: 'staff';
  expiresAt: number;
  mobile: string;
  name?: string;
  staffRole?: string;
  isAdmin?: boolean;
}

export const STAFF_SESSION_COOKIE = 'docty_staff_session';
export const STAFF_SESSION_PURPOSE = 'docty:staff-session:v1';

export function staffSessionSecret() {
  return process.env.STAFF_SESSION_SECRET || process.env.PATIENT_SESSION_SECRET || '';
}

export function createStaffSessionCookie(value: string, maxAge: number) {
  return `${STAFF_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(
    0,
    Math.floor(maxAge)
  )}; Priority=High`;
}

export function clearStaffSessionCookie() {
  return createStaffSessionCookie('', 0);
}

export function createStaffSessionToken(
  secret: string,
  staff: { mobile: string; name?: string; staffRole?: string; isAdmin?: boolean },
  maxAgeSeconds = 30 * 60
) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return {
    expiresAt,
    token: sealValue(
      {
        role: 'staff',
        expiresAt,
        mobile: staff.mobile,
        name: staff.name,
        staffRole: staff.staffRole,
        isAdmin: Boolean(staff.isAdmin),
      },
      secret,
      STAFF_SESSION_PURPOSE
    ),
    maxAge: maxAgeSeconds,
  };
}

export function readStaffSession(cookieHeader: string | undefined, secret: string) {
  const session = openValue<StaffSession>(
    readCookie(cookieHeader, STAFF_SESSION_COOKIE),
    secret,
    STAFF_SESSION_PURPOSE
  );
  return session &&
    session.role === 'staff' &&
    typeof session.mobile === 'string' &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt >= Math.floor(Date.now() / 1000)
    ? session
    : undefined;
}
