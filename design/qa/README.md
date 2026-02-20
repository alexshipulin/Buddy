# Design QA - Pixel Perfect Verification

## Overview

Design QA overlay позволяет быстро сравнивать текущий UI с эталонными скриншотами из Figma/Stitch для достижения pixel-perfect соответствия.

## Usage

### 1. Подготовка reference изображений

Экспортируйте скриншоты из Figma/Stitch в PNG и сохраните в `design/reference/`:

```
design/reference/
  ├── welcome.png
  ├── goal-selection.png
  ├── dietary-profile.png
  ├── home.png
  ├── profile.png
  └── menu-results.png
```

### 2. Использование в коде

```tsx
import { DesignQAOverlay } from '../ui/components/DesignQAOverlay';

function WelcomeScreen() {
  const [qaVisible, setQaVisible] = React.useState(false);
  const [qaOpacity, setQaOpacity] = React.useState(50);

  // Enable via gesture (e.g., 5 taps on title)
  const handleTitlePress = () => {
    // ... gesture detection logic
    setQaVisible(true);
  };

  return (
    <>
      {/* Your screen content */}
      <DesignQAOverlay
        referenceImageUri={require('../../design/reference/welcome.png')}
        opacity={qaOpacity}
        onOpacityChange={setQaOpacity}
        onClose={() => setQaVisible(false)}
        visible={qaVisible}
      />
    </>
  );
}
```

### 3. Dev gesture для включения

Добавьте в каждый экран скрытый жест (например, 5 тапов по заголовку):

```tsx
const [tapCount, setTapCount] = React.useState(0);
const tapTimeout = React.useRef<NodeJS.Timeout>();

const handleTitleTap = () => {
  setTapCount((prev) => {
    const next = prev + 1;
    if (next >= 5) {
      setQaVisible(true);
      setTapCount(0);
    }
    if (tapTimeout.current) clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => setTapCount(0), 1000);
    return next;
  });
};
```

## Checklist для pixel-perfect

- [ ] Spacing: все отступы соответствуют 4pt grid (4, 8, 12, 16, 20, 24, 32, 40)
- [ ] Typography: размеры шрифтов и line heights соответствуют iOS text styles
- [ ] Radius: радиусы карточек, кнопок, чипов соответствуют токенам
- [ ] Colors: цвета соответствуют макету (особенно акцентные и состояния)
- [ ] Safe area: контент не перекрывает notch/home indicator
- [ ] Touch targets: все интерактивные элементы минимум 44×44pt
- [ ] Bottom CTA: кнопки зафиксированы снизу с учетом safe area
- [ ] Max width: на широких экранах контент ограничен (460pt) и центрирован
- [ ] ScrollView: при нехватке места включается скролл, кнопка остается снизу

## Screenshots для регрессии

Для визуальной регрессии делайте скриншоты на разных устройствах:

```bash
# iOS Simulator
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-se-welcome.png
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-15-welcome.png
xcrun simctl io booted screenshot ~/Desktop/screenshots/iphone-15-pro-max-welcome.png
```

Сравнивайте с reference изображениями вручную или через простой diff скрипт.
