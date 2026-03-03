# Справочник: вызовы ИИ в приложении Buddy

Подробное описание того, как и когда вызывается ИИ (Gemini), какие модели используются, при каких условиях и как обрабатываются ошибки. Документ для анализа и поддержки.

---

## 1. Обзор: точки входа в ИИ

| Сценарий | Где вызывается | Модуль / провайдер | Модель(и) | Условие вызова |
|----------|----------------|--------------------|-----------|----------------|
| **Анализ меню по фото** | ScanMenuScreen → analyzeMenuUseCase | GeminiMenuAnalysisProvider → `analyzeMenuWithGemini` (src/ai/menuAnalysis.ts) | Цепочка: PRIMARY → FALLBACK_1 → FALLBACK_2 | Есть `EXPO_PUBLIC_GEMINI_API_KEY`; иначе MockMenuAnalysisProvider (без вызова ИИ) |
| **Расчёт норм КБЖУ** | ProfileScreen → Save → triggerCalculation | `calculateNutritionTargets` (src/services/calculateNutritionTargets.ts) | Одна модель: `gemini-2.5-flash` | Пользователь сохранил профиль и изменил персональные параметры (рост, вес, возраст, пол, активность) |
| **Анализ фото блюда (трек еды)** | TrackMealScreen | aiService.analyzeMealPhoto | Жёстко: `gemini-2.5-flash` (URL в aiService) | Есть API key; при ошибке — дефолтные макросы без вызова ИИ |
| **Чат «Спроси Buddy»** | ChatScreen | aiService.askBuddy | Жёстко: `gemini-2.5-flash` | Есть API key; при ошибке — заглушка текста |
| **Легаси: анализ меню (не используется скан-флоу)** | — | aiService.analyzeMenu | `gemini-2.5-flash` | Не вызывается из ScanMenu; только текстовая/однофото логика, возвращает mock при отсутствии ключа/ошибке |

---

## 2. Переменные окружения

| Переменная | Назначение | Где читается |
|------------|------------|--------------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Ключ API Google Gemini | Все вызовы: container (провайдер меню), calculateNutritionTargets, aiService (getApiKey) |
| `EXPO_PUBLIC_GEMINI_MODEL` | Опционально: кастомная первая модель для анализа меню | src/ai/menuAnalysis.ts → `PRIMARY_MODEL` |
| `EXPO_PUBLIC_USE_MOCK_DATA` | Показ моков на Home/Profile/результатах меню | Конфиг; не отключает вызовы ИИ для скан/профиля, но на Profile при USE_MOCK_DATA save не вызывает triggerCalculation |
| `EXPO_PUBLIC_TEST_MODE` | Режим теста: не проверяется лимит дневных сканов, не инкрементируется счётчик | src/services/analyzeMenuUseCase.ts |

Проверка ключа в разных местах:

- **Меню-скан:** `container.ts` — если ключа нет или он `your_key_here`/пустой → создаётся `MockMenuAnalysisProvider`, вызов Gemini не делается.
- **Нормы КБЖУ:** `calculateNutritionTargets` — при отсутствии/заглушке ключа бросает `Error('AI service not configured...')`.
- **aiService (meal, chat):** `getApiKey()` возвращает `null` → функции возвращают мок/заглушку без запроса к API.

---

## 3. Анализ меню по фото (основной сценарий)

### 3.1 Цепочка вызовов

1. **ScanMenuScreen** (пользователь нажал «Анализировать» с 1–5 фото)  
   → `analyzeMenuUseCase(photos, deps)`
2. **analyzeMenuUseCase** (src/services/analyzeMenuUseCase.ts)  
   → проверка лимита `trialRepo.canScanToday()` (если не TEST_MODE)  
   → `deps.menuProvider.analyzeMenu(images, user)`  
   → при успехе: сохранение результата, история, `trialRepo.incrementDailyScanAfterSuccess()`
