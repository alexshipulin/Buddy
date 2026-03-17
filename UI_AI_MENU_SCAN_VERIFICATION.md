# UI & AI Menu Scan — Verification Report (TZ v0.1)

Release-grade verification. Evidence only; no code was changed.

---

## 1) Multi-image proof

### 1.1 Search for "firstImage" / "images[0]" in menu scan path

| Location | In menu scan path? | Evidence |
|----------|--------------------|----------|
| `src/services/aiService.ts` lines 189–193 | **No** | Used inside `analyzeMenu()` (exported from aiService). This function is **not** called by the menu scan flow. Scan flow uses `analyzeMenuUseCase` → `menuAnalysisProvider.analyzeMenu` (GeminiMenuAnalysisProvider). |

**Conclusion:** No `firstImage`/`images[0]` in the actual menu scan path (ScanMenuScreen → analyzeMenuUseCase → GeminiMenuAnalysisProvider → analyzeMenuWithGemini).

### 1.2 Menu scan uses all 1..5 images in Gemini request

**Flow:**  
`ScanMenuScreen` (photos 1..5) → `analyzeMenuUseCase(photos, deps)` → `deps.menuProvider.analyzeMenu(images, user)` (GeminiMenuAnalysisProvider).

**Building payload for all images:**

- **`src/data/providers/GeminiMenuAnalysisProvider.ts`** (lines 29–34)  
  Loops over every image and builds one payload per image:
  ```ts
  const imagePayloads: { base64: string; mimeType: string }[] = [];
  for (const uri of images) {
    const base64 = await uriToBase64(uri);
    if (!base64) throw new MenuAnalysisFailedError(...);
    imagePayloads.push({ base64, mimeType: detectMimeType(uri) });
  }
  ```
  Then passes full array: `analyzeMenuWithGemini({ images: imagePayloads, ... })`.

- **`src/ai/menuAnalysis.ts`** (lines 109–112)  
  Builds `parts` with prompt plus one `inlineData` per image:
  ```ts
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  for (const img of params.images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }
  ```
  Request body: `contents: [{ role: 'user', parts }]` (line 115).

**Result:** All 1..5 images are sent in a single Gemini request; `parts` contains one text part plus N `inlineData` parts (N = number of images).

---

## 2) Contract proof

### 2.1 DishPick end-to-end

| Stage | File | How each field is set / used |
|-------|------|------------------------------|
| **Type** | `src/domain/models.ts` 44–53 | `DishPick`: `name`, `shortReason`, `pins`, `confidencePercent`, `dietBadges`, `allergenNote`, `noLine`. |
| **AI schema** | `src/ai/menuAnalysis.ts` 11–23 | `DISH_PICK_SCHEMA` and `MENU_RESPONSE_SCHEMA` require the same fields; response parsed as `MenuAnalysisResponse` (DishPick[]). |
| **Provider** | `src/data/providers/GeminiMenuAnalysisProvider.ts` 48–56 | Returns `analysis.topPicks.slice(0,3)` and `analysis.caution` / `analysis.avoid` as-is (no mapping); type `DishPick[]`. |
| **Stored** | `src/services/analyzeMenuUseCase.ts` 28–29 | `result` from provider passed to `historyRepo.saveScanResult(result)`; `MenuScanResult` = `topPicks/caution/avoid: DishPick[]`. |
| **Rendering** | `src/screens/MenuResultsScreen.tsx` 37–66 | TopPickCard: `item.name`, `item.shortReason`, `item.confidencePercent`, `item.pins`, `item.dietBadges`, `item.allergenNote`, `item.noLine`. |

All DishPick fields are defined in domain, enforced by AI schema, passed through provider and storage, and rendered on MenuResultsScreen.

### 2.2 Pins validation

| Rule | Where | Evidence |
|------|--------|----------|
| Pins only from whitelist | `src/ai/menuAnalysis.ts` 44–46 | `for (const p of d.pins) { if (!pinWhitelist.includes(p)) throw new Error(...); }` |
| Pins unique | `src/ai/menuAnalysis.ts` 42–43 | `const pinSet = new Set(d.pins); if (pinSet.size !== d.pins.length) throw new Error(...)` |
| Pins length 3 or 4 | `src/ai/menuAnalysis.ts` 39–41 | `if (!Array.isArray(d.pins) \|\| d.pins.length < 3 \|\| d.pins.length > 4) throw new Error(...)` |
| Whitelist source | `src/data/providers/GeminiMenuAnalysisProvider.ts` 36, 45 | `const pinWhitelist = getPinWhitelist(user.goal)`; passed as `pinWhitelist` to `analyzeMenuWithGemini`. |
| Whitelist definition | `src/domain/menuPins.ts` | `getPinWhitelist(goal)` returns 12 pins per goal (Lose fat, Maintain weight, Gain muscle, Eat healthier). |

### 2.3 allergenNote rules

