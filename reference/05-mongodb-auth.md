# MongoDB and authentication

## Installed MongoDB Community and toggle

Set `USE_LOCAL_MONGODB=true` in the server `.env` to connect to your installed Community service at `127.0.0.1:27017`. Change `MONGODB_LOCAL_PORT` for a nonstandard port. Set `USE_LOCAL_MONGODB=false` to use the exact `MONGODB_URI` value, including credentials/options when needed. Restart Node after a change and run `npm run db:check`. Settings → Check connections reports the selected mode.

The toggle is server configuration, shared by the whole app. Existing URI-only configurations remain supported. Switching does not copy accounts or data between databases.

## Optional bundled local database

`npm run mongo:local` runs an actual `mongod` process on 127.0.0.1:27018. `USE_LOCAL_MONGODB=false` with `MONGODB_URI=mongodb://127.0.0.1:27018` selects it. Records persist in `.data/local-mongo`, including users, sessions and files. The launcher does not install a Windows service or require Docker.

Stop the process with Ctrl+C and restart it with the same command to reuse the data. Do not remove `.data/local-mongo` unless you intend to delete the local database.

## Atlas / replacement URI

Create your database deployment in MongoDB Atlas, create a database user, permit the backend's IP in the network access list, and copy the application's connection string. Replace its password placeholder, URL-encode reserved password characters, and set it as `MONGODB_URI` in `.env`. Use a database account scoped to the application's database rather than a broad administrator account.

```dotenv
USE_LOCAL_MONGODB=false
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER/faculty_workspace
MONGODB_DB=faculty_workspace
```

Restart Node after editing `.env`. Run:

```sh
npm run db:check
```

This performs ping, insert, read and delete against a uniquely identified temporary check record. It does not edit workspace records. The script reports errors without printing the URI or password. See [MongoDB Node driver setup](https://www.mongodb.com/docs/drivers/node/current/get-started/) and [GridFS files](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/).

## Authentication

Signup stores a normalized unique email and display name. Passwords use a random salt and scrypt (N=32768, r=8, p=1, 64-byte output); plaintext passwords are not stored. Login creates an opaque random session token. Only its SHA-256 hash is saved in MongoDB.

The browser receives `faculty_session` as an HttpOnly, SameSite=Lax cookie with a seven-day lifetime. Server checks enforce expiry even before MongoDB's TTL cleanup runs. Set `COOKIE_SECURE=true` for HTTPS production. Logout removes the session and clears the cookie. Reusing a revoked token is rejected.

Every workspace and file operation derives user identity from the session, not from a supplied user ID. Different accounts cannot read or overwrite each other's workspace or files. Signup/login have a server-local attempt limit of ten requests per client address per minute.

## Boundaries

This is email/password account authentication, not university SSO. Password recovery, email verification, administrator/student roles, account deletion UI and organization membership are not implemented. Origin validation and JSON-only mutation requests protect browser APIs; production should use HTTPS and an exact allowed-origin list.

Existing accounts live in the selected database. Switching the URI to an empty database does not transfer accounts automatically. Use an appropriate database backup/migration when moving the database; workspace JSON backups transfer academic records/files but do not transfer password hashes or sessions.

Gemini uses the backend's project key and budget shared across its authenticated users. For public registration, add operational abuse controls and shared limits before deploying multiple server instances.

For the current Atlas connection steps, see [Connect to a database deployment](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/).
