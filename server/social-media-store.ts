import { neon } from '@neondatabase/serverless';

export type SocialLocation = 'Manikonda' | 'Lanco Hills' | 'Combined';
export type SocialStatus = 'draft' | 'content_review' | 'clinical_review' | 'management_review' | 'approved' | 'scheduled' | 'published' | 'failed';

const julyItems = [
  ['2026-07-14','Combined','Instagram Carousel + Stories','Monsoon Wellness','5 everyday monsoon health precautions','Save this practical monsoon checklist','Save this post and book a consultation if symptoms persist','Education','Ready'],
  ['2026-07-15','Manikonda','Google Business + Instagram Story','24/7 Care','Care that does not watch the clock','Highlight 24/7 General Physician and Pharmacy availability','Call 9989804888 for assistance','Service','Ready'],
  ['2026-07-16','Lanco Hills','Instagram Static + Google Business','Clinic Spotlight','Healthcare closer to Lanco Hills','Introduce the location, core services and neighbourhood convenience','Book your appointment at Docty Clinics – Lanco Hills','Location','Confirm operational status'],
  ['2026-07-17','Combined','Instagram Reel','Doctor-led Education','When should a fever be checked by a doctor?','30-second doctor video: duration, worsening symptoms and warning signs','Consult a qualified doctor for persistent or worsening symptoms','Education','Doctor filming needed'],
  ['2026-07-18','Manikonda','Instagram Static + Google Business','Weekend Care','Your weekend healthcare plan','Promote GP, Dental, Physiotherapy, Diagnostics and Pharmacy','Call now to check availability and book','Service','Ready'],
  ['2026-07-19','Lanco Hills','Instagram Carousel','Services','One clinic, everyday healthcare needs','Slides: GP, Dental, Physiotherapy, Diagnostics, Pharmacy and Specialists','Save the location and contact us for appointments','Service','Confirm services'],
  ['2026-07-20','Combined','Instagram Carousel + Stories','Dental Health','Do not wait for tooth pain','Early signs that merit a dental check-up; avoid diagnostic claims','Schedule a dental consultation','Education','Ready'],
  ['2026-07-21','Manikonda','Google Business','Local Search','General Physician consultation in Manikonda','Concise service post with hours, landmark and appointment number','Call 9989804888 to book','Local SEO','Ready'],
  ['2026-07-22','Lanco Hills','Instagram Static + Google Business','Doctor/Team Spotlight','Meet your neighbourhood care team','Use verified doctor photo, qualification, specialty and schedule','Appointments available—contact the clinic','Doctor','Doctor details needed'],
  ['2026-07-23','Combined','Instagram Reel + Stories','Physiotherapy','Pain, stiffness or limited movement?','Physiotherapist explains how assessment-led care may help','Book a physiotherapy assessment','Education','Filming needed'],
  ['2026-07-24','Combined','Instagram Carousel + Google Business','Total Care','Everyday healthcare, planned for the family','Explain Total Care benefits without overcrowding the creative','Ask us which Total Care plan suits your family','Subscription','Verify current plans/prices'],
  ['2026-07-25','Manikonda','Instagram Static + Stories','Pharmacy','Your neighbourhood pharmacy—open 24 hours','Availability-led message; do not promise specific medicine stock','Visit Docty Clinics, Manikonda','Service','Ready'],
  ['2026-07-26','Lanco Hills','Instagram Reel','Clinic Walkthrough','A quick look inside Docty Clinics – Lanco Hills','15–25 second walkthrough: reception, consultation rooms and services','Visit us or contact us for appointments','Location','Video needed'],
  ['2026-07-27','Combined','Instagram Carousel','Diagnostics','Preparing for a blood test','General preparation tips; explicitly follow the test-specific advice given','Book diagnostic tests with Docty Clinics','Education','Clinical review'],
  ['2026-07-28','Manikonda','Instagram Static + Google Business','Specialists','Specialist consultations close to home','Publish only verified specialties, doctors, dates and times','Call to confirm today’s specialist schedule','Doctor','Roster needed'],
  ['2026-07-29','Lanco Hills','Google Business + Instagram Story','Local Search','Docty Clinics near Lanco Hills','Location, landmark, key services, phone number and map prompt','Get directions and book an appointment','Local SEO','Confirm operational status'],
  ['2026-07-30','Combined','Instagram Reel + Stories','Ask the Doctor','Three common questions patients ask a GP','Short doctor answers; invite general questions, not personal diagnoses','Comment a general health topic for a future video','Engagement','Doctor filming needed'],
  ['2026-07-31','Combined','Instagram Carousel + Google Business','Month-end Round-up','Your July healthcare reminder','Recap preventive check-ups, ongoing medicines and timely consultations','Plan your August appointment today','Engagement','Ready'],
] as const;

