# Welcome screen: blur, subtitle, and hero size fixes

## Root cause of blur

1. **Missing @2x/@3x assets** — Only 1x PNGs in `assets/welcome/`. On 2x/3x devices the runtime upscales the 1x image → soft/blurry.
2. **Upscaling** — Graphics were scaled by `screenWidth/390` without a cap, so on large devices they were drawn larger than design → blur.
3. **Fractional pixels** — Computed left/top/width/height were not rounded to device pixels, causing subpixel rendering and blur.

## Exact changes that fixed it

1. **No upscaling**  
   `graphicScale = min(screenW/390, screenH/844, 1)`. All hero positions/sizes use `graphicScale`; never > 1.

2. **Pixel-aligned layout**  
   `PixelRatio.roundToNearestPixel(n)` for every computed left, top, width, height of hero elements and Images. Eliminates fractional-pixel blur.

3. **Single FIGMA constant**  
   One source of truth: `FIGMA = { base: { w: 390, h: 844 }, rects: { heroCluster, sticker, ellipse1..6, feature icons, food icons, title, subtitleRow1, subtitleRow2, button } }`. All sizes from Figma rects only (no old 186 etc).

4. **Centering on wide screens**  
   `offsetX = (screenWidth - 390*graphicScale)/2`, `notchShift = clamp(insets.top, 0, 12)`. Hero and content use `roundToPx(offsetX + rect.x * scale)` so the 390pt frame is centered and never upscaled.

5. **Subtitle exactly 2 lines**  
   Two separate `<Text>` rows. Each: `numberOfLines={1}`, `adjustsFontSizeToFit`, `minimumFontScale={0.92}`, `maxWidth` = Figma subtitle width × textScale.

6. **Require base name only**  
   `require('.../name.png')`; add `name@2x.png` and `name@3x.png` for crisp rendering.

## Assets to add for sharpness

In `assets/welcome/` add @2x and @3x for each: sticker, cameraWithFlash, forkKnifePlate, brain, checkMark, directHit, avocado, burrito, croissant, stuffedFlatbread, pizza, spaghetti. Export from Figma at 2x and 3x; stable names, no spaces.
