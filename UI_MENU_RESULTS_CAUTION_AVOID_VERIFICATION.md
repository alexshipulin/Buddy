# MenuResults Caution/Avoid Verification Report

Read-only release verification for caution/avoid risk pins + tooltip flow.

---

## 1) AI contract verification

- **1.1 Caution requires `riskPins` (1..3) and `quickFix` (`Try: ...`)**
  - **Result:** PASS
  - **Evidence (`src/ai/menuAnalysis.ts`):**
    - `CAUTION_DISH_PICK_SCHEMA` requires `riskPins` and `quickFix`.
    - Prompt explicitly requires caution fields:
      - `riskPins (1-3 unique from caution whitelist)`
      - `quickFix (one allowed quickFix value)`
  - **Evidence (`src/validation/menuAnalysisValidator.ts`):**
    - For `group === 'caution'`:
      - `riskPins` must be array, length `1..3`, unique, subset of caution whitelist.
      - `quickFix` required, must start with `"Try: "`, max 45 chars, no newline.

- **1.2 Avoid requires `riskPins` (1..3) and no `quickFix`**
  - **Result:** PASS
  - **Evidence (`src/ai/menuAnalysis.ts`):**
    - `AVOID_DISH_PICK_SCHEMA` requires `riskPins` and does not require `quickFix`.
    - Prompt: avoid item fields include `riskPins` and do not include quickFix.
  - **Evidence (`src/validation/menuAnalysisValidator.ts`):**
    - For `group === 'avoid'`:
      - `riskPins` required with rules `1..3`, unique, whitelist subset.
      - `quickFix` is rejected (`quickFix_not_allowed`).

- **1.3 Top picks still use positive `pins`**
  - **Result:** PASS
  - **Evidence (`src/ai/menuAnalysis.ts`):**
    - `TOP_DISH_PICK_SCHEMA` requires `pins`.
    - Prompt: topPicks must use `pins (3-4 unique from top whitelist)`.
  - **Evidence (`src/validation/menuAnalysisValidator.ts`):**
    - For `group === 'topPicks'`:
      - `pins` required, exactly `3..4`, unique, top whitelist subset.
      - `riskPins` and `quickFix` explicitly disallowed.

---

## 2) Whitelists verification

- **2.1 `getCautionPinWhitelist(goal)` returns exactly 10 strings per goal**
  - **Result:** PASS
  - **Evidence (`src/domain/menuPins.ts`):**
    - `CAUTION_LOSE_FAT_PINS`, `CAUTION_MAINTAIN_WEIGHT_PINS`, `CAUTION_GAIN_MUSCLE_PINS`, `CAUTION_EAT_HEALTHIER_PINS` each contain 10 items.
    - `getCautionPinWhitelist(goal)` returns mapped list from `GOAL_CAUTION_PINS`.

- **2.2 `getAvoidPinWhitelist(goal)` returns exactly 10 strings per goal**
  - **Result:** PASS
  - **Evidence (`src/domain/menuPins.ts`):**
    - `AVOID_LOSE_FAT_PINS`, `AVOID_MAINTAIN_WEIGHT_PINS`, `AVOID_GAIN_MUSCLE_PINS`, `AVOID_EAT_HEALTHIER_PINS` each contain 10 items.
    - `getAvoidPinWhitelist(goal)` returns mapped list from `GOAL_AVOID_PINS`.

- **2.3 Validator enforces section-specific whitelist subsets**
  - **Result:** PASS
  - **Evidence (`src/validation/menuAnalysisValidator.ts`):**
    - Chooses whitelist by section:
      - `group === 'caution' ? pinWhitelistCaution : pinWhitelistAvoid`
    - Validates each `riskPin` membership and fails on mismatch (`riskPin_not_in_whitelist`).

---

## 3) UI verification

- **3.1 Caution renders yellow warning chips from `dish.riskPins`**
  - **Result:** PASS
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - `CautionCard`: maps `item.riskPins?.slice(0, 3)` to `<Chip ... variant="warning" />`.
  - **Evidence (`src/ui/components/Chip.tsx`):**
    - `variant="warning"` applies warning background/text styles (`warning`, `warningText`).

- **3.2 Avoid renders red danger chips from `dish.riskPins`**
  - **Result:** PASS
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - `AvoidCard`: maps `item.riskPins?.slice(0, 3)` to `<Chip ... variant="danger" />`.
  - **Evidence (`src/ui/components/Chip.tsx`):**
    - `variant="danger"` applies danger background/text styles (`danger`, `dangerText`).

- **3.3 Caution info affordance shown only when `quickFix` exists**
  - **Result:** PASS
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - Conditional render:
      - `{item.quickFix ? <Pressable style={styles.quickFixInfoBtn} ...> : null}`

- **3.4 Tap behavior matches platform requirements**
  - **Result:** PASS
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - `handleShowQuickFix`:
      - iOS: `ActionSheetIOS.showActionSheetWithOptions({ title: 'Suggested change', message: quickFix, options: ['OK'] ... })`
      - Android: `Alert.alert('Suggested change', quickFix)`

---

## 4) Layout regression check

- **4.1 Chips wrap (no overflow by style design)**
  - **Result:** PASS (static code evidence)
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - `riskPinsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: ... }`
    - chip lists are capped with `.slice(0, 3)`.

- **4.2 No overlap with Ask Buddy / bottom controls**
  - **Result:** PASS (static code evidence)
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - Scroll content bottom reserve:
      - `scrollPaddingBottom = insets.bottom + (...)`
      - `contentContainerStyle` includes dynamic bottom padding.
    - Sticky bottom bar is still conditionally rendered and safe-area padded:
      - `paddingBottom: insets.bottom + BOTTOM_BAR_PADDING`.

- **4.3 Safe area respected**
  - **Result:** PASS (static code evidence)
  - **Evidence (`src/screens/MenuResultsScreen.tsx`):**
    - Header top inset uses safe area:
      - `paddingTop: insets.top + spec.headerPaddingTopOffset`.
    - Bottom bar/scroll also include `insets.bottom`.

---

## Overall result

- **All requested checks:** PASS
- **Status:** Ready for release from code-contract/UI verification perspective.
- **Residual risk:** Final visual confirmation on physical iPhone Pro Max is still recommended (text truncation/line wrapping can vary with font scaling/user settings).

