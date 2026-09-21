# Setup and daily commands

## Requirements

- Node.js 22.13 or newer, npm, and a modern browser.
- MongoDB for accounts and database persistence. Use the included local launcher or MongoDB Atlas.
- A Gemini API key only if you want online generation.

## Initial setup

```sh
npm install
npm run setup
```

`setup` copies `.env.example` to `.env` only when `.env` does not already exist. Secrets belong in `.env`, which is ignored by Git. Do not put database passwords or Gemini keys in a variable beginning with `VITE_`.

## Database toggle

Set the server-side toggle in `.env`, then restart the Node backend:

| Setting | Connection used |
|---|---|
| `USE_LOCAL_MONGODB=true` | Installed MongoDB Community at `127.0.0.1`, using `MONGODB_LOCAL_PORT` (default 27017) |
| `USE_LOCAL_MONGODB=false` | Exact `MONGODB_URI` connection string from `.env` |

`MONGODB_DB` selects the database in both modes. Existing configurations without the toggle continue to use `MONGODB_URI`. There is no automatic fallback to another database if connection fails. Settings → Check connections displays the active mode without exposing the URI.

## Use your installed MongoDB Community

Your laptop's MongoDB Windows service was running and passed read/write verification on port 27017. The current `.env` enables it:

```dotenv
USE_LOCAL_MONGODB=true
MONGODB_LOCAL_PORT=27017
MONGODB_DB=faculty_workspace
```

Keep the MongoDB service running. If it is stopped, start MongoDB from Windows Services. Do not run the bundled `mongo:local` launcher when using your installed service.

```sh
npm run db:check
npm run dev:full
```

Open Vite's printed address, normally http://127.0.0.1:5173. Create an account and check Settings for **Saved to MongoDB**. If Vite is already running, use `npm run server` to start only Node. Stop app processes with Ctrl+C.

## Use a connection string

```dotenv
USE_LOCAL_MONGODB=false
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=faculty_workspace
```

Replace the URI with your Atlas, remote, or authenticated local MongoDB URI. Then restart Node and run `npm run db:check`. This also supports Community installations requiring credentials or extra connection options. Local mode leaves the saved URI intact but ignores it until the toggle is false.

Switching databases does not migrate accounts or records. Log in or create an account in the selected database; use backup/migration tools to transfer existing data. The previous bundled development database on port 27018 remains separate.

## Optional bundled development MongoDB

If MongoDB is not installed, `npm run mongo:local` launches a real local MongoDB on port 27018 with data in `.data/local-mongo`. Use `USE_LOCAL_MONGODB=false` and `MONGODB_URI=mongodb://127.0.0.1:27018`, then run `npm run dev:full` in another terminal. The first launch downloads a large binary into `.cache/mongodb`. The bundled launcher is for local development only.

## Production

```sh
npm run build
npm start
```

The Node server serves `dist/` and `/api` together. Use an HTTPS reverse proxy, set `COOKIE_SECURE=true`, and add the exact public origin to `ALLOWED_ORIGINS`. Set `SERVER_HOST=0.0.0.0` only where your hosting platform requires it. Configure a protected MongoDB deployment. Keep the backend's `.env`, `.data`, source and database directories outside public static hosting.

Static-only deployment of `dist/` still supports the offline workspace, but cannot provide accounts, MongoDB sync or Gemini without a backend routed at `/api`. Hash navigation does not require SPA rewrite rules. The standard Node server mounts the app at the domain root; static-only subfolder deployment remains supported.

`npm run preview` previews static build output only. Use `npm start` to preview account features and APIs together.
