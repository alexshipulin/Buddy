# Alert Component QA

Единый компонент алерта: `src/ui/components/AppAlertProvider.tsx`  
Figma source: `allert (node 52:58)` в файле `Buddy`.

## Автоматические проверки

1. `npm run verify:alerts`
   - падает, если в `src` остались `Alert.alert(...)` или `ActionSheetIOS.showActionSheetWithOptions(...)`
   - падает, если `AppAlertProvider` не подключен в `App.tsx`
2. `npm run check`
   - `typecheck` + `verify:alerts`

## Ручной smoke-check по экрану

1. `Scan menu`:
   - запретить доступ к камере и нажать `take photo` → алерт `Camera access needed`
   - первый успешный скан вызывает вопрос `Save scans to Photos?` с кнопками `Not now` / `Allow`
   - в error/debug оверлее кнопка `Copy` показывает алерт `Copied`
2. `Menu results`:
   - `I take it` показывает алерт `Added`
   - кнопка `i` в `OK with caution` показывает алерт `Suggested change`
3. `Track meal`:
   - `Add Meal` показывает алерт `Saved`

## Визуальные критерии (сверка с Figma)

1. Карточка белая, с крупным радиусом (~40), мягкой тенью, ширина около 358 на iPhone шириной 390.
2. Заголовок крупнее текста описания, контрастный (`#0F172A`).
3. Кнопки внизу в один ряд: secondary светлая (`Back`/cancel), primary тёмная (`OK`/default).
4. Затемнение фона под модалкой есть, контент под модалкой не интерактивен.
