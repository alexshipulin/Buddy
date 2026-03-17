# Buddy: Current Pin Assignment Logic (Menu + Meal)

Generated from current code state (2026-03-11).

## 1. Scope: where pins are assigned now

There are two active pipelines:

1. Menu scan (`Scan menu`):
- AI returns grouped buckets: `topPicks`, `caution`, `avoid`.
- AI assigns `pins`/`riskPins`/`quickFix` inside strict whitelists passed from app.
- App validates and normalizes AI output (soft validation), then renders.

2. Meal photo/text (`Enter meal`):
- AI can return `pins`/`riskPins`/`menuSection`.
- If AI omits or conflicts, app derives fallback pins from macros and normalizes section.

Important:
- The deterministic ranking modules (`src/domain/recommendationRanking.ts`, `buildDeterministicPins`) exist, but they are not currently used in the active menu scan flow after rollback.

## 2. Menu scan pin logic (active)

### 2.1 Runtime source of pin whitelists

File: `src/domain/menuPins.ts`

- `getPinWhitelist(goal)` -> allowed positive pins for `topPicks`
- `getCautionPinWhitelist(goal)` -> allowed `riskPins` for `caution`
- `getAvoidPinWhitelist(goal)` -> allowed `riskPins` for `avoid`
- `getDietMismatchPin(dietaryPreferences)` -> optional additional risk pin:
  - `Vegan or vegetarian` -> `Not Vegan`
  - `Pescatarian` -> `Not Pescatarian`
  - `Semi-vegetarian` -> `Not Semi-vegetarian`
  - `Gluten-free` -> `Not Gluten-free`
  - `Lactose-free` -> `Not Lactose-free`
  - `Keto` -> `Not Keto`
  - `Paleo (whole foods)` -> `Not Paleo`

File: `src/data/providers/GeminiMenuAnalysisProvider.ts`

- Whitelists are built from goal.
- `dietMismatchPin` is injected into caution/avoid whitelists for current request.
- These lists are passed into `analyzeMenuWithGemini(...)`.

### 2.2 What AI is told to do

File: `src/ai/menuAnalysis.ts`

AI prompt requirements:
- Return only JSON with `topPicks`, `caution`, `avoid`.
- Use only provided whitelists for pins.
- `topPicks` must use `pins` (3-4 unique).
- `caution` and `avoid` must use `riskPins` (1-3 unique).
- `quickFix` requested for caution.
- `allergenNote` requested:
  - if allergies selected: `"Allergen safe"` or `"May contain allergens - ask the waiter"`
  - if no allergies: `null`
- `noLine` requested only for dislikes (`"No <ingredient>"`).

### 2.3 App-side validation and normalization

File: `src/validation/menuAnalysisValidator.ts`

Current behavior:
- `topPicks.pins`: must be array, unique, 3-4, and in top whitelist.
- `caution/avoid.riskPins`: normalized and forced into whitelist (fallback to first whitelist pin if needed).
- `quickFix` for caution is normalized:
  - any text -> `Try: <text>`
  - empty or invalid -> `Try: ask staff`
  - max length 45 chars.
- `quickFix` in avoid is ignored.
- `dietBadges` are filtered to selected user diet preferences only.
- `allergenNote`:
  - if allergies selected and note invalid -> normalized to `"May contain allergens - ask the waiter"`.
  - if no allergies selected -> forced to `null`.
- `riskPins` allergen normalization:
  - if AI returns generic `Allergen`, app replaces it with specific `Contains <allergen>` based on selected allergies and dish text.
  - if text match is unclear, fallback is first selected allergy (for example `Contains milk`).
- `noLine`:
  - kept only if matches format `No <ingredient>` and ingredient exists in user dislikes.
  - otherwise dropped to `null`.

Failure policy:
- per-item problems are tolerated and normalized where possible.
- hard validation error is thrown only when top-level response is invalid or no valid items remain.

## 3. Menu scan pin variants (all current strings)

### 3.1 Top pins by goal

