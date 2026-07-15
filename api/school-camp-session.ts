import { neon } from '@neondatabase/serverless';

type CampSessionState = {
  groupId: string;
  questionIndex: number;
  status: 'waiting' | 'live' | 'finished';
  showResults: boolean;
  registrations: Record<string, unknown>;
  responses: Record<string, Record<string, string>>;
  updatedAt: string;
};

const memoryStore = new Map<string, CampSessionState>();

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function ensureTable(sql: any) {
  await sql`
    create table if not exists school_camp_sessions (
      group_id text primary key,
      question_index integer not null default 0,
      status text not null default 'waiting',
      show_results boolean not null default false,
      registrations jsonb not null default '{}'::jsonb,
      responses jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table school_camp_sessions add column if not exists registrations jsonb not null default '{}'::jsonb`;
  await sql`alter table school_camp_sessions add column if not exists responses jsonb not null default '{}'::jsonb`;
}

function normalizeGroupId(value: unknown) {
  return String(value || 'pre-primary').trim() || 'pre-primary';
}

function normalizeStatus(value: unknown): CampSessionState['status'] {
  return value === 'live' || value === 'finished' ? value : 'waiting';
}

function fallbackState(groupId: string): CampSessionState {
  return (
    memoryStore.get(groupId) || {
      groupId,
      questionIndex: 0,
      status: 'waiting',
      showResults: false,
      registrations: {},
      responses: {},
      updatedAt: new Date().toISOString(),
    }
  );
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function handler(request: any, response: any) {
  const groupId = normalizeGroupId(request.method === 'GET' ? request.query?.group : request.body?.groupId);
  const url = databaseUrl();

  if (request.method === 'GET') {
    if (!url) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ session: fallbackState(groupId), source: 'memory' });
    }

    try {
      const sql = neon(url);
      await ensureTable(sql);
      const rows = await sql`
        select group_id, question_index, status, show_results, registrations, responses, updated_at
        from school_camp_sessions
        where group_id = ${groupId}
        limit 1
      `;
      const row = rows[0] as any;

      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({
        session: row
          ? {
              groupId: row.group_id,
              questionIndex: Number(row.question_index || 0),
              status: normalizeStatus(row.status),
              showResults: Boolean(row.show_results),
              registrations: asRecord(row.registrations),
              responses: asRecord(row.responses) as Record<string, Record<string, string>>,
              updatedAt: new Date(row.updated_at).toISOString(),
            }
          : fallbackState(groupId),
        source: row ? 'neon' : 'default',
      });
    } catch {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ session: fallbackState(groupId), source: 'memory-fallback' });
    }
  }

  if (request.method === 'POST') {
    const nextState: CampSessionState = {
      groupId,
      questionIndex: Math.max(0, Number(request.body?.questionIndex || 0)),
      status: normalizeStatus(request.body?.status),
      showResults: request.body?.showResults === true,
      registrations: asRecord(request.body?.registrations),
      responses: asRecord(request.body?.responses) as Record<string, Record<string, string>>,
      updatedAt: new Date().toISOString(),
    };

    memoryStore.set(groupId, nextState);

    if (!url) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ session: nextState, source: 'memory' });
    }

    try {
      const sql = neon(url);
      await ensureTable(sql);
      await sql`
        insert into school_camp_sessions (group_id, question_index, status, show_results, registrations, responses, updated_at)
        values (
          ${groupId},
          ${nextState.questionIndex},
          ${nextState.status},
          ${nextState.showResults},
          ${JSON.stringify(nextState.registrations)}::jsonb,
          ${JSON.stringify(nextState.responses)}::jsonb,
          now()
        )
        on conflict (group_id)
        do update set
          question_index = excluded.question_index,
          status = excluded.status,
          show_results = excluded.show_results,
          registrations = excluded.registrations,
          responses = excluded.responses,
          updated_at = now()
      `;

      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ session: nextState, source: 'neon' });
    } catch {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({ session: nextState, source: 'memory-fallback' });
    }
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ message: 'Method not allowed.' });
}
