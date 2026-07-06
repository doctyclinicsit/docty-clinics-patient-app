import { neon } from '@neondatabase/serverless';

export type SystemLogLevel = 'info' | 'success' | 'warning' | 'error';

export interface SystemLogInput {
  level?: SystemLogLevel;
  source: string;
  event: string;
  message: string;
  actorName?: string;
  actorMobile?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemLogFilters {
  limit?: number;
  level?: string;
  source?: string;
  query?: string;
}

let ensured = false;

function connectionString() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

function sqlClient() {
  const databaseUrl = connectionString();
  if (!databaseUrl) throw new Error('System log database is not configured.');
  return neon(databaseUrl);
}

async function ensureSystemLogTable(sql: any) {
  if (ensured) return;
  await sql`
    create table if not exists system_logs (
      id bigserial primary key,
      created_at timestamptz not null default now(),
      level text not null default 'info',
      source text not null,
      event text not null,
      message text not null,
      actor_name text,
      actor_mobile text,
      metadata jsonb not null default '{}'::jsonb
    )
  `;
  await sql`create index if not exists system_logs_created_at_idx on system_logs (created_at desc)`;
  await sql`create index if not exists system_logs_source_idx on system_logs (source)`;
  await sql`create index if not exists system_logs_level_idx on system_logs (level)`;
  ensured = true;
}

export async function writeSystemLog(input: SystemLogInput) {
  const sql = sqlClient();
  await ensureSystemLogTable(sql);
  const level = input.level || 'info';
  const metadata = JSON.stringify(input.metadata || {});
  const rows = await sql`
    insert into system_logs (
      level,
      source,
      event,
      message,
      actor_name,
      actor_mobile,
      metadata
    )
    values (
      ${level},
      ${input.source},
      ${input.event},
      ${input.message},
      ${input.actorName || null},
      ${input.actorMobile || null},
      ${metadata}::jsonb
    )
    returning
      id,
      created_at,
      level,
      source,
      event,
      message,
      actor_name,
      actor_mobile,
      metadata
  `;
  return rows[0];
}

export async function safeWriteSystemLog(input: SystemLogInput) {
  try {
    await writeSystemLog(input);
  } catch {
    // Logging should never block the operational flow.
  }
}

export async function listSystemLogs(filters: SystemLogFilters = {}) {
  const sql = sqlClient();
  await ensureSystemLogTable(sql);
  const limit = Math.min(200, Math.max(1, Number(filters.limit) || 80));
  const source = String(filters.source || '').trim();
  const level = String(filters.level || '').trim();
  const query = String(filters.query || '').trim();

  if (source && level && query) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where source = ${source}
        and level = ${level}
        and (message ilike ${`%${query}%`} or event ilike ${`%${query}%`} or actor_name ilike ${`%${query}%`} or actor_mobile ilike ${`%${query}%`})
      order by created_at desc
      limit ${limit}
    `;
  }

  if (source && level) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where source = ${source} and level = ${level}
      order by created_at desc
      limit ${limit}
    `;
  }

  if (source && query) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where source = ${source}
        and (message ilike ${`%${query}%`} or event ilike ${`%${query}%`} or actor_name ilike ${`%${query}%`} or actor_mobile ilike ${`%${query}%`})
      order by created_at desc
      limit ${limit}
    `;
  }

  if (level && query) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where level = ${level}
        and (message ilike ${`%${query}%`} or event ilike ${`%${query}%`} or actor_name ilike ${`%${query}%`} or actor_mobile ilike ${`%${query}%`})
      order by created_at desc
      limit ${limit}
    `;
  }

  if (source) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where source = ${source}
      order by created_at desc
      limit ${limit}
    `;
  }

  if (level) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where level = ${level}
      order by created_at desc
      limit ${limit}
    `;
  }

  if (query) {
    return sql`
      select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
      from system_logs
      where message ilike ${`%${query}%`} or event ilike ${`%${query}%`} or actor_name ilike ${`%${query}%`} or actor_mobile ilike ${`%${query}%`}
      order by created_at desc
      limit ${limit}
    `;
  }

  return sql`
    select id, created_at, level, source, event, message, actor_name, actor_mobile, metadata
    from system_logs
    order by created_at desc
    limit ${limit}
  `;
}
