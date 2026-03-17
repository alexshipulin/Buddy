# Выгрузка реализации первого экрана (Welcome / First screen)

Описание реализации стартового экрана приложения: структура, константы, код. Не претендует на точное соответствие макету по пикселям — ориентир на iOS HIG и общую композицию.

**Файл:** `src/screens/WelcomeScreen.tsx`  
**Макет:** Figma Buddy, node 0-1 (first screen)  
**Ресурсы:** `assets/welcome/` (скопированы из `amo/`)

---

## 1. Структура экрана

- **Корень** — `View` на весь экран, фон `appTheme.colors.background`.
- **Hero** — верхняя зона (фиксированная высота), без фоновой картинки: по центру стикер, вокруг него четыре иконки еды (avocado, pizza, burrito, croissant).
- **Skip** — пилл «Skip» в правом верхнем углу с учётом safe area.
- **Нижний лист (sheet)** — от конца hero до низа экрана: скруглённые верхние углы, тень, внутри заголовок, подзаголовок, кнопка «Get started», ссылка «Already have an account? Log in».

Все ключевые размеры и отступы заданы в объекте `LAYOUT` (фрейм 390×844 pt, сетка 8pt, минимум 44pt для нажатий).

---

## 2. Ресурсы (картинки)

Картинки подключаются из `assets/welcome/` через `require()`. Имена без пробелов для стабильной работы Metro.

```ts
const WELCOME_IMAGES = {
  sticker: require('../../assets/welcome/sticker.png') as ImageSourcePropType,
  forkKnifePlate: require('../../assets/welcome/forkKnifePlate.png') as ImageSourcePropType,
  brain: require('../../assets/welcome/brain.png') as ImageSourcePropType,
  avocado: require('../../assets/welcome/avocado.png') as ImageSourcePropType,
  pizza: require('../../assets/welcome/pizza.png') as ImageSourcePropType,
  burrito: require('../../assets/welcome/burrito.png') as ImageSourcePropType,
  croissant: require('../../assets/welcome/croissant.png') as ImageSourcePropType,
  spaghetti: require('../../assets/welcome/spaghetti.png') as ImageSourcePropType,
};
```

На экране используются: `sticker` (центр hero), `avocado`, `pizza`, `burrito`, `croissant` (четыре угла вокруг стикера). Остальные зарезервированы под возможные правки по макету.

---

## 3. Константы вёрстки (LAYOUT)

```ts
const LAYOUT = {
  frameWidth: 390,
  heroHeight: 404,
  skipTop: 8,
  skipRight: 20,
  skipPillHeight: 36,
  skipPillMinWidth: 56,
  skipPillRadius: 18,
  stickerSize: 186,
  foodIconSize: 46,
  foodOffsetX: 72,
  foodOffsetY: 48,
  sheetRadius: 32,
  sheetPaddingTop: 28,
  sheetPaddingHorizontal: 24,
  sheetPaddingBottom: 34,
  titleTop: 0,
  titlePaddingH: 24,
  subtitleTop: 12,
  subtitleMaxWidth: 342,
  ctaTop: 24,
  ctaHeight: 56,
  linkTop: 16,
  minTouchTarget: 44,
} as const;
```

- **Hero:** высота 404pt (на маленьких экранах ограничивается `screenHeight - 320`). Центр hero используется для расчёта позиций стикера и иконок.
- **Стикер:** 186×186pt, центр hero: `left = heroCenterX - stickerSize/2`, `top = heroCenterY - stickerSize/2`.
- **Иконки еды:** 46×46pt, смещения от центра ±72pt по X и ±48pt по Y (четыре угла).
- **Skip:** отступ сверху `insets.top + 8`, справа не меньше 20pt (учёт safe area).
- **Лист:** скругление 32pt, отступы сверху/снизу/по бокам 28/34/24pt. Контент листа ограничен по ширине `min(screenWidth, 390)`.
- **Контент листа:** заголовок без доп. отступа сверху, подзаголовок +12pt, кнопка +24pt, ссылка +16pt. Высота кнопки 56pt, зона нажатия ссылки не меньше 44pt.

---

## 4. Разметка JSX (сокращённо)

- **Hero** — один `View` с `position: 'absolute'`, внутри:
  - контейнер стикера с инлайн-стилями `left/top/width/height` от центра hero;
  - четыре контейнера иконок с `left/top/width/height` для левого верхнего, правого верхнего, левого нижнего, правого нижнего.
- **Skip** — обёртка с `position: 'absolute'`, `top: insets.top + LAYOUT.skipTop`, `right: Math.max(insets.left, LAYOUT.skipRight)`; внутри `Pressable` с текстом «Skip».
- **Sheet** — `View` с `position: 'absolute'`, `top: heroHeight`, `left/right/bottom: 0`, инлайн `paddingTop/paddingBottom/paddingHorizontal`. Внутри контейнер контента с `width: contentWidth`, в нём:
  - `Text` (заголовок) «Pick the best dish fast»;
  - `Text` (подзаголовок) «Scan a menu and get simple picks…»;
  - `View` с кнопкой `PrimaryButton` «Get started»;
  - `Pressable` с текстом «Already have an account? Log in».

Навигация: «Skip» и «Get started» → `navigation.navigate('GoalSelection')`, ссылка → `navigation.navigate('SignInNudge', { source: 'manual' })`.

---

## 5. Стили (StyleSheet)

- **root:** `flex: 1`, `backgroundColor: appTheme.colors.background`.
- **hero:** `position: 'absolute'`, `left: 0`, `top: 0`, фон `appTheme.colors.background`, `justifyContent/alignItems: 'center'` (ширина и высота задаются инлайном).
- **stickerWrap / foodIcon:** `position: 'absolute'`, `overflow: 'hidden'`; размеры и позиции инлайном.
- **sticker / foodImg:** `width/height: '100%'`, у `Image` — `resizeMode="contain"`.
- **skipWrap:** минимальная высота `max(skipPillHeight, 44)`, выравнивание по правому краю.
- **skipPill:** высота 36, minWidth 56, borderRadius 18, полупрозрачный чёрный фон, белый текст, fontWeight 600, fontSize 15.
- **sheet:** `position: 'absolute'`, `left/right/bottom: 0`, фон surface, скругление 32, `minHeight: 320`, `...appTheme.shadows.modal`.
- **sheetInner:** `maxWidth: LAYOUT.frameWidth`.
- **title:** `...typography.hero`, `textAlign: 'center'`.
- **subtitle:** `...typography.body`, цвет muted, центр, `maxWidth: 342`.
- **cta:** `minHeight: 56`.
- **linkWrap:** `minHeight: 44`, центр по вертикали и горизонтали, вертикальный padding 8.
- **link:** body, цвет muted, центр.

---

## 6. Зависимости

- `useSafeAreaInsets()` — отступы под вырез и home indicator.
- `useWindowDimensions()` — ширина/высота экрана для `contentWidth` и `heroHeight`.
- `spec`, `appTheme`, `typography` — из `design/spec`, `design/theme`, `ui/typography`.
- `PrimaryButton` — из `ui/components/PrimaryButton`.
- Навигация: `RootStackParamList`, экран `Welcome`.

---

## 7. Как подстроить под макет

- Позиции и размеры — в `LAYOUT`: при необходимости заменить числа на значения из Figma Inspect (x, y, width, height для фрейма 390×844).
- Замена или добавление картинок — правка `WELCOME_IMAGES` и соответствующих `Image` в разметке; файлы класть в `assets/welcome/` с теми же именами или обновить пути в `WELCOME_IMAGES`.

После изменений достаточно перезапустить Metro/Expo; отдельная миграция не нужна.
