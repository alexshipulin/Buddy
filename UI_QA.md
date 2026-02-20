# UI Pixel-Perfect Pass – QA Checklist

Reference: design screenshots IMG_1520–1527. Branch: `ui/pixel-perfect-pass`.

## What Changed

### Single source of truth
- **`src/design/tokens.ts`** – Colors (bg, surface, ink, muted, border, primary, accent, success, etc.), spacing (4–40pt, spacingScale xs→3xl), radius (card 24, sheet 32, input 14, chip 16, pill 18, button 28), radiusScale (small 12, medium 16, large 20, xl 24), card shadow. Typography: iOS text styles (largeTitle 34/41, title1 28/34, title2 22/28, title3 20/25, headline 17/22, body 17/22, callout 16/21, subheadline 15/20, footnote 13/18, caption1 12/16, caption2 11/13); aliases hero, h1, h2, body, bodySemibold, caption, overline.
- **`src/design/theme.ts`** – Composes tokens; exports `appTheme` with semantic colors and spacing/radius aliases (xs→3xl).
- **`src/design/spec.ts`** – Spec used by components: screen padding, header dimensions, button/chip/card/input sizes, step indicator, min touch target (44pt).
- **`src/ui/theme.ts`** – Re-exports design theme as `uiTheme` for backward compatibility.
- **`src/ui/typography.ts`** – Uses design typography (hero, h1, h2, body, bodySemibold, caption, overline).

### Global layout
- **`src/ui/components/Screen.tsx`** – No top padding; only `paddingHorizontal: 20`, `paddingBottom: insets.bottom + 16`. Headers control top spacing. Supports `maxContentWidth` (default 460) for wide screens, `bottomCTAPadding` when BottomCTA is present.
- **`src/components/AppScreen.tsx`** – Same padding rules (horizontal 20, bottom insets+16, no arbitrary paddingTop).
- **`src/components/ScreenHeader.tsx`** – New header: height 56, paddingTop insets.top+8, center title, left pill (back or label e.g. "Welcome", "Goal", "Home"), optional right pill/Skip. Pill: height 36, radius 18, paddingX 14.
- **`src/ui/components/BottomCTA.tsx`** – Fixed bottom CTA container with safe area support. Use for primary actions pinned to bottom (Continue, Save Changes).

### Navigation
- **`src/app/navigation/AppNavigator.tsx`** – `headerShown: false` at navigator level; no default React Navigation titles.

### Components
- **PrimaryButton** – Height 56, radius 28, paddingHorizontal 16 (spec), primary bg, bodySemibold primaryText, disabled uses disabledBg and no shadow; min touch 44.
- **SecondaryButton** – Height 56, radius 28, paddingHorizontal 16 (spec), surface + border, bodySemibold.
- **Chip** – Height 32, radius 16, paddingX 12; selected ink/white, unselected surface/muted. Optional `small` (28/14/10, caption).
- **Card** – Radius 24, padding 20, border 1px, cardShadow.
- **TextField** – Height 52, radius 14, paddingX 16, body font.
- **SelectField** – Same input dimensions, chevron right.

### Screens
- **WelcomeScreen** – Hero image top; bottom sheet absolute bottom, radius 32, padding 20/28/insets.bottom+16; title hero, subtitle body muted maxWidth 320; CTA full width; Skip pill top-right with safe area.
- **WelcomeScreen** – Hero image full width; bottom sheet absolute bottom, maxHeight 60%, minHeight 320, radius 32, padding 20/28/insets.bottom+16; content maxWidth 460 centered; title hero, subtitle body muted maxWidth 320; CTA full width; Skip pill top-right with safe area.
- **GoalSelectionScreen** – ScreenHeader left "Welcome", title "Goal"; ScrollView with maxContentWidth 460; step indicator (dot 8, active 22×8, gap 8); title "Select your goal" h1; subtitle body muted; goal grid 2 cols adaptive (cardWidth calculated), card height 170, icon 40, radio 24; Continue BottomCTA pinned bottom.
- **DietaryProfileScreen** – ScreenHeader left "Goal", title "Dietary profile"; same step indicator; page title h1; section titles h2 marginTop 24; chips gap 12; Save BottomCTA pinned bottom, Skip link under; Add other modal.
- **HomeScreen** – No nav header, maxContentWidth 460. Top row: greeting hero, "Ready to scan?" body muted, avatar 44×44. Today card radius 24 padding 20; "Eaten" pill accentSoft/accent height 28 radius 14; macro labels overline muted, values h1; action tiles icon circle 56×56 radius 28, title h2.
- **ProfileScreen** – ScreenHeader left "Home", title "Profile"; ScrollView with bottomCTAPadding; Account, Dietary profile (link to DietaryProfile), Personal parameters (TextField Height/Weight/Age, SelectField Sex, SegmentedControl Activity); Save Changes BottomCTA pinned bottom; disclaimer caption muted.
- **MenuResultsScreen** – ScreenHeader left "Home", title "Top picks"; section title "Top picks" h1; helper body muted; summary card radius 24 padding 20; dish cards same style (h2, body muted, Chip small, "I take it" + "Why?" text link accent); Rescan secondary 56/28; "Open chat with Buddy" accent link.

## One-click check

**Одна команда (из любой папки):**

```bash
sh ~/Desktop/Buddy/check.sh
```

Или если проект не на рабочем столе:

