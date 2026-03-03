# Логика присвоения пинов (pins) с учётом предпочтений пользователя

Полный flow: профиль пользователя → выбор вайтлистов → промпт для AI → парсинг ответа → валидация.

---

## 1. Профиль пользователя (входные данные)

```typescript
// src/domain/models.ts

export type Goal = 'Lose fat' | 'Maintain weight' | 'Gain muscle' | 'Eat healthier';

export type DietaryPreference =
  | 'Vegan or vegetarian'
  | 'Pescatarian'
  | 'Semi-vegetarian'
  | 'Gluten-free'
  | 'Lactose-free'
  | 'Keto'
  | 'Paleo (whole foods)';

export type Allergy = string;

export const ALLERGY_OPTIONS: readonly string[] = [
  'Milk', 'Eggs', 'Fish',
  'Crustacean shellfish (shrimp, crab, lobster)',
  'Tree nuts (almonds, walnuts, cashews)',
  'Peanuts', 'Wheat', 'Soy',
] as const;

export type UserProfile = {
  goal: Goal;
  dietaryPreferences: DietaryPreference[];
  allergies: Allergy[];
  dislikes?: string[];  // динамический список ингредиентов
};
```

---

## 2. Тип блюда в ответе AI

```typescript
// src/domain/models.ts

export type DishPick = {
  name: string;           // название блюда (точно как в меню)
  shortReason: string;    // одно предложение, почему
  pins: string[];         // ПОЗИТИВНЫЕ пины (только для topPicks, 3-4 штуки)
  riskPins?: string[];    // НЕГАТИВНЫЕ пины (только для caution/avoid, 1-3 штуки)
  quickFix?: string | null; // подсказка изменения (только для caution, "Try: ...")
  confidencePercent: number; // 0-100
  dietBadges: string[];   // подмножество выбранных пользователем dietaryPreferences
  allergenNote: string | null; // "Allergen safe" | "May contain allergens - ask the waiter" | null
  noLine: string | null;  // "No tomato" — если блюдо содержит нелюбимый ингредиент
};

export type MenuScanResult = {
  topPicks: DishPick[];   // лучшие блюда (max 3)
  caution: DishPick[];    // нормально с оговорками
  avoid: DishPick[];      // лучше не заказывать
  // ...
};
```

---

## 3. Вайтлисты пинов (зависят от Goal пользователя)