`Lose fat`:
- `Low calorie`
- `High fiber`
- `Lean protein`
- `Low sodium`
- `Low sugar`
- `Portion-friendly`
- `Filling`
- `Veggie-rich`
- `Grilled/steamed`
- `Light dressing`
- `Whole foods`
- `Not fried`

`Maintain weight`:
- `Balanced`
- `Moderate protein`
- `Whole grains`
- `Vegetables`
- `Lean protein`
- `Fiber`
- `Low sodium`
- `Variety`
- `Healthy fats`
- `Portion-aware`
- `Fresh`
- `Whole foods`

`Gain muscle`:
- `High protein`
- `Best protein`
- `Lean protein`
- `Calorie sufficient`
- `Strength support`
- `Recovery`
- `Balanced`
- `Whole foods`
- `Nutrient dense`
- `No empty calories`
- `Healthy fats`
- `Carbs included`

`Eat healthier`:
- `Whole foods`
- `Veggie-rich`
- `Less processed`
- `Fiber`
- `Low sodium`
- `Low sugar`
- `Healthy fats`
- `Balanced`
- `Fresh`
- `Variety`
- `Nutrient dense`
- `Grilled/steamed`

### 3.2 Caution risk pins by goal

`Lose fat`:
- `High calories`
- `High Fat`
- `Fried`
- `Sugary`
- `Heavy Sauce`
- `Refined Carbs`
- `High Sodium`
- `Allergen`
- `Dislike`

`Maintain weight`:
- `High Sodium`
- `High Sugar`
- `High Fat`
- `Fried`
- `Heavy Sauce`
- `Refined Carbs`
- `Low Fiber`
- `Allergen`
- `Dislike`

`Gain muscle`:
- `Low Protein`
- `Too Low Cals`
- `No Carbs`
- `Small Portion`
- `High Sugar`
- `Fried`
- `Heavy Sauce`
- `Allergen`
- `Dislike`

`Eat healthier`:
- `Processed`
- `High Sodium`
- `Added Sugar`
- `Fried`
- `Heavy Sauce`
- `Refined Carbs`
- `High sat fat`
- `Allergen`
- `Dislike`

### 3.3 Avoid risk pins by goal

`Lose fat`:
- `High calories`
- `Deep-fried`
- `Fried`
- `Added Sugar`
- `High sat fat`
- `Creamy`
- `Heavy Sauce`
- `High carbs`
- `Refined Carbs`
- `Processed`
- `Allergen`
- `Dislike`

`Maintain weight`:
- `Very High Sodium`
- `Added Sugar`
- `Deep-fried`
- `Fried`
- `High sat fat`
- `Creamy`
- `Heavy Sauce`
- `Ultra-processed`
- `Processed`
- `Refined Carbs`
- `Allergen`
- `Dislike`

`Gain muscle`:
- `Very Low Protein`
- `Too Low Cals`
- `No Carbs`
- `Tiny Portion`
- `Added Sugar`
- `Deep-fried`
- `Fried`
- `High sat fat`
- `Processed`
- `Allergen`
- `Dislike`

`Eat healthier`:
- `Ultra-processed`
- `Processed`
- `Very High Sodium`
- `Added Sugar`
- `Deep-fried`
- `Fried`
- `High sat fat`
- `Creamy`
- `Heavy Sauce`
- `Refined Carbs`
- `Allergen`
- `Dislike`

### 3.4 Extra risk pin from dietary mismatch

One of:
- `Not Vegan`
- `Not Pescatarian`
- `Not Semi-vegetarian`
- `Not Gluten-free`
- `Not Lactose-free`
- `Not Keto`
- `Not Paleo`

## 4. Allergens and dislikes in menu scan

Allergen-related fields:
- `allergenNote` allowed values in final normalized output:
  - `Allergen safe`
  - `May contain allergens - ask the waiter`
  - `null` (when no allergies selected)
- Generic risk pin `Allergen` may come from AI, but in final normalized output it is converted to:
  - `Contains peanut`
  - `Contains milk`
  - `Contains fish`
  - `Contains shellfish`
  - `Contains tree nuts`
  - `Contains egg`
  - `Contains wheat`
  - `Contains soy`

