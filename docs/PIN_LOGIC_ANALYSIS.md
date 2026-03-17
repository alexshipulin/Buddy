# Pin Logic Analysis (Current Runtime)

Date: 2026-03-11  
Scope: `menu_scan` deterministic ranking pipeline (current app runtime), with exact code references.

## 1) End-to-end flow where pins are produced

1. AI extracts dishes with macros/flags/allergen/dislike signals (no direct pins in extraction schema/prompt):  
   - `src/ai/menuAnalysis.ts:161`  
   - `src/ai/menuAnalysis.ts:169`  
   - `src/ai/menuAnalysis.ts:173`  
   - `src/ai/menuAnalysis.ts:314`
2. Provider runs deterministic ranking in app code:  
   - `src/data/providers/GeminiMenuAnalysisProvider.ts:278`
3. During ranking, section is decided (`top` / `caution` / `avoid`), then deterministic pins are generated:  
   - `src/domain/recommendationRanking.ts:610`  
   - `src/domain/recommendationRanking.ts:611`
4. Mapping to final `DishPick` for UI:  
   - top gets `pins`; caution/avoid get `riskPins`: `src/domain/recommendationRanking.ts:544` and `src/domain/recommendationRanking.ts:545`
5. UI rendering:  
   - top chips: `src/screens/MenuResultsScreen.tsx:56`  
   - caution risk chips: `src/screens/MenuResultsScreen.tsx:118`  
   - avoid risk chips: `src/screens/MenuResultsScreen.tsx:162`

## 2) Pin data model in result

- `DishPick.pins` (positive pins, top section) and `DishPick.riskPins` (risk pins, caution/avoid):  
  `src/domain/models.ts:95`  
  `src/domain/models.ts:98`  
  `src/domain/models.ts:100`

## 3) Source of truth: pin catalogs (whitelists)

Main catalog file: `src/domain/menuPins.ts`

### 3.1 Top pin whitelist by goal

Defined in:
- Lose fat: `src/domain/menuPins.ts:13`
- Maintain weight: `src/domain/menuPins.ts:27`
- Gain muscle: `src/domain/menuPins.ts:40`
- Eat healthier: `src/domain/menuPins.ts:51`
- Goal map: `src/domain/menuPins.ts:63`

Helper:
- `getPinWhitelist(goal)`: `src/domain/menuPins.ts:187`

### 3.2 Risk pin whitelist by goal

Caution lists:
- Lose fat: `src/domain/menuPins.ts:74`
- Maintain weight: `src/domain/menuPins.ts:86`
- Gain muscle: `src/domain/menuPins.ts:98`
- Eat healthier: `src/domain/menuPins.ts:109`

Avoid lists:
- Lose fat: `src/domain/menuPins.ts:121`
- Maintain weight: `src/domain/menuPins.ts:134`
- Gain muscle: `src/domain/menuPins.ts:147`
- Eat healthier: `src/domain/menuPins.ts:159`

Maps and getters:
- `GOAL_CAUTION_PINS`: `src/domain/menuPins.ts:172`
- `GOAL_AVOID_PINS`: `src/domain/menuPins.ts:179`
- `getCautionPinWhitelist(goal)`: `src/domain/menuPins.ts:192`
- `getAvoidPinWhitelist(goal)`: `src/domain/menuPins.ts:197`

### 3.3 Explicit pin values (current)

Top pins:

| Goal | Pins |
|---|---|
| Lose fat | `Low-calorie`, `High fiber`, `Lean protein`, `Low sodium`, `Low sugar`, `Portion-aware`, `Filling`, `Vegetables`, `Grilled/steamed`, `Light dressing`, `Whole foods` |
| Maintain weight | `Balanced`, `Moderate protein`, `Whole grains`, `Vegetables`, `Lean protein`, `High fiber`, `Low sodium`, `Healthy fats`, `Portion-aware`, `Whole foods` |
| Gain muscle | `High protein`, `Lean protein`, `Enough calories`, `Balanced`, `Whole foods`, `Nutrient-rich`, `Healthy fats`, `Carbs included` |
| Eat healthier | `Whole foods`, `Vegetables`, `High fiber`, `Low sodium`, `Low sugar`, `Healthy fats`, `Balanced`, `Nutrient-rich`, `Grilled/steamed` |

Caution risk pins:

