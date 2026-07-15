import { createHmac, timingSafeEqual } from 'node:crypto';

export type CampStationSession = {
  campId: string;
  stationType: string;
  stationIds: string[];
  cohortIds: string[];
  mobile: string;
  staffName: string;
  expiresAt: number;
};

function secret() {
  return process.env.CAMP_STATION_SESSION_SECRET || process.env.STAFF_SESSION_SECRET || '';
}

function encode(value: string) {
  return Buffer.from(value).toString('base64url');
}

export function createCampStationSession(payload: CampStationSession) {
  const key = secret();
  if (!key) throw new Error('Camp station sessions are not configured.');
  const encoded = encode(JSON.stringify(payload));
  const signature = createHmac('sha256', key).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyCampStationSession(token: string): CampStationSession | null {
  const key = secret();
  const [encoded, provided] = String(token || '').split('.');
  if (!key || !encoded || !provided) return null;
  const expected = createHmac('sha256', key).update(encoded).digest('base64url');
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as CampStationSession;
    if (!payload.campId || !payload.stationType || !Array.isArray(payload.cohortIds) || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request: any) {
  const header = String(request.headers?.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}
