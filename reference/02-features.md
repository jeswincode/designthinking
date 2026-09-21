# Implemented features

| Area | What works | Scope and limits |
|---|---|---|
| Signup/login | Name, normalized unique email, password login, session restoration, logout | Passwords require 12–128 characters; no password-reset email, email verification, SSO or role administration yet |
| Dashboard | Live task/event counts, daily agenda, priorities, research entry, weekly workload, create action | Fictional examples are dated when a fresh workspace is created |
| Offline assistant | Rule-based daily briefing, keyword lookup, `create task …`, finding an open two-hour block | This is not a local language model; actions are reviewed before saving |
| Gemini assistant | Explicit prompt/context submission, text drafting, response display, editable document creation | Requires account, backend and configured Gemini key; no autonomous actions, PDF parsing or live research retrieval |
| Tasks | Create/edit/delete, complete/reopen, date, category, priority, notes, checklist items, daily/weekly follow-up on completion, search/filter/sort | Repeating tasks create the next task when completed; calendar recurrence is not implemented |
| Calendar | Day/week/month views, period navigation, events, location, task deadlines, overlap checks, time blocks | Events use local date/time; no timezone conversion or external calendar sync |
| Research | Local library entries, notes, author/source URL, status/tags, uploaded papers, related tasks | Entries must be supplied by the user; no automatic paper discovery, PDF extraction or citation verification |
| Teaching | Course records, progress notes, topic context, lesson-plan and quiz-outline templates, linked work | Templates are editable structures, not verified curriculum or generated answer banks |
| Mentoring | Student profiles, mentoring notes/history, status, follow-up task creation, scheduled meetings | Notes are free text; no student portal or automatic academic-risk scoring |
| Documents | Upload/download, rename/edit/delete, folder/tag classification, keyword search, text preview | Up to 25 MB per file; text extraction only for supported text formats; binary originals are preserved |
| Administration | Report records, draft/status tracking, report and meeting-minute templates, related tasks and events | No automated university submissions or approval routing |
| Email | Manually saved messages, sender/context, reply templates, task/event conversion | No inbox connection and no email sending |
| Notifications | Due/overdue reminders, read state, completion actions, preference switch | Shown while using the app; no background push or email notifications |
| Analytics | Pending/completed/overdue counts, completion percentage, weekly hours, allocation chart, daily bars | Uses planned events, not tracked working time or performance scoring |
| Global search | Keywords across titles, notes, tags and sources, category filtering | No semantic index or external search |
| Settings | Profile/interests, reminders, account/logout, connection status, retry sync, database restore, backups, clear workspace | Database restore and clearing require review; export first if you need local changes |
| Integrations | Gemini configuration guidance, roadmap cards for external services | Google Drive, email, LMS, calendar synchronization and institution SSO remain future work |

## Connected flows

- A task appears in dashboard priorities, calendar deadlines, reminders and analytics.
- A mentoring/research/report/email record can create a follow-up task with its source notes copied across.
- A record can create a calendar work block; conflicts are checked before saving.
- A template or Gemini reply opens an editable document draft; saving adds it to Documents.
- Account edits are cached locally immediately, then automatically saved to that user's MongoDB workspace. Files are uploaded before the workspace references them.
- Export/import moves records and files between the offline workspace, accounts and devices. Import appends records and assigns new IDs.

## Important distinctions

The offline workspace and each account have separate browser caches. Signing up does not silently upload the old offline workspace. Export it in offline Settings, log in, and import that backup if you want to move the data.

Account initialization uses the example workspace when the database is empty. Start fresh in Settings if desired. Research examples and student examples are fictional.