let ensured = false;

function sqlClient() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) throw new Error('Social media database is not configured.');
  return neon(url);
}

function requiresClinicalReview(pillar: string, channel: string) {
  return /education|doctor|diagnostic/i.test(pillar) || /reel/i.test(channel);
}

export async function ensureSocialMediaSchema() {
  if (ensured) return;
  const sql = sqlClient();
  await sql`
    create table if not exists social_content_items (
      id bigserial primary key,
      scheduled_for date not null,
      location text not null check (location in ('Manikonda','Lanco Hills','Combined')),
      channels text[] not null default '{}',
      format text not null,
      theme text not null,
      headline text not null,
      content_direction text not null default '',
      call_to_action text not null default '',
      pillar text not null default '',
      production_note text not null default '',
      caption text not null default '',
      google_business_copy text not null default '',
      reel_script text not null default '',
      hashtags text[] not null default '{}',
      led_headline text not null default '',
      led_supporting_line text not null default '',
      status text not null default 'draft',
      requires_clinical_review boolean not null default false,
      content_approved_at timestamptz,
      clinical_approved_at timestamptz,
      management_approved_at timestamptz,
      scheduled_publish_at timestamptz,
      published_at timestamptz,
      created_by text,
      updated_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists social_content_comments (
      id bigserial primary key,
      content_id bigint not null references social_content_items(id) on delete cascade,
      body text not null,
      author_name text,
      author_mobile text,
      author_role text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists social_approval_history (
      id bigserial primary key,
      content_id bigint not null references social_content_items(id) on delete cascade,
      stage text not null,
      decision text not null,
      note text,
      actor_name text,
      actor_mobile text,
      actor_role text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists social_publish_attempts (
      id bigserial primary key,
      content_id bigint not null references social_content_items(id) on delete cascade,
      channel text not null,
      attempt_number integer not null default 1,
      status text not null default 'blocked',
      error_message text,
      provider_reference text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists social_keyword_clusters (
      id bigserial primary key,
      location text not null,
      cluster_name text not null,
      intent text not null,
      keywords text[] not null,
      source text not null default 'Phase 1 seed',
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists social_audit_log (
      id bigserial primary key,
      content_id bigint references social_content_items(id) on delete set null,
      action text not null,
      actor_name text,
      actor_mobile text,
      actor_role text,
      before_state jsonb,
      after_state jsonb,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists social_content_date_idx on social_content_items (scheduled_for, location)`;
  await sql`create index if not exists social_content_status_idx on social_content_items (status)`;

  const countRows = await sql`select count(*)::int as count from social_content_items`;
  if (!Number(countRows[0]?.count)) {
    for (const item of julyItems) {
      const [date, location, format, theme, headline, direction, cta, pillar, note] = item;
      const channels = ['Instagram', /Google Business/i.test(format) ? 'Google Business Profile' : '', /Stories/i.test(format) ? 'Instagram Stories' : ''].filter(Boolean);
      const status = note === 'Ready' ? 'content_review' : note === 'Clinical review' ? 'clinical_review' : 'draft';
      await sql`
        insert into social_content_items (
          scheduled_for, location, channels, format, theme, headline, content_direction,
          call_to_action, pillar, production_note, status, requires_clinical_review, created_by, updated_by
        ) values (
          ${date}, ${location}, ${channels}, ${format}, ${theme}, ${headline}, ${direction},
          ${cta}, ${pillar}, ${note}, ${status}, ${requiresClinicalReview(pillar, format)}, 'July 2026 workbook', 'July 2026 workbook'
        )
      `;
    }
  }
  const keywordCount = await sql`select count(*)::int as count from social_keyword_clusters`;
  if (!Number(keywordCount[0]?.count)) {
    await sql`
      insert into social_keyword_clusters (location, cluster_name, intent, keywords) values
      ('Manikonda','Immediate care','High intent',array['24/7 doctor Manikonda','general physician Manikonda','clinic near me Manikonda','24 hour pharmacy Manikonda']),
      ('Manikonda','Everyday services','Service discovery',array['dental clinic Manikonda','physiotherapy Manikonda','diagnostic tests Manikonda','specialist doctor Manikonda']),
      ('Lanco Hills','Neighbourhood clinic','High intent',array['clinic near Lanco Hills','doctor Lanco Hills','general physician Lanco Hills','Docty Clinics Lanco Hills']),
      ('Lanco Hills','Family care','Service discovery',array['family clinic Lanco Hills','dental clinic Lanco Hills','physiotherapy Lanco Hills','diagnostics Lanco Hills']),
      ('Combined','Brand and local','Navigational',array['Docty Clinics Hyderabad','Docty Clinics near me','neighbourhood clinic Hyderabad','family healthcare Hyderabad'])
    `;
  }
  ensured = true;
}

