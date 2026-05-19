# CLAUDE.md

Guidance for future agents working in NudgeMail. Keep this short and
edit it when patterns change — it's loaded into context every session.

## Project

NudgeMail is an internal-use Electron desktop app for managing contacts
(grouped by client + assigned staff + client type) and sending merge-field
email campaigns via Outlook (Microsoft Graph) or any SMTP provider.

- Electron 33 + electron-vite (main / preload / renderer bundled separately)
- React 18 + TypeScript 5.7 strict; Tailwind v3 dark-only; Zustand stores
- better-sqlite3 at `userData/nudgemail.sqlite`, WAL, FKs on, 5-backup rotation
- Single-page renderer, view switching via `uiStore.activeView` (no router)
- British English everywhere in user-facing copy ("colour", "Recipients", …)

## Conventions

### IPC

Every handler returns `{ success, data?, error? }`. The preload `invoke<T>()`
helper unwraps it and throws on failure — renderer code is exception-driven,
not envelope-driven. Channels are domain-prefixed (`contacts:list`,
`campaigns:setFilters`, `clientTypes:create`, …). Never introduce `any` in
preload bindings — `src/types/api.ts` is the source of truth for renderer
types and must stay in sync with what `preload.ts` exposes.

### Migrations

DO NOT mutate `electron/database/schema.ts` (the v1 baseline) for new schema
changes. Add a new file under `electron/database/migrations/NNN_*.ts`
exporting `{ version, description, up(db) }`, register it in
`migrations/index.ts`, and bump `CURRENT_SCHEMA_VERSION`. Each migration
runs in its own `db.transaction()` with the `schema_version` row update
inside — partial application is impossible. `ALTER TABLE ADD COLUMN` is
fine in a migration but unsafe in the baseline (re-run would fail).

### Stores

Five stores under `src/stores`: `ui`, `contact`, `template`, `campaign`,
`settings`, plus `clientType`. Stores own load() actions and any mutations
that the renderer needs to chain (e.g. `contactStore.importContacts` calls
`loadList + loadClients + loadTags` after success).

### Components

PascalCase. Shared primitives in `src/components/shared/` —
`Button`, `Input`/`Textarea`/`Select`, `Modal`/`SlideOver`, `Badge`,
`EmptyState`, `TagInput`, `ClientTypePicker`, `AreaSelect`. Tailwind
tokens: `bg-{DEFAULT,elevated,subtle,hover}`, `fg-{DEFAULT,muted,subtle}`,
`accent`, `border`/`border-strong`, plus success/warning/danger. Don't
hardcode hex colours in components.

### UK counties

`src/lib/uk-counties.ts` — 108 entries (48 English ceremonial + 32 Scottish
council areas + 22 Welsh principal areas + 6 NI traditional counties).
**Never** accept area as free-text input — always use `AreaSelect` or the
multi-select in `RecipientFilterBar`. The strict importer (`importContactsStrict`)
rejects rows whose area isn't in this list.

## Subsystems

### Scheduler

`electron/services/campaign-scheduler.ts` runs in the main process. Boots
from `main.ts` after `initDatabase` and IPC registration, fires an
immediate catch-up sweep (so campaigns missed while the app was closed
still run), then ticks every 60s. Each tick:

1. `listDueCampaigns(now)` → campaigns where `is_active = 1` AND `next_run_at <= now()`
2. Broadcasts `campaigns:scheduled-run-started`
3. **Recurring** campaigns: `getCampaignFilters` → `resolveRecipientsForFilters`
   → `materializeRecipientsForRun` rewrites `campaign_emails` from scratch
   so newly-added matching contacts get picked up.
4. **One-off** campaigns: reuse the rows materialised at creation.
5. Advances `last_run_at` / `next_run_at` BEFORE invoking the runner
   (long sends mustn't re-trigger themselves on the next tick).
6. `runCampaign(id)` — existing send loop.
7. Broadcasts `campaigns:scheduled-run-completed`.

Recipient timing decision (hybrid): one-off campaigns lock recipients at
creation; recurring campaigns resolve filters per run. If you change this,
update both `applyCampaignSchedule` in queries and the runner logic.

`computeNextRunAt(schedule, from)` in `electron/utils/schedule.ts` is the
pure function for next-run math. Keep it pure — no DB, no Electron, no
side effects. Weekly clamps to same time next matching weekday; monthly
clamps `day_of_month=31` to the last day of shorter months. All times
resolve in host local TZ via `Intl.DateTimeFormat`.

### Filters

`campaign_filters` rows store `(campaign_id, filter_type, filter_value)`
where `filter_type ∈ {'client_type', 'area'}`. Use `setCampaignFilters`
(transactional replace) and `getCampaignFilters`. Filter semantics:
**AND across dimensions, OR within each** — `clientTypeIds=[a,b]` matches
contacts with type a OR b, but those contacts must also be in one of the
listed `areas` if any are specified. Eligible contacts are
`is_active = 1` AND non-empty email.

### Strict import

`importContactsStrict(filePath)` in `electron/utils/strict-import.ts` is
the canonical import path. Required headers `email`/`first_name`/`last_name`
(case-insensitive); optional `company`/`phone`/`area`/`client_types`/`tags`.
`client_types` and `tags` are semicolon-separated. **Never** auto-create
client types in the importer — unknown names skip the row with a specific
reason. Whole import is one transaction; row-level validation failures
are recorded in `errors[]`; unexpected throws roll the whole import back.

### Preview

`campaigns:preview(campaignId, sampleContactId?)` returns rendered HTML +
subject + missing merge fields + a candidate list (≤100) for the recipient
switcher. The renderer puts the HTML in a sandboxed `<iframe srcDoc>` with
`sandbox=""` (no allow-* flags) so any script or network inside the
compiled email is isolated. **Never** use `dangerouslySetInnerHTML` for
campaign content in the renderer.
