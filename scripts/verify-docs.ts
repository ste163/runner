/**
 * Verifies that AGENTS.md stays in sync with the repo's agent resources.
 *
 * Checks:
 *   1. Every skill directory under .agents/skills/ is mentioned in AGENTS.md
 *   2. Every prompt template under .pi/prompts/ is mentioned in AGENTS.md
 */

import { readdirSync, readFileSync } from 'fs'

const AGENTS_PATH = 'AGENTS.md'
const SKILLS_DIR = '.agents/skills'
const PROMPTS_DIR = '.pi/prompts'

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

const run = () => {
  const agentsMd = readAgentsMd()
  const results = [
    ...checkSkills(agentsMd, readSkillNames()),
    ...checkPrompts(agentsMd, readPromptNames()),
  ]

  results.forEach(({ ok, msg }) => (ok ? console.log(`✓ ${msg}`) : console.error(`❌ ${msg}`)))

  const failures = results.filter(({ ok }) => !ok).length

  if (failures > 0) {
    console.error(`\n${failures} doc-sync issue(s) found. Update ${AGENTS_PATH} to match the repo.`)
    process.exit(1)
  }

  console.log('\nAll doc checks passed.')
}

run()
