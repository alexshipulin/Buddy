# AI Logic: Menu Scan + Meal Logging (Single File)

Этот файл — единая выжимка всей логики AI в текущем проекте Buddy:

1. Анализ меню по фото (`Scan menu`)
2. Внесение еды (`Track meal`: фото/текст)
3. Низкоуровневые AI-запросы, fallback, валидация, кэш, сохранение

Отдельная документация по серверной части авторизации:
`docs/BACKEND_AUTH_REQUIREMENTS.md` (`Документация - что нужно сделать на бекенде`)

---

## 1) Главные точки входа

### 1.1 Scan menu (фото меню)
- Экран: `src/screens/ScanMenuScreen.tsx`
- Use case: `src/services/analyzeMenuUseCase.ts`
- Провайдер (Gemini или mock): `src/services/container.ts`
- Реальный AI-провайдер: `src/data/providers/GeminiMenuAnalysisProvider.ts`
- Prompt + JSON schema + parse/validate: `src/ai/menuAnalysis.ts`
- HTTP/fallback моделей: `src/ai/geminiClient.ts`
- Бизнес-валидация ответа: `src/validation/menuAnalysisValidator.ts`

### 1.2 Track meal (внесение еды)
- Экран: `src/screens/TrackMealScreen.tsx`
- AI для фото блюда: `src/services/aiService.ts` (`analyzeMealPhoto`)
- Сохранение meal в историю: `src/services/addMealUseCase.ts`

---

## 2) Полный флоу: Scan menu

## 2.1 UI запускает use case

```ts
// src/screens/ScanMenuScreen.tsx
const output = await analyzeMenuUseCase(photos, {
  historyRepo,
  menuProvider: menuAnalysisProvider,
  trialRepo,
  userRepo,
});
```

Что делает экран до вызова:
- собирает до 5 фото (`camera`/`gallery`)
- показывает лоадер
- ловит типизированные ошибки:
  - `DailyScanLimitReachedError`
  - `MenuAnalysisInvalidJsonError`
  - `MenuAnalysisValidationError`
  - `MenuAnalysisFailedError`

---

## 2.2 Use case: лимиты + сохранение результата

```ts
// src/services/analyzeMenuUseCase.ts
export async function analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput> {
  return withInflight('menu_scan', async (signal) => {
    const user = await deps.userRepo.getUser();
    if (!user) throw new Error('User profile is not set');

    if (!TEST_MODE) {
      const canScan = await deps.trialRepo.canScanToday();
      if (!canScan) throw new DailyScanLimitReachedError();
    }

    const result = await deps.menuProvider.analyzeMenu(images, user, signal);
    await deps.historyRepo.saveScanResult(result);
    await deps.historyRepo.addItem({
      id: createId('history'),
      type: 'menu_scan',
      title: 'Menu scan',
      createdAt: result.createdAt,
      payloadRef: result.id,
      imageUris: images,
    });

    if (!TEST_MODE) {
      await deps.trialRepo.incrementDailyScanAfterSuccess();
    }
    const first = await deps.trialRepo.registerFirstResultIfNeeded(new Date());
    return {
      resultId: result.id,
      shouldShowPaywallAfterResults: first.isFirstResult,
      trialDaysLeft: deps.trialRepo.getTrialDaysLeft(first.state, new Date()),
    };
  });
}
```

Ключевые моменты:
- лимит проверяется до AI вызова
- счетчик сканов увеличивается только после успешного результата
- вызывается через `withInflight('menu_scan', ...)` (предыдущий запрос с тем же ключом отменяется)

---

## 2.3 Выбор Gemini или Mock

```ts
// src/services/container.ts
function createMenuAnalysisProvider(): MenuAnalysisProvider {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_key_here' && apiKey.trim() !== '') {
    return new GeminiMenuAnalysisProvider();
  }
  return new MockMenuAnalysisProvider();
}
```

Если ключа нет, меню анализируется mock-провайдером (без внешнего AI API).

---

## 2.4 GeminiMenuAnalysisProvider: подготовка входа

```ts
// src/data/providers/GeminiMenuAnalysisProvider.ts
const imagePayloads: { base64: string; mimeType: string }[] = [];
for (const uri of images) {
  const base64 = await uriToBase64(uri);
  if (!base64) throw new MenuAnalysisFailedError(`Failed to read image: ${uri.slice(0, 50)}...`);
  imagePayloads.push({ base64, mimeType: detectMimeType(uri) });
}

const pinWhitelistTop = getPinWhitelist(user.goal);
const pinWhitelistCaution = getCautionPinWhitelist(user.goal);
const pinWhitelistAvoid = getAvoidPinWhitelist(user.goal);
const dietMismatchPin = getDietMismatchPin(user.dietaryPreferences ?? []);
```

