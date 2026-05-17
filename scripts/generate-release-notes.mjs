#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)

function getArg(name) {
  const index = args.indexOf(`--${name}`)
  if (index >= 0) {
    return args[index + 1]
  }

  const prefixed = args.find(arg => arg.startsWith(`--${name}=`))
  return prefixed?.slice(name.length + 3)
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return fallback
  }
}

function gitLines(args) {
  const output = git(args)
  return output ? output.split('\n').filter(Boolean) : []
}

function getTag() {
  return (
    getArg('tag') ||
    process.env.RELEASE_TAG ||
    process.env.GITHUB_REF_NAME ||
    git(['describe', '--tags', '--exact-match'], '')
  )
}

function getPreviousTag(tag) {
  return git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', `${tag}^`], '')
}

function parseCommit(line) {
  const [hash, subject] = line.split('\x1f')
  const match = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<title>.+)$/i.exec(subject)

  if (!match?.groups) {
    return {
      hash,
      title: subject,
      type: 'other',
      breaking: false,
    }
  }

  return {
    hash,
    title: match.groups.scope ? `${match.groups.title} (${match.groups.scope})` : match.groups.title,
    type: match.groups.type.toLowerCase(),
    breaking: Boolean(match.groups.breaking),
  }
}

function categoryFor(type) {
  switch (type) {
    case 'feat':
      return 'Features'
    case 'fix':
      return 'Fixes'
    case 'perf':
      return 'Performance'
    case 'refactor':
      return 'Refactoring'
    case 'docs':
      return 'Documentation'
    case 'test':
      return 'Tests'
    case 'build':
    case 'ci':
      return 'Build and CI'
    case 'chore':
      return 'Maintenance'
    default:
      return 'Changes'
  }
}

function formatCommit(commit) {
  const shortHash = commit.hash.slice(0, 7)
  return `- ${commit.title} (${shortHash})`
}

const tag = getTag()

if (!tag) {
  console.error('Missing release tag. Pass --tag v1.2.3 or set RELEASE_TAG.')
  process.exit(1)
}

const previousTag = getPreviousTag(tag)
const range = previousTag ? `${previousTag}..${tag}` : tag
const lines = gitLines(['log', '--pretty=format:%H%x1f%s', range])
const commits = lines.map(parseCommit).filter(commit => !commit.title.startsWith('Merge '))
const grouped = new Map()

for (const commit of commits) {
  const category = commit.breaking ? 'Breaking Changes' : categoryFor(commit.type)
  grouped.set(category, [...(grouped.get(category) ?? []), commit])
}

const repository = process.env.GITHUB_REPOSITORY
const compareUrl =
  repository && previousTag
    ? `https://github.com/${repository}/compare/${previousTag}...${tag}`
    : undefined

const sections = [`# ${tag}`, '']

if (compareUrl) {
  sections.push(`[Compare changes](${compareUrl})`, '')
}

if (commits.length === 0) {
  sections.push('- No commit changes found for this release.', '')
} else {
  const order = [
    'Breaking Changes',
    'Features',
    'Fixes',
    'Performance',
    'Refactoring',
    'Documentation',
    'Tests',
    'Build and CI',
    'Maintenance',
    'Changes',
  ]

  for (const category of order) {
    const entries = grouped.get(category)
    if (!entries?.length) {
      continue
    }

    sections.push(`## ${category}`)
    sections.push(...entries.map(formatCommit))
    sections.push('')
  }
}

const notes = sections.join('\n').trimEnd() + '\n'
const output = getArg('output')

if (output) {
  const outputPath = resolve(output)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, notes)
} else {
  process.stdout.write(notes)
}
