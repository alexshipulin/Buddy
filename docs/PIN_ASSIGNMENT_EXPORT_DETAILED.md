# Полная выгрузка: пины и логика присвоения в анализе блюд

Дата актуальности: 2026-03-17

## 1) Где пины реально назначаются сейчас (runtime)

Текущий активный flow для `Scan menu`:

1. `GeminiMenuAnalysisProvider.analyzeMenu(...)` получает от AI `RawDish[]` (макросы, флаги, аллергены, dislikes), без финальных `DishPick` пинов.
2. Затем вызывается `classifyDishes(...)`.
3. В `classifyDishes(...)` блюдо сначала попадает в секцию `top` / `caution` / `avoid`.
4. После выбора секции:
   - для `top` вызывается `computePositivePins(...)`
   - для `caution/avoid` вызывается `computeRiskPins(...)`
5. Результат мапится в `DishPick`:
   - `top`: заполняется `pins`
   - `caution/avoid`: заполняется `riskPins`

Ключевые файлы:
- `src/data/providers/GeminiMenuAnalysisProvider.ts`
- `src/services/classifyDishes.ts`
- `src/services/computePins.ts`

## 2) Полный список пинов (фактический каталог)

## 2.1 Позитивные (top) пины по goal (каталог/whitelist)

Источник: `src/domain/menuPins.ts` (`GOAL_PINS`)

### Lose fat
- Low-calorie
- High fiber
- Lean protein
- Low sodium
- Low sugar
- Portion-aware
- Filling
- Vegetables
- Grilled/steamed
- Light dressing
- Whole foods

### Maintain weight
- Balanced
- Moderate protein
- Whole grains
- Vegetables
- Lean protein
- High fiber
- Low sodium
- Healthy fats
- Portion-aware
- Whole foods

### Gain muscle
- High protein
- Lean protein
- Enough calories
- Balanced
- Whole foods
- Nutrient-rich
- Healthy fats
- Carbs included

### Eat healthier
- Whole foods
- Vegetables
- High fiber
- Low sodium
- Low sugar
- Healthy fats
- Balanced
- Nutrient-rich
- Grilled/steamed

## 2.2 Risk-пины для секции caution (каталог/whitelist)

Источник: `src/domain/menuPins.ts` (`GOAL_CAUTION_PINS`)

### Lose fat
- High-calorie
- High fat
- Fried
- High sugar
- Heavy sauce
- Refined Carbs
- High sodium
- Allergen
- Dislike

### Maintain weight
- High sodium
- High sugar
- High fat
- Fried
- Heavy sauce
- Refined Carbs
- Low Fiber
- Allergen
- Dislike

### Gain muscle
- Low Protein
- Small portion
- No Carbs
- High sugar
- Fried
- Heavy sauce
- Allergen
- Dislike

### Eat healthier
- Processed
- High sodium
- High sugar
- Fried
- Heavy sauce
- Refined Carbs
- High sat fat
- Allergen
- Dislike

## 2.3 Risk-пины для секции avoid (каталог/whitelist)

Источник: `src/domain/menuPins.ts` (`GOAL_AVOID_PINS`)

### Lose fat
- High-calorie
- Fried
- High sugar
- High sat fat
- Heavy sauce
- High carbs
- Refined Carbs
- Processed
- Allergen
- Dislike

### Maintain weight
- High sodium
- High sugar
- Fried
- High sat fat
- Heavy sauce
- Ultra-processed
- Processed
- Refined Carbs
- Allergen
- Dislike

### Gain muscle
- Very Low Protein
- Small portion
- No Carbs
- High sugar
- Fried
- High sat fat
- Processed
- Allergen
- Dislike

### Eat healthier
- Ultra-processed
- Processed
- High sodium
- High sugar
- Fried
- High sat fat
- Heavy sauce
- Refined Carbs
- Allergen
- Dislike

## 2.4 Дополнительный diet-mismatch пин (контрактный слой)

Источник: `src/domain/menuPins.ts` (`getDietMismatchPin`)

Маппинг:
- Vegan or vegetarian -> Not Vegan
- Pescatarian -> Not Pescatarian
- Semi-vegetarian -> Not Semi-vegetarian
- Gluten-free -> Not Gluten-free
- Lactose-free -> Not Lactose-free
- Keto -> Not Keto
- Paleo (whole foods) -> Not Paleo

Примечание: это используется в контрактной/validator-логике (whitelist injection), но не в активной runtime-ветке `classifyDishes + computePins`.

## 2.5 Нормализация legacy названий пинов

Источник: `src/domain/menuPins.ts` (`LEGACY_PIN_CANONICAL_MAP`)

