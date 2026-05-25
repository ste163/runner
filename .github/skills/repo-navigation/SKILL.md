---
name: repo-navigation
description: Layout of the runner repo — where source, pages, tests, scripts, config, and assets live. Use when navigating the codebase, finding files, or understanding what commands do what.
---

# repo-navigation

## What This Repo Is

`runner` is a Lynx/ReactLynx Android app built with `sparkling-app-cli`. It has two Lynx pages (`main`, `second`) rendered inside a native Android shell.

## Directory Layout

```
src/
  pages/
    main/         # Main Lynx page — index.tsx (entry), App.tsx (component), App.spec.tsx (tests), App.css
    second/       # Second Lynx page — same structure
  assets/         # Static images (png)
  rspeedy-env.d.ts
  typing.d.ts
android/          # Native Android shell (Gradle project)
  app/src/main/assets/  # Built Lynx bundles copied here by `bun run build`
resource/         # App icon and splash screen images
scripts/          # Shell scripts (android-dev.sh used by `bun dev`)
dist/             # Build output (gitignored)
```

## Entry Points

- `app.config.ts` — sparkling-app-cli config: pages, routes, Android package name, splash screen, icon
- `lynx.config.ts` — Rspeedy/Rsbuild config: entries, output, plugins (used standalone without Android shell)
- `vitest.config.ts` — Vitest config
- `tsconfig.json` — TypeScript config
- `oxlintrc.json` — oxlint config

## Pages

Each page under `src/pages/<name>/` follows this pattern:

- `index.tsx` — Rspeedy bundle entry point
- `App.tsx` — Root ReactLynx component
- `App.css` — Page styles
- `App.spec.tsx` — Vitest unit tests

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

## Verification Order

Run in this order after changes:

```sh
bun typecheck && bun test && bun lint
```

`bun run build` and `bun dev` require macOS + Android SDK + emulator — not available in cloud agent.

## Test Locations

Tests live alongside source: `src/pages/<name>/App.spec.tsx`. No separate `__tests__` directory.
