# UI Pixel-Perfect Pass – QA Checklist

Reference: design screenshots IMG_1520–1527. Branch: `ui/pixel-perfect-pass`.

## What Changed

### Single source of truth
- **`src/design/tokens.ts`** – Colors (bg, surface, ink, muted, border, primary, accent, success, etc.), spacing (4–40pt), radius (card 24, sheet 32, input 14, chip 16, pill 18, button 28), card shadow, typography tokens.
- **`src/design/theme.ts`** – Composes tokens; exports `appTheme` with semantic colors and spacing/radius aliases.
- **`src/design/spec.ts`** – Spec used by components: screen padding, header dimensions, button/chip/card/input sizes, step indicator, min touch target (44pt).
- **`src/ui/theme.ts`** – Re-exports design theme as `uiTheme` for backward compatibility.
- **`src/ui/typography.ts`** – Uses design typography (hero, h1, h2, body, bodySemibold, caption, overline).

### Global layout
- **`src/ui/components/Screen.tsx`** – No top padding; only `paddingHorizontal: 20`, `paddingBottom: insets.bottom + 16`. Headers control top spacing.
- **`src/components/AppScreen.tsx`** – Same padding rules (horizontal 20, bottom insets+16, no arbitrary paddingTop).
- **`src/components/ScreenHeader.tsx`** – New header: height 56, paddingTop insets.top+8, center title, left pill (back or label e.g. "Welcome", "Goal", "Home"), optional right pill/Skip. Pill: height 36, radius 18, paddingX 14.

### Navigation
- **`src/app/navigation/AppNavigator.tsx`** – `headerShown: false` at navigator level; no default React Navigation titles.

### Components
- **PrimaryButton** – Height 56, radius 28, primary bg, bodySemibold primaryText, disabled uses disabledBg and no shadow; min touch 44.
- **SecondaryButton** – Height 56, radius 28, surface + border, bodySemibold.
- **Chip** – Height 32, radius 16, paddingX 12; selected ink/white, unselected surface/muted. Optional `small` (28/14/10, caption).
- **Card** – Radius 24, padding 20, border 1px, cardShadow.
- **TextField** – Height 52, radius 14, paddingX 16, body font.
- **SelectField** – Same input dimensions, chevron right.

### Screens
- **WelcomeScreen** – Hero image top; bottom sheet absolute bottom, radius 32, padding 20/28/insets.bottom+16; title hero, subtitle body muted maxWidth 320; CTA full width; Skip pill top-right with safe area.
- **GoalSelectionScreen** – ScreenHeader left "Welcome", title "Goal"; step indicator (dot 8, active 22×8, gap 8); title "Select your goal" h1; subtitle body muted; goal grid 2 cols, card height 170, icon 40, radio 24; Continue pinned bottom with insets.
- **DietaryProfileScreen** – ScreenHeader left "Goal", title "Dietary profile"; same step indicator; page title h1; section titles h2 marginTop 24; chips gap 12; Save pinned bottom, Skip link under; Add other modal.
- **HomeScreen** – No nav header. Top row: greeting hero, "Ready to scan?" body muted, avatar 44×44. Today card radius 24 padding 20; "Eaten" pill accentSoft/accent height 28 radius 14; macro labels overline muted, values h1; action tiles icon circle 56×56 radius 28, title h2.
- **ProfileScreen** – ScreenHeader left "Home", title "Profile"; Account, Dietary profile (link to DietaryProfile), Personal parameters (TextField Height/Weight/Age, SelectField Sex, SegmentedControl Activity); Save Changes pinned bottom; disclaimer caption muted.
- **MenuResultsScreen** – ScreenHeader left "Home", title "Top picks"; section title "Top picks" h1; helper body muted; summary card radius 24 padding 20; dish cards same style (h2, body muted, Chip small, "I take it" + "Why?" text link accent); Rescan secondary 56/28; "Open chat with Buddy" accent link.

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

- Before: Mixed spacing (6, 10, 16, 20, 28), inconsistent radii, extra top padding, navigation titles, chips/buttons not to spec.
- After: 8pt rhythm (4–40), single token set, no default top padding, custom ScreenHeader, buttons 56/28, chips 32/16, cards 24/20.
