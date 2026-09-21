# Architecture and persistence

## Components

- `src/main.tsx`: React mount point.
- `src/AccountApp.tsx`: login/signup gate, session check, initial database restore, separate offline mode.
- `src/App.tsx`: navigation and academic workflows.
- `src/AccountPanel.tsx`: sync status, connection check, logout and reviewed restore.
- `src/GeminiPanel.tsx`: online drafting with explicit data-sharing confirmation.
- `lib/workspace.ts`: record types, examples, date/conflict logic, templates and IndexedDB files.
- `lib/api.ts`: same-origin API calls and safe error handling.
- `lib/sync.ts`: account cache keys, upload ordering, sync queue and revision checks.
- `server/app.mjs`: Node HTTP API, origin restrictions, session requirements, bounded request bodies and static hosting.
- `server/mongo.mjs`: MongoDB connection pool, password hashing, account sessions, workspaces and GridFS.
- `server/gemini.mjs`: Google REST request, budgets, response cache, timeout and provider error mapping.

## Database selection

`server/config.mjs` selects the connection once at backend startup. `USE_LOCAL_MONGODB=true` uses installed Community on loopback with `MONGODB_LOCAL_PORT` (27017 default). `false`, or an omitted toggle for backwards compatibility, uses `MONGODB_URI`. Both use `MONGODB_DB`. No credentials are sent to the frontend; authenticated status exposes only `mode: community | connection-string` and connection health. Switching requires restarting Node and does not migrate data or fall back to another database.

## MongoDB collections

| Collection | Contents |
|---|---|
| `users` | UUID `_id`, unique lowercase email, display name, salt, scrypt password hash, creation date |
| `sessions` | SHA-256 hash of opaque session token as `_id`, user ID, expiry; expiry TTL index |
| `workspaces` | User ID as `_id`, schema version 1 workspace, revision, update timestamp |
| `uploads.files` / `uploads.chunks` | GridFS file metadata/chunks; file ID is namespaced by authenticated user |
| `connection_checks` | Temporary records created and removed by `db:check` |

Workspace data contains a profile, record list, reminder preference, read-reminder IDs and sample flag. Record kinds are task, event, paper, student, document, course, report and email. A unique user index and session TTL index are initialized on connection; no manual migration command is needed for this version.

## Save and restore

1. The UI writes the changed account workspace to local storage.
2. The sync queue records a pending marker and waits 750 ms to combine nearby edits.
3. New attached files are uploaded from IndexedDB into the user's GridFS namespace.
4. The workspace is saved with `expectedRevision`.
5. MongoDB updates only if that revision matches; successful saves increment it.
6. The UI reports **Saved to MongoDB**. Offline/network failures retain local changes for retry.

A stale revision produces HTTP 409 instead of silently overwriting another device. Pending local work survives reload. If the database advanced since those edits, the app asks you to export a local backup and restore the database copy. You can then import/reconcile the saved local work. This is conflict detection, not automatic record-by-record merging.

Restoring the database copy pauses the old sync queue while fetching the replacement. If fetching fails, the existing queue resumes so later edits can still save; a failed restore does not permanently disable autosave.

GridFS uploads precede the workspace save. These two operations are not one multi-document transaction. Unreferenced uploads may remain after aborted saves or deleted records; automatic garbage collection and historical snapshots are not implemented.

## Browser storage

- Offline workspace: `faculty-workspace-v1`.
- Account workspace: `faculty-workspace-v1:<userId>`.
- Sync metadata: `faculty-sync-v1:<userId>`.
- IndexedDB: `faculty-files-v1`; account files use user-prefixed keys.

Logging out revokes the server session but preserves the local cache to avoid discarding pending work. Local caches are not encrypted. On a shared device, export needed work and clear browser data after use.

## API limits and hosting

JSON request limit is 4 MB, file limit 25 MB. Database selection/connect timeout is 5 seconds. The backend uses a small connection pool. API responses are not cached by the service worker. Gemini and MongoDB credentials never enter the browser bundle.

The production service worker caches only the static shell and listed assets. A previously opened account can keep editing while disconnected; reconnection triggers retry. A fresh offline reload cannot validate a MongoDB session and offers the separate offline workspace instead.