Примеры:
- `High Fat` -> `High fat`
- `High Sugar`, `Added Sugar`, `Sugary` -> `High sugar`
- `High Sodium`, `Very High Sodium` -> `High sodium`
- `Fiber` -> `High fiber`
- `Veggie-rich` -> `Vegetables`
- `Portion-friendly` -> `Portion-aware`
- `Small Portion`, `Tiny Portion`, `Too Low Cals` -> `Small portion`
- `Deep-fried` -> `Fried`
- `Heavy Sauce`, `Creamy` -> `Heavy sauce`
- `Best protein` -> `High protein`
- `Fresh`, `Less processed` -> `Whole foods`
- `High calories` -> `High-calorie`
- `Low calorie` -> `Low-calorie`
- `Calorie sufficient` -> `Enough calories`
- `Nutrient dense` -> `Nutrient-rich`

Удаляемые (не проходят в финал):  
`No empty calories`, `Strength support`, `Recovery`, `Variety`, `Not fried`

## 3) Логика выбора секции (top/caution/avoid), которая определяет тип пинов

Источник: `src/services/classifyDishes.ts`

Порядок правил:

1. `avoid`, если есть матч аллергена (`detected_allergies` пересекся с `user.allergies`).
2. `caution`, если есть матч dislikes (`detected_dislikes` пересекся с `user.dislikes`).
3. `caution`, если есть diet mismatch (`checkDietMismatch`).
4. `caution`, если `qualityMismatch(...)` вернул причину.
5. `caution`, если `dishContext.shouldDowngrade === true`.
6. иначе `top`.

Важно:
- секция выбирается до расчета самих пинов;
- для `top` всегда positive pins;
- для `caution/avoid` всегда risk pins.

## 4) Подробная runtime логика присвоения positive pins (`computePositivePins`)

Источник: `src/services/computePins.ts`

Общие правила:
- максимум 4 positive-пина;
- если не сработало ни одно условие -> fallback `Balanced`.

## 4.1 Goal: Lose fat

Триггеры:
- Lean protein: `proteinG >= 22 && fatG < 20`
- Low-calorie: `caloriesKcal < 400`
- High fiber: `(vegan || paleo) && carbsG >= 20`
- Grilled/steamed: `!fried && !heavy_sauce && caloriesKcal < 550`
- Low sodium: `!heavy_sauce && !processed`
- Low sugar: `!high_sugar`
- Filling: `proteinG >= 20 && carbsG >= 15`
- Portion-aware: `caloriesKcal < 500 && proteinG >= 15`
- Vegetables: `vegan || vegetarian`
- Light dressing: `!heavy_sauce && caloriesKcal < 450`
- Whole foods: `paleo`

## 4.2 Goal: Maintain weight

Триггеры:
- Balanced: `proteinG >= 18 && carbsG >= 20 && fatG < 28`
- Lean protein: `proteinG >= 22 && fatG < 20`
- Moderate protein: `proteinG >= 18 && proteinG < 28`
- Whole grains: `carbsG >= 35 && !processed`
- Vegetables: `vegan || vegetarian`
- High fiber: `(vegan || paleo) && carbsG >= 20`
- Low sodium: `!heavy_sauce && !processed`
- Healthy fats: `fatG >= 10 && fatG < 28 && !fried`
- Portion-aware: `caloriesKcal < 500 && proteinG >= 15`
- Whole foods: `paleo`

## 4.3 Goal: Gain muscle

Триггеры:
- High protein: `proteinG >= 28`
- Lean protein: `proteinG >= 22 && fatG < 20`
- Enough calories: `caloriesKcal >= 450`
- Balanced: `proteinG >= 18 && carbsG >= 20 && fatG < 28`
- Healthy fats: `fatG >= 10 && fatG < 28 && !fried`
- Carbs included: `carbsG >= 30`
- Nutrient-rich: `proteinG >= 20 && caloriesKcal < 600`
- Whole foods: `paleo`

## 4.4 Goal: Eat healthier

Триггеры:
- Whole foods: `paleo`
- Vegetables: `vegan || vegetarian`
- High fiber: `(vegan || paleo) && carbsG >= 20`
- Low sodium: `!heavy_sauce && !processed`
- Low sugar: `!high_sugar`
- Healthy fats: `fatG >= 10 && fatG < 28 && !fried`
- Balanced: `proteinG >= 18 && carbsG >= 20 && fatG < 28`
- Nutrient-rich: `proteinG >= 20 && caloriesKcal < 600`
- Grilled/steamed: `!fried && !heavy_sauce && caloriesKcal < 550`

## 5) Подробная runtime логика присвоения risk pins (`computeRiskPins`)

Источник: `src/services/computePins.ts`

