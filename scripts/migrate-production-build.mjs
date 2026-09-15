import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function isCloudflareProductionBuild(environment = process.env) {
  return Boolean(environment.WORKERS_CI_BUILD_UUID) && environment.WORKERS_CI_BRANCH === 'main'
}

if (process.argv[1] === fileURLToPath(import.meta.url) && isCloudflareProductionBuild()) {
  console.log('Cloudflare production build detected; applying D1 migrations before deployment.')

  const result = spawnSync('pnpm', ['run', 'db:migrate:remote'], {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
