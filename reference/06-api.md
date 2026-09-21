# API reference

All paths are relative to `/api`. Development proxies these requests through Vite to the Node server. Production uses same-origin Node hosting. Responses contain JSON except file downloads.

| Method/path | Authentication | Input / result |
|---|---|---|
| `GET /health` | None | Minimal service availability |
| `POST /auth/signup` | None | `{name,email,password}`; sets session cookie, returns public user |
| `POST /auth/login` | None | `{email,password}`; sets session cookie, returns public user |
| `GET /auth/session` | Session | Current `{user:{id,name,email}}` |
| `POST /auth/logout` | Existing cookie if any | Revokes session, clears cookie |
| `GET /status` | Session | Database `{configured,connected,mode}` (`community` or `connection-string`) and Gemini model/configuration/budget defaults; never secrets |
| `GET /workspace` | Session | `{workspace,revision,updatedAt?}`; empty account returns null workspace and revision 0 |
| `PUT /workspace` | Session | `{workspace,expectedRevision}`; validates and returns incremented revision |
| `PUT /files/:id` | Session | Raw bytes, at most 25 MB; immutable file ID scoped to the user |
| `GET /files/:id` | Session | Authenticated binary attachment |
| `POST /ai/generate` | Session | `{prompt,context}`; returns `{text,model,cached,truncated}` |

Send `Content-Type: application/json` for JSON mutations. Requests from browser origins outside `ALLOWED_ORIGINS` return 403. Vite's proxy preserves the request's origin. For scripts, retain the session cookie returned by login; do not use a MongoDB URI or Gemini API key as browser authentication.

## Errors

```json
{"error":{"code":"REVISION_CONFLICT","message":"The database changed on another device..."}}
```

Common codes: `INVALID_CREDENTIALS`, `EMAIL_EXISTS`, `INVALID_LOGIN`, `UNAUTHORIZED`, `NOT_CONFIGURED`, `INVALID_WORKSPACE`, `REVISION_CONFLICT`, `MISSING_FILES`, `FILE_CONFLICT`, `FILE_NOT_FOUND`, `AUTH_RATE_LIMIT`, `GEMINI_QUOTA`, `LOCAL_DAILY_LIMIT`, `GEMINI_AUTH`, and `GEMINI_TIMEOUT`.

HTTP status distinguishes invalid input (400), unauthenticated (401), forbidden origin (403), missing resource (404), conflict (409), oversized body (413), wrong content type (415), empty AI output (422), rate limit (429), provider failure (502), unavailable configuration/database (503), and timeout (504). Retryable rate errors may include `Retry-After`. Clients must not automatically retry generation requests.