Общие правила:
- максимум 3 risk-пина;
- логика идет по шагам (порядок важен):
  1) profile-based
  2) goal-specific (только Gain muscle)
  3) universal
- если ничего не сработало -> goal-specific fallback.

## 5.1 Шаг 1: profile-based

1. Allergen:
- если есть пересечение `detected_allergies` и `user.allergies` (по `includes` в обе стороны, case-insensitive).

2. Contains `<dislike>`:
- если элемент из `detected_dislikes` точно совпал с `user.dislikes` (case-insensitive exact).

3. Dietary mismatch (первый несовпавший pref):
- `Vegan or vegetarian` + dish не vegan/vegetarian -> `Non-vegan`
- `Gluten-free` + dish не gluten_free -> `Contains gluten`
- `Lactose-free` + dish не lactose_free -> `Contains lactose`
- `Keto` + dish не keto -> `High carbs`
- `Paleo (whole foods)` + dish не paleo -> `Processed`

Примечание: в этом месте нет проверок для `Pescatarian` и `Semi-vegetarian`.

## 5.2 Шаг 2: goal-specific (только Gain muscle)

- Very Low Protein: `proteinG < 18`
- Low Protein: `proteinG < 25`
- Small portion: `caloriesKcal < 350`
- No Carbs: `carbsG < 20`

## 5.3 Шаг 3: universal

- Fried: `fried`
- High sugar: `high_sugar`
- Heavy sauce: `heavy_sauce`
- High-calorie: `caloriesKcal >= 650`
- High sat fat: `fatG >= 38`
- High fat: `fatG >= 30`
- High carbs: `carbsG >= 65`
- Refined Carbs: `carbsG >= 55 && processed`
- Ultra-processed: `processed && fried`
- Processed: `processed`
- High sodium: `heavy_sauce || processed`
- Low Fiber: `!vegan && !paleo && carbsG < 15`

## 5.4 Fallback risk pin

Если после всех шагов riskPins пуст:
- Gain muscle -> `Low Protein`
- Lose fat -> `High-calorie`
- Maintain weight -> `High-calorie`
- Eat healthier -> `Processed`

## 6) Как пины попадают в итоговый `DishPick`

Источник: `src/data/providers/GeminiMenuAnalysisProvider.ts` (`toDishPick`)

- Для секции `top`:
  - `pins = pinLabels.slice(0, 4)`
  - `riskPins = undefined`
- Для секций `caution` и `avoid`:
  - `pins = []`
  - `riskPins = pinLabels.slice(0, 3)`

`quickFix` в этой ветке выставляется как `null`.

## 7) Контрактная валидация (legacy/strict schema слой)

Источник: `src/validation/menuAnalysisValidator.ts`

Этот слой строго валидирует `DishPick` JSON-ответы по whitelist:
- `topPicks.pins`: 3..4, только из top whitelist.
- `caution/avoid.riskPins`: 1..3, только из соответствующих risk whitelist.
- `topPicks` не должны содержать `riskPins`.
- `caution/avoid` не должны содержать `pins`.
- `quickFix`: только в caution, формат `Try: ...`, длина <= 45.

Важно: в текущем runtime flow `GeminiMenuAnalysisProvider -> classifyDishes` эта strict-валидация напрямую не вызывается.

## 8) Что проверить, если “пин кажется странным”

1. Проверить секцию блюда (`top/caution/avoid`) в `classifyDishes`.
2. Проверить входные поля блюда из AI extraction:
- `nutrition`
- `diet_flags`
- `cooking_flags`
- `detected_allergies`
- `detected_dislikes`
3. Пройти условия `computePositivePins` или `computeRiskPins` по порядку.
4. Убедиться, что пины не срезались лимитом (`top <= 4`, `risk <= 3`).
5. Проверить fallback-пин (если ничего не сработало).

## 9) Важные расхождения в текущей реализации

1. Runtime и whitelist-слой живут раздельно:
- runtime (активно): `classifyDishes + computePins`
- whitelist validator (строгий контракт): `menuPins + menuAnalysisValidator`

2. Некоторые runtime risk-пины не входят в whitelist-словари `menuPins.ts`:
- `Contains <dislike>`
- `Non-vegan`
- `Contains gluten`
- `Contains lactose`

3. Runtime fallback для positive pins всегда `Balanced`, даже для `Lose fat` и `Eat healthier`, где `Balanced` не входит в соответствующий top whitelist.

4. В `computeRiskPins` нет отдельной проверки для dietary prefs:
- `Pescatarian`
- `Semi-vegetarian`

5. В активной ветке `GeminiMenuAnalysisProvider -> classifyDishes` поле `quickFix` сейчас всегда `null`.