3. **menuProvider** — экземпляр из container:  
   - при наличии ключа: **GeminiMenuAnalysisProvider**  
   - иначе: **MockMenuAnalysisProvider**
4. **GeminiMenuAnalysisProvider.analyzeMenu**  
   → конвертация URI в base64 (`uriToBase64` из aiService)  
   → сбор whitelist пинов по цели и диете (`getPinWhitelist`, `getCautionPinWhitelist`, `getAvoidPinWhitelist`, `getDietMismatchPin`)  
   → **analyzeMenuWithGemini** (src/ai/menuAnalysis.ts)

### 3.2 Модели и fallback (menuAnalysis.ts)

- **PRIMARY_MODEL** = `process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash'`
- **FALLBACK_MODEL_1** = `'gemini-2.5-flash'`
- **FALLBACK_MODEL_2** = `'gemini-2.5-flash-lite'`

Цепочка строится так: `[PRIMARY, FALLBACK_1, FALLBACK_2]` с дедупликацией по имени (сохраняется порядок). Например, если `EXPO_PUBLIC_GEMINI_MODEL` не задан, цепочка: `['gemini-2.5-flash', 'gemini-2.5-flash-lite']`.

Поведение:

- Вызов идёт по одной модели за раз через **callGeminiModel(model, key, body)**.
- При **любой** ошибке (сеть, 4xx/5xx, таймаут, в т.ч. «structured output not supported») переходим к следующей модели в цепочке.
- «Structured output unsupported» определяется по телу ответа (400/422): подстроки (без учёта регистра):  
  `"json mode is not enabled"`, `"responsemimetype"`, `"responseschema"`, `"not supported"`, `"structured output"`.
- Если все модели исчерпаны и последняя ошибка — structured unsupported, бросается **MenuAnalysisInvalidJsonError** с сообщением вида «All models rejected structured output...».
- Иначе пробрасывается последняя ошибка.

### 3.3 Один запрос к Gemini (callGeminiModel)

- **URL:** `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=...`
- **Метод:** POST, `Content-Type: application/json`
- **Тело:**  
  - `contents`: один элемент `role: 'user'`, `parts`: сначала один элемент `{ text: prompt }`, затем по одному `{ inlineData: { mimeType, data: base64 } }` на каждое изображение (все 1–5 фото уходят в один запрос).
  - `generationConfig`:  
    - `responseMimeType: 'application/json'`  
    - `responseSchema: MENU_RESPONSE_SCHEMA`  
    - `temperature: 0.2`  
    - `maxOutputTokens: 16384`

Текст ответа берётся из `data.candidates[0].content.parts[].text`, склеивается.

### 3.4 Схема ответа (MENU_RESPONSE_SCHEMA)

- Корневой объект: `topPicks`, `caution`, `avoid` (массивы), все обязательные.
- Элементы массивов — объекты по схемам **TOP_DISH_PICK_SCHEMA** (topPicks), **CAUTION_DISH_PICK_SCHEMA** (caution), **AVOID_DISH_PICK_SCHEMA** (avoid).
- В каждой схеме есть опциональные поля макросов: `estimatedCalories`, `estimatedProteinG`, `estimatedCarbsG`, `estimatedFatG` (number | null).

### 3.5 Промпт (кратко)

- В промпте передаются: цель (goal), диет-преференции, аллергии, dislikes, три whitelist пинов (top / caution / avoid), список допустимых quickFix, опционально dietMismatchPin.
- Инструкции: только JSON, язык полей — английский, название блюда — как в меню; для каждого блюда во всех группах — оценить макросы (или null).

### 3.6 После получения ответа

- **JSON.parse(rawOutput)** — при ошибке парсинга бросается **MenuAnalysisInvalidJsonError** (raw = rawOutput, model = использованная модель).
- **validateMenuAnalysisResponse(...)** — строгая валидация по контракту (пины, длина, whitelist, allergenNote, noLine, dietBadges и т.д.). При ошибке валидации бросается **MenuAnalysisValidationError**; в menuAnalysis он перехватывается и перебрасывается как **MenuAnalysisInvalidJsonError** с теми же issues и raw.

