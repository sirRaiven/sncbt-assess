#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { basename, join, relative, resolve, sep } from 'node:path'

const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue'])
const STALE_PATTERN = /(?:\.(?:tmp|bak|old|orig|rej)$|~$)/i
const IGNORE_DIRECTORIES = new Set([
  '.git', '.nuxt', '.output', '.data', '.cache', 'coverage', 'dist',
  'node_modules', 'playwright-report', 'test-results', '.temp',
])

function parseArgs(argv) {
  let root = process.cwd()
  let strict = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') {
      strict = true
      continue
    }
    if (arg === '--root') {
      const next = argv[index + 1]
      if (!next) throw new Error('--root requires a path')
      root = resolve(next)
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return { root: resolve(root), strict }
}

function extension(path) {
  const match = path.match(/(\.[^./\\]+)$/)
  return match?.[1]?.toLowerCase() ?? ''
}

function walk(directory, output = []) {
  if (!existsSync(directory)) return output

  for (const name of readdirSync(directory)) {
    if (IGNORE_DIRECTORIES.has(name)) continue
    const path = join(directory, name)
    const stats = statSync(path)
    if (stats.isDirectory()) walk(path, output)
    else output.push(path)
  }

  return output
}

function normalize(root, path) {
  return relative(root, path).split(sep).join('/')
}

function pascalCase(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function kebabCase(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function readSearchCorpus(root, excludedPath) {
  const roots = ['app', 'server', 'tests', 'nuxt.config.ts', 'vitest.config.ts']
  let corpus = ''

  for (const entry of roots) {
    const path = join(root, entry)
    if (!existsSync(path)) continue
    const stats = statSync(path)
    const files = stats.isDirectory() ? walk(path) : [path]
    for (const file of files) {
      if (resolve(file) === resolve(excludedPath)) continue
      if (!SOURCE_EXTENSIONS.has(extension(file))) continue
      try {
        corpus += `\n${readFileSync(file, 'utf8')}`
      } catch {
        // Ignore unreadable non-critical candidate sources; fatal source hygiene
        // checks do not depend on candidate reference detection.
      }
    }
  }

  return corpus
}

function componentIdentifiers(root, path) {
  const componentsRoot = join(root, 'app', 'components')
  const rel = normalize(componentsRoot, path).replace(/\.vue$/i, '')
  const segments = rel.split('/')
  const base = pascalCase(segments.at(-1) ?? '')
  const prefixed = segments.map(pascalCase).join('')
  return new Set([
    base,
    prefixed,
    kebabCase(base),
    kebabCase(prefixed),
  ].filter(Boolean))
}

function isReferenced(root, path, identifiers) {
  const corpus = readSearchCorpus(root, path)
  for (const identifier of identifiers) {
    const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const boundary = identifier.includes('-')
      ? new RegExp(`<${escaped}(?:[\\s/>])`, 'i')
      : new RegExp(`\\b${escaped}\\b`)
    if (boundary.test(corpus)) return true
  }
  return false
}

function scanRepository(root) {
  const sourceRoots = [
    join(root, 'app'),
    join(root, 'server'),
    join(root, 'supabase', 'functions'),
    join(root, 'scripts'),
  ]
  const allFiles = sourceRoots.flatMap(path => walk(path))

  const stale = allFiles
    .filter(path => STALE_PATTERN.test(basename(path)))
    .map(path => normalize(root, path))

  const composablesRoot = join(root, 'app', 'composables')
  const misplacedVue = walk(composablesRoot)
    .filter(path => path.toLowerCase().endsWith('.vue'))
    .map(path => normalize(root, path))

  const candidateComponents = walk(join(root, 'app', 'components'))
    .filter(path => path.toLowerCase().endsWith('.vue'))
    .filter(path => !isReferenced(root, path, componentIdentifiers(root, path)))
    .map(path => normalize(root, path))

  const candidateComposables = walk(composablesRoot)
    .filter(path => /\.(?:ts|js)$/i.test(path))
    .filter(path => {
      const stem = basename(path).replace(/\.(?:ts|js)$/i, '')
      if (!/^use[A-Z0-9_]/.test(stem)) return false
      return !isReferenced(root, path, new Set([stem]))
    })
    .map(path => normalize(root, path))

  return {
    stale,
    misplacedVue,
    candidates: [...candidateComponents, ...candidateComposables].sort(),
  }
}

function printList(title, items) {
  if (items.length === 0) return
  console.log(`\n${title}`)
  for (const item of items) console.log(`- ${item}`)
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
    return
  }

  const result = scanRepository(options.root)
  printList('Fatal: stale source artifact(s)', result.stale)
  printList('Fatal: misplaced Vue component(s) under app/composables', result.misplacedVue)
  printList('Potential unused Nuxt component/composable(s) — manual review required', result.candidates)

  const fatalCount = result.stale.length + result.misplacedVue.length
  if (fatalCount > 0) {
    console.error(`\nOrphan audit failed: ${fatalCount} fatal source hygiene issue(s).`)
    process.exitCode = 1
    return
  }

  if (options.strict && result.candidates.length > 0) {
    console.error(`\nOrphan audit failed in strict mode: ${result.candidates.length} potential unused source candidate(s).`)
    process.exitCode = 1
    return
  }

  console.log(`\nOrphan audit passed. ${result.candidates.length} potential unused source candidate(s) reported for review.`)
}

main()
