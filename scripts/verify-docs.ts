/**
 * Verifies that AGENTS.md stays in sync with the repo's agent resources.
 *
 * Checks:
 *   1. Every skill directory under .agents/skills/ is mentioned in AGENTS.md
 *   2. Every prompt template under .pi/prompts/ is mentioned in AGENTS.md
 *   3. Every rule file under .pi/rules/ is mentioned in AGENTS.md, has a
 *      non-empty 'paths:' front-matter field, and each pattern's static
 *      prefix exists
 */

import { existsSync, readdirSync, readFileSync } from 'fs'

const AGENTS_PATH = 'AGENTS.md'
const SKILLS_DIR = '.agents/skills'
const PROMPTS_DIR = '.pi/prompts'
const RULES_DIR = '.pi/rules'

const readAgentsMd = () => readFileSync(AGENTS_PATH, 'utf-8')

const readSkillNames = () =>
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

const readPromptNames = () =>
  readdirSync(PROMPTS_DIR, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.md'))
    .map((f) => f.name.replace(/\.md$/, ''))

const checkSkills = (agentsMd: string, skills: readonly string[]) =>
  skills.map((skill) =>
    agentsMd.includes(skill)
      ? { ok: true, msg: `Skill '${skill}' found in ${AGENTS_PATH}` }
      : {
          ok: false,
          msg: `Skill '${skill}' exists in ${SKILLS_DIR}/ but is missing from ${AGENTS_PATH}`,
        }
  )

const checkPrompts = (agentsMd: string, prompts: readonly string[]) =>
  prompts.map((prompt) =>
    agentsMd.includes(prompt)
      ? { ok: true, msg: `Prompt template '${prompt}' found in ${AGENTS_PATH}` }
      : {
          ok: false,
          msg: `Prompt template '${prompt}' exists in ${PROMPTS_DIR}/ but is missing from ${AGENTS_PATH}`,
        }
  )

const readRuleNames = () =>
  readdirSync(RULES_DIR, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.md'))
    .map((f) => f.name)

const readRulePaths = (name: string): string[] | null => {
  const raw = readFileSync(`${RULES_DIR}/${name}`, 'utf-8')
  const lines = raw.split('\n')
  const open = lines.indexOf('---')
  const close = lines.indexOf('---', open + 1)
  if (open === -1 || close === -1) return null
  const pathsLine = lines.slice(open + 1, close).find((line) => line.startsWith('paths:'))
  if (!pathsLine) return null
  const value = pathsLine.slice('paths:'.length).trim()
  if (value === '') return null
  const entries = value.startsWith('[') ? value.slice(1, -1).split(/["']\s*,\s*["']/g) : [value]
  const cleaned = entries
    .map((entry) =>
      entry
        .trim()
        .replace(/^['"]+/, '')
        .replace(/['"]+$/, '')
    )
    .filter((entry) => entry !== '')
  return cleaned.length === 0 ? null : cleaned
}

const staticPrefix = (pattern: string): string => {
  const metachar = pattern.search(/[*?{]/)
  return metachar === -1 ? pattern : pattern.slice(0, metachar)
}

const checkRules = (agentsMd: string, rules: readonly string[]) =>
  rules.flatMap((rule) => {
    if (!agentsMd.includes(rule)) {
      return [
        {
          ok: false,
          msg: `Rule '${rule}' exists in ${RULES_DIR}/ but is missing from ${AGENTS_PATH}`,
        },
      ]
    }
    const mentioned = { ok: true, msg: `Rule '${rule}' found in ${AGENTS_PATH}` }
    const patterns = readRulePaths(rule)
    if (patterns === null) {
      return [
        mentioned,
        { ok: false, msg: `Rule '${rule}' has no non-empty 'paths:' front-matter field` },
      ]
    }
    return [
      mentioned,
      { ok: true, msg: `Rule '${rule}' has a non-empty 'paths:' front-matter field` },
      ...patterns.map((pattern) => {
        const prefix = staticPrefix(pattern)
        if (prefix === '') {
          return {
            ok: true,
            msg: `Pattern '${pattern}' in ${RULES_DIR}/${rule} has no static prefix to check`,
          }
        }
        return existsSync(prefix)
          ? { ok: true, msg: `Pattern '${pattern}' in ${RULES_DIR}/${rule} matches '${prefix}'` }
          : {
              ok: false,
              msg: `Pattern '${pattern}' in ${RULES_DIR}/${rule} has no matching path (prefix '${prefix}' does not exist)`,
            }
      }),
    ]
  })

const run = () => {
  const agentsMd = readAgentsMd()
  const results = [
    ...checkSkills(agentsMd, readSkillNames()),
    ...checkPrompts(agentsMd, readPromptNames()),
    ...checkRules(agentsMd, readRuleNames()),
  ]

  results.forEach(({ ok, msg }) => (ok ? console.log(`✓ ${msg}`) : console.error(`❌ ${msg}`)))

  const failures = results.filter(({ ok }) => !ok).length

  if (failures > 0) {
    console.error(
      `\n${failures} doc-sync issue(s) found. Update ${AGENTS_PATH} or ${RULES_DIR}/ to match the repo.`
    )
    process.exit(1)
  }

  console.log('\nAll doc checks passed.')
}

run()
