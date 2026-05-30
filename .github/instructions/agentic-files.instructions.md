---
applyTo: '.github/**/*.md'
---

## Editing `.github/` Agent Files

When writing or editing any file in `.github/` (skills, agents, instructions, hooks, copilot-instructions.md, AGENTS.md):

1. Invoke `/caveman` skill — write in compressed, token-efficient style.
2. Drop articles, filler, hedging. Fragments OK. Technical terms exact.
3. Strip table padding — no alignment spaces before `|`. Use single space: `| value | desc |` not `| value      | desc                |`.
4. Compress table separators — use `| --- |` not `| --------- |`. Minimum dashes only.
5. No blank lines inside tables or lists unless structurally required.
6. Every word must carry information. If removal loses no knowledge, remove it.
7. Code blocks, commands, and type definitions: write normal — do not compress.
