# Navigation Architecture Plan

## Problem Statement

The app needs a persistent navigation bar that:

- Shows on Home, Workout, Onboarding, and Graphs pages
- ONLY hides on ActiveWorkout page (when workout is running)
- Persists when navigating between pages (doesn't disappear/reappear)
- Allows clicking between pages at any time (except during active workout)

## Lynx Architecture Constraints

Each page is a **separate bundle** that loads independently:

- `home.lynx.bundle` → `src/pages/home/index.tsx`
- `workout.lynx.bundle` → `src/pages/workout/index.tsx`
- `activeWorkout.lynx.bundle` → `src/pages/activeWorkout/index.tsx`
- `onboarding.lynx.bundle` → `src/pages/onboarding/index.tsx`
- `graphs.lynx.bundle` → `src/pages/graphs/index.tsx`

When `router.open()` is called, it opens a new page in the navigation stack. Each bundle is loaded as a fresh instance - there is NO global wrapper around all pages.

## Current Problem

AppShell exists only in home page, so nav bar only shows on home. When you navigate to Workout via `router.open()`, a new navigation stack is created. The home page bundle unloads, and the workout bundle loads. The nav bar is gone because it only existed in the home bundle.

## Solution: Distributed Layout Pattern

Each page must include its own AppLayout wrapper. Each page will:

1. Render AppLayout with `initialPage` set to its own page name
2. Render its page component as a child of AppLayout
3. AppLayout provides the BottomNav and PageContext

This way:

- Every page has its own nav bar (rendered locally)
- When you click Home/Workout buttons, it navigates via `router.open()` to the appropriate page
- Each page loads with its nav bar intact
- ActiveWorkout page doesn't include AppLayout, so no nav bar

### Architecture Diagram

```
home.lynx.bundle:
  <AppLayout initialPage="home">
    <Home />
  </AppLayout>

workout.lynx.bundle:
  <AppLayout initialPage="workout">
    <Workout />
  </AppLayout>

activeWorkout.lynx.bundle:
  <ActiveWorkout />  (no AppLayout)

onboarding.lynx.bundle:
  <AppLayout initialPage="onboarding">
    <Onboarding />
  </AppLayout>

graphs.lynx.bundle:
  <AppLayout initialPage="graphs">
    <Graphs />
  </AppLayout>
```

### How Navigation Works

1. User clicks "Workout" button in Home page
2. Home's AppLayout calls `router.open({ scheme: workoutScheme })`
3. Home bundle unloads, Workout bundle loads
4. Workout bundle renders AppLayout with initialPage="workout"
5. Workout bundle's AppLayout renders BottomNav with "Workout" tab active
6. User sees nav bar persist (because each page provides it)

### ActiveWorkout Special Case

When user clicks "Start Workout" on Workout page:

1. Workout page calls `router.open({ scheme: activeWorkoutScheme })`
2. Workout bundle unloads, ActiveWorkout bundle loads
3. ActiveWorkout bundle renders ONLY <ActiveWorkout /> (no AppLayout)
4. Nav bar is hidden because ActiveWorkout doesn't include it
5. User can't navigate away during active workout

When user clicks "Stop" or "Done" on ActiveWorkout:

1. Calls `close()` to navigate back to Workout
2. Workout bundle loads again with AppLayout
3. Nav bar reappears

## Implementation Steps

1. ✓ Create PageContext with useCurrentPage hook
2. Create AppLayout component that:
   - Accepts `initialPage` prop
   - Accepts `children` (the page component)
   - Renders PageContext.Provider wrapping AppLayout
   - Conditionally renders BottomNav (hide only for activeWorkout)
   - Provides nav callbacks that call router.open()

3. Update each page index.tsx to use AppLayout:
   - home/index.tsx: wrap Home with AppLayout initialPage="home"
   - workout/index.tsx: wrap Workout with AppLayout initialPage="workout"
   - onboarding/index.tsx: wrap Onboarding with AppLayout initialPage="onboarding"
   - graphs/index.tsx: wrap Graphs with AppLayout initialPage="graphs"
   - activeWorkout/index.tsx: DO NOT wrap, render ActiveWorkout directly

4. Remove old AppShell component (no longer needed)

5. Add comprehensive tests:
   - AppLayout renders nav bar on home, workout, onboarding, graphs
   - AppLayout hides nav bar when initialPage="activeWorkout"
   - Each page's nav buttons navigate correctly
   - ActiveWorkout doesn't render AppLayout

6. Verify build and tests pass

## Key Insight

Each page is responsible for providing its own UI layout (including nav bar). The nav bar appears persistent because each page renders it independently. This is not true persistence across bundles - it's distributed rendering. The user perceives it as persistent because every page except activeWorkout includes the nav bar.

## Why This Works

- Matches Lynx's bundle-per-page model
- No global state needed (each page has its own instance)
- Nav bar always available on every page (except activeWorkout)
- Navigation is straightforward (router.open with scheme)
- Tests can verify each page includes/excludes nav bar correctly