| Goal | Risk pins |
|---|---|
| Lose fat | `High-calorie`, `High fat`, `Fried`, `High sugar`, `Heavy sauce`, `Refined Carbs`, `High sodium`, `Allergen`, `Dislike` |
| Maintain weight | `High sodium`, `High sugar`, `High fat`, `Fried`, `Heavy sauce`, `Refined Carbs`, `Low Fiber`, `Allergen`, `Dislike` |
| Gain muscle | `Low Protein`, `Small portion`, `No Carbs`, `High sugar`, `Fried`, `Heavy sauce`, `Allergen`, `Dislike` |
| Eat healthier | `Processed`, `High sodium`, `High sugar`, `Fried`, `Heavy sauce`, `Refined Carbs`, `High sat fat`, `Allergen`, `Dislike` |

Avoid risk pins:

| Goal | Risk pins |
|---|---|
| Lose fat | `High-calorie`, `Fried`, `High sugar`, `High sat fat`, `Heavy sauce`, `High carbs`, `Refined Carbs`, `Processed`, `Allergen`, `Dislike` |
| Maintain weight | `High sodium`, `High sugar`, `Fried`, `High sat fat`, `Heavy sauce`, `Ultra-processed`, `Processed`, `Refined Carbs`, `Allergen`, `Dislike` |
| Gain muscle | `Very Low Protein`, `Small portion`, `No Carbs`, `High sugar`, `Fried`, `High sat fat`, `Processed`, `Allergen`, `Dislike` |
| Eat healthier | `Ultra-processed`, `Processed`, `High sodium`, `High sugar`, `Fried`, `High sat fat`, `Heavy sauce`, `Refined Carbs`, `Allergen`, `Dislike` |

## 4) Deterministic pin generator (actual triggers)

Function: `buildDeterministicPins(...)`  
Code: `src/domain/menuPins.ts:297`

### 4.1 Common mechanics

1. Pin is added only if it exists in section whitelist:  
   `src/domain/menuPins.ts:291`
2. Duplicate pins are blocked:  
   `src/domain/menuPins.ts:293`
3. Section switch:
   - `top` branch: `src/domain/menuPins.ts:303`
   - risk branch (`caution` / `avoid`): `src/domain/menuPins.ts:334`

### 4.2 Top pins trigger matrix

Top branch rules:

| Trigger condition | Candidate pin | Code |
|---|---|---|
| `protein >= 30` | `High protein` | `src/domain/menuPins.ts:305` |
| `flags.leanProtein` | `Lean protein` | `src/domain/menuPins.ts:306` |
| `flags.veggieForward` | `Vegetables` | `src/domain/menuPins.ts:307` |
| `flags.wholeFood` | `Whole foods` | `src/domain/menuPins.ts:308` |
| `goal === Gain muscle && calories >= 450` | `Enough calories` | `src/domain/menuPins.ts:309` |
| `goal === Lose fat && 0 < calories <= 550` | `Low-calorie` | `src/domain/menuPins.ts:312` |
| `goal === Gain muscle && carbs >= 30` | `Carbs included` | `src/domain/menuPins.ts:315` |
| `10 <= fat <= 28` | `Healthy fats` | `src/domain/menuPins.ts:318` |

Post-processing:
- If pins < 3, fill from top whitelist in order until 3: `src/domain/menuPins.ts:321`
- Final cap to max 4 pins: `src/domain/menuPins.ts:329`

Important:
- Even if trigger fires, pin is skipped if not in current goal whitelist (whitelist gate is strict): `src/domain/menuPins.ts:291`.

### 4.3 Caution/Avoid risk pin trigger matrix

Risk branch rules:

| Trigger condition | Candidate pin(s) | Code |
|---|---|---|
| `calories >= 650` | `High-calorie` | `src/domain/menuPins.ts:335` |
| `fat >= 30` | `High fat` | `src/domain/menuPins.ts:336` |
| `flags.fried` | `Fried` | `src/domain/menuPins.ts:337` |
| `flags.highFatSauce` | `Heavy sauce` | `src/domain/menuPins.ts:338` |
| `flags.refinedCarbHeavy` | `Refined Carbs` | `src/domain/menuPins.ts:339` |
| `flags.processed` | `Processed` and `Ultra-processed` | `src/domain/menuPins.ts:340` |
| `flags.sugaryDrink || flags.dessert` | `High sugar` | `src/domain/menuPins.ts:344` |
| `fat >= 38` | `High sat fat` | `src/domain/menuPins.ts:347` |
| `carbs >= 65` | `High carbs` | `src/domain/menuPins.ts:348` |
| selected allergies + allergen pressure | `Allergen` | `src/domain/menuPins.ts:350` |
| `dislikeSignals.containsDislikedIngredient` | `Dislike` | `src/domain/menuPins.ts:356` |

