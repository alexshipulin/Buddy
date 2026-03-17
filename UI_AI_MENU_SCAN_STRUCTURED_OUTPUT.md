# AI Menu Scan — Structured Output & Model Fallback

## Models Used

| Priority | Model | Source |
|----------|-------|--------|
| Primary | `EXPO_PUBLIC_GEMINI_MODEL` env var, defaults to `gemini-2.5-flash` | `src/ai/menuAnalysis.ts: PRIMARY_MODEL` |
| Fallback 1 | `gemini-2.5-flash` | `src/ai/menuAnalysis.ts: FALLBACK_MODEL_1` |
| Fallback 2 | `gemini-2.5-flash-lite` | `src/ai/menuAnalysis.ts: FALLBACK_MODEL_2` |

Duplicates are removed from the chain at runtime (e.g. if `EXPO_PUBLIC_GEMINI_MODEL` is not set, PRIMARY and FALLBACK_1 are the same model, so only one attempt is made).

## Structured Output Configuration

Every Gemini request for menu scan includes:

```json
"generationConfig": {
  "responseMimeType": "application/json",
  "responseSchema": { /* OpenAPI-compatible DishPick schema */ },
  "temperature": 0.2,
  "maxOutputTokens": 4096
}
```

- **`responseMimeType`** — forces the model to output valid JSON (camelCase per REST API spec).
- **`responseSchema`** — provides the exact shape expected, reducing hallucinated fields.

## Structured Output Unsupported — Detection & Fallback

If a model returns HTTP 400 or 422 and the error body contains any of these substrings (case-insensitive):

```
"json mode is not enabled"
"responsemimetype"
"responseschema"
"not supported"
"structured output"
```

…the request is automatically retried with the next model in the chain. If all models fail this way, a `MenuAnalysisInvalidJsonError` is thrown with `message` explaining all models were exhausted.

## Raw Response Capture

`rawModelText` is always captured from `candidates[0].content.parts[].text` before any parsing. It is stored on `MenuAnalysisInvalidJsonError.raw` even when structured output is enabled (the field may still contain partial or malformed text in edge cases).

## Error Types

| Error | When Thrown | `.raw` | `.model` |
|-------|-------------|--------|---------|
| `MenuAnalysisInvalidJsonError` | JSON parse failure or contract validation failure | yes | yes |
| `MenuAnalysisFailedError` | HTTP/network errors, missing image | no | no |
| `DailyScanLimitReachedError` | Daily scan cap reached | no | no |

## Debug UI in ScanMenuScreen

When `__DEV__ === true` OR `EXPO_PUBLIC_SHOW_AI_DEBUG=true`:

1. The error card shows a **"▼ Show AI response"** toggle below the user-facing error message.
2. Expanding it reveals:
   - **Model name** used for the failed request (e.g. `gemini-2.5-flash`).
   - A scrollable **monospace block** with the full raw text received from the API.
   - A **Copy** button that copies the raw text to the clipboard.
3. Production builds without `EXPO_PUBLIC_SHOW_AI_DEBUG=true` never show this section.

### Example: Invalid JSON Case

Scenario: model returns `Sure! Here is the JSON: {...}` (markdown wrapper) instead of raw JSON.

- `JSON.parse` throws.
- `MenuAnalysisInvalidJsonError` is created with `raw = "Sure! Here is the JSON: {...}"`.
- User sees: **"Could not analyze this menu. Please try again."**
- Developer (in dev build) expands the panel and sees the exact model output with the markdown wrapper, making the prompt fix obvious.

## Files Changed

| File | Change |
|------|--------|
| `src/ai/menuAnalysis.ts` | New `MenuAnalysisInvalidJsonError` class; model constants; `callGeminiModel`; fallback loop; fixed `responseMimeType`/`responseSchema` keys |
| `src/data/providers/GeminiMenuAnalysisProvider.ts` | Pass through `MenuAnalysisInvalidJsonError` |
| `src/services/analyzeMenuUseCase.ts` | Re-export `MenuAnalysisInvalidJsonError` |
| `src/screens/ScanMenuScreen.tsx` | Handle `MenuAnalysisInvalidJsonError`; debug section with raw output + Copy |
| `UI_AI_MENU_SCAN_STRUCTURED_OUTPUT.md` | This file |
