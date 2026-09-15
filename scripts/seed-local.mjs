import { spawnSync } from 'node:child_process'

import { hashPassword } from 'better-auth/crypto'

const email = 'test@example.com'
const passwordHash = await hashPassword('password')
const now = Date.now()

function sql(value) {
  return `'${value.replaceAll("'", "''")}'`
}

const statements = `
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES ('local-test-user', 'Test User', ${sql(email)}, 1, ${now}, ${now})
ON CONFLICT(email) DO UPDATE SET email_verified = 1, updated_at = ${now};

INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT 'local-test-credential', id, 'credential', id, ${sql(passwordHash)}, ${now}, ${now}
FROM user
WHERE email = ${sql(email)}
  AND NOT EXISTS (
    SELECT 1 FROM account
    WHERE user_id = user.id AND provider_id = 'credential'
  );

UPDATE account
SET password = ${sql(passwordHash)}, updated_at = ${now}
WHERE provider_id = 'credential'
  AND user_id = (SELECT id FROM user WHERE email = ${sql(email)});
`

const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'
const result = spawnSync(
  wrangler,
  ['d1', 'execute', 'DB', '--local', '--command', statements],
  { stdio: 'inherit' },
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

console.log(`Seeded local test account ${email}`)