Далее:
- добавляет `dietMismatchPin` в risk whitelist (если есть)
- считает cache key
- сначала читает кэш
- если кэша нет, вызывает `analyzeMenuWithGemini(...)`

---

## 2.5 Prompt и JSON schema для Gemini

```ts
// src/ai/menuAnalysis.ts
const structuredBody = {
  contents: [{ role: 'user', parts }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: MENU_RESPONSE_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: MENU_SCAN_MAX_TOKENS,
  },
};
```

`parts` содержит:
- один `text` с подробной инструкцией
- затем `inlineData` для каждого фото (все фото в одном запросе)

Prompt включает:
- цель пользователя (`Goal`)
- диетические предпочтения
- аллергии
- dislikes
- whitelist пинов:
  - `topPicks.pins`
  - `caution.riskPins`
  - `avoid.riskPins`
- правила по `quickFix`, `allergenNote`, `noLine`, макросам

---

## 2.6 HTTP вызов + fallback моделей

```ts
// src/ai/geminiClient.ts
const url = `${GEMINI_BASE}/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(params.body),
  signal: params.signal,
});
```

Цепочки моделей:

```ts
// src/ai/geminiClient.ts
case 'menu_scan':
  chain = [process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
```

Правила `runWithFallback(...)`:
- `ABORT` -> сразу throw
- `429` -> следующий модельный fallback
- `5xx` -> один retry с backoff, потом fallback
- structured output не поддерживается -> plain fallback без schema на той же модели
- `4xx` (не structured issue) -> без fallback, сразу throw

---

## 2.7 Парсинг и строгая валидация

```ts
// src/ai/menuAnalysis.ts
const sanitized = sanitizeJsonText(rawOutput);
const parsed = JSON.parse(sanitized);
return validateMenuAnalysisResponse({
  response: parsed,
  goal: params.userGoal,
  pinWhitelistTop: params.pinWhitelistTop,
  pinWhitelistCaution: params.pinWhitelistCaution,
  pinWhitelistAvoid: params.pinWhitelistAvoid,
  selectedDietPreferences: params.dietPrefs as DietaryPreference[],
  selectedAllergies: params.allergies as Allergy[],
  dislikes: params.dislikes ?? [],
});
```

Если парсинг/валидация падает -> кидается `MenuAnalysisInvalidJsonError` с деталями.

---

## 2.8 Что валидируется в меню-ответе

В `validateMenuAnalysisResponse` проверяется:
- структура root (`topPicks`, `caution`, `avoid`)
- `name`, `shortReason`
- `confidencePercent` (0..100)
- `pins` только для `topPicks`, 3-4, уникальные, из whitelist
- `riskPins` только для `caution/avoid`, 1-3, уникальные, из соответствующего whitelist
- `quickFix` только в `caution`, формат `Try: ...`
- `dietBadges` как subset выбранных диет пользователя
- `allergenNote` по правилам аллергий
- `noLine` по правилам dislikes

---

## 2.9 Кэш AI-результатов

```ts
// src/ai/aiCache.ts
export async function getCached<T>(key: string): Promise<T | null> { ... }
export async function setCache<T>(key: string, value: T, ttlMs: number): Promise<void> { ... }
export const TTL_24H = 24 * 60 * 60 * 1000;
```

Для menu scan кэш-ключ строится из:
- кусков base64 изображений
- goal
- dietary preferences
- allergies
- dislikes
- версии (`menu_v1`)

---

## 3) Полный флоу: внесение еды (TrackMeal)

## 3.1 Экран TrackMeal

```ts
// src/screens/TrackMealScreen.tsx
let macros = toStableMacros(`${title}-${descriptionInput}-${source}`);
let notes = source === 'text' ? descriptionInput.trim() : undefined;

if (source === 'photo' && imageUri && TEST_MODE) {
  const analysis = await analyzeMealPhoto(imageUri);
  macros = analysis.macros;
  notes = analysis.description;
}
```

Текущее поведение:
- всегда есть локальный fallback `toStableMacros(...)`
- AI для фото вызывается только если `TEST_MODE === true`

Это важный факт текущей реализации.

---

## 3.2 analyzeMealPhoto (реальный AI запрос)

```ts
// src/services/aiService.ts
export async function analyzeMealPhoto(imageUri: string): Promise<MealPhotoResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { macros: { ...MEAL_DEFAULTS }, description: 'Meal logged. Add API key for AI analysis.' };

  const base64Image = await uriToBase64(imageUri);
  const structuredBody = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Image } }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: MEAL_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  };
  const { rawText } = await runWithFallback({
    taskType: 'meal_photo',
    apiKey,
    body: structuredBody,
    supportsPlainFallback: true,
    buildPlainBody,
  });
  const parsed = JSON.parse(sanitizeJsonText(rawText));
  ...
}
```

Особенности:
- использует ту же fallback-инфраструктуру (`runWithFallback`)
- кэширует результат по image hash на 24ч
- при любой ошибке возвращает дефолтные макросы + сообщение

---

## 3.3 uri -> base64

```ts
// src/services/aiService.ts
export async function uriToBase64(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) return uri.split(',')[1] || null;
  if (uri.startsWith('file://')) {
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // fetch blob -> FileReader -> base64
  }
  return uri;
}
```

---

## 3.4 Сохранение внесенной еды

```ts
// src/services/addMealUseCase.ts
await deps.historyRepo.saveMeal(meal);
await deps.historyRepo.addItem({
  id: createId('history'),
  type: 'meal',
  title: meal.title,
  createdAt: meal.createdAt,
  payloadRef: meal.id,
  imageUris: meal.imageUri ? [meal.imageUri] : undefined,
});
```

---

## 4) Общие типы данных AI-результата

```ts
// src/domain/models.ts
export type DishPick = {
  name: string;
  shortReason: string;
  pins: string[];
  riskPins?: string[];
  quickFix?: string | null;
  confidencePercent: number;
  dietBadges: string[];
  allergenNote: string | null;
  noLine: string | null;
  estimatedCalories?: number | null;
  estimatedProteinG?: number | null;
  estimatedCarbsG?: number | null;
  estimatedFatG?: number | null;
};
```

```ts
export type MenuScanResult = {
  id: string;
  createdAt: string;
  inputImages: string[];
  topPicks: DishPick[];
  caution: DishPick[];
  avoid: DishPick[];
  summaryText: string;
  disclaimerFlag: true;
};
```

---

## 5) Важные флаги и условия

```ts
// src/config/flags.ts
const testModeEnv = process.env.EXPO_PUBLIC_TEST_MODE;
export const TEST_MODE = testModeEnv === '1' || testModeEnv === 'true';
```

- `TEST_MODE` влияет на лимиты scan
- в текущем коде `TEST_MODE` также включает AI в `TrackMeal` (фото)

---

## 6) Mock ветка (когда нет API ключа)

Для `Scan menu`:
- `container.ts` выберет `MockMenuAnalysisProvider`
- вернется preset-результат без внешнего AI

Для `analyzeMealPhoto`:
- вернутся дефолтные макросы и текст fallback

---

## 7) Слой хранения

Хранилище: `AsyncStorage`

```ts
// src/data/storage/storage.ts
export async function getJson<T>(key: string, fallback: T): Promise<T> { ... }
export async function setJson<T>(key: string, value: T): Promise<void> { ... }
```

История:
- `HistoryRepo.saveScanResult(...)`
- `HistoryRepo.addItem(...)`
- `HistoryRepo.saveMeal(...)`

---

## 8) Краткая sequence-диаграмма

### 8.1 Scan menu
1. `ScanMenuScreen.onContinue`
2. `analyzeMenuUseCase`
3. `TrialRepo.canScanToday`
4. `menuProvider.analyzeMenu`
5. `GeminiMenuAnalysisProvider`:
   - `uriToBase64` x N
   - whitelist pins
   - cache lookup
   - `analyzeMenuWithGemini`
6. `runWithFallback` -> `callGenerateContent`
7. parse + validate
8. `HistoryRepo.saveScanResult` + `HistoryRepo.addItem`
9. UI -> `MenuResults`

### 8.2 Track meal (photo)
1. `TrackMealScreen.saveMeal('photo')`
2. локальные макросы `toStableMacros`
3. если `TEST_MODE` и есть фото -> `analyzeMealPhoto`
4. parse AI JSON / fallback
5. `addMealUseCase` -> `HistoryRepo.saveMeal` + `addItem`

---

## 9) Практические выводы по текущему состоянию

1. Меню-скан реализован как полноценный production-flow: схема, fallback моделей, валидация, кэш, лимиты.
2. Внесение еды через AI-фото сейчас фактически dev/test-сценарий, потому что вызов ограничен `TEST_MODE`.
3. Оба направления используют общую низкоуровневую инфраструктуру Gemini (`runWithFallback`, `callGenerateContent`, API key helpers).
