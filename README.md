# Today

TanStack Start application deployed as a Cloudflare Worker with a Cloudflare D1 database.

## Local development

```sh
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env (generate one with: openssl rand -base64 32)
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` applies the checked-in Drizzle migrations to Wrangler's isolated local D1 database and seeds a verified test account. Sign in locally with `test@example.com` and `password`. The seed is repeatable and only targets Wrangler's local database. Local D1 data is stored under `.wrangler/`.

## Deploy to Cloudflare

Authenticate Wrangler and store the Better Auth secret once:

```sh
pnpm wrangler login
pnpm wrangler secret put BETTER_AUTH_SECRET
```

Then build, apply the database migrations, and deploy the Worker:

```sh
pnpm run deploy
```

For Cloudflare Workers Builds, use `pnpm run build` as the build command. Its `prebuild`
hook detects a production build from Cloudflare's `WORKERS_CI_BUILD_UUID` and
`WORKERS_CI_BRANCH` variables, applies remote migrations, and stops the build if a
migration fails. The deploy command can remain `npx wrangler deploy`.

The API token selected in **Worker > Settings > Builds** must include **D1: Edit** in
addition to the Worker deployment permissions. Cloudflare's default generated Builds
token does not include D1 access.

Leave the non-production deploy command as `npx wrangler versions upload`. Preview and
local builds skip the production migration hook.

The Worker uses the `task-tracker` D1 database configured in `wrangler.jsonc`.

The auth host allowlist contains only the app's exact Workers address and custom domain. Add other app-controlled hostnames to the comma-separated `BETTER_AUTH_ALLOWED_HOSTS` value in `wrangler.jsonc`.

For later schema changes, update `src/db/schema.ts`, run `pnpm db:generate`, review the generated SQL, and apply it locally. Production migrations are applied automatically during the production branch's build, before the new Worker is published. Keep migrations compatible with the currently deployed Worker because the old Worker can serve traffic between the migration and deployment.
