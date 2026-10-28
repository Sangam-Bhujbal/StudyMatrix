# Security notes

## Public repository

StudyMatrix is intentionally public for demonstration. The repository must not
contain real API keys, service-role keys, private certificates, or personal
credentials.

- `GEMINI_API_KEY` is read only from the hosting provider's environment.
- The browser calls `/api/ai`; it never receives the Gemini key.
- Supabase values entered in Settings are runtime values and are not committed.
- The built-in `demo@studymatrix.app` account is a public demo credential, not
  a private account and must not be used for real data.
- The local login is demo-only client-side authentication. Use a server-backed
  auth provider before adding real users.

If a secret is accidentally exposed, revoke it immediately, remove it from the
repository history, and create a replacement.

## Reporting

For a private report, contact the repository owner through GitHub rather than
opening a public issue with sensitive details.