```typescript
// src/domain/menuPins.ts

// ═══════════════════════════════════════════════════════════════
// ПОЗИТИВНЫЕ ПИНЫ (topPicks) — по 12 на каждый Goal
// ═══════════════════════════════════════════════════════════════

// Lose fat:
['Low calorie','High fiber','Lean protein','Lower sodium','Lower sugar',
 'Portion control','Satiating','Vegetable-forward','Grilled or steamed',
 'Light dressing','Whole foods','No fried']

// Maintain weight:
['Balanced','Moderate protein','Whole grains','Vegetables','Lean protein',
 'Fiber','Lower sodium','Variety','Healthy fats','Portion aware','Fresh','Seasonal']

// Gain muscle:
['High protein','Protein-rich','Complete protein','Lean protein','Calorie sufficient',
 'Strength support','Recovery','Amino acids','Balanced macros','Whole foods',
 'No empty calories','Nutrient dense']

// Eat healthier:
['Whole foods','Vegetable-forward','Minimally processed','Fiber','Lower sodium',
 'Lower sugar','Healthy fats','Balanced','Fresh','Seasonal','Variety','Nutrient dense']

// ═══════════════════════════════════════════════════════════════
// CAUTION ПИНЫ (riskPins для caution) — по 10 на каждый Goal
// ═══════════════════════════════════════════════════════════════

// Lose fat:
['High Cals','High Fat','Fried','Sugary','Heavy Sauce',
 'Refined Carbs','High Sodium','Diet Mismatch','Allergen','Dislike']

// Maintain weight:
['High Sodium','High Sugar','High Fat','Fried','Heavy Sauce',
 'Refined Carbs','Low Fiber','Diet Mismatch','Allergen','Dislike']

// Gain muscle:
['Low Protein','Too Low Cals','No Carbs','Small Portion','High Sugar',
 'Fried','Heavy Sauce','Diet Mismatch','Allergen','Dislike']

// Eat healthier:
['Processed','High Sodium','Added Sugar','Fried','Heavy Sauce',
 'Refined Carbs','High SatFat','Diet Mismatch','Allergen','Dislike']

// ═══════════════════════════════════════════════════════════════
// AVOID ПИНЫ (riskPins для avoid) — 11-13 на каждый Goal
// Содержат как "усиленные" версии caution-пинов,
// так и обычные caution-пины (AI не всегда различает уровни).
// ═══════════════════════════════════════════════════════════════

// Lose fat:
['Very High Cals','Deep Fried','Fried','Added Sugar','High SatFat',
 'Creamy','Heavy Sauce','Carb Bomb','Refined Carbs','Processed',
 'Diet Mismatch','Allergen','Dislike']

// Maintain weight:
['Very High Sodium','Added Sugar','Deep Fried','Fried','High SatFat',
 'Creamy','Heavy Sauce','Ultra Processed','Processed','Refined Carbs',
 'Diet Mismatch','Allergen','Dislike']

// Gain muscle:
['Very Low Protein','Too Low Cals','No Carbs','Tiny Portion','Added Sugar',
 'Deep Fried','Fried','High SatFat','Processed',
 'Diet Mismatch','Allergen','Dislike']

// Eat healthier:
['Ultra Processed','Processed','Very High Sodium','Added Sugar','Deep Fried',
 'Fried','High SatFat','Creamy','Heavy Sauce','Refined Carbs',
 'Diet Mismatch','Allergen','Dislike']

// ═══════════════════════════════════════════════════════════════
// Три специальных пина (есть в КАЖДОМ caution и avoid вайтлисте):
// ═══════════════════════════════════════════════════════════════
// "Diet Mismatch" — AI ставит если блюдо конфликтует с dietaryPreferences
// "Allergen"      — AI ставит если у пользователя есть аллергии и блюдо рискованное
// "Dislike"       — AI ставит если блюдо содержит нелюбимый ингредиент

// ═══════════════════════════════════════════════════════════════
// API для получения вайтлистов:
// ═══════════════════════════════════════════════════════════════

export function getPinWhitelist(goal: Goal): string[]         // позитивные (topPicks)
export function getCautionPinWhitelist(goal: Goal): string[]  // caution riskPins
export function getAvoidPinWhitelist(goal: Goal): string[]    // avoid riskPins
```

---

## 4. Провайдер: сборка параметров и вызов AI

```typescript
// src/data/providers/GeminiMenuAnalysisProvider.ts

class GeminiMenuAnalysisProvider {
  async analyzeMenu(images: string[], user: UserProfile): Promise<MenuScanResult> {
    // 1. Конвертация всех фото в base64
    const imagePayloads = [];
    for (const uri of images) {
      const base64 = await uriToBase64(uri);
      imagePayloads.push({ base64, mimeType: detectMimeType(uri) });
    }

    // 2. Получение трёх вайтлистов на основе goal пользователя
    const pinWhitelistTop     = getPinWhitelist(user.goal);        // 12 позитивных пинов
    const pinWhitelistCaution = getCautionPinWhitelist(user.goal); // 10 caution пинов
    const pinWhitelistAvoid   = getAvoidPinWhitelist(user.goal);   // 11-13 avoid пинов

    // 3. Вызов Gemini с полным профилем пользователя
    const analysis = await analyzeMenuWithGemini({
      images: imagePayloads,
      userGoal: user.goal,
      dietPrefs: user.dietaryPreferences,  // для dietBadges
      allergies: user.allergies,           // для allergenNote + пина "Allergen"
      dislikes: user.dislikes,             // для noLine + пина "Dislike"
      pinWhitelistTop,
      pinWhitelistCaution,
      pinWhitelistAvoid,
    });

    return {
      topPicks: analysis.topPicks.slice(0, 3),  // cap at 3
      caution: analysis.caution,
      avoid: analysis.avoid,
      summaryText: `Buddy ranked dishes for ${user.goal.toLowerCase()} and your preferences.`,
      // ...
    };
  }
}
```

---

## 5. Промпт для Gemini (как AI получает вайтлисты)