Gain-muscle-specific extra risk rules:

| Trigger condition | Candidate pin | Code |
|---|---|---|
| `0 < protein < 25` | `Low Protein` | `src/domain/menuPins.ts:361` |
| `0 < protein < 18` | `Very Low Protein` | `src/domain/menuPins.ts:362` |
| `0 < calories < 350` | `Small portion` | `src/domain/menuPins.ts:363` |
| `0 < carbs < 20` | `No Carbs` | `src/domain/menuPins.ts:364` |

Post-processing:
- If no risk pin matched, fallback to first risk whitelist pin: `src/domain/menuPins.ts:367`
- Final cap to max 3 risk pins: `src/domain/menuPins.ts:373`

Important:
- Risk pin still must exist in current section whitelist (`caution` or `avoid`) due to whitelist gate in `addIfWhitelisted`: `src/domain/menuPins.ts:291`.

## 5) How section is chosen (defines whether pins or riskPins appear)

Section chooser: `determineSection(...)`  
Code: `src/domain/recommendationRanking.ts:325`

Decision order:

1. `avoid` if hard conflicts exist: `src/domain/recommendationRanking.ts:331`
2. `avoid` if explicit allergen contains selected allergy: `src/domain/recommendationRanking.ts:332`
3. `avoid` if disliked ingredient not removable: `src/domain/recommendationRanking.ts:333`
4. `caution` if any soft pressure, protein warning, severe quality risk, or allergen unclear: `src/domain/recommendationRanking.ts:336`
5. `caution` if infeasible and not first-meal-flex: `src/domain/recommendationRanking.ts:345`
6. Otherwise `top`: `src/domain/recommendationRanking.ts:346`

Direct implication:
- If no hard conflicts are produced, `avoid` can stay empty even with many risky dishes.

## 6) Where hard/soft/protein/quality reasons come from

Scoring and reason construction: `scoreDish(...)`  
Code: `src/domain/recommendationRanking.ts:363`

### 6.1 Hard conflict triggers (can force `avoid`)

| Hard trigger | Code |
|---|---|
| Selected allergen found in `allergenSignals.contains` | `src/domain/recommendationRanking.ts:401` |
| Disliked ingredient not removable | `src/domain/recommendationRanking.ts:409` |
| Severe calorie over-share (`dishCalories > remaining * 1.45`, after first meal) | `src/domain/recommendationRanking.ts:414` |
| Feasibility leaves `< 180` kcal/meal | `src/domain/recommendationRanking.ts:445` |

### 6.2 Soft pressure triggers (usually `caution`)

| Soft trigger | Code |
|---|---|
| `caloriePressure > tolerance` | `src/domain/recommendationRanking.ts:422` |
| `fatPressure > tolerance` | `src/domain/recommendationRanking.ts:425` |
| `highFatSauce && fatPressure >= 1` | `src/domain/recommendationRanking.ts:427` |
| `carbPressure > tolerance` | `src/domain/recommendationRanking.ts:434` |
| Feasibility leaves `< 300` kcal/meal | `src/domain/recommendationRanking.ts:448` |
| Protein needed/meal too high after pick (not first-meal-flex) | `src/domain/recommendationRanking.ts:451` |

### 6.3 Protein warning trigger

| Trigger | Code |
|---|---|
| `dishProtein < proteinFloor` and still enough protein target remains (`remainingProteinRatio > 0.35`) | `src/domain/recommendationRanking.ts:438` |

### 6.4 Severe quality-risk trigger used by sectioning

Quality reasons created from flags:
- fried/sugaryDrink/processed/highFatSauce/dessert/refinedCarbHeavy: `src/domain/recommendationRanking.ts:224`

Severe-risk detector:
- fried/sugary/dessert/processed reasons considered severe: `src/domain/recommendationRanking.ts:315`

## 7) Why top can appear and avoid can be empty