### 3.7 Ошибки и UI

- **MenuAnalysisInvalidJsonError** — невалидный JSON или провал валидации; в ScanMenuScreen показывается «Could not analyze this menu. Please try again.»; в dev можно раскрыть сырой ответ.
- **MenuAnalysisValidationError** — пробрасывается провайдером как есть; в UI та же обработка (сообщение + при необходимости лог issues).
- **MenuAnalysisFailedError** — обёртка для прочих ошибок (сеть, нет изображений и т.д.).
- **DailyScanLimitReachedError** — из use case, если лимит дневных сканов исчерпан (если не TEST_MODE).

---

## 4. Расчёт дневных норм КБЖУ (профиль)

### 4.1 Когда вызывается

- **ProfileScreen**, кнопка «Save Changes» → `save()`.
- В `save()` после сохранения пользователя сравниваются старые и новые `baseParams` (heightCm, weightKg, age, activityLevel, sex).  
- **triggerCalculation(next)** вызывается только если `baseParams` есть и хотя бы одно из полей изменилось. Повторный запрос при неизменных параметрах не делается.

### 4.2 Модель и URL

- Модель зашита: **`gemini-2.5-flash`** (константа MODEL в calculateNutritionTargets.ts).
- URL: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=...`

### 4.3 Запрос

- **contents:** один user‑сообщение из двух parts: системный промпт (правила BMR/TDEE/цели/белок/жиры/углеводы) и строка вида `Compute for this input: ${JSON.stringify(input)}`.
- **input:** goal, sex (male/female), height_cm, weight_kg, age_years (или null), activity (low/med/high).
- **generationConfig:**  
  - `responseMimeType: 'application/json'`  
  - `responseSchema: RESPONSE_SCHEMA` (calories_kcal, protein_g, carbs_g, fat_g, bmr_kcal, tdee_kcal, assumptions)  
  - `temperature: 0.0`  
  - `maxOutputTokens: 2048`

### 4.4 Обработка ответа

- Текст из `candidates[0].content.parts[].text`.
- Обрезка markdown-ограждений (`` ```json `` / `` ``` ``) в начале и конце.
- **JSON.parse**; при ошибке — `Error('Could not parse AI response...')` с превью raw.
- Проверка наличия полей: `calories_kcal` и `protein_g` должны быть числами; иначе — `Error('AI response missing fields...')`.
- Остальные поля с дефолтами (0) при отсутствии. Результат маппится в тип **NutritionTargets** и сохраняется через **userRepo.saveNutritionTargets**.

### 4.5 Ошибки и UI

- Отсутствие ключа или «your_key_here» → `Error('AI service not configured...')`.
- Нет baseParams → `Error('Personal parameters (height, weight, activity) are required.')`.
- Сетевые ошибки → `Error('Network error...')`.
- Любая ошибка в triggerCalculation попадает в состояние calcStatus/calcError на ProfileScreen; пользователь видит сообщение и кнопку «Try again».

---

## 5. aiService: остальные вызовы ИИ

Файл: **src/services/aiService.ts**. Базовые URL захардкожены:  
`GEMINI_TEXT_API_URL` и `GEMINI_VISION_API_URL` — оба указывают на модель **gemini-2.5-flash** в пути.

### 5.1 analyzeMealPhoto (TrackMealScreen)

- **Назначение:** по фото блюда получить макросы и описание.
- **Условие:** при отсутствии API key возвращаются дефолтные макросы и текст без вызова API.
- **Запрос:** один user content: text (prompt) + inlineData (один image, base64, mimeType image/jpeg).  
  **generationConfig:** `response_mime_type: 'application/json'`, `response_json_schema: MEAL_SCHEMA` (caloriesKcal, proteinG, carbsG, fatG, description), temperature 0.2, maxOutputTokens 200.
- **Поведение при ошибке:** при ошибке парсинга JSON — один retry с уточнённым промптом; при повторной ошибке — throw; в catch на верхнем уровне — возврат дефолтных макросов и сообщения «Meal logged. AI analysis unavailable.»

### 5.2 askBuddy (ChatScreen)

- **Назначение:** ответ на сообщение пользователя в чате (текст + опциональный context).
- **Условие:** при отсутствии API key возвращается заглушка createMockChatResponse().
- **Запрос:** только текст: `contents: [{ role: 'user', parts: [{ text: prompt }] }]` (без generationConfig для JSON). Ответ — свободный текст.
- **Поведение при ошибке:** в catch возвращается та же заглушка.

### 5.3 analyzeMenu (легаси, не используется скан-флоу)

- Использует только **первое** изображение из переданного массива/строки; формат ответа (reasonShort, tags) не совпадает с текущим DishPick.
- Вызывается только если где-то явно импортируют и вызывают; **ScanMenuScreen и analyzeMenuUseCase используют только GeminiMenuAnalysisProvider**, который дергает **analyzeMenuWithGemini**, а не aiService.analyzeMenu.

### 5.4 geminiTextTest

- Вспомогательная функция: один текстовый запрос к Gemini без JSON. Используется при необходимости ручной проверки API (ключ обязателен, иначе throw).

---

## 6. Сводка по моделям

| Место | Модель(и) | Настройка |
|-------|-----------|-----------|
| Анализ меню (скан) | Цепочка: PRIMARY → gemini-2.5-flash → gemini-2.5-flash-lite | PRIMARY = env EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash' |
| Нормы КБЖУ | gemini-2.5-flash | Константа в коде |
| aiService (meal, chat, legacy menu) | gemini-2.5-flash | В URL в aiService.ts |

Все вызовы идут в **REST API** `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`.

---

## 7. Важные файлы

| Файл | Роль |
|------|------|
| src/ai/menuAnalysis.ts | Цепочка моделей, callGeminiModel, промпт, схема, fallback, вызов validateMenuAnalysisResponse, MenuAnalysisInvalidJsonError |
| src/validation/menuAnalysisValidator.ts | validateMenuAnalysisResponse, контракт полей и пинов |
| src/services/calculateNutritionTargets.ts | Расчёт КБЖУ: один запрос к gemini-2.5-flash, парсинг, маппинг в NutritionTargets |
| src/data/providers/GeminiMenuAnalysisProvider.ts | Подготовка изображений, whitelist, вызов analyzeMenuWithGemini, обработка ошибок |
| src/services/container.ts | Выбор MenuAnalysisProvider (Gemini vs Mock) по наличию API key |
| src/services/analyzeMenuUseCase.ts | Лимит сканов, вызов menuProvider.analyzeMenu, сохранение, инкремент лимита |
| src/services/aiService.ts | uriToBase64, analyzeMealPhoto, askBuddy, analyzeMenu (legacy), geminiTextTest; везде gemini-2.5-flash в URL |
| src/screens/ScanMenuScreen.tsx | Вызов analyzeMenuUseCase, обработка ошибок и отображение |
| src/screens/ProfileScreen.tsx | save → сравнение baseParams → triggerCalculation → calculateNutritionTargets |

---

## 8. Условия и ограничения (кратко)

- **Меню:** вызов ИИ только если выбран GeminiMenuAnalysisProvider (есть валидный API key). Лимит дневных сканов проверяется до вызова; инкремент — только после успешного ответа и сохранения. При TEST_MODE лимит не проверяется и не инкрементируется.
- **КБЖУ:** вызов только при сохранении профиля и фактическом изменении персональных параметров; требуется наличие baseParams и валидный API key.
- **Meal/Chat (aiService):** при отсутствии ключа или ошибке — возврат моков/заглушек без вызова API (кроме явного geminiTextTest).

Документ актуален по состоянию кода на момент создания; при изменении цепочек вызовов или моделей его стоит обновить.
