# AI Menu Scan — Runtime validation (TZ v0.1)

Strict runtime validator for the AI menu scan response. Invalid output is rejected; the user sees a retry state and no mock dishes.

---

## What is validated

- **Response shape:** Must be an object with arrays `topPicks`, `caution`, `avoid` (each can be empty). No minimum count for top picks.

- **Per dish (DishPick) in any of the three arrays:**
  1. **name** — Required string, non-empty after trim. No translation or normalization beyond trim.
  2. **shortReason** — Required string; one short sentence: length 15–160, no newlines, no leading bullet (`-` or `•`).
  3. **pins** — Array of exactly 3 or 4 strings; each trimmed and non-empty; unique within the dish; every pin must be in the pin whitelist for the current goal.
  4. **confidencePercent** — Required finite number in range 0–100.
  5. **dietBadges** — Required array (can be empty); every item must be one of the user’s selected diet preferences; must not include `"None"`.
  6. **allergenNote** — If the user has no (real) allergies selected: must be `null`. If the user has at least one allergy selected: must be exactly one of `"Allergen safe"` or `"May contain allergens - ask the waiter"`.
  7. **noLine** — `null` or string. If string: must start with `"No "` (case-sensitive); the part after `"No "` is treated as the ingredient and must match (case-insensitive) one of the user’s dislikes. If the user has no dislikes, `noLine` must be `null`.

- **Minimal normalization before validation:** Only trimming of string fields (`shortReason`, `pins`, `dietBadges`, `allergenNote`, `noLine`). Dish `name` is only trimmed; no auto-fix of pins, allergenNote, or dropping invalid pins.

---

## What errors cause retry

Any validation failure causes:

1. **MenuAnalysisValidationError** to be thrown with an `issues` array (`path`, `code`, `message`).
2. The provider does not return mock data; the error propagates to the UI.
3. The user sees the message: **"Could not analyze this menu. Please try again."** and can use the **Try again** button (same retry UX as for other analysis failures).
4. In dev builds, `issues` are logged with `console.warn('[MenuScanValidation]', issues)`; they are not shown to the user.

---

## Files changed

| File | Change |
|------|--------|
| **src/validation/menuAnalysisValidator.ts** | **New.** Exports `ValidationIssue`, `MenuAnalysisValidationError`, `validateMenuAnalysisResponse()`. Implements all rules above; throws on first collected set of issues (no partial return). |
| **src/ai/menuAnalysis.ts** | After `JSON.parse(raw)`, calls `validateMenuAnalysisResponse(...)` with `goal`, `pinWhitelist`, `selectedDietPreferences`, `selectedAllergies`, `dislikes`. Returns only the validated result; rethrows `MenuAnalysisValidationError` (no mock fallback). Removed legacy inline validation. |
| **src/data/providers/GeminiMenuAnalysisProvider.ts** | Imports `MenuAnalysisValidationError`. In `catch`, if `err instanceof MenuAnalysisValidationError` rethrows as-is; otherwise wraps in `MenuAnalysisFailedError`. Ensures `pinWhitelist` from `getPinWhitelist(user.goal)` and user profile fields are passed through to the AI/validator. |
| **src/services/analyzeMenuUseCase.ts** | Re-exports `MenuAnalysisValidationError` from `../validation/menuAnalysisValidator` for use by the UI. |
| **src/screens/ScanMenuScreen.tsx** | Imports `MenuAnalysisValidationError`. On catch: if `MenuAnalysisValidationError`, sets error message to `"Could not analyze this menu. Please try again."` and in `__DEV__` logs `e.issues` with `console.warn('[MenuScanValidation]', e.issues)`. Same retry card/button as for other failures. |

---

## Exact file paths (list)

- `src/validation/menuAnalysisValidator.ts` (new)
- `src/ai/menuAnalysis.ts`
- `src/data/providers/GeminiMenuAnalysisProvider.ts`
- `src/services/analyzeMenuUseCase.ts`
- `src/screens/ScanMenuScreen.tsx`
- `UI_AI_MENU_SCAN_VALIDATION.md` (this file)