1. `top` appears when none of avoid/caution conditions fire (`determineSection`): `src/domain/recommendationRanking.ts:325`.
2. `avoid` requires hard conflicts (or specific allergen/dislike hard cases): `src/domain/recommendationRanking.ts:331`.
3. Many negative signals become `caution`, not `avoid` (soft pressure, low protein, severe quality risk): `src/domain/recommendationRanking.ts:336`.

## 8) UI output rules for pins

1. Top cards render only `pins` (+ diet badges), not `riskPins`:  
   `src/screens/MenuResultsScreen.tsx:54`  
   `src/screens/MenuResultsScreen.tsx:56`
2. Caution cards render up to 3 `riskPins` with warning style:  
   `src/screens/MenuResultsScreen.tsx:116`  
   `src/screens/MenuResultsScreen.tsx:118`
3. Avoid cards render up to 3 `riskPins` with danger style:  
   `src/screens/MenuResultsScreen.tsx:160`  
   `src/screens/MenuResultsScreen.tsx:162`
4. When user taps `I take it`, pins are persisted into meal record:
   - `pins`: `src/screens/MenuResultsScreen.tsx:271`
   - `riskPins`: `src/screens/MenuResultsScreen.tsx:272`
   - `menuSection` (top/caution/avoid) saved with meal: `src/screens/MenuResultsScreen.tsx:278`
5. In `Meal details`, UI renders either risk pins (warning/danger) or top pins:
   - branch switch by `riskPins` presence: `src/screens/TrackMealScreen.tsx:144` and `src/screens/TrackMealScreen.tsx:146`
   - risk chip style uses `menuSection === 'avoid' ? 'danger' : 'warning'`: `src/screens/TrackMealScreen.tsx:153`
   - top pin rendering path: `src/screens/TrackMealScreen.tsx:159`

## 9) Validation constraints for pin payload shape (legacy/contract validator)

Validator file: `src/validation/menuAnalysisValidator.ts`

Top (`topPicks`) constraints:
- `pins` required array, 3..4, whitelist-checked:  
  `src/validation/menuAnalysisValidator.ts:119`  
  `src/validation/menuAnalysisValidator.ts:128`  
  `src/validation/menuAnalysisValidator.ts:132`
- `riskPins` not allowed for top: `src/validation/menuAnalysisValidator.ts:211`

Caution/Avoid constraints:
- `pins` not allowed: `src/validation/menuAnalysisValidator.ts:138`
- `riskPins` required array, 1..3, whitelist-checked:  
  `src/validation/menuAnalysisValidator.ts:220`  
  `src/validation/menuAnalysisValidator.ts:229`  
  `src/validation/menuAnalysisValidator.ts:232`

Important runtime note:
- Current `menu_scan` path uses extraction + deterministic ranking (not direct AI `topPicks/caution/avoid` payload).  
  Deterministic path call: `src/data/providers/GeminiMenuAnalysisProvider.ts:278`  
  This validator remains relevant as contract guard/tests for legacy structured output flow.

## 10) Pin normalization and canonical labels

Normalization helpers:
- `normalizePinLabel`, `normalizePinLabels`: `src/domain/menuPins.ts:254`
- Legacy-to-canonical map: `src/domain/menuPins.ts:221`

Runtime usage note:
- Deterministic pin generator already emits canonical labels directly.  
- Normalization is mainly used in validator path for incoming structured AI arrays: `src/validation/menuAnalysisValidator.ts:127` and `src/validation/menuAnalysisValidator.ts:228`.

## 11) Diet-mismatch pin (currently not active in deterministic menu_scan path)

Defined:
- map (`Not Vegan`, `Not Keto`, etc.): `src/domain/menuPins.ts:201`
- getter: `src/domain/menuPins.ts:216`

Observation:
- In current deterministic `menu_scan` runtime path, this function is not invoked.

## 12) Operational debugging: where to inspect pin decisions per scan

Provider emits per-dish ranking debug logs:
- stage `ranking.dish` with `sectionAssigned`, reasons, pressures:  
  `src/data/providers/GeminiMenuAnalysisProvider.ts:311`  
  `src/data/providers/GeminiMenuAnalysisProvider.ts:328`  
  `src/data/providers/GeminiMenuAnalysisProvider.ts:330`

Final bucket summary per scan:
- stage `ranking.final_buckets`:  
  `src/data/providers/GeminiMenuAnalysisProvider.ts:359`
