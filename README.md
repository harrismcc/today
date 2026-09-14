# Task Tracker

TanStack Start application deployed as a Cloudflare Worker with a Cloudflare D1 database.

## Local development

```sh
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env (generate one with: openssl rand -base64 32)
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm db:migrate` applies the checked-in Drizzle migrations to Wrangler's isolated local D1 database. Local D1 data is stored under `.wrangler/`.

## Deploy to Cloudflare

Authenticate Wrangler and store the Better Auth secret once:

```sh
pnpm wrangler login
pnpm wrangler secret put BETTER_AUTH_SECRET
```

Then deploy the Worker and apply the database migrations:

```sh
pnpm deploy
pnpm db:migrate:remote
```

The first deploy automatically provisions the `task-tracker` D1 database and writes its Cloudflare ID into `wrangler.jsonc`. Commit that generated ID so future deploys and remote migration commands target the same database.

The default auth host allowlist accepts the generated `*.workers.dev` address. Before attaching a custom domain, add its hostname to the comma-separated `BETTER_AUTH_ALLOWED_HOSTS` value in `wrangler.jsonc`.

For later schema changes, update `src/db/schema.ts`, run `pnpm db:generate`, review the generated SQL, and apply it locally before applying it remotely.
