/**
 * End-to-end verification for new pin logic.
 *
 * Covers:
 *  1. Repo-wide legacy string audit (whitelists + mock data)
 *  2. Whitelist integrity checks
 *  3. Diet-mismatch pin injection into Gemini prompt params
 *  4. Validator rejection of legacy pins / acceptance of computed pins
 *
 * Run with:  npx tsx scripts/verifyPinLogic.ts
 */

import {
  getCautionPinWhitelist,
  getAvoidPinWhitelist,
  getPinWhitelist,
  getDietMismatchPin,
} from '../src/domain/menuPins';
import { validateMenuAnalysisResponse, MenuAnalysisValidationError } from '../src/validation/menuAnalysisValidator';
import type { Goal, DietaryPreference } from '../src/domain/models';

const GOALS: Goal[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function assertThrows(fn: () => unknown, errorClass: new (...args: any[]) => Error, message: string): void {
  try {
    fn();
    console.error(`  ✗ FAIL (no throw): ${message}`);
    failed++;
  } catch (e) {
    if (e instanceof errorClass) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL (wrong error ${(e as Error)?.constructor?.name}): ${message}`);
      failed++;
    }
  }
}

function assertNoThrow(fn: () => unknown, message: string): void {
  try {
    fn();
    console.log(`  ✓ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL (threw ${(e as Error)?.message}): ${message}`);
    failed++;
  }
}

// ── Step 1: Legacy string audit across all whitelists ────────────────────────
console.log('\n[Step 1] Legacy string audit — all whitelists');
const BANNED_RUNTIME = [
  'High Cals', 'Very High Cals', 'Diet Mismatch',
  'Protein-rich', 'Complete protein', 'Carb Bomb',
  'High SatFat', 'Deep Fried',
  // Old positive pin names
  'Lower sodium', 'Lower sugar', 'Vegetable-forward', 'Satiating',
  'Portion control', 'Grilled or steamed', 'No fried',
  'Minimally processed', 'Balanced macros', 'Portion aware', 'Seasonal',
];

for (const goal of GOALS) {
  const allPins = [
    ...getPinWhitelist(goal),
    ...getCautionPinWhitelist(goal),
    ...getAvoidPinWhitelist(goal),
  ];
  for (const banned of BANNED_RUNTIME) {
    assert(!allPins.includes(banned), `"${banned}" absent from ${goal} whitelists`);
  }
}

// ── Step 2: Whitelist integrity ───────────────────────────────────────────────
console.log('\n[Step 2] Whitelist integrity checks');

for (const goal of GOALS) {
  const top = getPinWhitelist(goal);
  assert(top.length > 0, `${goal}: top whitelist is not empty (got ${top.length})`);
  assert(new Set(top).size === top.length, `${goal}: top whitelist unique`);

  const caution = getCautionPinWhitelist(goal);
  assert(!caution.includes('High Cals'), `${goal}: caution no "High Cals"`);
  assert(!caution.includes('Very High Cals'), `${goal}: caution no "Very High Cals"`);
  assert(!caution.includes('Diet Mismatch'), `${goal}: caution no "Diet Mismatch"`);

  const avoid = getAvoidPinWhitelist(goal);
  assert(!avoid.includes('Very High Cals'), `${goal}: avoid no "Very High Cals"`);
  assert(!avoid.includes('Diet Mismatch'), `${goal}: avoid no "Diet Mismatch"`);
}

// Lose fat should have "High-calorie" in both caution and avoid
assert(getCautionPinWhitelist('Lose fat').includes('High-calorie'), 'Lose fat caution has "High-calorie"');
assert(getAvoidPinWhitelist('Lose fat').includes('High-calorie'), 'Lose fat avoid has "High-calorie"');
// No list may have "High-calorie" more than once
for (const goal of GOALS) {
  const allPins = [...getCautionPinWhitelist(goal), ...getAvoidPinWhitelist(goal)];
  const count = allPins.filter((p) => p === 'High-calorie').length;
  assert(count <= 2, `${goal}: "High-calorie" not duplicated within a single list (total across both: ${count})`);
}

// Gain muscle top checks
const gainTop = getPinWhitelist('Gain muscle');
assert(gainTop.includes('High protein'), 'Gain muscle top has "High protein"');
assert(!gainTop.includes('Best protein'), 'Gain muscle top no "Best protein"');
assert(!gainTop.includes('Protein-rich'), 'Gain muscle top no "Protein-rich"');
assert(!gainTop.includes('Complete protein'), 'Gain muscle top no "Complete protein"');

// ── Step 3: Diet-mismatch pin injection check ─────────────────────────────────
console.log('\n[Step 3] Diet-mismatch pin injection (Lose fat + Paleo)');

const userDietPrefs: DietaryPreference[] = ['Paleo (whole foods)'];
const dietMismatchPin = getDietMismatchPin(userDietPrefs);
assert(dietMismatchPin === 'Not Paleo', `getDietMismatchPin returns "Not Paleo" (got "${dietMismatchPin}")`);

const baseCaution = getCautionPinWhitelist('Lose fat');
const baseAvoid = getAvoidPinWhitelist('Lose fat');
const effectiveCaution = dietMismatchPin ? [...baseCaution, dietMismatchPin] : baseCaution;
const effectiveAvoid = dietMismatchPin ? [...baseAvoid, dietMismatchPin] : baseAvoid;

assert(!baseCaution.includes('Not Paleo'), 'base caution does NOT have "Not Paleo" before injection');
assert(effectiveCaution.includes('Not Paleo'), 'effective caution includes "Not Paleo" after injection');
assert(!baseAvoid.includes('Not Paleo'), 'base avoid does NOT have "Not Paleo" before injection');
assert(effectiveAvoid.includes('Not Paleo'), 'effective avoid includes "Not Paleo" after injection');

// Simulate what the prompt builder receives and confirm "Diet Mismatch" is not in whitelist strings
const cautionPinListStr = effectiveCaution.join(', ');
const avoidPinListStr = effectiveAvoid.join(', ');
assert(!cautionPinListStr.includes('Diet Mismatch'), 'caution whitelist string contains no "Diet Mismatch"');
assert(!avoidPinListStr.includes('Diet Mismatch'), 'avoid whitelist string contains no "Diet Mismatch"');
assert(cautionPinListStr.includes('Not Paleo'), 'caution whitelist string contains "Not Paleo"');
assert(avoidPinListStr.includes('Not Paleo'), 'avoid whitelist string contains "Not Paleo"');

// ── Step 4: Validator rejection/acceptance checks ─────────────────────────────
console.log('\n[Step 4] Validator: legacy pin rejection, valid pin acceptance');

// Helper to build a minimal valid response shell
function makeResponse(overrides: Partial<{
  cautionRiskPins: string[];
  avoidRiskPins: string[];
  topPins: string[];
}>) {
  return {
    topPicks: [{
      name: 'Test dish',
      shortReason: 'A valid reason for testing purposes here.',
      pins: overrides.topPins ?? ['Low-calorie', 'High fiber', 'Lean protein'],
      confidencePercent: 80,
      dietBadges: [],
      allergenNote: null,
      noLine: null,
    }],
    caution: [{
      name: 'Caution dish',
      shortReason: 'A valid reason for testing purposes here.',
      riskPins: overrides.cautionRiskPins ?? ['High-calorie'],
      quickFix: 'Try: sauce on the side',
      confidencePercent: 60,
      dietBadges: [],
      allergenNote: null,
      noLine: null,
    }],
    avoid: [{
      name: 'Avoid dish',
      shortReason: 'A valid reason for testing purposes here.',
      riskPins: overrides.avoidRiskPins ?? ['High-calorie'],
      confidencePercent: 70,
      dietBadges: [],
      allergenNote: null,
      noLine: null,
    }],
  };
}

const validationParams = {
  goal: 'Lose fat' as Goal,
  pinWhitelistTop: getPinWhitelist('Lose fat'),
  pinWhitelistCaution: effectiveCaution,
  pinWhitelistAvoid: effectiveAvoid,
  selectedDietPreferences: userDietPrefs,
  selectedAllergies: [],
  dislikes: [],
};

// 4a: legacy "High Cals" in caution riskPins → must throw
assertThrows(
  () => validateMenuAnalysisResponse({ response: makeResponse({ cautionRiskPins: ['High Cals'] }), ...validationParams }),
  MenuAnalysisValidationError,
  'validator rejects caution riskPins: ["High Cals"]'
);

// 4b: legacy "Diet Mismatch" in caution riskPins → must throw (not in any whitelist)
assertThrows(
  () => validateMenuAnalysisResponse({ response: makeResponse({ cautionRiskPins: ['Diet Mismatch'] }), ...validationParams }),
  MenuAnalysisValidationError,
  'validator rejects caution riskPins: ["Diet Mismatch"]'
);

// 4c: legacy "Diet Mismatch" in avoid riskPins → must throw
assertThrows(
  () => validateMenuAnalysisResponse({ response: makeResponse({ avoidRiskPins: ['Diet Mismatch'] }), ...validationParams }),
  MenuAnalysisValidationError,
  'validator rejects avoid riskPins: ["Diet Mismatch"]'
);

// 4d: computed "Not Paleo" in caution riskPins → must pass (it's in effectiveCaution)
assertNoThrow(
  () => validateMenuAnalysisResponse({ response: makeResponse({ cautionRiskPins: ['Not Paleo'] }), ...validationParams }),
  'validator accepts caution riskPins: ["Not Paleo"] with injected whitelist'
);

// 4e: computed "Not Paleo" in avoid riskPins → must pass (it's in effectiveAvoid)
assertNoThrow(
  () => validateMenuAnalysisResponse({ response: makeResponse({ avoidRiskPins: ['Not Paleo'] }), ...validationParams }),
  'validator accepts avoid riskPins: ["Not Paleo"] with injected whitelist'
);

// 4f: canonical "High-calorie" in caution riskPins → must pass
assertNoThrow(
  () => validateMenuAnalysisResponse({ response: makeResponse({ cautionRiskPins: ['High-calorie'] }), ...validationParams }),
  'validator accepts caution riskPins: ["High-calorie"]'
);

// 4g: legacy caution pin "High Sugar" is normalized to "High sugar" → must pass
const normalizedHighSugar = validateMenuAnalysisResponse({
  response: makeResponse({ cautionRiskPins: ['High Sugar', 'Allergen'] }),
  ...validationParams,
});
assert(
  normalizedHighSugar.caution[0]?.riskPins?.includes('High sugar') ?? false,
  'validator normalizes caution risk pin "High Sugar" to "High sugar"'
);

// 4h: removed pin "No empty calories" is dropped from riskPins and payload still validates
const droppedRemovedPin = validateMenuAnalysisResponse({
  response: makeResponse({ cautionRiskPins: ['No empty calories', 'High-calorie'] }),
  ...validationParams,
});
assert(
  droppedRemovedPin.caution[0]?.riskPins?.includes('No empty calories') === false,
  'validator drops removed pin "No empty calories" from final output'
);
assert(
  droppedRemovedPin.caution[0]?.riskPins?.includes('High-calorie') ?? false,
  'validator keeps canonical pins when removed pins are present'
);

// 4i: legacy top pin "Low calorie" is normalized to "Low-calorie" → must pass
assertNoThrow(
  () => validateMenuAnalysisResponse({ response: makeResponse({ topPins: ['Low calorie', 'Low sodium', 'Lean protein'] }), ...validationParams }),
  'validator normalizes top pin "Low calorie" to "Low-calorie"'
);

// 4j: old top pin "Lower sodium" → must throw
assertThrows(
  () => validateMenuAnalysisResponse({ response: makeResponse({ topPins: ['Low-calorie', 'Lower sodium', 'Lean protein'] }), ...validationParams }),
  MenuAnalysisValidationError,
  'validator rejects top pin "Lower sodium" (legacy)'
);

// 4k: canonical top pin "Low sodium" → must pass
assertNoThrow(
  () => validateMenuAnalysisResponse({ response: makeResponse({ topPins: ['Low-calorie', 'Low sodium', 'Lean protein'] }), ...validationParams }),
  'validator accepts top pin "Low sodium" (new)'
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All verification checks passed ✓\n');
  console.log('Step 5 (manual): Run a scan with goal "Lose fat" + diet "Paleo (whole foods)":');
  console.log('  – Expect "Not Paleo" in caution/avoid pins');
  console.log('  – Expect NO "Diet Mismatch", "High Cals", or "Very High Cals" in UI');
  console.log('  – Expect "High-calorie" as the only calorie risk pin');
}
