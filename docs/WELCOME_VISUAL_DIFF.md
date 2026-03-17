# Welcome screen visual diff (390×844 vs Figma 39:145)

## 1) Console output on 390×844

When the app runs in __DEV__ at 390×844, the Welcome screen logs:

- **graphicScale, offsetX, notchShift** — one line
- **For each hero element:** `left`, `top`, `w`, `h` (computed), then Figma rect `x,y,w,h`, then whether `(computed/scale)` matches Figma within 1pt (OK/FAIL).

**How to get it:** Run the app on iPhone 13/14 simulator (390×844), open Welcome screen, open Metro/console and look for `[WelcomeScreen 390x844]` and `[Hero ...]`.

**Check:** Every hero line should end with `match 1pt: OK`. If any show FAIL, fix the FIGMA rect or the formula so that `computed/scale` equals the Figma value (within 1pt).

---

## 2) Assets check

**Used image keys in code:** sticker, cameraWithFlash, forkKnifePlate, brain, checkMarkButton (file: checkMark.png), directHit, avocado, burrito, croissant, stuffedFlatbread, pizza, spaghetti.

**Required files in `assets/welcome/` for each:**

| Key (code)   | Base file          | Required files                          |
|--------------|--------------------|-----------------------------------------|
| sticker      | sticker.png        | sticker.png, sticker@2x.png, sticker@3x.png |
| cameraWithFlash | cameraWithFlash.png | same pattern                        |
| forkKnifePlate | forkKnifePlate.png | same pattern                        |
| brain        | brain.png          | same pattern                            |
| checkMarkButton | checkMark.png    | checkMark.png, checkMark@2x.png, checkMark@3x.png |
| directHit    | directHit.png      | same pattern                            |
| avocado … spaghetti | (same name).png | name.png, name@2x.png, name@3x.png  |

**Script:** `npx tsx scripts/verifyWelcomeAssets.ts` — checks existence of 1x, @2x, @3x for each used asset.

**require():** Code must use only the base filename, e.g. `require('../../assets/welcome/sticker.png')`. No `@2x` or `@3x` in the path; RN picks density automatically.

---

## 3) Visual diff (screenshot vs Figma)

**Steps:**

1. Run the app on 390×844 (e.g. iPhone 14 simulator).
2. Open Welcome screen and take a screenshot (e.g. Cmd+S in simulator).
3. In Figma, open file `0yomAW7HsP0HOy0Un5S69H`, node 39:145 (first screen frame 390×844).
4. Place screenshot and Figma frame side by side (or overlay at 100% zoom).
5. For each element, compare position and size and fill the table below.

**Template — fill “Actual” and “Fix” when something is off:**

| Element        | Expected (Figma 39:145) | Actual (screenshot / inspect) | Fix |
|----------------|--------------------------|-------------------------------|-----|
| heroCluster    | x=0, y=59, w=390, h=360  |                               |     |
| sticker        | x=133, y=118, w=124, h=124 (in hero) |                    |     |
| ellipse1…6     | (see FIGMA.rects)        |                               |     |
| cameraWithFlash, … | (see FIGMA.rects)     |                               |     |
| title          | y=435, w=342             |                               |     |
| subtitleRow1   | y=513, w=326             |                               |     |
| subtitleRow2   | y=535, w=326             |                               |     |
| button         | x=32, y=772 from top, w=326, h=56 |                    |     |

**Short list format (when there are mismatches):**

```
element -> expected (Figma) -> actual -> fix
```

Example:

- `sticker w -> 124 -> 126 -> set FIGMA.rects.sticker.w = 124 and ensure roundToPx(124*1)=124`
- `title y -> 435 -> 432 -> increase notchShift or title rect y in FIGMA`

After fixing, re-run the app at 390×844 and confirm console shows all `match 1pt: OK` and the visual matches Figma.