Dislike-related fields:
- Risk pin `Dislike` can appear in caution/avoid.
- `noLine` can appear as `No <ingredient>`, but only if ingredient matches user dislikes.

## 5. Meal photo/text pin logic (active)

### 5.1 AI-side + app fallback logic

File: `src/services/aiService.ts`

If AI returns pins/riskPins:
- app accepts them (dedup/trim, max 4 pins and max 3 risk pins).

If AI omits them:
- app derives from macros.

Derived pins thresholds:
- `High protein` if protein >= 35g
- `Portion-aware` if calories <= 650
- `Lower fat` if fat <= 22g
- `Balanced` if carbs <= 45g

Derived riskPins thresholds:
- `High calories` if calories >= 900
- `High fat` if fat >= 38g
- `High carbs` if carbs >= 75g
- `Low protein` if protein < 20g

Section derivation:
- 0 risk pins -> `top`
- 1-2 risk pins -> `caution`
- >=3 risk pins -> `avoid`

### 5.2 TrackMeal extra local fallback signals

File: `src/screens/TrackMealScreen.tsx`

When rendering meal details, local `deriveMealSignals(...)` may be used as fallback:

Top pin candidates:
- `High protein` (protein >= 35)
- `Portion-aware` (calories <= 600)
- `Lower carbs` (carbs <= 35)
- `Lower fat` (fat <= 20)
- `Fresh` (if title/notes contain `fresh`, `salad`, `veggie`)
- `Photo-logged` or `Text-logged` by source
- fallback: `Balanced`

Risk pin candidates:
- `High calories` (>= 800)
- `High carbs` (>= 70)
- `High fat` (>= 35)
- `Low protein` (< 20)

## 6. Deterministic pin module status (currently not wired to active menu scan)

File: `src/domain/menuPins.ts` -> `buildDeterministicPins(...)`

This helper can generate additional pin strings like:
- positive: `Lower carb`, `Veggie-forward`, `No listed allergen`
- risk: `Dessert`, `Sugary drink`, `Contains <allergen>`, `Allergen unclear`, `Dislike (removable)`

These are currently relevant to inactive deterministic ranking code, not to the active rolled-back menu scan flow.

## 7. Code examples for analysis

### Example A: Build whitelists for menu scan request

```ts
import {
  getPinWhitelist,
  getCautionPinWhitelist,
  getAvoidPinWhitelist,
  getDietMismatchPin,
} from '../domain/menuPins';

const top = getPinWhitelist(user.goal);
const caution = getCautionPinWhitelist(user.goal);
const avoid = getAvoidPinWhitelist(user.goal);

const dietMismatchPin = getDietMismatchPin(user.dietaryPreferences ?? []);
const effectiveCaution = dietMismatchPin ? [...caution, dietMismatchPin] : caution;
const effectiveAvoid = dietMismatchPin ? [...avoid, dietMismatchPin] : avoid;
```

### Example B: How `quickFix` is normalized in caution

```ts
const rawQuickFix = typeof quickFixRaw === 'string' ? quickFixRaw : '';
const normalizedQuickFix = rawQuickFix.replace(/\s+/g, ' ').trim();
const quickFixBody = normalizedQuickFix.replace(/^try[:\-\s]*/i, '').trim();

let quickFix = quickFixBody ? `Try: ${quickFixBody}` : 'Try: ask staff';
if (quickFix.length > 45) {
  const bodyLimit = 45 - 'Try: '.length;
  const boundedBody = quickFixBody.slice(0, bodyLimit).trim();
  quickFix = boundedBody ? `Try: ${boundedBody}` : 'Try: ask staff';
}
```

### Example C: Derived meal pins from macros

```ts
const pins: string[] = [];
const riskPins: string[] = [];

if (proteinG >= 35) pins.push('High protein');
if (caloriesKcal <= 650) pins.push('Portion-aware');
if (fatG <= 22) pins.push('Lower fat');
if (carbsG <= 45) pins.push('Balanced');

if (caloriesKcal >= 900) riskPins.push('High calories');
if (fatG >= 38) riskPins.push('High fat');
if (carbsG >= 75) riskPins.push('High carbs');
if (proteinG < 20) riskPins.push('Low protein');
```
