import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import test from 'node:test'

const root = process.cwd()

async function filesUnder(dir) {
  const output = []
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (/\.(?:ts|vue|mjs)$/.test(entry.name)) output.push(full)
    }
  }
  await walk(join(root, dir))
  return output
}

test('active source contains no explicit any annotations after Phase 2.1', async () => {
  const files = [
    ...(await filesUnder('app')),
    ...(await filesUnder('server')),
    ...(await filesUnder('scripts')),
    ...(await filesUnder('supabase/functions')),
  ]

  const offenders = []
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    source.split(/\r?\n/).forEach((line, index) => {
      const hasExplicitAny = /:\s*any\b|\bas\s+any\b|<[^>\n]*\bany\b|\bany\s*\[/.test(line)
      if (hasExplicitAny && !line.trim().startsWith('//')) {
        offenders.push(`${relative(root, file)}:${index + 1}: ${line.trim()}`)
      }
    })
  }

  assert.deepEqual(offenders, [], `Explicit any remains:\n${offenders.join('\n')}`)
})

test('ESLint no-explicit-any rule is not weakened to make Phase 2.1 pass', async () => {
  const eslint = await readFile(join(root, 'eslint.config.mjs'), 'utf8')
  assert.doesNotMatch(eslint, /no-explicit-any["']?\s*:\s*["']?(?:off|0)["']?/i)
})

test('known Phase 2.1 concrete lint defects stay removed', async () => {
  const checks = [
    ['app/components/AppBreadcrumbs.vue', /items\?: AppBreadcrumbItem\[\];/],
    ['app/components/AssessmentOutcomeProgress.vue', /const segments = computed/],
    ['app/components/SignOutButton.vue', /withDefaults\(\s*defineProps</s],
  ]

  for (const [file, expected] of checks) {
    const source = await readFile(join(root, file), 'utf8')
    assert.match(source, expected, `${file} is missing its Phase 2.1 lint correction`)
  }

  const orphanAudit = await readFile(join(root, 'scripts/audit-orphans.mjs'), 'utf8')
  assert.ok(orphanAudit.includes('const match = path.match(/(\\.[^./\\\\]+)$/)'))

  const outcome = await readFile(join(root, 'app/components/AssessmentOutcomeProgress.vue'), 'utf8')
  assert.doesNotMatch(outcome, /resolvedPercent/)

  const signOut = await readFile(join(root, 'app/components/SignOutButton.vue'), 'utf8')
  assert.doesNotMatch(signOut, /const props\s*=/)

  const progress = await readFile(join(root, 'app/pages/instructor/student-progress.vue'), 'utf8')
  assert.doesNotMatch(progress, /const selectedStudent\s*=/)

  const accountProfile = await readFile(join(root, 'supabase/functions/account-profile/index.ts'), 'utf8')
  assert.doesNotMatch(accountProfile, /interface AccountRow|type AccountStatus/)

  const questions = await readFile(join(root, 'supabase/functions/questions/index.ts'), 'utf8')
  assert.doesNotMatch(questions, /type ActionInput\s*=/)

  const delivery = await readFile(join(root, 'supabase/functions/assessment-delivery/index.ts'), 'utf8')
  assert.doesNotMatch(delivery, /&&\s*Boolean\(\s*data\.finalized/)

  const classrooms = await readFile(join(root, 'supabase/functions/classrooms/index.ts'), 'utf8')
  assert.equal((classrooms.match(/const classroomMap\s*=/g) ?? []).length, 1)

  const sessions = await readFile(join(root, 'supabase/functions/assessment-sessions/index.ts'), 'utf8')
  assert.doesNotMatch(sessions, /let error:[\s\S]{0,120}\| null\s*=\s*null/)
})
