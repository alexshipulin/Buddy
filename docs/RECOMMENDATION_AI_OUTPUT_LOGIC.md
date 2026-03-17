# Buddy: логика вывода рекомендаций и AI-анализа (актуальное состояние)

Обновлено: 2026-03-11

Этот файл описывает текущую production-логику:
- как формируется запрос к ИИ,
- какие prompt'ы используются,
- как ответ обрабатывается и валидируется,
- как после анализа ранжируются блюда с учетом целей, предпочтений и дневного бюджета.

## 1) Где находится логика (карта файлов)

- Вход в scan flow:
  - `src/services/analyzeMenuUseCase.ts`
- Провайдер Gemini + кэш + пин-whitelist:
  - `src/data/providers/GeminiMenuAnalysisProvider.ts`
- Prompt, JSON schema, recovery parser, validation pass:
  - `src/ai/menuAnalysis.ts`
- Бизнес-валидация структуры и правил:
  - `src/validation/menuAnalysisValidator.ts`
- Пины и riskPins по goal:
  - `src/domain/menuPins.ts`
- Дневной бюджет и first-meal flex:
  - `src/domain/dayBudget.ts`
- Scoring/ранжирование top picks:
  - `src/domain/recommendationRanking.ts`
- Применение ранжирования в UI результатов:
  - `src/screens/MenuResultsScreen.tsx`
- Состояние дневного потребления:
  - `src/data/repos/DailyNutritionRepo.ts`
- Обновление дневного потребления при логе блюда:
  - `src/services/addMealUseCase.ts`
- Таргеты калорий/БЖУ:
  - `src/services/calculateNutritionTargets.ts`
- Низкоуровневый fallback/ретраи Gemini:
  - `src/ai/geminiClient.ts`
- AI для meal photo/text:
  - `src/services/aiService.ts`

---

## 2) Источник входных данных для рекомендаций

Рекомендации используют одновременно:
- `goal` пользователя (`Lose fat | Maintain weight | Gain muscle | Eat healthier`)
- `dietaryPreferences`
- `allergies`
- `dislikes`
- `nutrition targets` (cal/protein/carbs/fat)
- текущее состояние дня (`consumed`, `mealsLoggedCount`, время)

Код `UserRepo` (нормализация профиля):

```ts
// src/data/repos/UserRepo.ts
const DEFAULT_USER_PROFILE: UserProfile = {
  goal: 'Maintain weight',
  dietaryPreferences: [],
  allergies: [],
  dislikes: [],
};

function normalizeUserProfile(raw: Partial<UserProfile>): UserProfile {
  return {
    goal: raw.goal ?? DEFAULT_USER_PROFILE.goal,
    dietaryPreferences: raw.dietaryPreferences ?? [],
    allergies: raw.allergies ?? [],
    dislikes: raw.dislikes ?? [],
    baseParams: raw.baseParams,
  };
}
```

---

## 3) Menu scan: end-to-end pipeline

### 3.1 Use case: запуск скана

```ts
// src/services/analyzeMenuUseCase.ts
export async function analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput> {
  return withInflight('menu_scan', async (signal) => {
    const analysisId = await nextAnalysisRunId();

    const user = await deps.userRepo.getUser();
    if (!user) throw new Error('User profile is not set');

    if (!TEST_MODE) {
      const canScan = await deps.trialRepo.canScanToday();
      if (!canScan) throw new DailyScanLimitReachedError();
    }

    const result = await deps.menuProvider.analyzeMenu(images, user, signal, { analysisId });
    const resultWithAnalysisId = { ...result, analysisId };

    await deps.historyRepo.saveScanResult(resultWithAnalysisId);
    await deps.historyRepo.addItem({
      id: createId('history'),
      type: 'menu_scan',
      title: 'Menu scan',
      createdAt: resultWithAnalysisId.createdAt,
      payloadRef: resultWithAnalysisId.id,
      imageUris: images,
    });

    if (!TEST_MODE) {
      await deps.trialRepo.incrementDailyScanAfterSuccess();
    }

    const first = await deps.trialRepo.registerFirstResultIfNeeded(new Date());
    return {
      resultId: resultWithAnalysisId.id,
      analysisId,
      shouldShowPaywallAfterResults: first.isFirstResult,
      trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()),
    };
  });
}
```

### 3.2 Провайдер: подготовка, whitelist, кэш

