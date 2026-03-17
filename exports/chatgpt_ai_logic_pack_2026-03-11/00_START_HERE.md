# Buddy AI Logic Pack (for ChatGPT analysis)

This pack contains the source files that implement:
- menu scan AI analysis
- meal AI analysis
- recommendation ranking (Top / OK / Avoid)
- goals, pins, allergies, dislikes, limits, caching, and validation

## Quick read order
1. `files/docs/AI_LOGIC_SINGLE_FILE.md`
2. `files/src/services/analyzeMenuUseCase.ts`
3. `files/src/data/providers/GeminiMenuAnalysisProvider.ts`
4. `files/src/ai/menuAnalysis.ts`
5. `files/src/validation/menuAnalysisValidator.ts`
6. `files/src/screens/MenuResultsScreen.tsx`
7. `files/src/domain/recommendationRanking.ts`
8. `files/src/domain/dayBudget.ts`
9. `files/src/domain/menuPins.ts`
10. `files/src/domain/models.ts`

## Main product questions this pack answers
- How prompts and Gemini requests are built and retried.
- How model JSON is parsed, normalized, validated, cached.
- How Top / OK / Avoid are generated and re-ordered in UI.
- How user goal/profile (diet/allergies/dislikes) affects output.
- How pin assignment and pin whitelist enforcement works.
- Why/when items move from Top to OK.

## Important note
This is a source-level dump (not runtime database export).
Use `Scan ID` and AI debug logs flow in code (`aiDebugLog.ts`) for runtime incident forensics.
