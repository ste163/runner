---
name: repo-navigation
description: Layout of the runner repo — where source, pages, tests, scripts, config, and assets live. Use when navigating the codebase, finding files, or understanding what commands do what.
---

## Session Start

`sessionStart` hook. No task — orient silently, no output.

# repo-navigation

`runner` — ReactLynx Android app, two Lynx pages (`main`, `second`) in native Android shell.

## Layout

```
src/
  pages/
    home/         # index.tsx (entry), Home.tsx (component), Home.spec.tsx (tests), Home.css
    workout/      # Workout selection page (shows nav bar)
    activeWorkout/# Active workout execution page (hides nav bar)
    onboarding/   # same structure
    graphs/       # example page for text graph experiments
  components/
    AppLayout/    # Root layout wrapper (provides BottomNav on all pages except activeWorkout)
    BottomNav/    # Bottom navigation component
  native/         # JS bridge wrappers for NativeModules
  assets/         # Static images (png)
  domain/         # Business logic (profile, intervals, progression, currentPage context)
  native-modules.d.ts
  rspeedy-env.d.ts
  typing.d.ts
android/          # Native Android shell (Gradle) — do not modify without asking
  app/src/main/assets/  # Built Lynx bundles (copied by `bun run build`)
resource/         # App icon and splash screen images
scripts/          # android-dev.sh, real device setup docs in README.md
dist/             # Build output (gitignored)
```

## Config Files

- `app.config.ts` — sparkling-app-cli: pages, routes, package name, splash, icon
- `lynx.config.ts` — Rspeedy/Rsbuild: entries, output, plugins
- `vitest.config.ts`, `tsconfig.json`, `oxlintrc.json`

## Commands

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `bun install`          | Install dependencies                                            |
| `bun dev`              | Rebuild/reinstall watch loop — uses emulator or real ADB device |
| `bun run build`        | Build bundles → copy to `android/app/src/main/assets/`          |
| `bun run smoke`        | One-shot build + install + launch on Android                    |
| `bun typecheck`        | TypeScript typecheck only (no emit)                             |
| `bun run test`         | Run Vitest unit tests once                                      |
| `bun run test:watch`   | Run Vitest in watch mode                                        |
| `bun lint`             | Run oxlint                                                      |
| `bun lint:fix`         | Auto-fix lint issues                                            |
| `bun fmt`              | Format with oxfmt                                               |
| `bun fmt:check`        | Check formatting                                                |
| `bun run clean`        | Remove `dist/`, Android build caches                            |
| `bun run log`          | Tail Android logcat                                             |
| `bun run log:app`      | Tail only app process logs                                      |
| `bun run device:check` | Show connected ADB devices                                      |

`bun run build` and `bun dev` require macOS + Android SDK — not available in cloud agent.
Real device setup: `scripts/README.md`.