```ts
// src/data/providers/GeminiMenuAnalysisProvider.ts
const preparedImages = await Promise.all(
  images.map(async (uri) => ({ uri, prepared: await prepareImagePayloadForAI(uri) }))
);

const pinWhitelistTop = getPinWhitelist(user.goal);
const pinWhitelistCaution = getCautionPinWhitelist(user.goal);
const pinWhitelistAvoid = getAvoidPinWhitelist(user.goal);
const dietMismatchPin = getDietMismatchPin(user.dietaryPreferences ?? []);

const effectiveCautionWhitelist = dietMismatchPin
  ? [...pinWhitelistCaution, dietMismatchPin]
  : pinWhitelistCaution;
const effectiveAvoidWhitelist = dietMismatchPin
  ? [...pinWhitelistAvoid, dietMismatchPin]
  : pinWhitelistAvoid;

const cacheKey = hashCacheKey([
  ...imageFingerprints,
  `goal:${user.goal}`,
  `diet:${[...(user.dietaryPreferences ?? [])].sort().join(',')}`,
  `allergies:${[...(user.allergies ?? [])].sort().join(',')}`,
  `dislikes:${(user.dislikes ?? []).map((d) => d.trim().toLowerCase()).filter(Boolean).sort().join(',')}`,
  'menu_v3',
]);
```

### 3.3 Конкретный prompt для Menu Scan (текущий)

Код формируется в `src/ai/menuAnalysis.ts` в `promptLines`.

```ts
const promptLines = [
  'Return ONLY JSON that matches schema. No extra keys. No markdown. No extra text.',
  'Analyze all provided images as one menu.',
  `Goal: ${params.userGoal}`,
  `Diet preferences (dietBadges must be subset): ${params.dietPrefs.join(', ') || 'none'}`,
  `Allergies: ${params.allergies.join(', ') || 'none'}`,
  dislikesLine || 'Dislikes: none',
  `Whitelists: topPicks.pins (exactly 3-4 unique) => ${topPinList}`,
  `Whitelists: caution.riskPins (1-3 unique) => ${cautionPinList}`,
  `Whitelists: avoid.riskPins (1-3 unique) => ${avoidPinList}`,
  `Allowed quickFix (caution only): ${quickFixList}`,
  'Rules:',
  '- Return as many relevant dishes as confidently possible across all sections.',
  '- Do not artificially cap topPicks count if more strong options exist.',
  '- For large menus, include broad coverage; keep each item concise.',
  '- Distribute medium-quality dishes to caution instead of placing almost everything in topPicks.',
  '- Output language: English for all fields except name.',
  '- name: copy dish name exactly from menu (no translation), except constructor combos (rule below).',
  '- shortReason: 1 sentence, 15-90 chars preferred, no bullets/newlines.',
  '- topPicks use pins only; caution/avoid use riskPins only.',
  '- confidencePercent: 0..100.',
  '- allergenNote: if allergies selected => "Allergen safe" or "May contain allergens - ask the waiter"; else null.',
  '- noLine: null unless dish contains a disliked ingredient; then "No <ingredient>" from selected dislikes.',
  '- Top pick may contain disliked ingredient only if noLine is set.',
  '- If allergies selected and dish is risky/unknown, include risk pin "Allergen" in caution/avoid.',
  dietMismatchLine ? `- ${dietMismatchLine}` : '',
  '- If dish conflicts with dislikes, include risk pin "Dislike" in caution/avoid and set noLine when modifiable.',
  '- Fill estimatedCalories/estimatedProteinG/estimatedCarbsG/estimatedFatG as integer estimates; use null if unknown.',
  'Constructor sections (build-your-own):',
  '- Treat as constructor when menu has: comma-separated components, "choose/pick/add/build your own" phrasing, or add-ons lists without clear dish names/prices.',
  '- Create assembled dishes as normal DishPick entries in topPicks/caution/avoid.',
  '- Assembled name format: "Custom: <combo>" or "Build: <combo>".',
  '- <combo>: 2-4 components joined by " + " (token-light).',
  '- Use ONLY components explicitly present in menu; never invent ingredients.',
  '- If categories exist, make sane pairings (e.g., base + protein + topping). If unknown, choose common pairings; avoid odd mixes (e.g., 3 carbs only).',
  '- Generate max 3-5 assembled dishes per constructor block, and max 6 assembled dishes total per menu.',
  '- If constructor combos have mixed quality, distribute them across topPicks/caution/avoid; do not place all builds in topPicks.',
];
```

### 3.4 JSON schema и вызов модели

