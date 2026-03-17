# Логика отправки фото ИИ и возврата ответа (Menu Scan)

Полное описание цепочки: от нажатия «Continue» на экране скана до сохранения результата и перехода на экран результатов.

---

## 1. Точка входа: экран скана

**Файл:** `src/screens/ScanMenuScreen.tsx`

- Пользователь добавляет фото: камера (`takePhoto`) или галерея (`addFromGallery`). Хранятся URI строки в `photos: string[]`, максимум 5 фото.
- По нажатию **Continue** вызывается `onContinue()`:
  - `setLoading(true)`, сброс ошибки.
  - Вызов `analyzeMenuUseCase(photos, { historyRepo, menuProvider: menuAnalysisProvider, trialRepo, userRepo })`.
  - При успехе: `onSuccess(output)` → опционально сохранение в галерею, `navigation.navigate('MenuResults', { resultId, paywallAfterOpen, trialDaysLeft })`.
  - При ошибке: в зависимости от типа исключения выставляется `errorMessage`, для `MenuAnalysisInvalidJsonError` — также `rawAiOutput` и `rawAiModel` (для блока «Show AI response»). Лимит дня → отдельное сообщение и кнопка «Open paywall».
- Кнопка **Copy** копирует в буфер текущий текст ошибки (`errorMessage`).

---

## 2. Use case: проверка лимита и вызов провайдера

**Файл:** `src/services/analyzeMenuUseCase.ts`

```ts
analyzeMenuUseCase(images: string[], deps: Deps): Promise<AnalyzeMenuOutput>
```

**Шаги:**

1. **Пользователь:** `user = await deps.userRepo.getUser()`. Если нет — `throw new Error('User profile is not set')`.
2. **Лимит сканов (если не TEST_MODE):** `deps.trialRepo.canScanToday()`. Если `false` → `throw new DailyScanLimitReachedError()`.
3. **Анализ:** `result = await deps.menuProvider.analyzeMenu(images, user)`. Здесь вызывается провайдер (см. ниже).
4. **Сохранение:**  
   - `deps.historyRepo.saveScanResult(result)` — сохраняет `MenuScanResult`.  
   - `deps.historyRepo.addItem({ type: 'menu_scan', title: 'Menu scan', payloadRef: result.id, imageUris: images })` — запись в список истории.
5. **Увеличение счётчика сканов (если не TEST_MODE):** `deps.trialRepo.incrementDailyScanAfterSuccess()` — только после успешного ответа и сохранения.
6. **Возврат:** `{ resultId: result.id, shouldShowPaywallAfterResults, trialDaysLeft }`.

Важно: лимит дня увеличивается только после успешного ответа ИИ и сохранения; при ошибке ИИ счётчик не трогается.

---

## 3. Провайдер: подготовка изображений и вызов Gemini

**Файл:** `src/data/providers/GeminiMenuAnalysisProvider.ts`

**Интерфейс:** `MenuAnalysisProvider.analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult>`

**Шаги:**

1. **Проверка:** если `images.length === 0` → `throw new MenuAnalysisFailedError('No images provided')`.
2. **Конвертация в base64:** для каждого `uri` из `images`:
   - `base64 = await uriToBase64(uri)` (см. раздел «Утилита uriToBase64»).
   - При неудаче → `throw new MenuAnalysisFailedError('Failed to read image: ...')`.
   - MIME по расширению: `detectMimeType(uri)` — png/jpeg/webp/heic, по умолчанию jpeg.
   - В массив добавляется `{ base64, mimeType }`.
3. **Whitelist пинов:** `pinWhitelist = getPinWhitelist(user.goal)` из `src/domain/menuPins.ts` (12 пинов на цель).
4. **Вызов ИИ:**  
   `analysis = await analyzeMenuWithGemini({ images: imagePayloads, userGoal: user.goal, dietPrefs: user.dietaryPreferences ?? [], allergies: user.allergies ?? [], dislikes: user.dislikes, pinWhitelist })`.
5. **Формирование результата:**
   - `topPicks = analysis.topPicks.slice(0, 3)`.
   - `summaryText = 'Buddy ranked dishes for ${user.goal.toLowerCase()} and your preferences.'`.
   - Возврат объекта `MenuScanResult`: `id` (createId('scan')), `createdAt`, `inputImages: images`, `topPicks`, `caution`, `avoid`, `summaryText`, `disclaimerFlag: true`.
6. **Ошибки:**  
   - `MenuAnalysisValidationError` и `MenuAnalysisInvalidJsonError` пробрасываются без обёртки.  
   - Остальные оборачиваются в `MenuAnalysisFailedError(message, err)`.

---

## 4. Утилита: URI → base64

