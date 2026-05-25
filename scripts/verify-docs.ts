/**
 * Verifies that repo-navigation/SKILL.md stays in sync with the codebase.
 *
 * Checks:
 *   1. Every directory under src/pages/ is mentioned in repo-navigation/SKILL.md
 *   2. Every command in the SKILL.md Commands table exists as a package.json script
 */

import { readdirSync, readFileSync } from 'fs'

const SKILL_PATH = '.github/skills/repo-navigation/SKILL.md'
const PAGES_DIR = 'src/pages'
const PKG_PATH = 'package.json'

const readSkill = () => readFileSync(SKILL_PATH, 'utf-8')

const readPages = () =>
  readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

const readScripts = () =>
  (JSON.parse(readFileSync(PKG_PATH, 'utf-8')) as { scripts: Record<string, string> }).scripts

const parseDocumentedCommands = (skill: string): readonly string[] => {
  const BUN_BUILTINS = ['install', 'add', 'remove', 'update', 'init', 'run', 'x']
  const matches = [...skill.matchAll(/\|\s*`bun(?:\s+run)?\s+([\w:]+)`/g)]
  return matches.reduce<string[]>(
    (acc, [, cmd]) => (cmd && !BUN_BUILTINS.includes(cmd) ? [...acc, cmd] : acc),
    []
  )
}

const checkPages = (skill: string, pages: readonly string[]) =>
  pages.map((page) =>
    skill.includes(page)
      ? { ok: true, msg: `Page '${page}' found in ${SKILL_PATH}` }
      : {
          ok: false,
          msg: `Page '${page}' exists in ${PAGES_DIR}/ but is missing from ${SKILL_PATH}`,
        }
  )

const checkCommands = (commands: readonly string[], scripts: Readonly<Record<string, string>>) =>
  commands.map((cmd) =>
    scripts[cmd]
      ? { ok: true, msg: `Command '${cmd}' in ${SKILL_PATH} exists in package.json` }
      : {
          ok: false,
          msg: `Command '${cmd}' is documented in ${SKILL_PATH} but missing from package.json scripts`,
        }
  )

const run = () => {
  const skill = readSkill()
  const results = [
    ...checkPages(skill, readPages()),
    ...checkCommands(parseDocumentedCommands(skill), readScripts()),
  ]

  results.forEach(({ ok, msg }) => (ok ? console.log(`✓ ${msg}`) : console.error(`❌ ${msg}`)))

  const failures = results.filter(({ ok }) => !ok).length

  if (failures > 0) {
    console.error(
      `\n${failures} doc-sync issue(s) found. Update ${SKILL_PATH} to match the codebase.`
    )
    process.exit(1)
  }

  console.log('\nAll doc checks passed.')
}

run()
