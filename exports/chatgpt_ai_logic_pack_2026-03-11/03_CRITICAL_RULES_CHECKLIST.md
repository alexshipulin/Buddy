# Critical Rules Checklist (for AI audit)

Use this checklist when analyzing behavior:

1. Is provider Gemini or Mock?
- `files/src/services/container.ts`

2. Was result served from cache?
- `files/src/data/providers/GeminiMenuAnalysisProvider.ts`
- `files/src/ai/aiCache.ts`

3. Was JSON recovered/truncated and retried?
- `files/src/ai/menuAnalysis.ts`
- `files/src/ai/geminiClient.ts`

4. Did validator drop/throw due pins/quickFix/allergen/noLine constraints?
- `files/src/validation/menuAnalysisValidator.ts`

5. Why no Top picks?
- Check AI `topPicks` + feasibility move to OK:
  - `files/src/screens/MenuResultsScreen.tsx`
  - `files/src/domain/dayBudget.ts`
  - `files/src/domain/recommendationRanking.ts`

6. Why missing Build variants?
- Check constructor prompt + constructor fallback + build caps/order:
  - `files/src/ai/menuAnalysis.ts`
  - `files/src/screens/MenuResultsScreen.tsx`

7. Why today alerts or budget warnings differ from expectation?
- `files/src/domain/todayAlert.ts`
- `files/src/screens/HomeScreen.tsx`
- `files/src/ui/components/TodayAlertLine.tsx`

8. Goal/profile constraints source of truth
- `files/src/domain/models.ts`
- `files/src/domain/menuPins.ts`
- `files/src/data/repos/UserRepo.ts`
