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

`pnpm db:migrate` applies the checked-in Drizzle migrations to Wrangler's isolated local D1 database. Local D1 data is stored under `.wrangler/`.

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

For Cloudflare Workers Builds, configure the production branch with:

- Build command: `pnpm run build`
- Deploy command: `pnpm run deploy:production`

Leave the non-production deploy command as `npx wrangler versions upload`. This keeps preview builds from applying migrations to the production database. The production deploy command applies migrations before publishing the Worker, and stops the deployment if a migration fails.

The Worker uses the `task-tracker` D1 database configured in `wrangler.jsonc`.

The default auth host allowlist accepts the generated `*.workers.dev` address. Before attaching a custom domain, add its hostname to the comma-separated `BETTER_AUTH_ALLOWED_HOSTS` value in `wrangler.jsonc`.

For later schema changes, update `src/db/schema.ts`, run `pnpm db:generate`, review the generated SQL, and apply it locally. Production migrations are applied automatically when the production branch deploys. Keep migrations compatible with the currently deployed Worker because they run immediately before the new Worker is published.
