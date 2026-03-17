# Welcome (First) Screen — Assets & Responsive Logic

**Figma:** file `0yomAW7HsP0HOy0Un5S69H`, node `39:145` (frame "first screen").  
**Code:** `src/screens/WelcomeScreen.tsx`.

---

## 1. Asset files (paths and density variants)

All assets live in **`assets/welcome/`**. Use base name in code (e.g. `require('.../sticker.png')`); React Native will load `sticker@2x.png` / `sticker@3x.png` when present for sharp rendering.

| Code key           | Base path (1x)                    | Add @2x / @3x for sharpness |
|--------------------|-----------------------------------|------------------------------|
| sticker            | `assets/welcome/sticker.png`      | ✅ recommended               |
| cameraWithFlash    | `assets/welcome/cameraWithFlash.png` | ✅ recommended            |
| forkKnifePlate     | `assets/welcome/forkKnifePlate.png`  | ✅ recommended            |
| brain              | `assets/welcome/brain.png`        | ✅ recommended               |
| checkMarkButton    | `assets/welcome/checkMark.png`     | ✅ recommended               |
| directHit           | `assets/welcome/directHit.png`     | ✅ recommended               |
| avocado            | `assets/welcome/avocado.png`       | ✅ recommended               |
| burrito            | `assets/welcome/burrito.png`       | ✅ recommended               |
| croissant          | `assets/welcome/croissant.png`     | ✅ recommended               |
| stuffedFlatbread   | `assets/welcome/stuffedFlatbread.png` | ✅ recommended            |
| pizza              | `assets/welcome/pizza.png`         | ✅ recommended               |
| spaghetti          | `assets/welcome/spaghetti.png`     | ✅ recommended               |
| arrow              | `assets/welcome/arrow.png`         | Optional: CTA arrow icon; currently using text "›" |

**Ellipses:** Rendered as `View` circles (no PNGs). Fill: `rgba(124, 58, 237, 0.08)`. Positions/sizes come from `FIGMA_BASELINE.ellipses`.

**Added/renamed for this implementation:**  
- No new files required beyond the list above.  
- If you export from Figma: add `sticker@2x.png`, `sticker@3x.png` (and same for each asset) next to the 1x file; optionally add `arrow.png` (+ @2x/@3x) and switch the CTA to use `<Image source={WELCOME_IMAGES.arrow} />` instead of the "›" character.

---

## 2. Responsive logic (short note)

- **Reference size:** 390×844 (iPhone 13/14). All baseline coordinates/sizes in `FIGMA_BASELINE` are for this frame.
- **Width scaling:**  
  `scaleW = screenWidth / 390`  
  `s(n) = Math.round(n * scaleW)`  
  Used for: horizontal margins, button width, x-positions, horizontal padding, and (by design) for y-positions and sizes so the layout scales proportionally with width. No global height-based scale (avoids tiny UI on tall devices).
- **Anchors:**
  - **Button:** Pinned to bottom: `bottom = insets.bottom + s(18)`, `left/right = s(32)`. Height and corner radius scaled with `s()`.
  - **Title / subtitle:** Placed above the button. On 390×844 their y-positions match `FIGMA_BASELINE.title.y` and `FIGMA_BASELINE.subtitle.y`. Vertical spacing between hero → title → subtitle → button is flexible: extra space goes mainly between hero and title; if space is tight, gaps are reduced so the subtitle never overlaps the button.
  - **Hero cluster:** Top-anchored at `insets.top + small offset` (max 12–16pt). Width = screen width; height = remaining space reserved for hero, capped by baseline hero height (scaled).
- **Hero-only scale:** If the reserved vertical space is too small for the full hero cluster, a **heroScale** (clamp 0.88–1.0) is applied only to the hero cluster (sizes and positions inside it). Text and button are not scaled.
- **Result:** Pixel-accurate look on 390×844; on 375×812 and 430×932 the same constraints keep the button pinned, no overlap, and a consistent composition without awkward stretching.