| Rule | Where | Evidence |
|------|--------|----------|
| Allowed values (when allergies selected) | `src/ai/menuAnalysis.ts` 36, 53–56 | `ALLOWED_ALLERGEN_NOTES = ['Allergen safe', 'May contain allergens - ask the waiter']`; if `hasAllergies` and `d.allergenNote !== null`, must be in this list or throw. |
| Null when no allergies | `src/ai/menuAnalysis.ts` 57–59 | `if (!hasAllergies) { if (d.allergenNote !== null) throw new Error(...); }` |
| Prompt instruction | `src/ai/menuAnalysis.ts` 106 | Prompt: "allergenNote: if user has allergies selected, must be either \"Allergen safe\" or \"May contain allergens - ask the waiter\". If user has no allergies: null." |

---

## 3) No silent mocks

### 3.1 Failed AI call never returns mock dishes without notice

| Code path | Behavior | Evidence |
|-----------|----------|----------|
| GeminiMenuAnalysisProvider.analyzeMenu | On any error (AI or validation), throws; does not return mock. | `src/data/providers/GeminiMenuAnalysisProvider.ts` 61–64: `catch (err) { ... throw new MenuAnalysisFailedError(message, err); }`. No `return this.mockProvider.analyzeMenu(...)` or similar. |
| analyzeMenuUseCase | No catch that would substitute mock result. | `src/services/analyzeMenuUseCase.ts`: calls `deps.menuProvider.analyzeMenu(images, user)`; on throw, error propagates to ScanMenuScreen. |
| ScanMenuScreen | On error, shows error card + "Try again"; does not navigate to results. | Error state and retry UI (no silent mock navigation). |

**Conclusion:** There is no path where a failed AI call returns mock dishes to the user without an explicit demo notice.

### 3.2 TEST_MODE / demo: explicit summaryText

| Provider | When used | summaryText | Evidence |
|----------|-----------|-------------|----------|
| MockMenuAnalysisProvider | When no API key (container returns Mock) | `'Demo result - AI not configured'` | `src/data/providers/MockMenuAnalysisProvider.ts` line 19: `const summaryText = 'Demo result - AI not configured'`. |
| createMenuAnalysisProvider | API key present → Gemini; missing → Mock | N/A | `src/services/container.ts` 16–21. |

Demo path uses Mock provider only when key is missing, and summaryText clearly states "Demo result - AI not configured".

---

## 4) Scan limit correctness

### 4.1 Daily scan increments only after successful analysis

**Evidence in `src/services/analyzeMenuUseCase.ts`:**

```ts
// Lines 24–26: Check limit BEFORE calling AI (no increment)
if (!TEST_MODE) {
  const canScan = await deps.trialRepo.canScanToday();
  if (!canScan) throw new DailyScanLimitReachedError();
}
// Line 28: AI call (may throw)
const result = await deps.menuProvider.analyzeMenu(images, user);
// Lines 29–37: Only on success: save result and history
await deps.historyRepo.saveScanResult(result);
await deps.historyRepo.addItem({ ... });
// Lines 38–40: Only on success: increment daily scan
if (!TEST_MODE) {
  await deps.trialRepo.incrementDailyScanAfterSuccess();
}
```

- Limit is checked with `canScanToday()` (read-only); no increment before AI.
- `incrementDailyScanAfterSuccess()` is called only after `saveScanResult` and `addItem`.
- If `analyzeMenu` throws, execution never reaches the increment.

**Result:** Daily scan count increments only after a successful analysis and save.

---

## 5) UI proof — Top 3 card

All required elements are present in `src/screens/MenuResultsScreen.tsx` inside `TopPickCard`:

| Requirement | Status | File:lines / snippet |
|-------------|--------|------------------------|
| name (title) | pass | 37: `{item.name}` in `styles.dishName` |
| shortReason (subtitle) | pass | 38: `{item.shortReason}` in `styles.reason` |
| Confidence chip "{n}% confidence" | pass | 39–41: `{item.confidencePercent}% confidence` in `confidenceChip` |
| "High confidence" only if ≥ 70 | pass | 34, 43–45: `highConfidence = item.confidencePercent >= 70`; conditional `"High confidence"` text |
| 3–4 pins as chips | pass | 47–52: `item.pins.map` → `<Chip label={pin} small />` |
| dietBadges as chips | pass | 54–59: `item.dietBadges.map` → `<Chip label={badge} small />` |
| allergenNote when present | pass | 61–63: `item.allergenNote != null` → line with `{item.allergenNote}` |
| noLine when present | pass | 64–66: `item.noLine != null` → separate line `{item.noLine}` |
| Cap at 3 top picks | pass | 224: `result.topPicks.slice(0, 3).map(...)` |

---

## Checklist summary

| # | Item | Result |
|---|------|--------|
| 1 | Multi-image: no firstImage in menu scan path | pass |
| 2 | Multi-image: all 1..5 images in Gemini parts (multiple inlineData) | pass |
| 3 | DishPick contract end-to-end (schema → provider → store → UI) | pass |
| 4 | Pins: from getPinWhitelist(goal), unique, length 3–4 | pass |
| 5 | allergenNote: null when no allergies; else one of two allowed strings | pass |
| 6 | No silent mock on failed AI (throw only; demo has explicit summaryText) | pass |
| 7 | Daily scan increments only after successful analysis + save | pass |
| 8 | Top 3 card UI: name, shortReason, confidence chip, High confidence ≥70, pins, dietBadges, allergenNote, noLine | pass |

**Overall:** Implementation matches TZ v0.1 for the verified scope. Evidence is file paths and code snippets above; no code was modified during this verification.
