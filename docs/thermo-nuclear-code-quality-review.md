# Thermo-nuclear code quality review

**Reviewed:** 2026-09-15

**Baseline:** [`f2b918e`](https://github.com/harrismcc/today/commit/f2b918e42914ec9e784e3145024040ff1dd2be17) on `main`

**Rubric:** [Thermo-Nuclear Code Quality Review](https://raw.githubusercontent.com/cursor/plugins/refs/heads/main/thermos/skills/thermo-nuclear-code-quality-review/SKILL.md)

## Remediation status

**All 13 findings were addressed in the working tree: 10 resolved and 3 explicitly mitigated.**

| Finding | Status | Resolution |
| --- | --- | --- |
| 1. Mutation reconciliation | Resolved | One canonical flat collection, deterministic reconciliation, same-todo single-flight locks, disabled controls, and accessible errors. |
| 2. Global cleanup shortcuts | Resolved | Arrow shortcuts are scoped to the focused cleanup card. |
| 3. Offline OAuth revocation | Resolved by policy change | `offline_access` and refresh grants were removed; MCP access expires after one hour. |
| 4. Conflicting postponed state | Resolved | Completion is `todo \| done`; independent `postponedAt` preserves whether a later reschedule occurred. |
| 5. Midnight rollover | Resolved | The local-day anchor updates at midnight, focus, and visibility changes. |
| 6. Destructive migration `0002` | Mitigated | Published history is unchanged; upgrade precautions and the unrecoverable ownership gap are documented in `drizzle/README.md`. |
| 7. Split todo contracts | Resolved | Validation, date operations, filters, ordering, and reconciliation share one domain module; repository filters execute in SQL. |
| 8. Cleanup state machine | Resolved | One reducer-owned interaction phase replaces overlapping refs and booleans. |
| 9. OAuth continuation | Resolved | Typed route search is the sole source for guards, links, and submissions, including SSR. |
| 10. MCP JWKS cast | Mitigated | The upstream 1.7.4 mismatch remains, but the cast is isolated behind a validated, tested adapter. |
| 11. Partial PWA lifecycle | Resolved | Navigations are network-only with a static offline fallback; waiting workers activate through an explicit update prompt. |
| 12. Duplicate auth machinery | Resolved | One request-scoped factory owns the Better Auth configuration, preserving Cloudflare's I/O context; the canonical HIBP reset-password path replaces custom middleware. |
| 13. Open registration | Mitigated | Standards-compatible registration remains enabled with a five-per-minute, trusted-IP limit; storage is per Worker isolate, not global. |

Integrated verification passed: 11 domain/OAuth/MCP tests, 3 generated-service-worker tests, the production build and TypeScript check, local migration `0007`, OAuth discovery and registration probes, and browser checks for postponed-plus-done rendering and cleanup keyboard isolation.

## Original verdict

The findings below describe the reviewed baseline commit, not the remediated working tree.

**Changes required: 6 high-priority and 7 medium-priority findings.**

The strongest simplification is to establish one todo domain model and one mutation/reconciliation path. Today, scheduling semantics, validation, filtering, and client state are independently reconstructed in the web UI, cleanup UI, server functions, repository, and MCP adapter. Authentication has a similar but smaller ownership problem around OAuth grant lifecycle and route continuation.

No source file is near the rubric's 1,000-line threshold. The concern is not raw file size; it is state and policy duplicated across otherwise modest files.

## High priority

### 1. Todo mutations can race and leave the client inconsistent with the database

**Evidence:** [`todo-list.tsx:37-64`](../src/components/todo-list.tsx#L37-L64), [`todo-list.tsx:96-185`](../src/components/todo-list.tsx#L96-L185), [`todo-item.tsx:7-23`](../src/components/todo-item.tsx#L7-L23)

`TodoList` is a hand-built cache: `byDay`, `localDataVersion`, and `refreshInFlight` sit beside four mutation-specific patches. Controls stay enabled while requests run, and `TodoItem` declares async callbacks as returning `void`, so rejected promises are discarded by click handlers.

A concrete race is **postpone + complete** on the same item. If postpone finishes first, it moves the local item to tomorrow. A later status response patches only the captured old `key`, so the UI leaves tomorrow's item postponed while the database says done. Delete combined with another mutation can also produce an unhandled `Todo not found` rejection.

**Recommendation:** Make one layer own mutation state and reconciliation. The cleanest move is to invalidate/refetch canonical route data after each mutation instead of maintaining four cache-patching algorithms. If local patching is retained, serialize operations per todo, disable the affected controls, normalize every returned todo by removing its ID from all buckets and inserting it by `updated.scheduledDate`, and expose an announced error/retry state.

### 2. Global cleanup shortcuts can delete a task while another control has focus

**Evidence:** [`cleanup-mode.tsx:214-228`](../src/components/cleanup-mode.tsx#L214-L228), [`cleanup-mode.tsx:240-256`](../src/components/cleanup-mode.tsx#L240-L256)

The `window` keydown handler excludes inputs and open menu roles, but not ordinary buttons or links. With “Back to main list” or the menu trigger focused, pressing Left Arrow deletes the current task; Right Arrow postpones it.

**Recommendation:** Scope keyboard handling to a focused cleanup controller/card region. Do not maintain a growing global exclusion list for a destructive command.

### 3. Offline OAuth access has no user-owned revocation lifecycle

**Evidence:** [`auth.server.ts:126-133`](../src/lib/auth.server.ts#L126-L133), [`consent.tsx:25-28`](../src/routes/consent.tsx#L25-L28), [`settings.account.tsx:17-61`](../src/routes/settings.account.tsx#L17-L61)

The MCP provider grants `offline_access`, and consent promises access lasts “until you revoke access,” but no route or server function lists or revokes connected applications. Better Auth 1.7.4 deliberately preserves `offline_access` refresh tokens when browser sessions are revoked, so logout and password reset do not give the user an incident-recovery path.

**Recommendation:** Either remove `offline_access`, or add a canonical Connected Applications service and settings page that list grants and revoke consent plus associated refresh/access tokens. Explicitly decide whether password reset should revoke these grants.

### 4. `postponed` has two incompatible meanings

**Evidence:** [`schema.ts:307-327`](../src/db/schema.ts#L307-L327), [`todos.server.ts:36-86`](../src/data/todos.server.ts#L36-L86), [`mcp.server.ts:113-127`](../src/lib/mcp.server.ts#L113-L127)

The web postpone operation sets `status = 'postponed'` and moves the date. MCP exposes `postponed` through the generic status setter, which leaves the date unchanged. The model therefore cannot say whether postponement is current state, a scheduling command, or historical metadata.

**Recommendation:** Remove `postponed` from generic status. Model current completion as `todo | done`, and expose one absolute `rescheduleTodo(userId, id, targetDate)` transition to web, cleanup, and MCP. Record a separate event/timestamp only if postponement history is a product requirement.

### 5. “Today” becomes yesterday in long-lived sessions

**Evidence:** [`todo-list.tsx:85-94`](../src/components/todo-list.tsx#L85-L94), [`todo-list.tsx:169-179`](../src/components/todo-list.tsx#L169-L179), [`todo-list.tsx:187-193`](../src/components/todo-list.tsx#L187-L193)

`viewed` is memoized only from `offset`. If the installed app remains open across local midnight, the heading still says “Today” while `key` remains yesterday, and new tasks are written to yesterday. Background todo refresh does not recompute the date.

**Recommendation:** Track a canonical local-day key that updates at the next local midnight, then derive the selected day from that key and `offset`. Put local calendar-key operations in the shared todo domain module.

### 6. Migration `0002` is an irreversible data-loss upgrade

**Evidence:** [`0002_plain_hammerhead.sql:1-14`](../drizzle/0002_plain_hammerhead.sql#L1-L14)

Applying `0002` to any database that completed `0000` and contains todos drops the table before recreating it with `user_id`. This is a historical/upgrade hazard, not evidence that current production data was lost; the migration may already have run.

**Recommendation:** First determine where `0002` remains unapplied and whether the original destructive cutover was intentional. Do not rewrite an already-applied migration. For any pending upgrade path, backfill ownership explicitly (or fail if rows exist) before enforcing `NOT NULL`; document recovery for environments that already lost rows.

## Medium priority

### 7. Domain contracts live in transport adapters instead of the todo domain

**Evidence:** [`todos.ts:5-58`](../src/data/todos.ts#L5-L58), [`mcp.server.ts:22-38`](../src/lib/mcp.server.ts#L22-L38), [`mcp.server.ts:61-78`](../src/lib/mcp.server.ts#L61-L78), [`todos.server.ts:6-18`](../src/data/todos.server.ts#L6-L18)

Date validation is duplicated in server-function and MCP adapters, while repository functions still accept plain strings. `listTodos` can only read every active row, so MCP and cleanup filter independently after broad reads. A new caller can bypass calendar/text invariants, and policy changes can drift between transports.

**Recommendation:** Create one small todo-domain contract module with parsed `DateKey`, normalized bounded text, status/reschedule schemas, and typed list filters. Make repository functions accept parsed inputs and compile filters into SQL. Add a database date-shape constraint as defense in depth.

### 8. Cleanup mode is an implicit callback-driven state machine

**Evidence:** [`cleanup-mode.tsx:36-105`](../src/components/cleanup-mode.tsx#L36-L105), [`cleanup-mode.tsx:156-212`](../src/components/cleanup-mode.tsx#L156-L212), [`cleanup-mode.tsx:287-312`](../src/components/cleanup-mode.tsx#L287-L312)

One interaction phase is spread across `pending.current`, `isActing`, `isInputLocked`, `exitDirection`, `committed`, `exitTarget`, `onReady`, animation completion, and exit completion. Failure recovery already requires coordinated resets in both parent and card; adding cancellation or retries will add more branch coupling.

**Recommendation:** Give one controller/reducer an explicit phase such as `entering | ready | committing | recovering | complete`. Derive locks and animation props from that phase, and keep `CleanupCard` presentational.

### 9. OAuth continuation has competing sources of truth

**Evidence:** [`login.tsx:17-31`](../src/routes/login.tsx#L17-L31), [`login.tsx:40-67`](../src/routes/login.tsx#L40-L67), [`login.tsx:189-199`](../src/routes/login.tsx#L189-L199), [`signup.tsx:26-58`](../src/routes/signup.tsx#L26-L58)

Login and signup derive continuation in route guards, mount effects, submit handlers, and link rendering. Links initially render without continuation until hydration; a fast/pre-hydration click abandons OAuth. Search changes can also leave link state different from submit state.

**Recommendation:** Validate continuation once at each route boundary and consume `Route.useSearch()` as the typed source. Keep preservation of Better Auth's signed raw query in one adapter; remove the effects and direct `window.location.search` reads.

### 10. MCP verification depends on a contract-breaking cast

**Evidence:** [`mcp.server.ts:165-185`](../src/lib/mcp.server.ts#L165-L185)

The public `jwksUrl` type is a URL string, but the code passes an async loader through `unknown as string` because Better Auth's current runtime forwards it as `jwksFetch`. This hides a real Cloudflare self-fetch constraint behind a type lie. A dependency change that follows the public contract can break every authenticated MCP request without a compiler error.

**Recommendation:** Isolate this in one tested JWKS-source adapter and move to a supported Better Auth contract when available. Keep the compatibility workaround out of request orchestration and pin it with a focused token-verification integration test.

### 11. The service worker has no complete offline or update policy

**Evidence:** [`vite.config.ts:32-41`](../vite.config.ts#L32-L41), [`__root.tsx:69-76`](../src/routes/__root.tsx#L69-L76)

The worker precaches 40 static assets but has no navigation fallback. It also sets `skipWaiting: false` while registration ignores waiting workers, so a long-lived installed app can remain on old code indefinitely. The current setup pays PWA lifecycle complexity without owning either offline navigation or updates.

**Recommendation:** Choose one explicit policy. For an online-first authenticated app, provide a safe static offline navigation response and a user-visible update flow that activates the waiting worker and reloads on `controllerchange`. If neither behavior is required, remove broad precaching rather than retaining a partial PWA layer.

### 12. Auth construction and password policy duplicate canonical machinery

**Evidence:** [`auth.server.ts:46-137`](../src/lib/auth.server.ts#L46-L137), [`auth-session.server.ts:3-7`](../src/lib/auth-session.server.ts#L3-L7), [`mcp.server.ts:165-169`](../src/lib/mcp.server.ts#L165-L169)

Every session read, auth route, discovery request, and MCP request constructs a new Better Auth instance even though configuration and Worker bindings are module-stable. The configuration also overrides the HIBP plugin's default paths to exclude `/reset-password`, then reimplements that exact check in a global hook.

**Recommendation:** Export one module-level auth instance. Restore `/reset-password` to the HIBP plugin path list and delete the bespoke middleware, direct `isPasswordCompromised` call, duplicate message, and duplicate bounds branch.

### 13. Unauthenticated client registration has no application-owned resource boundary

**Evidence:** [`auth.server.ts:126-133`](../src/lib/auth.server.ts#L126-L133)

Any Internet client can persist OAuth client registrations. The repository contains no quota, rate limit, registration policy, or stale-client cleanup. External Cloudflare controls were not visible during this review, so this is conditional on no equivalent edge policy existing.

**Recommendation:** Prefer MCP client metadata documents where compatibility permits. Otherwise put dynamic registration behind an explicit rate-limited policy with quotas and cleanup rather than exposing raw unauthenticated persistence.

## Recommended implementation order

1. **Stop destructive and stale client behavior:** scope cleanup shortcuts, introduce per-todo pending/error handling, and fix the midnight clock.
2. **Simplify the todo model:** replace `postponed` status with canonical rescheduling, centralize schemas/date logic, and make list filtering repository-owned.
3. **Complete authorization lifecycle:** add grant revocation or remove `offline_access`; then centralize OAuth continuation and auth construction.
4. **Harden integration seams:** replace or isolate the JWKS cast, define dynamic-registration limits, and choose a complete service-worker policy.

## Positive findings

- Every todo read and mutation scopes by `userId`; active-row mutations also require `deletedAt IS NULL`.
- Individual todo updates use one SQL statement with `RETURNING`; no partial multi-statement CRUD update was found.
- MCP validates Host and Origin before auth and verifies issuer, audience, expiry, scope, subject, client ID, and DPoP replay state.
- OAuth continuation rejects external origins and paths outside `/api/auth/oauth2/authorize`; no open redirect was found.
- No implementation file exceeds 400 lines, excluding generated code; none approaches 1,000 lines.

## Verification and limits

- Traced the production route, auth/session, todo CRUD, cleanup, MCP, OAuth, settings, and service-worker paths.
- Inspected the installed Better Auth/MCP 1.7.4 implementation for HIBP defaults, `offline_access` logout behavior, dynamic registration, and JWKS verification.
- `pnpm run build` passed, including `tsc --noEmit`; it generated a 40-file service-worker precache. The only warning was the expected missing local `RESEND_API_KEY` secret.
- The repository has no automated test files. The build does not exercise concurrency, midnight rollover, keyboard focus, OAuth grant revocation, or migration upgrades.
- No production writes, OAuth grants, email sends, or migration applications were performed. External rate limits, D1 backups, and already-applied migration state were not observable from repository code.
