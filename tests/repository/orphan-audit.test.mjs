import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const script = join(root, 'scripts', 'audit-orphans.mjs')

function fixture() {
  const path = mkdtempSync(join(tmpdir(), 'sncbt-orphan-audit-'))
  mkdirSync(join(path, 'app', 'components'), { recursive: true })
  mkdirSync(join(path, 'app', 'composables'), { recursive: true })
  mkdirSync(join(path, 'app', 'pages'), { recursive: true })
  mkdirSync(join(path, 'supabase', 'functions'), { recursive: true })
  return path
}

function run(target, ...args) {
  return spawnSync(process.execPath, [script, '--root', target, ...args], {
    cwd: root,
    encoding: 'utf8',
  })
}

test('orphan audit passes a clean fixture', () => {
  const path = fixture()
  try {
    writeFileSync(join(path, 'app', 'components', 'GreetingCard.vue'), '<template><div /></template>')
    writeFileSync(join(path, 'app', 'pages', 'index.vue'), '<template><GreetingCard /></template>')

    const result = run(path)
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /Orphan audit passed/i)
  } finally {
    rmSync(path, { recursive: true, force: true })
  }
})

test('orphan audit fails on stale source artifacts', () => {
  const path = fixture()
  try {
    writeFileSync(join(path, 'app', 'components', 'LegacyCard.vue.bak'), 'stale')

    const result = run(path)
    assert.equal(result.status, 1)
    assert.match(`${result.stdout}\n${result.stderr}`, /stale source artifact/i)
  } finally {
    rmSync(path, { recursive: true, force: true })
  }
})

test('orphan audit fails on Vue components misplaced under composables', () => {
  const path = fixture()
  try {
    writeFileSync(join(path, 'app', 'composables', 'LogoutButton.vue'), '<template><button /></template>')

    const result = run(path)
    assert.equal(result.status, 1)
    assert.match(`${result.stdout}\n${result.stderr}`, /misplaced vue component/i)
  } finally {
    rmSync(path, { recursive: true, force: true })
  }
})

test('strict orphan audit fails on a potential unused Nuxt component', () => {
  const path = fixture()
  try {
    writeFileSync(join(path, 'app', 'components', 'NeverUsedCard.vue'), '<template><div /></template>')
    writeFileSync(join(path, 'app', 'pages', 'index.vue'), '<template><main /></template>')

    const normal = run(path)
    assert.equal(normal.status, 0, normal.stderr || normal.stdout)
    assert.match(normal.stdout, /potential unused/i)

    const strict = run(path, '--strict')
    assert.equal(strict.status, 1)
    assert.match(`${strict.stdout}\n${strict.stderr}`, /strict mode/i)
  } finally {
    rmSync(path, { recursive: true, force: true })
  }
})
