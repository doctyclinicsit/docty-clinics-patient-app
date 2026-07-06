import {
  openValue,
  readCookie,
  sealValue,
} from './patient-session.js';

export interface DoctorSession {
  role: 'doctor';
  expiresAt: number;
  doctorId: string;
  mobile: string;
  name: string;
  specialisation?: string;
}

export const DOCTOR_SESSION_COOKIE = 'docty_doctor_session';
export const DOCTOR_SESSION_PURPOSE = 'docty:doctor-session:v1';

export function doctorSessionSecret() {
  return process.env.DOCTOR_SESSION_SECRET || process.env.STAFF_SESSION_SECRET || process.env.PATIENT_SESSION_SECRET || '';
}

export function createDoctorSessionCookie(value: string, maxAge: number) {
  return `${DOCTOR_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(
    0,
    Math.floor(maxAge)
  )}; Priority=High`;
}

export function clearDoctorSessionCookie() {
  return createDoctorSessionCookie('', 0);
}

export function createDoctorSessionToken(
  secret: string,
  doctor: { doctorId: string; mobile: string; name: string; specialisation?: string },
  maxAgeSeconds = 30 * 60
) {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return {
    expiresAt,
    token: sealValue(
      { role: 'doctor', expiresAt, ...doctor },
      secret,
      DOCTOR_SESSION_PURPOSE
    ),
    maxAge: maxAgeSeconds,
  };
}

export function readDoctorSession(cookieHeader: string | undefined, secret: string) {
  const session = openValue<DoctorSession>(
    readCookie(cookieHeader, DOCTOR_SESSION_COOKIE),
    secret,
    DOCTOR_SESSION_PURPOSE
  );
  return session &&
    session.role === 'doctor' &&
    typeof session.doctorId === 'string' &&
    typeof session.mobile === 'string' &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt >= Math.floor(Date.now() / 1000)
    ? session
    : undefined;
}
