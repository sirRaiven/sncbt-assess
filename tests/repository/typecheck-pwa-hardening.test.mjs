import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const read = async path => readFile(new URL(path, root), 'utf8')

test('Nuxt runtime tests disable the PWA registration plugin', async () => {
  const source = await read('vitest.config.ts')
  assert.match(source, /overrides:\s*\{[\s\S]*pwa:\s*\{[\s\S]*registerPlugin:\s*false/)
  assert.match(source, /injectRegister:\s*null/)
})

test('typecheck uses Nuxt project references with explicit checker dependencies', async () => {
  const pkg = JSON.parse(await read('package.json'))
  assert.equal(pkg.scripts.typecheck, 'nuxt prepare && vue-tsc -b --noEmit')
  assert.equal(pkg.devDependencies['vue-tsc'], '^3.3.11')
  assert.equal(pkg.devDependencies.typescript, '^6.0.3')
})

test('assessment request timeout parameter is widened to number', async () => {
  const source = await read('app/composables/useAssessmentDelivery.ts')
  assert.match(source, /timeoutMs:\s*number\s*=\s*ASSESSMENT_REQUEST_TIMEOUT_MS/)
})

test('PWA component explicitly types the injected PWA API', async () => {
  const source = await read('app/components/PwaInstallButton.vue')
  assert.match(source, /interface PwaClientApi/)
  assert.match(source, /nuxtApp\.\$pwa[\s\S]*as\s+PwaClientApi\s*\|\s*undefined/)
})

test('strict array access guards are present in affected UI flows', async () => {
  const questionCard = await read('app/components/AssessmentQuestionEditorCard.vue')
  assert.match(questionCard, /const firstOption\s*=\s*editor\.options\[0\]/)
  assert.match(questionCard, /if \(firstOption\)/)

  const editor = await read('app/pages/instructor/assessments/[id]/edit.vue')
  assert.match(editor, /const firstQuestion\s*=\s*questions\.value\[0\]/)
  assert.match(editor, /if \(firstQuestion\)/)
  assert.match(editor, /if \(!moved\)\s*\{\s*return;/)
  assert.match(editor, /const lastQuestion\s*=\s*questions\.value\.at\(-1\)/)
})

test('remaining strictness fixes use guarded or normalized values', async () => {
  assert.match(await read('app/components/AppBreadcrumbs.vue'), /linkLabel:\s*'truncate'/)
  assert.match(await read('app/composables/useClassrooms.ts'), /\{\s*\.\.\.input,?\s*\}/)
  assert.match(await read('app/composables/useQuestions.ts'), /interface FunctionErrorBody/)
  assert.match(await read('app/pages/instructor/results/index.vue'), /const dateFromInput\s*=\s*computed/)
  assert.match(await read('app/pages/instructor/results/index.vue'), /v-model="dateFromInput"/)
  assert.match(await read('app/pages/instructor/student-progress.vue'), /const firstVisibleStudent\s*=\s*visible\[0\]/)
  assert.match(await read('app/utils/assessment-excel-import.ts'), /const headerRow\s*=\s*worksheet\.data\[0\]/)
  assert.match(await read('app/utils/instructor-report-export.ts'), /const zipBuffer\s*=\s*new ArrayBuffer/)
})
