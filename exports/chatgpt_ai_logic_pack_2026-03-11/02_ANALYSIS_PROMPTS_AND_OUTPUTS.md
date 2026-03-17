# Prompt / Output / Validation Guide

## Menu scan (Gemini)
- Prompt and structured schema are in:
  - `files/src/ai/menuAnalysis.ts`
- Model output is expected to contain:
  - `topPicks[]`, `caution[]`, `avoid[]`
- Each dish item is normalized then validated against business rules.

## Business validation highlights
- Top pins: only whitelist, exactly 3-4, unique.
- Caution/Avoid riskPins: only section whitelist, 1-3, unique.
- `quickFix`: only for caution, must start with `Try: `.
- `confidencePercent`: 0..100.
- `dietBadges`: subset of selected diet preferences.
- `allergenNote`: strict allowed values when allergies are selected.
- `noLine`: allowed only by dislikes rules.

Validation file:
- `files/src/validation/menuAnalysisValidator.ts`

## Constructor/build logic
- Prompt includes constructor rules in `menuAnalysis.ts`.
- Post-processing ensures build variants and normalizes `Build:` names.
- Disliked ingredients are filtered from build combos during normalization/fallback.

## Top / OK / Avoid display behavior
- AI output is not rendered directly 1:1.
- Top items are re-scored against remaining daily budget and can move to OK.
- First-meal rescue can keep top visible in specific cases.

UI composition file:
- `files/src/screens/MenuResultsScreen.tsx`
