# Architecture Map

## 1) Entry points
- Menu scan flow:
  - `files/src/screens/ScanMenuScreen.tsx`
  - `files/src/services/analyzeMenuUseCase.ts`
- Meal tracking + meal AI:
  - `files/src/screens/TrackMealScreen.tsx`
  - `files/src/services/aiService.ts`
  - `files/src/services/addMealUseCase.ts`

## 2) AI provider and transport
- Provider selection (Gemini vs Mock):
  - `files/src/services/container.ts`
- Gemini menu provider + cache key version:
  - `files/src/data/providers/GeminiMenuAnalysisProvider.ts`
- HTTP/fallback/retry/status handling:
  - `files/src/ai/geminiClient.ts`
- AI cache and debug logs:
  - `files/src/ai/aiCache.ts`
  - `files/src/ai/aiDebugLog.ts`

## 3) Prompting and structured output
- Prompt text + schema + JSON parsing/recovery + normalization:
  - `files/src/ai/menuAnalysis.ts`
- Strict business validation for menu response:
  - `files/src/validation/menuAnalysisValidator.ts`

## 4) Recommendation pipeline (post-AI)
- Menu result rendering and section composition:
  - `files/src/screens/MenuResultsScreen.tsx`
- Feasibility and budget gates:
  - `files/src/domain/dayBudget.ts`
- Scoring and ranking:
  - `files/src/domain/recommendationRanking.ts`
  - `files/src/domain/recommendationExplanations.ts`

## 5) Goals, pins, profile constraints
- Goal and AI-related domain types:
  - `files/src/domain/models.ts`
- Pin whitelists and diet mismatch pins:
  - `files/src/domain/menuPins.ts`
- User profile repositories:
  - `files/src/data/repos/UserRepo.ts`
  - `files/src/screens/GoalSelectionScreen.tsx`
  - `files/src/screens/DietaryProfileScreen.tsx`
  - `files/src/screens/ProfileScreen.tsx`

## 6) Limits, history, storage
- Daily scan limits / trial behavior:
  - `files/src/data/repos/TrialRepo.ts`
  - `files/src/services/analyzeMenuUseCase.ts`
- Scan and meal persistence:
  - `files/src/data/repos/HistoryRepo.ts`
  - `files/src/data/repos/DailyNutritionRepo.ts`
  - `files/src/data/storage/storage.ts`
