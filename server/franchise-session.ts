import {
  readCookie,
  openValue,
  sealValue,
} from './patient-session.js';

export interface FranchiseSession {
  role: 'franchise';
  expiresAt: number;
  mobile: string;
  name?: string;
  ekaRole?: string;
  assignedClinics?: Array<{ id: string; name: string }>;
}

export const FRANCHISE_SESSION_COOKIE = 'docty_franchise_session';
export const FRANCHISE_SESSION_PURPOSE = 'docty:franchise-session:v1';

export function franchiseSessionSecret() {
  return process.env.FRANCHISE_SESSION_SECRET || process.env.STAFF_SESSION_SECRET || process.env.PATIENT_SESSION_SECRET || '';
}

export function createFranchiseSessionCookie(value: string, maxAge: number) {
  return `${FRANCHISE_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(
    0,
    Math.floor(maxAge)
  )}; Priority=High`;
}

export function clearFranchiseSessionCookie() {
  return createFranchiseSessionCookie('', 0);
}

export function createFranchiseSessionToken(
  secret: string,
  owner: { mobile: string; name?: string; ekaRole?: string; assignedClinics?: Array<{ id: string; name: string }> },
  maxAgeSeconds = 8 * 60 * 60
) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return {
    expiresAt,
    token: sealValue(
      {
        role: 'franchise',
        expiresAt,
        mobile: owner.mobile,
        name: owner.name,
        ekaRole: owner.ekaRole,
        assignedClinics: owner.assignedClinics || [],
      },
      secret,
      FRANCHISE_SESSION_PURPOSE
    ),
    maxAge: maxAgeSeconds,
  };
}

export function readFranchiseSession(cookieHeader: string | undefined, secret: string) {
  const session = openValue<FranchiseSession>(
    readCookie(cookieHeader, FRANCHISE_SESSION_COOKIE),
    secret,
    FRANCHISE_SESSION_PURPOSE
  );
  return session &&
    session.role === 'franchise' &&
    typeof session.mobile === 'string' &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt >= Math.floor(Date.now() / 1000)
    ? session
    : undefined;
}

export function readFranchiseOwnerSession(cookieHeader: string | undefined) {
  const secret = franchiseSessionSecret();
  const session = secret ? readFranchiseSession(cookieHeader, secret) : undefined;
  if (!session) return { status: 401, message: 'Please sign in as a Franchise Owner.' as const };
  return { status: 200, session } as const;
}
