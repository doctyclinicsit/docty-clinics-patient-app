# Staff Administration

## Route and security

Staff Administration is available at `/staff/administration`.

Access requires two independent sessions:

1. A valid Docty staff session created by the existing staff OTP flow.
2. A fresh administration OTP sent through MSG91 to `STAFF_ADMIN_MOBILE` (default `9063145621`).

Successful verification creates a separate HTTP-only, `Secure`, `SameSite=Strict` cookie that expires after 10 minutes. The administration API rejects requests without both sessions.

## Access model

The administration page retrieves active staff from the existing Eka staff directory and combines them with stored access records from Neon. Administrators can enable or disable:

- Subscriber Cards
- Pharmacy Billing
- Leads
- Corporate Camps
- Doctor Payout
- Franchise Dashboard
- System Logs
- Social Media
- Staff Administration

Existing staff retain baseline access to Cards, Pharmacy Billing, Leads and Corporate Camps until an explicit record overrides it. Existing Eka admins retain their current admin modules by default. The configured super-admin account always retains Staff Administration access.

`staff_module_access` stores the current matrix. `staff_access_audit` records each changed module, previous value, new value, actor and timestamp.

## Enforcement

The staff session endpoint returns the effective module matrix, and the staff landing page uses it for navigation. The Social Media API also verifies `social_media` access server-side. Existing legacy modules keep their current admin/session checks; their individual APIs should adopt `hasStaffModuleAccess()` as they are migrated so direct API access follows the same matrix.

## Environment variables

```text
STAFF_ADMIN_MOBILE=9063145621
MSG91_AUTH_KEY=server-side-secret
MSG91_TEMPLATE_ID=approved-msg91-template
STAFF_SESSION_SECRET=server-side-secret
NEON_DATABASE_URL=postgresql://placeholder
```

Do not put real secret values in source control or expose them in browser responses.
