# Tests and troubleshooting

## Commands

```sh
npm test
npm run test:db
npm run build
npm run test:e2e
```

- `npm test`: workspace rules, API missing-configuration/authentication paths, mocked Gemini transport, output handling, budgets, cache and no-retry behavior. No live Gemini requests.
- `test:db`: real temporary MongoDB; signup/login, password hashing, account/file isolation, GridFS bytes, revision conflict, revoked sessions and persistence across backend recreation.
- `build`: TypeScript check, production React build and offline asset manifest.
- `test:e2e`: headless browser against its own temporary database, using the production build. Includes signup, task save, upload, logout, login from a fresh browser context, restored files, offline edits/reconnect, failed restore recovery followed by save/reload, Gemini missing-key behavior and mobile overflow checks.

The MongoDB tests use an isolated database process and stop it afterward. They do not use `.env` or modify your development/Atlas accounts. The first run may download a large MongoDB binary to `.cache/mongodb`.

Browser tests use installed Chrome at its normal Windows path. Override `PLAYWRIGHT_BROWSER_PATH` for another Chrome/Chromium binary. On systems without it, install Playwright's browser with `npx playwright install chromium` and use the bundled browser (the script uses that default on non-Windows systems). Screenshots are saved under `outputs/` and are not committed.

## Common issues

| Symptom | Check |
|---|---|
| Account service unavailable | Start Node (`npm run server`), then MongoDB or configure Atlas; Vite alone cannot log users in |
| Local Community unavailable | Start the installed MongoDB Windows service and check `MONGODB_LOCAL_PORT`; use URI mode if authentication is required |
| URI change has no effect | Set `USE_LOCAL_MONGODB=false`, then restart Node; local mode intentionally ignores the saved URI |
| Signup says Mongo unavailable | Verify `.env`, restart backend, run `npm run db:check`; inspect Atlas user/network access |
| Local port 27018 is busy | An existing local MongoDB may already be running; stop only the process you started |
| Cookie not retained locally | Keep `COOKIE_SECURE=false` on HTTP localhost and use the same hostname throughout |
| 403 origin denied | Add the actual browser origin, including port, to `ALLOWED_ORIGINS`; restart backend |
| Changed SERVER_PORT | Restart both Vite and Node so the proxy reloads configuration |
| Restore fails | The existing account remains usable and autosave resumes. Check backend connectivity, then retry restore if needed |
| Sync stays pending | Check connection status and Retry sync; local changes are preserved |
| Revision conflict | Export local backup, restore database copy, then reconcile/import the backup |
| Missing attachment blocks sync | Re-upload the original or remove its record, then retry |
| Offline records missing after login | Offline mode and account mode are separate; export/import to transfer |
| Gemini unavailable | Enable it, set the key/model in server env, restart, check quota in AI Studio |
| UI stale after deployment | Serve `sw.js` and `offline-assets.js` with no-cache; reconnect/reload to update the shell |

Live Gemini quota/access cannot be verified without a real key. Your replacement MongoDB connection must pass `db:check` once you provide it. Passing isolated tests verifies the implementation, not credentials for a database that has not yet been configured.

## Verified in this workspace

On September 4, 2026, `npm test` passed all 11 tests, `npm run test:db` passed against real MongoDB, the production build passed, and `npm run test:e2e` passed all browser flows listed above. `npm run db:check` also passed against the configured persistent local MongoDB instance.

Live Gemini generation remains unverified until a key is supplied. Its request handling, limits, caching and error paths were tested with mocked responses.

### Backend functionality review

The final review reran all commands above and `npm run db:check`; all passed. The running React preview also returned a successful response from `/api/health` through its backend proxy.

Two restore-recovery defects were corrected: failed database restores now resume the existing autosave queue and close the confirmation dialog so the error and workspace controls remain accessible. The browser regression test simulates a backend failure, adds another task, waits for MongoDB confirmation, reloads, and verifies the saved task is still present.

Validated flows: signup, login, logout, revoked sessions, per-account record/file isolation, upload/download bytes, save revisions, backend restart persistence, fresh-browser restore, offline queue/reconnect, failed restore recovery, reload, and mobile layout. MongoDB checks use real database processes; the UI checks use the production React build and Node API.

### September 7, 2026: installed MongoDB Community toggle

Added `USE_LOCAL_MONGODB` with explicit local/URI selection, custom local port support, backwards compatibility for existing URI-only configurations, and mode-aware connection feedback. `npm test` passed 14 tests, including three new configuration tests. `npm run test:db` passed the real MongoDB account/file persistence lifecycle, and `npm run build` passed.

`npm run db:check` passed ping, insert, read and delete against the installed Windows MongoDB Community service on 127.0.0.1:27017. The current `.env` selects Community mode and preserves the existing alternate URI. The backend and React preview were started with that configuration. No existing workspace records were changed or migrated. The prior full browser verification is recorded above; this configuration update was checked with targeted tests and a production build.
