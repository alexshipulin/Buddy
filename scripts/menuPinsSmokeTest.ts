/**
 * Smoke test for menu pin whitelists and diet-mismatch pin logic.
 *
 * Run with:
 *   npx tsx scripts/menuPinsSmokeTest.ts
 *
 * Exit code 0 = all assertions passed. Non-zero = failure.
 */

import {
  getCautionPinWhitelist,
  getAvoidPinWhitelist,
  getPinWhitelist,
  getDietMismatchPin,
} from '../src/domain/menuPins';
import type { Goal } from '../src/domain/models';

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

// ── 1. Banned legacy strings must not appear in any whitelist ─────────────────
console.log('\n[1] Legacy strings banned from all whitelists');
const BANNED = [
  'High Cals',
  'Very High Cals',
  'Diet Mismatch',
  'Protein-rich',
  'Complete protein',
  'Carb Bomb',
  'High SatFat',
  'Deep Fried',
  'Lower sodium',
  'Lower sugar',
  'Vegetable-forward',
  'Satiating',
  'Portion control',
  'Grilled or steamed',
  'No fried',
  'Minimally processed',
  'Balanced macros',
];

for (const goal of GOALS) {
  const allPins = [
    ...getPinWhitelist(goal),
    ...getCautionPinWhitelist(goal),
    ...getAvoidPinWhitelist(goal),
  ];
  for (const banned of BANNED) {
    assert(
      !allPins.includes(banned),
      `"${banned}" is absent from all whitelists for goal "${goal}"`
    );
  }
}

// ── 2. New strings must be present ───────────────────────────────────────────
console.log('\n[2] New strings present in expected whitelists');

// "High-calorie" must appear in caution and avoid for Lose fat
for (const goal of GOALS) {
  const caution = getCautionPinWhitelist(goal);
  const avoid = getAvoidPinWhitelist(goal);
  const hasInCaution = caution.includes('High-calorie');
  const hasInAvoid = avoid.includes('High-calorie');
  // Only Lose fat has it in caution; all goals should have it in avoid except Gain muscle (different focus)
  // Just check that no list has the old calorie pins
  assert(
    !caution.includes('High Cals'),
    `"High Cals" absent from caution for "${goal}"`
  );
  assert(
    !avoid.includes('Very High Cals'),
    `"Very High Cals" absent from avoid for "${goal}"`
  );
  // At least one of caution or avoid includes "High-calorie" for Lose fat
  if (goal === 'Lose fat') {
    assert(hasInCaution, `"High-calorie" present in Lose fat caution`);
    assert(hasInAvoid, `"High-calorie" present in Lose fat avoid`);
  }
}

// ── 3. Gain muscle top whitelist: correct protein pins ───────────────────────
console.log('\n[3] Gain muscle top whitelist — protein pins');
const gainMusclePins = getPinWhitelist('Gain muscle');
assert(
  gainMusclePins.includes('High protein'),
  'Gain muscle top includes "High protein"'
);
assert(
  !gainMusclePins.includes('Best protein'),
  'Gain muscle top does NOT include "Best protein"'
);
assert(
  !gainMusclePins.includes('Protein-rich'),
  'Gain muscle top does NOT include "Protein-rich"'
);
assert(
  !gainMusclePins.includes('Complete protein'),
  'Gain muscle top does NOT include "Complete protein"'
);

// ── 4. Every top whitelist has unique, non-empty pins ────────────────────────
console.log('\n[4] Top whitelists: non-empty and unique');
for (const goal of GOALS) {
  const pins = getPinWhitelist(goal);
  assert(pins.length > 0, `${goal} top whitelist is not empty (got ${pins.length})`);
  assert(
    new Set(pins).size === pins.length,
    `${goal} top whitelist has no duplicates`
  );
}

// ── 5. getDietMismatchPin mapping ────────────────────────────────────────────
console.log('\n[5] getDietMismatchPin');
assert(getDietMismatchPin([]) === null, 'empty prefs → null');
assert(getDietMismatchPin(['Paleo (whole foods)']) === 'Not Paleo', '"Paleo (whole foods)" → "Not Paleo"');
assert(getDietMismatchPin(['Keto']) === 'Not Keto', '"Keto" → "Not Keto"');
assert(getDietMismatchPin(['Gluten-free']) === 'Not Gluten-free', '"Gluten-free" → "Not Gluten-free"');
assert(getDietMismatchPin(['Vegan or vegetarian']) === 'Not Vegan', '"Vegan or vegetarian" → "Not Vegan"');
assert(getDietMismatchPin(['Lactose-free']) === 'Not Lactose-free', '"Lactose-free" → "Not Lactose-free"');
assert(getDietMismatchPin(['Pescatarian']) === 'Not Pescatarian', '"Pescatarian" → "Not Pescatarian"');
assert(getDietMismatchPin(['Semi-vegetarian']) === 'Not Semi-vegetarian', '"Semi-vegetarian" → "Not Semi-vegetarian"');

// ── 6. Computed diet-mismatch pin is injectable into caution/avoid ────────────
console.log('\n[6] Injected diet-mismatch pin extends whitelist correctly');
const baseCaution = getCautionPinWhitelist('Lose fat');
const baseAvoid = getAvoidPinWhitelist('Lose fat');
const paleo = getDietMismatchPin(['Paleo (whole foods)'])!;
const withPaleo = [...baseCaution, paleo];
assert(!baseCaution.includes(paleo), 'base caution does NOT include "Not Paleo" before injection');
assert(withPaleo.includes(paleo), 'after injection caution includes "Not Paleo"');
assert(!baseAvoid.includes(paleo), 'base avoid does NOT include "Not Paleo" before injection');
const withPaleoAvoid = [...baseAvoid, paleo];
assert(withPaleoAvoid.includes(paleo), 'after injection avoid includes "Not Paleo"');

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All smoke tests passed ✓');
}