```typescript
// src/ai/menuAnalysis.ts — промпт, который отправляется в Gemini

const prompt = `Return ONLY JSON. No markdown. No extra text.

Goal: ${params.userGoal}
Diet preferences (use only these for dietBadges): ${params.dietPrefs.join(', ') || 'none'}
Allergies: ${params.allergies.join(', ') || 'none'}
Dislikes: ${params.dislikes?.join(', ') || ''}

Top picks positive pins whitelist (choose ONLY from this list; 3-4 unique pins): ${topPinList}
Caution risk pins whitelist (choose ONLY from this list; 1-3 unique pins): ${cautionPinList}
Avoid risk pins whitelist (choose ONLY from this list; 1-3 unique pins): ${avoidPinList}
Allowed quickFix values for caution: ${quickFixList}

Task:
- Analyze ALL provided menu images together as one menu.
- Return 3 groups: topPicks (max 3), caution, avoid.
- topPicks: pins (3-4 unique from top whitelist)
- caution: riskPins (1-3 unique from caution whitelist), quickFix (one allowed value)
- avoid: riskPins (1-3 unique from avoid whitelist)
- For caution/avoid do NOT use positive pins; use riskPins only.
- allergenNote: "Allergen safe" | "May contain allergens - ask the waiter" | null
- noLine: only from dislikes, e.g. "No tomato". Otherwise null.
- If user has allergies and dish is risky → include risk pin "Allergen"
- If dish conflicts with diet preferences → include risk pin "Diet Mismatch"
- If dish conflicts with dislikes → include risk pin "Dislike" and set noLine`;

// Фиксированный список quickFix для caution:
const quickFixList = [
  'Try: sauce on the side', 'Try: no sauce', 'Try: grilled not fried',
  'Try: swap fries for salad', 'Try: half portion', 'Try: extra veggies',
  'Try: less oil', 'Try: no cheese', 'Try: no mayo', 'Try: skip dessert',
].join(', ');
```

---

## 6. JSON Schema для Gemini (structured output)

```typescript
// src/ai/menuAnalysis.ts — три разные схемы для трёх секций

// topPicks используют поле "pins" (позитивные):
const TOP_DISH_PICK_SCHEMA = {
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    pins: { type: 'array', items: { type: 'string' } },  // ← позитивные
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
  },
  required: ['name','shortReason','pins','confidencePercent','dietBadges','allergenNote','noLine'],
};

// caution используют "riskPins" + "quickFix":
const CAUTION_DISH_PICK_SCHEMA = {
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    riskPins: { type: 'array', items: { type: 'string' } },  // ← негативные
    quickFix: { type: 'string' },                             // ← подсказка
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
  },
  required: ['name','shortReason','riskPins','quickFix','confidencePercent','dietBadges','allergenNote','noLine'],
};

// avoid используют "riskPins" без quickFix:
const AVOID_DISH_PICK_SCHEMA = {
  properties: {
    name: { type: 'string' },
    shortReason: { type: 'string' },
    riskPins: { type: 'array', items: { type: 'string' } },  // ← негативные
    confidencePercent: { type: 'number' },
    dietBadges: { type: 'array', items: { type: 'string' } },
    allergenNote: { type: 'string', nullable: true },
    noLine: { type: 'string', nullable: true },
  },
  required: ['name','shortReason','riskPins','confidencePercent','dietBadges','allergenNote','noLine'],
};

// generationConfig:
{
  responseMimeType: 'application/json',
  responseSchema: MENU_RESPONSE_SCHEMA,
  temperature: 0.2,
  maxOutputTokens: 16384,
}
```

---

## 7. Валидация ответа AI (runtime)

