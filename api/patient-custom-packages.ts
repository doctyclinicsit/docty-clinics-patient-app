import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { readPatientSession } from '../server/patient-session.js';

interface SavedPackageInput {
  id?: string;
  name?: string;
  tests?: unknown[];
  regularTotal?: number;
  doctyTotal?: number;
  savings?: number;
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  );
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 180) : fallback;
}

function safeTests(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .slice(0, 80)
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        slug: safeText(record.slug),
        shortName: safeText(record.shortName),
        fullName: safeText(record.fullName),
        category: safeText(record.category),
        sampleType: safeText(record.sampleType),
        description: safeText(record.description),
        whyNeeded: safeText(record.whyNeeded),
        preparation: safeText(record.preparation),
        price: safeNumber(record.price),
        offerPrice: safeNumber(record.offerPrice),
        displayOrder: safeNumber(record.displayOrder),
      };
    })
    .filter((item) => item.slug && item.fullName);
}

async function ensureTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS patient_custom_packages (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      mobile TEXT NOT NULL,
      name TEXT NOT NULL,
      tests JSONB NOT NULL DEFAULT '[]'::jsonb,
      regular_total INTEGER NOT NULL DEFAULT 0,
      docty_total INTEGER NOT NULL DEFAULT 0,
      savings INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS patient_custom_packages_patient_idx ON patient_custom_packages(patient_id, updated_at DESC)`;
}

function getSession(request: any) {
  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) return { error: 'Patient session is not configured.' };
  const session = readPatientSession(request.headers.cookie, secret);
  if (!session?.patientId) return { error: 'Please sign in and select a patient profile to save this package.' };
  return { session };
}

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    tests: Array.isArray(row.tests) ? row.tests : [],
    regularTotal: Number(row.regular_total || 0),
    doctyTotal: Number(row.docty_total || 0),
    savings: Number(row.savings || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return response.status(500).json({ message: 'Saved package storage is not configured.' });
  }

  const sessionResult = getSession(request);
  if (sessionResult.error) {
    return response.status(401).json({ message: sessionResult.error });
  }

  const session = sessionResult.session!;
  const sql = neon(databaseUrl);
  await ensureTable(sql);

  if (request.method === 'GET') {
    const rows = await sql`
      SELECT id, name, tests, regular_total, docty_total, savings, created_at, updated_at
      FROM patient_custom_packages
      WHERE patient_id = ${session.patientId}
      ORDER BY updated_at DESC
      LIMIT 8
    `;
    return response.status(200).json({ packages: (rows as any[]).map(mapRow) });
  }

  if (request.method === 'POST') {
    const input = (request.body || {}) as SavedPackageInput;
    const tests = safeTests(input.tests);
    if (!tests.length) {
      return response.status(400).json({ message: 'Please add tests before saving this package.' });
    }

    const id = safeText(input.id) || randomUUID();
    const name = safeText(input.name, 'My Docty.Quick Labs Package') || 'My Docty.Quick Labs Package';
    const regularTotal = safeNumber(input.regularTotal);
    const doctyTotal = safeNumber(input.doctyTotal);
    const savings = safeNumber(input.savings);

    const rows = await sql`
      INSERT INTO patient_custom_packages (
        id,
        patient_id,
        mobile,
        name,
        tests,
        regular_total,
        docty_total,
        savings,
        updated_at
      )
      VALUES (
        ${id},
        ${session.patientId},
        ${session.mobile},
        ${name},
        ${JSON.stringify(tests)}::jsonb,
        ${regularTotal},
        ${doctyTotal},
        ${savings},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        tests = EXCLUDED.tests,
        regular_total = EXCLUDED.regular_total,
        docty_total = EXCLUDED.docty_total,
        savings = EXCLUDED.savings,
        updated_at = NOW()
      WHERE patient_custom_packages.patient_id = ${session.patientId}
      RETURNING id, name, tests, regular_total, docty_total, savings, created_at, updated_at
    `;

    await sql`
      DELETE FROM patient_custom_packages
      WHERE patient_id = ${session.patientId}
        AND id NOT IN (
          SELECT id
          FROM patient_custom_packages
          WHERE patient_id = ${session.patientId}
          ORDER BY updated_at DESC
          LIMIT 8
        )
    `;

    return response.status(200).json({ package: mapRow((rows as any[])[0]) });
  }

  if (request.method === 'DELETE') {
    const id = safeText(request.query?.id || request.body?.id);
    if (!id) return response.status(400).json({ message: 'Package id is required.' });

    await sql`
      DELETE FROM patient_custom_packages
      WHERE patient_id = ${session.patientId}
        AND id = ${id}
    `;
    return response.status(200).json({ success: true });
  }

  response.setHeader('Allow', 'GET, POST, DELETE');
  return response.status(405).json({ message: 'Method not allowed.' });
}
