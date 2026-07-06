import { readStaffSession, staffSessionSecret } from './staff-session.js';

export function readAdminStaffSession(cookieHeader: string | undefined) {
  const secret = staffSessionSecret();
  const session = secret ? readStaffSession(cookieHeader, secret) : undefined;
  if (!session) return { status: 401, message: 'Please sign in as staff.' as const };
  if (!session.isAdmin) return { status: 403, message: 'Doctor payout is available only for admin staff.' as const };
  return { status: 200, session } as const;
}