```bash
sh /Users/alexshipulin/Desktop/Buddy/check.sh
```

Скрипт сам перейдёт в каталог проекта и запустит проверку TypeScript. Потом можно запустить приложение: `cd ~/Desktop/Buddy && npm start`.

## Verification Checklist

- [ ] **No extra top whitespace** – All screens use ScreenHeader or custom top (Welcome); no default paddingTop from Screen/AppScreen.
- [ ] **Headers** – Center title, left pill (back or label), right optional; match mock.
- [ ] **Touch targets** – Buttons and tappable areas at least 44×44pt.
- [ ] **Typography** – Only hero, h1, h2, body, bodySemibold, caption, overline; no random font sizes; maxFontSizeMultiplier 1.2 where set.
- [ ] **Cards & chips** – Same radius, padding, and shadow across screens.
- [ ] **Safe areas** – Top notch and bottom home indicator respected (insets in Screen and ScreenHeader).
- [ ] **iOS simulator** – Test on iPhone 15 Pro or similar.
- [ ] **Android** – Smoke test.

## Before/After References

- Before: Mixed spacing (6, 10, 16, 20, 28), inconsistent radii, extra top padding, navigation titles, chips/buttons not to spec, non-adaptive layouts on large screens.
- After: 8pt rhythm (4–40), single token set, no default top padding, custom ScreenHeader, buttons 56/28, chips 32/16, cards 24/20, maxContentWidth 460 on wide screens, BottomCTA for fixed actions, ScrollView support with bottom padding.

## Design QA Overlay

**`src/ui/components/DesignQAOverlay.tsx`** – Component for pixel-perfect comparison with reference images from Figma/Stitch.

Usage: Enable via dev gesture (e.g., 5 taps on title) or dev toggle. See `design/qa/README.md` for details.

Features:
- Overlay reference image with adjustable opacity (0–100%)
- Tap slider to adjust opacity
- Full-screen modal
- Use with reference PNGs in `design/reference/`

## Pixel-perfect audit (Figma + Apple HIG)

### Tokens / theme

| Change | Detail |
|--------|--------|
| **Typography** | Exact iOS line heights: largeTitle 34/41, title1 28/34, title2 22/28, title3 20/25, headline 17/22, body 17/22, callout 16/21, subheadline 15/20, footnote 13/18, caption1 12/16, caption2 11/13. Aliases hero, h1, h2, bodySemibold, caption, overline unchanged. |
| **Spacing scale** | Added `spacingScale`: xs 4, sm 8, md 16, lg 20, xl 24, 2xl 32, 3xl 40. Theme exposes appTheme.spacing.xs … 3xl. |
| **No magic numbers** | All layout values use `spec` or `appTheme`; screens and components updated to remove hardcoded 4, 6, 10, 12, 14, etc. |

### Layout / navigation

| Issue | Fix |
|-------|-----|
| Extra top whitespace | AppScreen and Screen already had no paddingTop; only horizontal and bottom padding. Confirmed no extra top padding added anywhere. |
| Default stack headers | AppNavigator already uses `headerShown: false`; all screens use custom ScreenHeader or custom top (Welcome). |
| AppScreen padding | Replaced hardcoded 20/16 with `spec.screenPaddingHorizontal` and `spec.screenPaddingBottomOffset`. |

### Screen-by-screen

| Screen | What was wrong | What changed |
|--------|----------------|-------------|
| **Welcome** | CTA marginBottom 14 (magic) | `marginBottom: spec.spacing[16]`. |
| **Goal selection** | Already using Screen + ScreenHeader, spec, tokens. | No layout change. |
| **Dietary profile** | Add other input paddingVertical 12 (magic) | `paddingVertical: spec.spacing[12]`, `minHeight: spec.inputHeight`. |
| **Home** | eatenChip 14/12/28, macroCell gap 6, actionCard gap 14, actionIcon 28, recentTime marginTop 2, recentTag padding 12/4, actionIconOrange #FFF1E2 | All from spec: chipSmallRadius/PaddingX/Height, spacing[8]/[16], primaryButtonRadius, spacing[4], chipPaddingX/spacing[4], warningSoft. |
| **Profile** | sectionLabel marginBottom 10, row minHeight 42, guestPill 10/4, profileLink gap 10, segmentWrap/premiumCard/legalCard gap 8 or 6, chevron 16, premiumSubtitle marginBottom 6 | spec.spacing[8], spec.minTouchTarget, spec.chipPaddingX/spacing[4], spec.spacing[8], typography.callout.fontSize. |
| **Menu results** | BOTTOM_BAR_* magic, compactCard radius input, paddingVertical/gap 4, marginBottom 2, cautionTag 8/4/6, dishName marginBottom 2 | BOTTOM_BAR_PADDING from spec; compactCard uses cardRadius/cardBorderWidth; all spacing from spec; caption1.fontSize for small labels; cautionTag from spec spacing and inputRadius. |

### Verification

- No debug/placeholder copy left (no "Requested from Home", "Local account (MVP)" in codebase).
- Buttons: 56pt height, 28pt radius, 16pt horizontal padding (spec).
- Cards: 24pt radius, 20pt padding, 1px border, card shadow (spec).
- Chips: 32pt height, 16pt radius, 12pt paddingX; small 28/14/10 (spec).
- 8pt grid: spacing only 4, 8, 12, 16, 20, 24, 32, 40 from tokens.
