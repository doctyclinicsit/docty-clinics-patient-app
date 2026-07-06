import { neon } from '@neondatabase/serverless';
import { labTestCatalog, labTestCategories } from '../server/lab-tests-catalog.js';

const LAB_TEST_CATALOG_VERSION = '2026-07-04-test-focused-descriptions-v10';

interface LabTestRow {
  slug: string;
  short_name: string;
  full_name: string;
  category: string;
  sample_type: string;
  description: string;
  why_needed: string;
  preparation: string;
  price: number | null;
  offer_price: number | null;
  display_order: number;
}

interface LabTestItem {
  slug: string;
  shortName: string;
  fullName: string;
  category: string;
  sampleType: string;
  description: string;
  whyNeeded: string;
  preparation: string;
  price?: number | null;
  offerPrice?: number | null;
  displayOrder: number;
}

function normalizeRows(rows: LabTestRow[]): LabTestItem[] {
  return rows.map((row) => ({
    slug: row.slug,
    shortName: row.short_name,
    fullName: row.full_name,
    category: row.category,
    sampleType: row.sample_type,
    description: row.description,
    whyNeeded: row.why_needed,
    preparation: row.preparation,
    price: row.price,
    offerPrice: row.offer_price,
    displayOrder: row.display_order,
  }));
}

async function ensureLabTestsTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS lab_tests (
      slug TEXT PRIMARY KEY,
      short_name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      category TEXT NOT NULL,
      sample_type TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      why_needed TEXT NOT NULL,
      preparation TEXT NOT NULL DEFAULT '',
      price INTEGER,
      offer_price INTEGER,
      catalog_version TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS price INTEGER`;
  await sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS offer_price INTEGER`;
  await sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS catalog_version TEXT`;

  const countRows = (await sql`
    SELECT
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE price IS NULL)::int AS missing_price_count,
      COUNT(*) FILTER (WHERE catalog_version IS DISTINCT FROM ${LAB_TEST_CATALOG_VERSION})::int AS stale_count
    FROM lab_tests
  `) as Array<{
    count: number;
    missing_price_count: number;
    stale_count: number;
  }>;
  const count = Number(countRows?.[0]?.count || 0);
  const missingPriceCount = Number(countRows?.[0]?.missing_price_count || 0);
  const staleCount = Number(countRows?.[0]?.stale_count || 0);
  if (count >= labTestCatalog.length && missingPriceCount === 0 && staleCount === 0) return;

  const seedRows = labTestCatalog.map((test) => ({
    slug: test.slug,
    short_name: test.shortName,
    full_name: test.fullName,
    category: test.category,
    sample_type: test.sampleType,
    description: test.description,
    why_needed: test.whyNeeded,
    preparation: test.preparation,
    price: test.price ?? null,
    offer_price: test.offerPrice ?? null,
    catalog_version: LAB_TEST_CATALOG_VERSION,
    display_order: test.displayOrder,
  }));

  await sql`
    INSERT INTO lab_tests (
      slug,
      short_name,
      full_name,
      category,
      sample_type,
      description,
      why_needed,
      preparation,
      price,
      offer_price,
      catalog_version,
      display_order
    )
    SELECT
      slug,
      short_name,
      full_name,
      category,
      sample_type,
      description,
      why_needed,
      preparation,
      price,
      offer_price,
      catalog_version,
      display_order
    FROM jsonb_to_recordset(${JSON.stringify(seedRows)}::jsonb) AS source(
      slug TEXT,
      short_name TEXT,
      full_name TEXT,
      category TEXT,
      sample_type TEXT,
      description TEXT,
      why_needed TEXT,
      preparation TEXT,
      price INTEGER,
      offer_price INTEGER,
      catalog_version TEXT,
      display_order INTEGER
    )
    ON CONFLICT (slug) DO UPDATE
    SET
      short_name = EXCLUDED.short_name,
      full_name = EXCLUDED.full_name,
      category = EXCLUDED.category,
      sample_type = EXCLUDED.sample_type,
      description = EXCLUDED.description,
      why_needed = EXCLUDED.why_needed,
      preparation = EXCLUDED.preparation,
      price = EXCLUDED.price,
      offer_price = COALESCE(EXCLUDED.offer_price, lab_tests.offer_price),
      catalog_version = EXCLUDED.catalog_version,
      display_order = EXCLUDED.display_order,
      updated_at = NOW()
  `;
}

function filterTests(tests: LabTestItem[], request: any) {
  const search = String(request.query?.q || '').trim().toLowerCase();
  const category = String(request.query?.category || '').trim().toLowerCase();

  return tests.filter((test) => {
    const categoryMatches = !category || test.category.toLowerCase() === category;
    if (!categoryMatches) return false;
    if (!search) return true;

    return [
      test.shortName,
      test.fullName,
      test.category,
      test.sampleType,
      test.description,
      test.whyNeeded,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });
}

function fallbackResponse(request: any, source: 'fallback' | 'fallback-error', error?: unknown) {
  const tests = filterTests(labTestCatalog, request);
  return {
    tests,
    categories: labTestCategories,
    source,
    warning: error instanceof Error ? error.message : undefined,
  };
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

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return response.status(200).json(fallbackResponse(request, 'fallback'));
  }

  try {
    const sql = neon(databaseUrl);
    await ensureLabTestsTable(sql);
    const rows = await sql`
      SELECT
        slug,
        short_name,
        full_name,
        category,
        sample_type,
        description,
      why_needed,
      preparation,
      price,
      offer_price,
      display_order
      FROM lab_tests
      WHERE is_active = TRUE
        AND catalog_version = ${LAB_TEST_CATALOG_VERSION}
      ORDER BY display_order ASC, full_name ASC
    `;
    const tests = filterTests(normalizeRows(rows as LabTestRow[]), request);
    const categories = [
      ...new Set((rows as LabTestRow[]).map((row) => row.category).filter(Boolean)),
    ];

    return response.status(200).json({
      tests,
      categories,
      source: 'neon',
    });
  } catch (error) {
    return response.status(200).json(fallbackResponse(request, 'fallback-error', error));
  }
}