function publicItem(row: any) {
  return {
    id: String(row.id), scheduledFor: String(row.scheduled_for).slice(0, 10), location: row.location,
    channels: row.channels || [], format: row.format, theme: row.theme, headline: row.headline,
    contentDirection: row.content_direction, callToAction: row.call_to_action, pillar: row.pillar,
    productionNote: row.production_note, caption: row.caption, googleBusinessCopy: row.google_business_copy,
    reelScript: row.reel_script, hashtags: row.hashtags || [], ledHeadline: row.led_headline,
    ledSupportingLine: row.led_supporting_line, status: row.status,
    requiresClinicalReview: Boolean(row.requires_clinical_review), contentApprovedAt: row.content_approved_at,
    clinicalApprovedAt: row.clinical_approved_at, managementApprovedAt: row.management_approved_at,
    scheduledPublishAt: row.scheduled_publish_at, publishedAt: row.published_at, updatedAt: row.updated_at,
  };
}

export async function getSocialWorkspace(filters: { location?: string; status?: string } = {}) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const location = String(filters.location || 'all');
  const status = String(filters.status || 'all');
  const items = location !== 'all' && status !== 'all'
    ? await sql`select * from social_content_items where location=${location} and status=${status} order by scheduled_for, id`
    : location !== 'all'
      ? await sql`select * from social_content_items where location=${location} order by scheduled_for, id`
      : status !== 'all'
        ? await sql`select * from social_content_items where status=${status} order by scheduled_for, id`
        : await sql`select * from social_content_items order by scheduled_for, id`;
  const comments = await sql`select * from social_content_comments order by created_at desc limit 150`;
  const approvals = await sql`select * from social_approval_history order by created_at desc limit 150`;
  const keywords = await sql`select * from social_keyword_clusters order by location, cluster_name`;
  const publishingEnabled = process.env.SOCIAL_PUBLISHING_ENABLED === 'true' && Boolean(process.env.META_ACCESS_TOKEN) && Boolean(process.env.GOOGLE_BUSINESS_CREDENTIALS);
  return {
    items: items.map(publicItem),
    comments: comments.map((row: any) => ({ id:String(row.id), contentId:String(row.content_id), body:row.body, authorName:row.author_name, authorRole:row.author_role, createdAt:row.created_at })),
    approvals: approvals.map((row: any) => ({ id:String(row.id), contentId:String(row.content_id), stage:row.stage, decision:row.decision, note:row.note, actorName:row.actor_name, actorRole:row.actor_role, createdAt:row.created_at })),
    keywords: keywords.map((row:any) => ({ id:String(row.id), location:row.location, clusterName:row.cluster_name, intent:row.intent, keywords:row.keywords, source:row.source })),
    integrations: { publishingEnabled, metaConnected: Boolean(process.env.META_ACCESS_TOKEN), googleConnected: Boolean(process.env.GOOGLE_BUSINESS_CREDENTIALS), healthcareAutoPublish: false },
  };
}