```ts
const request = {
  contents: [{ role: 'user', parts }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: MENU_RESPONSE_SCHEMA,
    temperature: 0.2,
    maxOutputTokens,
  },
};
```

### 3.5 Fallback/ретраи и обработка ошибок модели

`runWithFallback` (`src/ai/geminiClient.ts`) делает:
- модельную цепочку (`menu_scan`: `flash-lite -> env flash -> flash`),
- plain fallback при `structuredUnsupported`,
- retry на `5xx`,
- переход на следующую модель при `429`,
- abort без fallback.

Ключевая логика:

```ts
if (category === 'ABORT') throw e;

if (callErr.isStructuredUnsupported && opts.supportsPlainFallback && opts.buildPlainBody) {
  // retry same model without responseSchema/responseMimeType
}

if (category === 'RATE_LIMIT') {
  // next model, or AllModelsRateLimitedError
}

if (category === 'SERVER') {
  // one retry with backoff
}

if (category === 'CLIENT') {
  // stop fallback
  throw e;
}
```

### 3.6 Парсинг ответа, recovery и финальная валидация

В `analyzeMenuWithGemini`:
1. `parseJsonWithRecovery()` пробует:
   - direct parse,
   - bounded JSON,
   - удаление trailing commas,
   - auto-close truncated JSON.
2. при неудаче/обрыве — compact retry с более коротким prompt.
3. нормализация (`normalizeMenuResponse`) + fallback для constructor блоков.
4. строгая бизнес-валидация `validateMenuAnalysisResponse`.

Пример:

```ts
const recovered = parseJsonWithRecovery(rawOutput);
// ... compact retry при parse_failed или skewed sections

const validated = validateMenuAnalysisResponse({
  response: withConstructorFallback,
  goal: params.userGoal,
  pinWhitelistTop: params.pinWhitelistTop,
  pinWhitelistCaution: params.pinWhitelistCaution,
  pinWhitelistAvoid: params.pinWhitelistAvoid,
  selectedDietPreferences: params.dietPrefs as DietaryPreference[],
  selectedAllergies: params.allergies as Allergy[],
  dislikes: params.dislikes ?? [],
});
```

---

## 4) Как рекомендации сортируются после анализа (с учетом дневного состояния)

### 4.1 Дневной state

```ts
// src/domain/dayBudget.ts
export type DailyNutritionState = {
  dateKey: string;
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  mealsLoggedCount: number;
  firstMealTime: number | null;
  lastMealTime: number | null;
  mealsPerDay?: number | null;
  wholeFoodsMealsCount?: number;
  processedMealsCount?: number;
};
```

`DailyNutritionRepo` сбрасывает state при смене локальной даты (`dateKey`) и обновляет consumed при логе meal:

```ts
// src/data/repos/DailyNutritionRepo.ts
if (!raw || raw.dateKey !== dateKey) {
  const empty = createEmptyDailyNutritionState(dateKey);
  await setJson(DAILY_NUTRITION_KEY, empty);
  return empty;
}

// applyLoggedMeal
consumed: {
  calories: current.consumed.calories + macros.caloriesKcal,
  protein: current.consumed.protein + macros.proteinG,
  carbs: current.consumed.carbs + macros.carbsG,
  fat: current.consumed.fat + macros.fatG,
},
mealsLoggedCount: current.mealsLoggedCount + 1,
firstMealTime: current.firstMealTime ?? timestamp,
lastMealTime: timestamp,
```

### 4.2 Хелперы для оставшегося бюджета

```ts
// src/domain/dayBudget.ts
export function isFirstMealFlex(state: DailyNutritionState, now: Date): boolean {
  return state.mealsLoggedCount === 0 && now.getHours() < 14;
}

export function estimateRemainingMeals(state: DailyNutritionState, now: Date, mealsPerDay?: number | null): number {
  // если mealsPerDay задан, используем его; иначе дефолт по фазе дня (morning=3, mid=2, evening=1)
}

export function computeRemaining(targets, consumed) {
  return {
    calories: targets.caloriesKcal - consumed.calories,
    protein: targets.proteinG - consumed.protein,
    carbs: targets.carbsG - consumed.carbs,
    fat: targets.fatG - consumed.fat,
  };
}

export function feasibilityAfterPick(params) {
  // proteinPerMealNeededAfter <= лимит(goal)
  // caloriesPerMealLeftAfter >= 300
}
```

### 4.3 Scoring formula для блюд

