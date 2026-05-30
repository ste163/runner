---
name: repo-navigation
description: Layout of the runner repo — where source, pages, tests, scripts, config, and assets live. Use when navigating the codebase, finding files, or understanding what commands do what.
---

## Session Start

Fired automatically via `sessionStart` hook. No task implied — orient silently, no output.

# repo-navigation

`runner` — ReactLynx Android app, two Lynx pages (`main`, `second`) in a native Android shell.

## Layout

```
src/
  pages/
    main/         # index.tsx (entry), App.tsx (component), App.spec.tsx (tests), App.css
    second/       # same structure
  assets/         # Static images (png)
  rspeedy-env.d.ts
  typing.d.ts
android/          # Native Android shell (Gradle) — do not modify without asking
  app/src/main/assets/  # Built Lynx bundles (copied by `bun run build`)
resource/         # App icon and splash screen images
scripts/          # Shell scripts (android-dev.sh used by `bun dev`)
dist/             # Build output (gitignored)
```

## Config Files

- `app.config.ts` — sparkling-app-cli: pages, routes, package name, splash, icon
- `lynx.config.ts` — Rspeedy/Rsbuild: entries, output, plugins
- `vitest.config.ts`, `tsconfig.json`, `oxlintrc.json`

## Commands

| Command              | What it does                                           |
| -------------------- | ------------------------------------------------------ |
| `bun install`        | Install dependencies                                   |
| `bun dev`            | Start Android emulator + rebuild/reinstall watch loop  |
| `bun run build`      | Build bundles → copy to `android/app/src/main/assets/` |
| `bun run smoke`      | One-shot build + install + launch on Android           |
| `bun typecheck`      | TypeScript typecheck only (no emit)                    |
| `bun test`           | Run Vitest unit tests once                             |
| `bun run test:watch` | Run Vitest in watch mode                               |
| `bun lint`           | Run oxlint                                             |
| `bun lint:fix`       | Auto-fix lint issues                                   |
| `bun fmt`            | Format with oxfmt                                      |
| `bun fmt:check`      | Check formatting                                       |
| `bun run clean`      | Remove `dist/`, Android build caches                   |
| `bun run log`        | Tail Android logcat                                    |
| `bun run log:app`    | Tail only app process logs                             |

`bun run build` and `bun dev` require macOS + Android SDK + emulator — not available in cloud agent.