export function generateContentDraft(input: any) {
  const location = String(input.location || 'Combined');
  const topic = String(input.topic || 'Everyday healthcare').trim();
  const service = String(input.service || topic).trim();
  const place = location === 'Combined' ? 'Manikonda and Lanco Hills' : location;
  return {
    headline: `${topic}, closer to home`,
    caption: `${topic} deserves clear, dependable guidance. Docty Clinics offers ${service.toLowerCase()} support for families in ${place}. Availability can vary by clinic—contact our team to confirm and book.`,
    googleBusinessCopy: `Looking for ${service.toLowerCase()} in ${place}? Contact Docty Clinics for current availability, clinic directions and appointment support. Call 9989804888.`,
    reelScript: `Hook: Need help with ${topic.toLowerCase()}?\nPoint 1: Start with a qualified assessment.\nPoint 2: Ask what is available at your nearest Docty clinic.\nPoint 3: Seek timely care if symptoms persist or worsen.\nClose: Contact Docty Clinics in ${place}.`,
    hashtags: ['#DoctyClinics', location === 'Combined' ? '#HyderabadHealthcare' : `#${location.replace(/\s/g,'')}Healthcare`, '#NeighbourhoodClinic', '#FamilyHealth'],
    ledHeadline: topic.split(' ').slice(0, 7).join(' '),
    ledSupportingLine: `${service} support closer to home`,
    disclaimer: 'AI-assisted draft. Verify services, schedules, claims and clinical wording before approval.',
  };
}

export async function createSocialItem(input: any, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const draft = generateContentDraft(input);
  const rows = await sql`
    insert into social_content_items (
      scheduled_for, location, channels, format, theme, headline, content_direction, call_to_action,
      pillar, production_note, caption, google_business_copy, reel_script, hashtags, led_headline,
      led_supporting_line, status, requires_clinical_review, created_by, updated_by
    ) values (
      ${input.scheduledFor}, ${input.location}, ${input.channels || ['Instagram']}, ${input.format || 'Instagram Static'},
      ${input.theme || input.topic || 'Campaign'}, ${input.headline || draft.headline}, ${input.contentDirection || ''},
      ${input.callToAction || 'Contact Docty Clinics to confirm availability'}, ${input.pillar || 'Education'},
      ${input.productionNote || 'AI-assisted draft'}, ${input.caption || draft.caption}, ${input.googleBusinessCopy || draft.googleBusinessCopy},
      ${input.reelScript || draft.reelScript}, ${input.hashtags || draft.hashtags}, ${input.ledHeadline || draft.ledHeadline},
      ${input.ledSupportingLine || draft.ledSupportingLine}, 'draft', ${requiresClinicalReview(input.pillar || 'Education', input.format || '')},
      ${actor.name || actor.mobile}, ${actor.name || actor.mobile}
    ) returning *
  `;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, after_state) values (${rows[0].id}, 'content_created', ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify(rows[0])}::jsonb)`;
  return publicItem(rows[0]);
}

export async function addSocialComment(contentId: string, body: string, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const rows = await sql`insert into social_content_comments (content_id, body, author_name, author_mobile, author_role) values (${contentId}, ${body}, ${actor.name}, ${actor.mobile}, ${actor.staffRole}) returning *`;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, after_state) values (${contentId}, 'comment_added', ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify({body})}::jsonb)`;
  return rows[0];
}

