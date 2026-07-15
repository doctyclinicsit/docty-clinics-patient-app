# Docty Social Media Management — Phase 1 Architecture

## Outcome

Phase 1 is integrated into the existing Docty Clinics patient/staff application at `/staff/social-media`. It reuses the Vite/React frontend, existing UI primitives and branding, the signed HTTP-only staff session, Vercel serverless APIs, Neon Postgres, and the current Vercel deployment.

Live Meta and Google publishing is deliberately disabled. Healthcare content cannot be automatically published, and approval is not treated as permission to bypass the connection/feature-flag gate.

## Repository architecture discovered

- Frontend: React 19 + TypeScript + Vite, React Router, Tailwind CSS 4, Radix/shadcn-style components in `src/components/ui`, Poppins and Docty pink/blue theme tokens in `src/index.css`.
- State/data: local React state, TanStack Query available, and same-origin `fetch` calls to `/api`.
- Authentication: sealed HTTP-only staff cookie in `server/staff-session.ts`; APIs resolve the cookie server-side. The session exposes mobile, name, staff role and admin status.
- Backend: file-based Vercel functions under `api`; shared server modules under `server` and `api/_lib`.
- Database: Neon/Postgres through `@neondatabase/serverless`. Existing modules use safe, idempotent `create table if not exists` bootstrapping.
- Audit: `system_logs` already exists. The social module adds a purpose-built immutable audit stream because content approvals need before/after state and content linkage.
- Deployment: Vercel SPA rewrites plus serverless functions. No general background-job framework exists in the repository.
- Storage: Vercel Blob is installed and used elsewhere; Phase 1 does not upload or mutate media.
- Testing: TypeScript and production build scripts exist; no unit/E2E test runner is currently configured.

## Phase 1 file placement

- `src/pages/staff-social-media.tsx`: dashboard, month/week/list calendar, content studio, approval centre and local-search clusters.
- `api/staff/social-media.ts`: authenticated, role-gated API boundary.
- `server/social-media-store.ts`: schema bootstrap, non-destructive July seed, content generation mock, workflow mutations and audit writes.
- `src/app.tsx`, `vercel.json`, `src/pages/staff-cards.tsx`: protected staff navigation and route integration.

## Route and page hierarchy

`/staff/social-media` is an internal page, so the public header/footer/chatbot remain hidden by the existing layout rule. The page uses five work areas:

1. Dashboard — upcoming posts, review counts, failures, integration safety status and analytics freshness.
2. Calendar — month, week and list views with location/channel/status/search filters and date rescheduling.
3. Content Studio — grounded brief, server-generated channel variants, editable copy, hashtags, reel script and a 6:4 portrait LED preview.
4. Approval Centre — role-specific actions, comments and approval history.
5. Local Search — explicit location clusters and transparent mock-provider state.

## Location model

Phase 1 uses the three workbook contexts exactly: `Manikonda`, `Lanco Hills`, and `Combined`. Every content record requires one context, every calendar card shows it, and local filters do not silently treat combined content as a location-specific claim.

Lanco Hills content from the workbook retains operational verification notes. It is not eligible to skip review because a draft exists.

## Role and permission matrix

| Module role | View | Create/reschedule/comment | Content review | Clinical review | Management approval | Retry publishing |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Content Creator | Yes | Yes | Yes | No | No | No |
| Clinical Reviewer | Yes | No | No | Yes | No | No |
| Management Approver | Yes | No | No | No | Yes | No |
| Publisher | Yes | No | No | No | No | Yes |
| Viewer | Yes | No | No | No | No | No |

Existing free-form staff roles are mapped on the server. Admin sessions receive all module permissions. Unknown staff roles become Viewer, which is the safe default.

## Approval states

```text
Draft
  -> Content Review
      -> Clinical Review (medical/doctor/diagnostic/reel content)
      -> Management Approval (non-clinical content)
  -> Clinical Review -> Management Approval
  -> Management Approval -> Approved
  -> Approved -> Scheduled -> Published

Any review stage -> Changes Requested -> Draft
Publishing error -> Publish Failed -> controlled retry
```

