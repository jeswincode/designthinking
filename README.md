# Faculty Workspace

Standalone React + TypeScript/Vite with a Node backend, MongoDB account persistence, optional Gemini generation, and a separate offline workspace. No OpenAI Sites required.

## Start locally

```sh
npm install
npm run setup
```

For your installed MongoDB Community, keep its Windows service running and set `USE_LOCAL_MONGODB=true` in `.env` (port 27017 by default). Run `npm run db:check`, then `npm run dev:full` and open Vite's local URL. Create an account to use MongoDB autosave. To use an alternate connection string, set `USE_LOCAL_MONGODB=false` and set `MONGODB_URI`. Restart Node after changing the toggle. See the setup reference for custom ports and the optional bundled MongoDB launcher.

For Gemini, set `GEMINI_ENABLED=true` and `GEMINI_API_KEY` in the server `.env`. The default model is `gemini-2.5-flash-lite`, with conservative request budgets. Live generation is an explicit action in the AI Assistant. No API key is needed for local templates or offline tools.

## Reference

Read [reference/README.md](reference/README.md) for the full feature inventory, setup, architecture, authentication, MongoDB, Gemini free-tier guidance, API and troubleshooting.

## Build and test

```sh
npm test
npm run test:db
npm run build
npm run test:e2e
npm start
```

`npm start` serves the production React build and backend on port 8787. `npm run preview` serves only the static app. Account features require MongoDB and the Node API. Use HTTPS, secure cookies and restricted origins for production.

Academic records are cached on the device and autosaved to the authenticated user's MongoDB workspace; files use IndexedDB and GridFS. Export backups in Settings. Offline mode uses a separate cache and is not silently uploaded when you create an account. Live AI and database credentials stay in the backend `.env`.
