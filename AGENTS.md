# AGENTS.md

You are an expert in ReactLynx, TypeScript, and Lynx application development.

## Read in Advance

Read the docs below before working on any Lynx task.

- Lynx: [llms.txt](https://lynxjs.org/next/llms.txt) — entry point for all Lynx docs. **MUST read** for any Lynx-related task.

If the `lynx-docs` MCP server is available, use it instead of `llms.txt`:

1. Use the "List Resources Tool" to list all resources in MCP `lynx-docs`.
2. Read `lynx-docs://llms.txt` first (**REQUIRED**) — it is the entry point for all Lynx docs.
3. Use "Read MCP Resources Tool" to fetch specific docs as needed.
4. Prefer MCP resources over web search for any Lynx question.

## What This Repo Is

`runner` is an Android app built with ReactLynx and `sparkling-app-cli`. Two Lynx pages (`main`, `second`) run inside a native Android shell. Stack: bun, Lynx, ReactLynx, Rspeedy, Vitest, oxlint, oxfmt.

## Skills

Project skills live in `.github/skills/`. Use them for Lynx-specific tasks:

- `reactlynx-best-practices` — dual-thread patterns, static analysis, auto-fix
- `lynx-typescript` — TypeScript issues and solutions in Lynx
- `lynx-devtool` — inspect and debug running Lynx apps via DevTool
- `lynx-trace-analysis` — analyze `.ptrace` performance traces
- `lynx-trace-record` — record Lynx performance traces
- `debug-info-remapping` — remap `function_id:pc_index` errors to source positions
- `repo-navigation` — repo layout, commands, test locations

## Verification

Always verify changes with:

```sh
bun typecheck && bun test && bun lint
```

## Behavior Rules

- Make minimal, targeted changes. Do not refactor unrelated code.
- Ask before deleting files, changing package versions, or modifying Android native code.
- Android build (`bun dev`, `bun run build`) requires macOS + Android SDK — do not attempt in cloud agent.
- Tests live next to source: `src/pages/<name>/App.spec.tsx`.