Phase 1 implements Draft, Content Review, Clinical Review, Management Approval, Approved and Changes Requested. Scheduling/publishing job execution remains a later phase. Approval actions and comments are appended to dedicated immutable tables and mirrored in `social_audit_log` with actor identity.

## Healthcare safety classification

Phase 1 flags education, doctor, diagnostic and reel content for clinical review. A production version should expand this into a versioned rules table covering symptoms, treatment, diagnosis, medicine, procedures, test preparation, health claims and doctor advice. Missing or unverified doctor, service, schedule, price, offer or location facts must remain review notes, never generated facts.

## AI boundary

The Phase 1 generator is a deterministic server-only mock provider. It creates distinct Instagram, Google Business, reel and LED variants and labels them as AI-assisted drafts. It does not call an external model or expose credentials.

The production adapter boundary should accept verified clinic/service/doctor/offer record IDs and return a structured schema with `needs_review` flags. It must store prompt version, model ID, generation time, source record IDs and validation outcome without patient data or secrets.

## Publishing adapter boundaries

- Meta adapter: OAuth connection, permission/health check, media validation, idempotency key, create post, provider ID and sanitised error metadata.
- Google Business adapter: OAuth connection, account/location mapping, supported post type validation, idempotency and provider ID.
- LED adapter: ordered manifest/export first; controller delivery only after controller capabilities are known.

All live adapters require server-side encrypted tokens, least-privilege scopes and retry classification. Phase 1 exposes only connection flags and a blocked retry record. `SOCIAL_PUBLISHING_ENABLED=true` alone is insufficient: both Meta and Google credential-presence checks must also pass, and the Phase 1 adapter still refuses to publish.

## Data and seed behaviour

The store creates social tables idempotently and seeds the 18 calendar rows from 14–31 July 2026 only when `social_content_items` is empty. It never overwrites production content. Five local keyword clusters are seeded separately when their table is empty.

## Environment variables

```text
NEON_DATABASE_URL=postgresql://placeholder
STAFF_SESSION_SECRET=placeholder
SOCIAL_MEDIA_ENABLED=true
SOCIAL_PUBLISHING_ENABLED=false
META_ACCESS_TOKEN=
GOOGLE_BUSINESS_CREDENTIALS=
```

Do not put real values in source control. `SOCIAL_MEDIA_ENABLED=false` disables the server API; the current Phase 1 route is also protected by staff authentication and role-gated mutations.

## Migration and rollback

The running code follows the repository convention of idempotent schema bootstrap. For controlled production rollout, capture the emitted DDL in a numbered migration, apply it first in a development Neon branch, verify row counts and indexes, then apply to production.

Rollback is non-destructive by default: remove the route/navigation and disable the feature flag while retaining content and audit data. Dropping tables is not recommended. If a destructive rollback is approved, export the `social_*` tables first and drop child tables before `social_content_items`.

## Risks and unresolved inputs

- Existing staff roles are free-form; named social roles need an administrable role mapping before production.
- The repository has no queue/worker convention; scheduled publishing needs an explicit Vercel Cron/queue decision.
- Meta/Google account eligibility, OAuth applications and API permissions are unverified.
- Clinic addresses, Lanco Hills operational status/services, doctor rosters and Total Care terms have not been supplied as verified system data.
- The LED controller and delivery API are unknown.
- No test runner is configured. Phase 1 can be checked with typecheck/build, but workflow unit/integration/E2E coverage needs a repository-approved test stack.
- Revision hash locking and approved-revision-only publishing should be completed before any scheduling queue is enabled.

## Acceptance gate before Phase 2/live work

Confirm verified clinic/service/doctor/offer data sources, approve the social role mapping, choose the job runner, and provide test (not production) Meta/Google applications. Live publishing must remain disabled until provider health checks, idempotency, token revocation and a clearly labelled test publication are verified with explicit approval.