```typescript
// src/validation/menuAnalysisValidator.ts

function validateDishPick(
  raw: unknown,
  index: number,
  group: 'topPicks' | 'caution' | 'avoid',  // секция определяет правила
  pinWhitelistTop: string[],
  pinWhitelistCaution: string[],
  pinWhitelistAvoid: string[],
  selectedDietPreferences: DietaryPreference[],
  hasAllergies: boolean,
  dislikes: string[],
  issues: ValidationIssue[]
): DishPick | null {

  // ── pins (только для topPicks) ──
  if (group === 'topPicks') {
    // pins: обязательный массив 3-4 уникальных строк
    // каждый pin ДОЛЖЕН быть из pinWhitelistTop
    // если pin не в вайтлисте → ошибка валидации
  }
  // caution/avoid НЕ должны иметь непустое поле pins

  // ── riskPins (только для caution и avoid) ──
  if (group === 'caution' || group === 'avoid') {
    // riskPins: обязательный массив 1-3 уникальных строк
    // для caution: каждый pin ДОЛЖЕН быть из pinWhitelistCaution
    // для avoid: каждый pin ДОЛЖЕН быть из pinWhitelistAvoid
    const whitelist = group === 'caution' ? pinWhitelistCaution : pinWhitelistAvoid;
    for (const p of riskPins) {
      if (!whitelist.includes(p)) → ошибка валидации
    }
  }
  // topPicks НЕ должны иметь riskPins

  // ── quickFix (только для caution) ──
  if (group === 'caution') {
    // quickFix обязателен, должен начинаться с "Try: ", <= 45 символов
  }
  if (group === 'avoid' || group === 'topPicks') {
    // quickFix запрещён
  }

  // ── dietBadges ──
  // Мягкая валидация: невалидные бейджи ФИЛЬТРУЮТСЯ, не вызывают ошибку.
  // AI часто добавляет "Vegan", "Vegetarian" и т.д. даже если пользователь не выбирал.
  dietBadges = dietBadgesRaw
    .filter(b => b.toLowerCase() !== 'none')
    .filter(b => selectedDietPreferences.includes(b));  // убираем невыбранные

  // ── allergenNote ──
  if (hasAllergies) {
    // допустимые значения: "Allergen safe" | "May contain allergens - ask the waiter"
    // null тоже допустим (AI может не указать)
  } else {
    // должен быть null (нет аллергий → нет allergenNote)
  }

  // ── noLine ──
  if (noLine != null) {
    // должен начинаться с "No " (пример: "No tomato")
    // ингредиент после "No " должен совпадать (case-insensitive) с одним из dislikes
    // если dislikes пустой → noLine должен быть null
  }
}
```

---

## 8. Схема data flow (summary)

```
UserProfile
  ├── goal ─────────────────→ getPinWhitelist(goal)         → 12 позитивных пинов
  │                          → getCautionPinWhitelist(goal)  → 10 caution пинов
  │                          → getAvoidPinWhitelist(goal)    → 11-13 avoid пинов
  ├── dietaryPreferences ───→ передаётся в промпт как допустимые dietBadges
  ├── allergies ────────────→ передаётся в промпт; управляет allergenNote + пин "Allergen"
  └── dislikes ─────────────→ передаётся в промпт; управляет noLine + пин "Dislike"

                    ↓ всё идёт в Gemini промпт ↓

Gemini возвращает JSON:
  topPicks[]: pins из позитивного вайтлиста (3-4)
  caution[]:  riskPins из caution вайтлиста (1-3) + quickFix
  avoid[]:    riskPins из avoid вайтлиста (1-3)

                    ↓ валидация ↓

Валидатор проверяет:
  - pins/riskPins являются подмножеством соответствующего вайтлиста
  - dietBadges фильтруются (оставляются только выбранные пользователем)
  - allergenNote соответствует правилам (зависит от наличия аллергий)
  - noLine соответствует dislikes пользователя
  - quickFix есть только у caution, начинается с "Try: "

Если валидация не прошла → MenuAnalysisValidationError → UI показывает "Try again"
```

---

## 9. Файлы

| Файл | Роль |
|------|------|
| `src/domain/models.ts` | Типы: Goal, DietaryPreference, UserProfile, DishPick, MenuScanResult |
| `src/domain/menuPins.ts` | Все вайтлисты пинов (по 3 на каждый goal) + функции-геттеры |
| `src/ai/menuAnalysis.ts` | Промпт, JSON schema, вызов Gemini, парсинг и вызов валидатора |
| `src/validation/menuAnalysisValidator.ts` | Runtime валидация каждого поля DishPick |
| `src/data/providers/GeminiMenuAnalysisProvider.ts` | Оркестрация: собирает данные профиля → вызывает AI → возвращает MenuScanResult |
