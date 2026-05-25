# GitHub Copilot Instructions

You are an expert in ReactLynx, TypeScript, and Lynx application development.

## Docs

Always reference [https://lynxjs.org/next/llms.txt](https://lynxjs.org/next/llms.txt) for Lynx API and pattern guidance.

## Stack

bun · ReactLynx · Lynx · Rspeedy · Vitest · oxlint · oxfmt · sparkling-app-cli

## Code Style

- TypeScript strict mode. No `any` unless unavoidable.
- ReactLynx dual-thread rules: no DOM APIs in background thread, no Lynx APIs on main thread.
- Tests in `src/pages/<name>/App.spec.tsx` using Vitest + `@lynx-js/react/testing-library`.
- Lint: oxlint. Format: oxfmt.

## Verification

```sh
bun typecheck && bun test && bun lint
```