export async function rescheduleSocialItem(contentId: string, scheduledFor: string, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const current = await sql`select * from social_content_items where id=${contentId}`;
  if (!current[0]) throw new Error('Content item not found.');
  const rows = await sql`update social_content_items set scheduled_for=${scheduledFor}, updated_by=${actor.name || actor.mobile}, updated_at=now() where id=${contentId} returning *`;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, before_state, after_state) values (${contentId}, 'content_rescheduled', ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify(current[0])}::jsonb, ${JSON.stringify(rows[0])}::jsonb)`;
  return publicItem(rows[0]);
}

export async function submitSocialContentForReview(contentId: string, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const current = await sql`select * from social_content_items where id=${contentId}`;
  if (!current[0]) throw new Error('Content item not found.');
  if (current[0].status !== 'draft') throw new Error('Only draft content can be submitted for review.');
  const rows = await sql`update social_content_items set status='content_review', updated_by=${actor.name || actor.mobile}, updated_at=now() where id=${contentId} returning *`;
  await sql`insert into social_approval_history (content_id, stage, decision, note, actor_name, actor_mobile, actor_role) values (${contentId}, 'content', 'submitted', 'Submitted for content review.', ${actor.name}, ${actor.mobile}, ${actor.staffRole})`;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, before_state, after_state) values (${contentId}, 'content_submitted', ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify(current[0])}::jsonb, ${JSON.stringify(rows[0])}::jsonb)`;
  return publicItem(rows[0]);
}

export async function reviewSocialContent(contentId: string, stage: string, decision: string, note: string, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const current = await sql`select * from social_content_items where id=${contentId}`;
  if (!current[0]) throw new Error('Content item not found.');
  const allowedStages = ['content','clinical','management'];
  if (!allowedStages.includes(stage) || !['approve','request_changes'].includes(decision)) throw new Error('Invalid review action.');
  const nextStatus = decision === 'request_changes' ? 'draft' : stage === 'content' ? (current[0].requires_clinical_review ? 'clinical_review' : 'management_review') : stage === 'clinical' ? 'management_review' : 'approved';
  const rows = stage === 'content'
    ? await sql`update social_content_items set status=${nextStatus}, content_approved_at=${decision === 'approve' ? new Date().toISOString() : null}, updated_by=${actor.name || actor.mobile}, updated_at=now() where id=${contentId} returning *`
    : stage === 'clinical'
      ? await sql`update social_content_items set status=${nextStatus}, clinical_approved_at=${decision === 'approve' ? new Date().toISOString() : null}, updated_by=${actor.name || actor.mobile}, updated_at=now() where id=${contentId} returning *`
      : await sql`update social_content_items set status=${nextStatus}, management_approved_at=${decision === 'approve' ? new Date().toISOString() : null}, updated_by=${actor.name || actor.mobile}, updated_at=now() where id=${contentId} returning *`;
  await sql`insert into social_approval_history (content_id, stage, decision, note, actor_name, actor_mobile, actor_role) values (${contentId}, ${stage}, ${decision}, ${note}, ${actor.name}, ${actor.mobile}, ${actor.staffRole})`;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, before_state, after_state) values (${contentId}, ${`${stage}_${decision}`}, ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify(current[0])}::jsonb, ${JSON.stringify(rows[0])}::jsonb)`;
  return publicItem(rows[0]);
}

export async function retryPublish(contentId: string, actor: any) {
  await ensureSocialMediaSchema();
  const sql = sqlClient();
  const enabled = process.env.SOCIAL_PUBLISHING_ENABLED === 'true' && Boolean(process.env.META_ACCESS_TOKEN) && Boolean(process.env.GOOGLE_BUSINESS_CREDENTIALS);
  const count = await sql`select count(*)::int as count from social_publish_attempts where content_id=${contentId}`;
  await sql`insert into social_publish_attempts (content_id, channel, attempt_number, status, error_message) values (${contentId}, 'all', ${Number(count[0]?.count) + 1}, 'blocked', ${enabled ? 'Publisher adapter is not enabled in Phase 1.' : 'Credentials are not connected and tested.'})`;
  await sql`insert into social_audit_log (content_id, action, actor_name, actor_mobile, actor_role, after_state) values (${contentId}, 'publish_retry_blocked', ${actor.name}, ${actor.mobile}, ${actor.staffRole}, ${JSON.stringify({enabled:false})}::jsonb)`;
  return { queued: false, publishingEnabled: false, message: 'Publishing remains disabled. Connect and test Meta and Google credentials before enabling retries.' };
}