**Файл:** `src/services/aiService.ts`

**Функция:** `uriToBase64(uri: string): Promise<string | null>`

- **data: URL:** возврат части после запятой (уже base64).
- **file://:** `FileSystem.readAsStringAsync(uri, { encoding: 'base64' })` (Expo FileSystem).
- **http(s)://:** `fetch(uri)` → `response.blob()` → чтение в base64 (логика в том же файле).
- В случае ошибки возвращается `null`.

---

## 5. Слой ИИ: запрос к Gemini, fallback моделей, парсинг и валидация

**Файл:** `src/ai/menuAnalysis.ts`

### 5.1 Модели и fallback

- **Primary:** `process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash'`.
- **Fallback 1:** `gemini-2.5-flash`.
- **Fallback 2:** `gemini-2.5-flash-lite`.
- Цепочка строится с дедупликацией: `buildModelChain()`.

Если ответ API содержит (без учёта регистра) подстроки: `"json mode is not enabled"`, `"responsemimetype"`, `"responseschema"`, `"not supported"`, `"structured output"` и при этом статус 400 или 422 — считается, что модель не поддерживает structured output, и выполняется повтор с следующей моделью в цепочке.

### 5.2 Построение запроса

- **API key:** `process.env.EXPO_PUBLIC_GEMINI_API_KEY`; при отсутствии — `throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY')`.
- **Промпт:** текст с целью (`userGoal`), диет-предпочтениями, аллергиями, дизлайками, списком пинов (whitelist). Требования: только JSON, имена блюд без перевода, 3 группы (topPicks до 3, caution, avoid), для каждого блюда — name, shortReason, pins (3–4 из whitelist), confidencePercent, dietBadges, allergenNote, noLine.
- **Части запроса (parts):** первый элемент — `{ text: prompt }`, далее для каждого изображения — `{ inlineData: { mimeType, data: base64 } }`. Все фото уходят в один запрос.
- **Тело запроса (body):**
  - `contents: [{ role: 'user', parts }]`.
  - `generationConfig`:  
    - `responseMimeType: 'application/json'`.  
    - `responseSchema: MENU_RESPONSE_SCHEMA` (без `additionalProperties` — Gemini его не принимает).  
    - `temperature: 0.2`, `maxOutputTokens: 4096`.

### 5.3 Вызов API и fallback

- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=...`
- **Метод:** POST, `Content-Type: application/json`, тело — JSON выше.
- Для каждой модели из цепочки:
  - При успехе (HTTP 200): из ответа берётся текст из `candidates[0].content.parts[].text`, склеивается в одну строку `rawOutput`; выход из цикла.
  - При ошибке: если статус 400/422 и текст помечен как «structured output unsupported» и модель не последняя — переход к следующей модели.
  - Если все модели отклонили structured output — `throw new MenuAnalysisInvalidJsonError({ raw: '', model, status, message })`.
  - Любая другая ошибка пробрасывается дальше (без смены модели).

### 5.4 Парсинг и валидация

- **Пустой ответ:** если строка ответа пустая → `MenuAnalysisInvalidJsonError({ raw: '', model, message: 'Empty model response' })`.
- **JSON:** `parsed = JSON.parse(rawOutput)`. При исключении → `MenuAnalysisInvalidJsonError({ raw: rawOutput, model, message: 'Model returned invalid JSON' })`.
- **Валидация контракта:** вызов `validateMenuAnalysisResponse({ response: parsed, goal, pinWhitelist, selectedDietPreferences, selectedAllergies, dislikes })` из `src/validation/menuAnalysisValidator.ts`. При выбросе `MenuAnalysisValidationError` он переупаковывается в `MenuAnalysisInvalidJsonError` с теми же `raw`, `model` и `issues`, чтобы в UI можно было показать сырой ответ и детали валидации.

---

## 6. Валидация ответа ИИ

**Файл:** `src/validation/menuAnalysisValidator.ts`

**Функция:** `validateMenuAnalysisResponse(params): MenuAnalysisResponse`

- **Вход:** `response` (распарсенный JSON), `goal`, `pinWhitelist`, `selectedDietPreferences`, `selectedAllergies`, `dislikes`.
- **Проверка верхнего уровня:** `response` — объект (не null/массив), есть массивы `topPicks`, `caution`, `avoid` (если нет — пустой массив).
- Для каждого элемента в `topPicks`, `caution`, `avoid` вызывается **validateDishPick** (ниже). При наличии ошибок по этому блюду в `issues` элемент не попадает в итоговый массив; в конце если `issues.length > 0` → `throw new MenuAnalysisValidationError(issues)`.

**Правила validateDishPick (каждое блюдо):**

| Поле | Правило |
|------|--------|
| name | Строка, непустая после trim. |
| shortReason | Строка, 15–160 символов, без переносов, без начала с «-» или «•». |
| pins | Массив строк, длина 2–4, все элементы уникальны, каждый входит в `pinWhitelist`. |
| confidencePercent | Число, 0–100. |
| dietBadges | Массив строк, только из `selectedDietPreferences`, без «None». |
| allergenNote | Если у пользователя есть аллергии: только `"Allergen safe"` или `"May contain allergens - ask the waiter"`. Если аллергий нет — только `null`. |
| noLine | Если есть dislikes: строка вида `"No X"`, где X совпадает с одним из dislikes (без учёта регистра). Если dislikes нет — `null`. |

Итог: объект `{ topPicks, caution, avoid }` с массивом `DishPick[]` в каждом поле.

---

## 7. Пины по целям (whitelist)

**Файл:** `src/domain/menuPins.ts`

- **getPinWhitelist(goal: Goal): string[]** — возвращает 12 пинов для данной цели.
- Цели: `'Lose fat' | 'Maintain weight' | 'Gain muscle' | 'Eat healthier'`.
- Примеры пинов для «Eat healthier»: Whole foods, Vegetable-forward, Minimally processed, Fiber, Lower sodium, Lower sugar, Healthy fats, Balanced, Fresh, Seasonal, Variety, Nutrient dense.

Имена пинов в ответе ИИ должны точно совпадать с одной из строк whitelist.

---

## 8. Типы данных

**Файл:** `src/domain/models.ts`

- **DishPick:** name, shortReason, pins (string[]), confidencePercent, dietBadges (string[]), allergenNote (string | null), noLine (string | null).
- **MenuScanResult:** id, createdAt, inputImages (string[]), topPicks (DishPick[]), caution (DishPick[]), avoid (DishPick[]), summaryText, disclaimerFlag.

---

## 9. Схема запроса к Gemini (responseSchema)

**В `src/ai/menuAnalysis.ts`:**

- **MENU_RESPONSE_SCHEMA:** объект с полями `topPicks`, `caution`, `avoid` (массивы объектов по DISH_PICK_SCHEMA).
- **DISH_PICK_SCHEMA:** объект с полями name, shortReason, pins (array of string), confidencePercent, dietBadges (array of string), allergenNote (string, nullable), noLine (string, nullable). Без `additionalProperties` (API Gemini не принимает).

---

## 10. Цепочка вызовов (кратко)

```
ScanMenuScreen.onContinue()
  → analyzeMenuUseCase(photos, deps)
       → userRepo.getUser()
       → trialRepo.canScanToday()  // если не TEST_MODE
       → menuProvider.analyzeMenu(images, user)   // GeminiMenuAnalysisProvider
            → uriToBase64(uri) для каждого фото
            → getPinWhitelist(user.goal)
            → analyzeMenuWithGemini({ images, userGoal, dietPrefs, allergies, dislikes, pinWhitelist })
                 → buildModelChain()
                 → для каждой модели: callGeminiModel(model, key, body)
                      → POST .../models/{model}:generateContent
                      → при 400/422 и «structured output» — следующая модель
                 → JSON.parse(rawOutput)
                 → validateMenuAnalysisResponse(...)
            → slice topPicks до 3, собрать MenuScanResult
       → historyRepo.saveScanResult(result)
       → historyRepo.addItem(...)
       → trialRepo.incrementDailyScanAfterSuccess()  // если не TEST_MODE
       → return { resultId, shouldShowPaywallAfterResults, trialDaysLeft }
  → navigation.navigate('MenuResults', { resultId, ... })
```

---

## 11. Ошибки и их обработка на экране

| Ошибка | Где возникает | Действие в ScanMenuScreen |
|--------|----------------|---------------------------|
| DailyScanLimitReachedError | analyzeMenuUseCase (canScanToday) | Сообщение про лимит, кнопки «Close» / «Open paywall». |
| MenuAnalysisInvalidJsonError | menuAnalysis (parse/validation) или fallback | Сообщение «Could not analyze...», в __DEV__/EXPO_PUBLIC_SHOW_AI_DEBUG — блок «Show AI response» с сырым текстом и кнопкой Copy. |
| MenuAnalysisValidationError | validator (редко вне InvalidJson) | То же пользовательское сообщение. |
| MenuAnalysisFailedError | провайдер (сеть, 4xx/5xx, нет ключа и т.д.) | Показать e.message. |
| Любая другая | — | Показать e.message или «Failed to analyze menu». |

Во всех случаях есть кнопка **Copy**, копирующая текущий текст ошибки (`errorMessage`) в буфер обмена.
