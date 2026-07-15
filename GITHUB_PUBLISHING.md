# Publish this project to another GitHub account

The current repository uses this remote:

```text
origin  https://github.com/doctyclinicsit/docty-clinics-patient-app.git
```

The procedure below creates a copy at
`https://github.com/DoctyHealthcare/DoctyClinics` while keeping `origin`
unchanged. Use a private destination repository unless the project has been
explicitly approved for public release.

## 1. Prepare the destination account

1. Sign in to the `DoctyHealthcare` GitHub account or organization.
2. Create the `DoctyClinics` repository if it does not already exist.
3. Select **Private**.
4. Do not initialize it with a README, `.gitignore`, or license.
5. Copy the new repository HTTPS URL.

## 2. Review and commit this working tree

This checkout contains work newer than the last commit. Review it before creating
the publication commit:

```powershell
Set-Location "C:\Users\pbijj\Documents\Codex\docty-clinics-patient-app"
git status
git diff --stat
git diff
```

Confirm that local environment files are ignored:

```powershell
git check-ignore .env.local .env.mapper.local
```

Both paths should be printed. Then commit the intended source files:

```powershell
git add --all
git status
git commit -m "Prepare project for GitHub publication"
```

Carefully inspect `git status` before committing. Files such as `.env.local`,
`.vercel`, `node_modules`, `dist`, logs, and ZIP archives must not appear.

## 3. Authenticate as the destination account

With GitHub CLI installed:

```powershell
gh auth logout --hostname github.com
gh auth login --hostname github.com --git-protocol https --web
gh auth status
```

Complete the browser sign-in using the destination account. If Git Credential
Manager presents an account picker during push, select the destination account.

## 4. Add a second remote and push

```powershell
git remote add destination https://github.com/DoctyHealthcare/DoctyClinics.git
git remote -v
git push -u destination main
```

If `destination` already exists, update it instead:

```powershell
git remote set-url destination https://github.com/DoctyHealthcare/DoctyClinics.git
git push -u destination main
```

This preserves `origin`, so future pushes can explicitly target either remote:

```powershell
git push origin main
git push destination main
```

## 5. Verify the GitHub copy

On the destination repository page, verify that:

- The default branch is `main`.
- `README.md`, `api`, `src`, `server`, and `vercel.json` are present.
- No `.env*`, `.vercel`, `node_modules`, `dist`, logs, or ZIP files are present.
- The repository visibility is **Private**.
- Branch protection and collaborator access match your requirements.

## 6. Deploy from the destination repository (optional)

Import the new repository into a new or transferred Vercel project. Recreate all
required values from `.env.example` in Vercel Environment Variables. Do not copy
secret values into GitHub files. Confirm the production domain, cron jobs, database,
Blob store, OAuth callback URLs, webhook URLs, and provider allowlists before
enabling traffic.

## Alternative: transfer instead of copy

If the original repository should move completely—and you have administrator
permission—use GitHub repository **Settings > General > Danger Zone > Transfer**.
A transfer preserves repository metadata better than creating a copy, but it also
changes ownership of the original. Do not use transfer when both accounts need
independent repositories.
