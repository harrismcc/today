import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import test from 'node:test'

const migrationHook = new URL('../scripts/migrate-production-build.mjs', import.meta.url)

test('the production build hook runs migrations, skips previews, and blocks deployment on failure', () => {
  const directory = mkdtempSync(join(tmpdir(), 'today-deploy-test-'))
  const commandLog = join(directory, 'command.log')
  const fakePnpm = join(directory, 'pnpm')
  writeFileSync(
    fakePnpm,
    `#!/bin/sh
printf '%s' "$*" > "$COMMAND_LOG"
exit "\${FAKE_PNPM_EXIT:-0}"
`,
  )
  chmodSync(fakePnpm, 0o755)

  const runHook = (environment: Record<string, string> = {}) =>
    spawnSync(process.execPath, [migrationHook.pathname], {
      env: {
        ...process.env,
        PATH: `${directory}${delimiter}${process.env.PATH}`,
        COMMAND_LOG: commandLog,
        ...environment,
      },
    })

  try {
    const production = runHook({
      WORKERS_CI_BUILD_UUID: 'build-id',
      WORKERS_CI_BRANCH: 'main',
    })
    assert.equal(production.status, 0)
    assert.equal(readFileSync(commandLog, 'utf8'), 'run db:migrate:remote')

    rmSync(commandLog)
    const preview = runHook({
      WORKERS_CI_BUILD_UUID: 'build-id',
      WORKERS_CI_BRANCH: 'feature/details',
    })
    assert.equal(preview.status, 0)
    assert.throws(() => readFileSync(commandLog, 'utf8'), { code: 'ENOENT' })

    const failedMigration = runHook({
      WORKERS_CI_BUILD_UUID: 'build-id',
      WORKERS_CI_BRANCH: 'main',
      FAKE_PNPM_EXIT: '23',
    })
    assert.equal(failedMigration.status, 23)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
