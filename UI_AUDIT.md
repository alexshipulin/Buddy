# UI Audit Report (iOS HIG)

## Scope
- Safe area correctness
- Typography conformance to iOS text styles
- Spacing/layout consistency
- Bottom CTA + scroll reservation behavior
- Pixel-parity support via overlay tooling

## Root Causes Found

1. **Screen wrapper inconsistencies**
   - Previous wrapper applied a fixed `maxContentWidth=460` behavior and did not enforce a standard top content inset for non-header screens.
   - Some screens manually compensated with local paddings.

2. **Top safe area handling mixed across screens**
   - Header-based screens and non-header screens used different patterns.
   - Risk of double-safe-area or missing-safe-area spacing depending on screen.

3. **Bottom CTA reservation logic fragmented**
   - Some screens used hardcoded estimations for CTA reserved space.
   - Sticky bottom bars were not always conditionally rendered with data state.

4. **Typography drift**
   - UI used aliases inconsistently; key title usage (e.g., Home greeting) did not consistently map to canonical iOS text styles.

5. **QA overlay too limited**
   - Overlay had opacity only, no per-screen switch, no x/y point offsets, no live layout metrics.

## What Changed

### 1) Layout System
- Added `src/design/layout.ts`:
  - `getPagePaddingX(width)`:
    - `<=375` => `16`
    - `>=390` => `20`
  - iPad-only width cap via `getContentMaxWidth(width)` (`>=768` => `540`)
  - shared spacing/safe-area layout constants

### 2) Typography System
- Added `src/design/typography.ts`:
  - canonical iOS text styles exported in one place
  - semantic aliases for app usage (`displayTitle`, `pageTitle`, etc.)
- Updated `src/ui/typography.ts` to consume canonical style definitions.

### 3) Screen Wrapper
- Updated `src/ui/components/Screen.tsx`:
  - supports `safeTop`, `safeBottom`, `hasBottomCTA`
  - applies unified top inset (`insets.top + offset`) for non-header screens
  - reserves bottom space for CTA when needed
  - applies max width only on iPad/wide layouts

### 4) Bottom CTA
- Updated `src/ui/components/BottomCTA.tsx`:
  - exported constants/helpers:
    - `CTA_BUTTON_HEIGHT`
    - `CTA_BASE_HEIGHT`
    - `getCTATotalHeight(safeAreaBottom)`
  - dynamic page horizontal padding by width class
  - unified safe-area-aware bottom spacing

### 5) Screen Fixes
- `GoalSelectionScreen`:
  - now uses `safeTop={false}` (header handles top inset)
  - uses `hasBottomCTA` for scroll reservation
  - page padding-aware card width formula
- `DietaryProfileScreen`:
  - moved `Skip` to header right action
  - uses fixed `BottomCTA` for Save
  - `safeTop={false}`, `hasBottomCTA`
- `ProfileScreen`:
  - `safeTop={false}`, `hasBottomCTA`
  - fixed bottom CTA through shared wrapper/component
- `HomeScreen`:
  - removed hard-coded `maxContentWidth` prop usage
  - greeting style aligned to iOS `largeTitle`
- `PaywallScreen`:
  - migrated from legacy `AppScreen` to shared `Screen`
  - safer header alignment with minimum touch target area
- `MenuResultsScreen`:
  - sticky bottom bar now renders **only when result exists**
  - chat navigation no longer receives undefined `resultId`
  - empty-state scroll padding adjusted (no phantom sticky space)

### 6) Design QA Overlay
- Updated `src/ui/components/DesignQAOverlay.tsx`:
  - per-screen reference toggles
  - opacity slider
  - X/Y offset controls in 1pt steps
  - live metrics output:
    - `safeAreaTop`
    - `pagePaddingX`
    - `titleTextStyleName`

## Phase 1 Checklist (status)

- [x] Audit for width-based font scaling helpers
- [x] Audit for magic top paddings and fake safe-area patterns
- [x] Audit for bottom CTA reservation mismatches
- [x] Introduce single typography source (`src/design/typography.ts`)
- [x] Introduce single layout source (`src/design/layout.ts`)
- [x] Update shared Screen wrapper behavior
- [x] Upgrade DesignQAOverlay controls and diagnostics

## Manual QA Matrix

Target devices:
- iPhone SE (375x667)
- iPhone 14/15/16 Pro (393x852)
- iPhone Pro Max (430x932)

Pass criteria:
- No overlap with status bar
- No overlap with home indicator
- CTA always reachable and visible
- Body/list content not hidden behind sticky CTA
- Title styles match intended iOS text styles
- Horizontal paddings match width class (16/20)
