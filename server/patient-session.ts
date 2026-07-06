import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export interface PatientSession {
  mobile: string;
  expiresAt: number;
  patientId?: string;
}

export interface PatientSelectionToken {
  patientId: string;
  mobile: string;
  expiresAt: number;
}

export const PATIENT_SESSION_COOKIE = 'docty_patient_session';
export const PATIENT_SESSION_PURPOSE = 'docty:patient-session:v2';
export const PATIENT_SELECTION_PURPOSE = 'docty:patient-selection:v2';

const TOKEN_VERSION = 'v2';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export function readCookie(header: string | undefined, name: string) {
  return String(header || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function encryptionKey(secret: string) {
  return createHash('sha256')
    .update(`docty-patient-token:${secret}`, 'utf8')
    .digest();
}

export function sealValue(
  payload: object,
  secret: string,
  purpose: string
) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(purpose, 'utf8'));

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    authTag.toString('base64url'),
  ].join('.');
}

export function openValue<T>(
  value: string | undefined,
  secret: string,
  purpose: string
): T | undefined {
  if (!value) return undefined;

  const [version, encodedIv, encodedCiphertext, encodedAuthTag] =
    value.split('.');
  if (
    version !== TOKEN_VERSION ||
    !encodedIv ||
    !encodedCiphertext ||
    !encodedAuthTag
  ) {
    return undefined;
  }

  try {
    const iv = Buffer.from(encodedIv, 'base64url');
    const ciphertext = Buffer.from(encodedCiphertext, 'base64url');
    const authTag = Buffer.from(encodedAuthTag, 'base64url');
    if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
      return undefined;
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(secret),
      iv,
      { authTagLength: AUTH_TAG_BYTES }
    );
    decipher.setAAD(Buffer.from(purpose, 'utf8'));
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(plaintext) as T;
  } catch {
    return undefined;
  }
}

export function createPatientSessionCookie(value: string, maxAge: number) {
  return `${PATIENT_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(
    0,
    Math.floor(maxAge)
  )}; Priority=High`;
}

export function clearPatientSessionCookie() {
  return createPatientSessionCookie('', 0);
}

export function readPatientSession(
  cookieHeader: string | undefined,
  secret: string
) {
  const session = openValue<PatientSession>(
    readCookie(cookieHeader, PATIENT_SESSION_COOKIE),
    secret,
    PATIENT_SESSION_PURPOSE
  );
  return session &&
    typeof session.mobile === 'string' &&
    typeof session.expiresAt === 'number' &&
    session.expiresAt >= Math.floor(Date.now() / 1000)
    ? session
    : undefined;
}

export function readPatientSelectionToken(
  value: string | undefined,
  secret: string
) {
  const selection = openValue<PatientSelectionToken>(
    value,
    secret,
    PATIENT_SELECTION_PURPOSE
  );
  return selection &&
    typeof selection.patientId === 'string' &&
    typeof selection.mobile === 'string' &&
    typeof selection.expiresAt === 'number' &&
    selection.expiresAt >= Math.floor(Date.now() / 1000)
    ? selection
    : undefined;
}
