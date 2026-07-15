# Docty Clinics Patient App

Web application and Vercel serverless APIs for Docty Clinics patient, doctor,
staff, pharmacy, camp, franchise, and executive workflows.

## Technology

- React 19, TypeScript, Vite, and Tailwind CSS
- Vercel Functions and scheduled jobs
- Neon/Postgres and Vercel Blob
- Integrations for Eka Care, eVitalRx, MSG91, Zoho CRM, and Zoho Books

## Local setup

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Fill only the variables needed for the features you are testing. Never commit
`.env.local` or any downloaded provider credentials.

## Checks

```powershell
npm run typecheck
npm run build
```

The production deployment is configured by `vercel.json`. Environment variables
must be recreated in the destination Vercel project; they are intentionally not
included in this repository.

## Publishing under another GitHub account

See [GITHUB_PUBLISHING.md](GITHUB_PUBLISHING.md) for the safe copy procedure,
authentication guidance, and post-publish checks.

## Security

- Keep the repository private unless all code and assets are approved for public release.
- Treat all `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, API key, OAuth, and database values as secrets.
- Rotate any credential that has ever been committed or shared outside an approved secret store.
