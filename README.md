# Faculty AI Workspace

An offline-first faculty workspace, built from the supplied specification. It includes tasks, recurring task follow-ups, calendar views and conflict detection, research notes, teaching and administrative templates, student mentoring, documents, manually saved email, reminders, workload charts, search and profile settings.

Records are device-local in browser storage. Uploaded files are stored as blobs in IndexedDB. Backup export includes both; import adds records without deleting existing work. Sample records are fictional and can be cleared from Settings.

The assistant uses explicit offline rules for briefings, keyword lookup, task creation and finding open research time. Templates are not represented as live AI output. Live AI, cloud sync, institutional authentication and external integrations are future features, per the user's request.

`npm run dev` opens the development server. `npm run build` builds the Worker and an offline cache manifest. `node --test scripts/core.test.mjs` checks the domain logic.

Offline use requires an initial online visit and successful service worker activation. The installed app caches the shell and assets; user records are never sent to a server. Browser data removal deletes local work, so export backups regularly. Device privacy is the user's responsibility; this build does not implement local accounts or roles.

WebMCP exposes keyword search and task creation where the browser supports it. Browser-level WebMCP execution has not been verified in this environment. No browser UI testing was requested.
