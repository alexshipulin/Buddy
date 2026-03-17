# Welcome Screen Verification Report

**Figma:** file `0yomAW7HsP0HOy0Un5S69H`, node `39:145` (frame "first screen").  
**Run after implementation.** Baseline reference: iPhone 13/14 (390×844 pt).

---

## 1) Baseline check (390×844)

**Figma node 39:145** was not read via API in this run. The following baseline values are taken from the code constant `FIGMA_BASELINE` in `src/screens/WelcomeScreen.tsx`. To confirm against Figma Inspect, open the file in Figma and compare x,y,w,h for each element.

### Baseline reference (FIGMA_BASELINE in code)

| Element | x | y | w | h | Notes |
|--------|---|---|---|---|-------|
| **hero cluster** | 0 | 71 | 390 | 505 | Bounds on frame |
| **sticker** | 102 | 159.5 | 186 | 186 | Relative to hero cluster |
| **ellipse1** | cx 80, cy 120 | — | r 48 | — | Circle, relative to hero |
| **ellipse2** | cx 310, cy 100 | — | r 40 | — |
| **ellipse3** | cx 60, cy 380 | — | r 36 | — |
| **ellipse4** | cx 330, cy 400 | — | r 44 | — |
| **ellipse5** | cx 195, cy 80 | — | r 28 | — |
| **ellipse6** | cx 195, cy 430 | — | r 32 | — |
| **cameraWithFlash** | 268 | 88 | 73 | 73 | Feature icon |
| **forkKnifePlate** | 49 | 90 | 67 | 67 | Feature icon |
| **brain** | 310 | 340 | 71 | 71 | Feature icon |
| **checkMarkButton** | 159 | 385 | 62 | 62 | Feature icon |
| **directHit** | 52 | 350 | 45 | 45 | Feature icon |
| **avocado** | 288 | 200 | 46 | 46 | Food icon |
| **burrito** | 56 | 220 | 46 | 46 | Food icon |
| **croissant** | 300 | 380 | 46 | 46 | Food icon |
| **stuffedFlatbread** | 44 | 400 | 46 | 46 | Food icon |
| **pizza** | 170 | 100 | 46 | 46 | Food icon |
| **spaghetti** | 174 | 430 | 46 | 46 | Food icon |
| **title block** | — | 576 | — | — | fontSize 28, lineHeight 34, weight 700 |
| **subtitle block** | — | 664 | — | — | fontSize 17, lineHeight 22, weight 400; bold: "Scan menu", "for your goal" |
| **button** | margin 32 | bottom 18 from safe | — | 56 | cornerRadius 28, shadow raised; arrow 24pt |

### Computed layout at 390×844 (from script / __DEV__ log)

When the app runs at 390×844, `WelcomeScreen` logs in __DEV__ (see `console.log('[WelcomeScreen layout]', ...)`). The script `npx tsx scripts/verifyWelcomeLayout.ts` computes the same layout with insets (59, 34):

- **heroCluster.top** = 71 (expected 71) — **OK**
- **heroCluster.height** = 505 (expected 505) — **OK**
- **titleY** = 576 (expected 576) — **OK**
- **subtitleY** = 664 (expected 664) — **OK**
- **heroScale** = 1.0 — **OK**

**Max 1pt rounding:** All baseline values match (tolerance 1pt).  
**390×844: Pass**

---

## 2) Responsive check (375×812 and 430×932)

Computed with `scripts/verifyWelcomeLayout.ts` (insets: 375×812 → 59/34, 430×932 → 59/47):

| Check | 375×812 | 430×932 |
|-------|---------|---------|
| Button pinned above bottom safe area | ✅ buttonBottom ≥ insets.bottom | ✅ |
| Subtitle does not overlap button | ✅ gapSubtitleToButton ≥ 0 (8pt, 16pt) | ✅ |
| Title/subtitle spacing readable | ✅ gapTitleSubtitleMin 20pt | ✅ |
| Hero does not collide with notch | ✅ heroClusterTop ≥ insets.top | ✅ |
| heroScale only affects hero cluster | ✅ text/button not scaled; heroScale 0.97 (375×812), 1.0 (430×932) | ✅ |

**375×812: Pass**  
**430×932: Pass**

---

## 3) Asset sharpness check

| Check | Result |
|-------|--------|
| For each used image: `name.png`, `name@2x.png`, `name@3x.png` in `assets/welcome/` | **Fail** — only 1x files present (no `@2x`/`@3x` in repo) |
| `require()` references base name only | **Pass** — `WELCOME_IMAGES` uses e.g. `require('.../sticker.png')` |
| On 3x simulator/device, images crisp (no blur) | **Manual** — add @2x/@3x then verify on device |

**Fix for sharpness:** Export from Figma (or design source) at 1x, 2x, 3x and add for each asset:

- `sticker.png`, `sticker@2x.png`, `sticker@3x.png`
- Same for: `cameraWithFlash`, `forkKnifePlate`, `brain`, `checkMark`, `directHit`, `avocado`, `burrito`, `croissant`, `stuffedFlatbread`, `pizza`, `spaghetti`

Place them in `assets/welcome/`; React Native will pick the correct density.

**Asset sharpness: Fail** (until @2x/@3x files are added). **require() base name: Pass.**

---

## Return: Pass/Fail summary

| Device / check | Result |
|----------------|--------|
| **390×844 (baseline)** | **Pass** — hero cluster, title, subtitle positions match FIGMA_BASELINE within 1pt; heroScale 1.0. |
| **375×812** | **Pass** — Button pinned, no overlap, hero below notch, heroScale applied only to hero (~0.97). |
| **430×932** | **Pass** — Button pinned, no overlap, hero below notch, heroScale 1.0. |
| **Asset sharpness** | **Fail** — No @2x/@3x files in `assets/welcome/`. Add per-asset @2x/@3x for crisp rendering on 3x. |
| **require() base name only** | **Pass** — Code uses only base name. |

**If Fail (future runs):** Use format: **element name → expected → actual → exact fix** (e.g. `subtitleY → 664 → 660 → set gapTitleSubtitleMin = 20 and titleBlockH = titleLineH * 2`).

---

## How to re-run verification

1. **Automated layout (no app):**  
   `cd /Users/alexshipulin/Desktop/Buddy && npx tsx scripts/verifyWelcomeLayout.ts`

2. **Computed values in app (390×844, 375×812, 430×932):**  
   Run the app in __DEV__ and open Welcome screen on the corresponding simulator size; check console for `[WelcomeScreen layout]` JSON.

3. **Compare to Figma:**  
   In Figma, select node 39:145 and children; read x,y,w,h from Inspect and compare to the logged/computed values above.