```ts
// src/domain/recommendationRanking.ts
const INFEASIBLE_SCORE = -999;

export function scoreDish(ctx: RankingContext, dish: DishPick): DishScoreResult {
  const macros = getDishMacros(dish);
  const feasibility = feasibilityAfterPick({
    goal: ctx.goal,
    remaining: ctx.remaining,
    remainingMeals: ctx.remainingMeals,
    dish: macros,
  });
  if (!feasibility.ok) {
    return { score: INFEASIBLE_SCORE, feasible: false, feasibility };
  }

  const weights = getGoalWeights(ctx.goal);
  const remainingProteinRatio =
    ctx.targets.proteinG > 0 ? Math.max(0, ctx.remaining.protein) / ctx.targets.proteinG : 0;

  const overCalories = Math.max(0, macros.calories - ctx.remaining.calories);
  const overCarbs = Math.max(0, macros.carbs - ctx.remaining.carbs);
  const overFat = Math.max(0, macros.fat - ctx.remaining.fat);

  const carbFlexMultiplier = ctx.firstMealFlex && ctx.goal !== 'Gain muscle' ? 0.5 : 1;
  const lowProteinFlexMultiplier = ctx.firstMealFlex && ctx.goal !== 'Gain muscle' ? 0.7 : 1;

  const floor = proteinFloor(ctx.goal, ctx.firstMealFlex);
  const hasLowProtein = macros.protein < floor;
  const lowProteinPenalty =
    hasLowProtein && remainingProteinRatio > 0.4
      ? (floor - macros.protein) * weights.lowProteinPenaltyWeight * lowProteinFlexMultiplier
      : 0;

  const proteinBonus = macros.protein * weights.proteinBonusWeight;
  const healthBonus = healthBonusForDish(ctx.goal, dish);
  const calOverPenalty = overCalories * weights.caloriesOverPenaltyWeight;
  const carbOverPenalty = overCarbs * weights.carbsOverPenaltyWeight * carbFlexMultiplier;
  const fatOverPenalty = overFat * weights.fatOverPenaltyWeight;

  const score = proteinBonus + healthBonus - (calOverPenalty + carbOverPenalty + fatOverPenalty + lowProteinPenalty);

  return { score, feasible: true, feasibility };
}
```

### 4.4 Применение scoring в MenuResults

```ts
// src/screens/MenuResultsScreen.tsx
const firstMealFlexActive = isFirstMealFlex(todayState, now);
const remaining = computeRemaining(targets, todayState.consumed);
const remainingMeals = estimateRemainingMeals(todayState, now, todayState.mealsPerDay);

const scored = topSource.map((dish, index) => ({
  dish,
  index,
  scored: scoreDish({
    goal,
    targets,
    dailyState: todayState,
    remaining,
    remainingMeals,
    firstMealFlex: firstMealFlexActive,
  }, dish),
}));

const feasibleTopScored = scoredSorted.filter((item) => item.scored.feasible);
const movedToOkScored = scoredSorted.filter((item) => !item.scored.feasible);
```

Важные правила UI после scoring:
- `TOP_PRIMARY_LIMIT = 6` — в Top на экране показывается максимум 6.
- overflow Top + неfeasible Top перемещаются в `OK with caution`.
- если это первый meal дня и Top пуст из-за budget gate — включается rescue (не оставлять пустой Top).

```ts
const orderedCaution = orderDishesInSection([
  ...baseCaution,
  ...overflowTop,
  ...topFeasibility.movedToOk,
]);
```

---

## 5) Как работают предпочтения/аллергии/dislikes

Это enforce-ится в двух местах:

1) На уровне prompt:
- в prompt передаются `Goal`, `Diet preferences`, `Allergies`, `Dislikes`.
- передаются whitelist pin/riskPin для конкретной цели.

2) На уровне строгой валидации (`menuAnalysisValidator.ts`):
- `topPicks.pins` только из `pinWhitelistTop`, длина 3..4.
- `caution/avoid.riskPins` только из соответствующих whitelist, длина 1..3.
- `quickFix` только для `caution`, формат `Try: ...`.
- `dietBadges` — subset выбранных диет.
- `allergenNote` валидируется относительно выбранных allergies.
- `noLine` валидируется относительно `dislikes` и формата `No <ingredient>`.

Пример (фрагмент):

```ts
if (group === 'topPicks') {
  if (!Array.isArray(pinsRaw)) addIssue(...);
  if (pins.length < 3 || pins.length > 4) addIssue(...);
  for (const p of pins) {
    if (!pinWhitelistTop.includes(p)) addIssue(...);
  }
}

if (group === 'caution' || group === 'avoid') {
  // riskPins 1..3, unique, только из whitelist
}

if (group === 'caution') {
  if (!quickFix.startsWith('Try: ')) addIssue(...);
}
```

