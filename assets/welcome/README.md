# First screen assets (Figma node 39:145)

Used by `src/screens/WelcomeScreen.tsx`. Code requires only the base name (e.g. `sticker.png`); React Native picks `sticker@2x.png` / `sticker@3x.png` when present for sharp rendering.

**Required (1x + @2x + @3x for crisp graphics):**

| Base file | Usage |
|-----------|--------|
| sticker.png | Hero center graphic |
| cameraWithFlash.png | Feature icon |
| forkKnifePlate.png | Feature icon |
| brain.png | Feature icon |
| checkMark.png | Feature icon (checkMarkButton) |
| directHit.png | Feature icon |
| avocado.png | Food icon |
| burrito.png | Food icon |
| croissant.png | Food icon |
| stuffedFlatbread.png | Food icon |
| pizza.png | Food icon |
| spaghetti.png | Food icon |

**Blur fix:** (1) Add `name@2x.png` and `name@3x.png` for each file (export from Figma at 2x/3x). (2) Code uses `graphicScale = min(screenW/390, screenH/844, 1)` so graphics are never upscaled. (3) All layout uses `PixelRatio.roundToNearestPixel()` to avoid fractional-pixel blur.
