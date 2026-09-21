# Faculty Workspace reference

Start here for the implemented app, configuration, and maintenance.

The working backend is a Node HTTP service with MongoDB accounts, sessions, workspace snapshots, and GridFS file persistence. Use [setup](01-setup.md) to start it and [testing](07-testing.md) for the verified checks and remaining configuration requirements.

1. [Setup and daily commands](01-setup.md)
2. [Every implemented feature](02-features.md)
3. [Architecture and persistence](03-architecture.md)
4. [Gemini free-tier setup](04-gemini.md)
5. [MongoDB Community toggle and account setup](05-mongodb-auth.md)
6. [API reference](06-api.md)
7. [Testing and troubleshooting](07-testing.md)

The app is standalone React + TypeScript/Vite with an optional Node backend. There is no OpenAI Sites dependency. Accounts, MongoDB persistence and Gemini use the backend; the separate offline workspace needs neither an account nor an API key.

Key files: `src/AccountApp.tsx` (authentication), `src/App.tsx` (workspace), `lib/sync.ts` (database sync), `server/app.mjs` (HTTP routes), `server/mongo.mjs` (accounts/storage), `server/gemini.mjs` (AI), and `.env.example` (configuration).