---

## 6) Логика AI для Enter meal (photo/text)

### 6.1 Текущий prompt

```ts
// src/services/aiService.ts
function buildMealPrompt(source: 'photo' | 'text', textInput?: string): string {
  const task =
    source === 'photo'
      ? 'Analyze this meal photo.'
      : `Analyze this meal description: "${textInput ?? ''}"`;
  return [
    'Return ONLY valid JSON. No markdown. No extra text.',
    task,
    'Generate concise meal output for mobile UI.',
    '- title: short dish title (1-4 words), e.g. "Bowl", "Pasta with chicken".',
    '- shortReason: one sentence, max 85 chars.',
    '- caloriesKcal/proteinG/carbsG/fatG: numeric estimates.',
    '- confidencePercent: 1..100.',
    '- Optional: pins, riskPins, dietBadges, allergenNote, noLine, menuSection.',
  ].join('\n');
}
```

### 6.2 Обработка ответа

- structured запрос (`responseSchema`) + plain fallback.
- JSON recovery (direct/bounded/trailing comma fix/auto-close).
- compact retry при неполном JSON.
- normalization + безопасные fallback-поля.
- 24ч кэш результата.

```ts
const runResult = await runWithFallback({
  taskType: params.source === 'photo' ? 'meal_photo' : 'meal_text',
  apiKey: params.apiKey,
  body: structuredBody,
  supportsPlainFallback: true,
  buildPlainBody,
});

const firstParsed = parseJsonWithRecovery(rawOutput);
if (!firstParsed || looksTruncated) {
  // compact retry с обязательными ключами
}

const normalized = normalizeMealAnalysis(recovered.parsed, ...);
await setCache(params.cacheKey, normalized, TTL_24H);
```

---

## 7) Расчет дневных целей (targets)

```ts
// src/services/calculateNutritionTargets.ts
const GOAL_CALORIES_FACTOR = {
  'Lose fat': 0.8,
  'Maintain weight': 1.0,
  'Gain muscle': 1.1,
  'Eat healthier': 1.0,
};

const GOAL_PROTEIN_PER_KG = {
  'Lose fat': 2.0,
  'Maintain weight': 1.6,
  'Gain muscle': 2.2,
  'Eat healthier': 1.6,
};

// BMR -> TDEE -> goal factor -> protein/fat/carbs
```

---

## 8) Что крутить, если хочешь менять поведение

### Больше/меньше строгий AI output
- `src/ai/menuAnalysis.ts`
  - `promptLines`
  - `MENU_RESPONSE_SCHEMA`
  - `getMenuScanMaxTokens`
  - compact retry правила

### Жестче/мягче ранжирование после анализа
- `src/domain/recommendationRanking.ts`
  - `getGoalWeights()`
  - `proteinFloor()`
  - `INFEASIBLE_SCORE`

### First-meal flexibility и remaining budget
- `src/domain/dayBudget.ts`
  - `isFirstMealFlex` (сейчас `< 14:00`)
  - `estimateRemainingMeals`
  - `feasibilityAfterPick` (лимиты proteinPerMeal/calsPerMeal)

### Перенос из Top в OK и лимиты карточек
- `src/screens/MenuResultsScreen.tsx`
  - `TOP_PRIMARY_LIMIT`
  - merge logic `orderedCaution`
  - rescue behavior first meal

### Пины и риск-пины по целям
- `src/domain/menuPins.ts`
  - `GOAL_PINS`, `GOAL_CAUTION_PINS`, `GOAL_AVOID_PINS`

---

## 9) Краткий фактический flow в одну цепочку

1. Пользователь запускает scan.
2. `analyzeMenuUseCase` проверяет лимит + создает `analysisId`.
3. `GeminiMenuAnalysisProvider` готовит изображения, собирает whitelist/prefs/allergies/dislikes, проверяет cache.
4. `analyzeMenuWithGemini` отправляет prompt + schema через `runWithFallback`.
5. Ответ проходит parse recovery + normalization + strict validation.
6. Результат сохраняется в history.
7. На `MenuResultsScreen` Top переранжируется с учетом текущего дневного бюджета и цели.
8. Неfeasible блюда уходят в `OK with caution`.
9. При логе блюда обновляется `DailyNutritionRepo`, и следующий scan будет учитывать новые остатки БЖУ.

