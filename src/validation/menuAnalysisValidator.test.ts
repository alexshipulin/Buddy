import { getAvoidPinWhitelist, getCautionPinWhitelist, getPinWhitelist } from '../domain/menuPins';
import type { Goal } from '../domain/models';
import {
  validateMenuAnalysisResponse,
  validateMenuExtractionResponse,
} from './menuAnalysisValidator';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function makeGroupedResponse(overrides?: {
  topMacros?: Record<string, unknown>;
  cautionMacros?: Record<string, unknown>;
  avoidMacros?: Record<string, unknown>;
}) {
  return {
    topPicks: [
      {
        name: 'Chicken bowl',
        shortReason: 'Balanced option with protein and vegetables for your goal.',
        pins: ['Low-calorie', 'High fiber', 'Lean protein'],
        confidencePercent: 84,
        dietBadges: [],
        allergenNote: null,
        noLine: null,
        estimatedCalories: 520,
        estimatedProteinG: 36,
        estimatedCarbsG: 42,
        estimatedFatG: 16,
        ...(overrides?.topMacros ?? {}),
      },
    ],
    caution: [
      {
        name: 'Burger',
        shortReason: 'Higher energy density, better with small modifications today.',
        riskPins: ['High-calorie'],
        quickFix: 'Try: sauce on the side',
        confidencePercent: 72,
        dietBadges: [],
        allergenNote: null,
        noLine: null,
        estimatedCalories: 680,
        estimatedProteinG: 32,
        estimatedCarbsG: 45,
        estimatedFatG: 33,
        ...(overrides?.cautionMacros ?? {}),
      },
    ],
    avoid: [
      {
        name: 'Fried combo',
        shortReason: 'Very high energy and fat load for your remaining budget now.',
        riskPins: ['High-calorie'],
        confidencePercent: 78,
        dietBadges: [],
        allergenNote: null,
        noLine: null,
        estimatedCalories: 920,
        estimatedProteinG: 24,
        estimatedCarbsG: 70,
        estimatedFatG: 52,
        ...(overrides?.avoidMacros ?? {}),
      },
    ],
  };
}

function validationParams(goal: Goal = 'Lose fat') {
  return {
    goal,
    pinWhitelistTop: getPinWhitelist(goal),
    pinWhitelistCaution: getCautionPinWhitelist(goal),
    pinWhitelistAvoid: getAvoidPinWhitelist(goal),
    selectedDietPreferences: [],
    selectedAllergies: [],
    dislikes: [],
  };
}

function testMacroNumericStringsAreParsed(): void {
  const result = validateMenuAnalysisResponse({
    response: makeGroupedResponse({
      topMacros: {
        estimatedCalories: '510',
        estimatedProteinG: '35',
        estimatedCarbsG: '41',
        estimatedFatG: '15',
      },
    }),
    ...validationParams(),
  });

  const top = result.topPicks[0];
  assert(top.estimatedCalories === 510, 'expected estimatedCalories string to parse to number');
  assert(top.estimatedProteinG === 35, 'expected estimatedProteinG string to parse to number');
  assert(top.estimatedCarbsG === 41, 'expected estimatedCarbsG string to parse to number');
  assert(top.estimatedFatG === 15, 'expected estimatedFatG string to parse to number');
}

function testMacroStringWithUnitsIsDropped(): void {
  const result = validateMenuAnalysisResponse({
    response: makeGroupedResponse({
      topMacros: {
        estimatedCarbsG: '41g',
        estimatedFatG: '~15',
      },
    }),
    ...validationParams(),
  });

  const top = result.topPicks[0];
  assert(top.estimatedCarbsG === null, 'expected estimatedCarbsG with unit suffix to become null');
  assert(top.estimatedFatG === null, 'expected estimatedFatG with non-numeric prefix to become null');
}

function testExtractionValidatorParsesMacroStrings(): void {
  const extraction = validateMenuExtractionResponse({
    response: {
      dishes: [
        {
          name: 'PANZANELLA SALAD',
          menuSection: 'Salads',
          shortDescription: 'Fresh salad.',
          estimatedCalories: '450',
          estimatedProteinG: '20',
          estimatedCarbsG: '35',
          estimatedFatG: '25',
          confidencePercent: '88',
          dietBadges: ['Pescatarian', 'None'],
        },
      ],
    },
    selectedDietPreferences: ['Pescatarian'],
  });

  const dish = extraction.dishes[0];
  assert(dish.estimatedCalories === 450, 'expected extraction calories string to parse');
  assert(dish.estimatedProteinG === 20, 'expected extraction protein string to parse');
  assert(dish.estimatedCarbsG === 35, 'expected extraction carbs string to parse');
  assert(dish.estimatedFatG === 25, 'expected extraction fat string to parse');
  assert(dish.confidencePercent === 88, 'expected confidence string to parse');
  assert((dish.dietBadges ?? []).length === 1 && dish.dietBadges?.[0] === 'Pescatarian', 'expected dietBadges subset filter');
}

function testExtractionValidatorDropsInvalidMacroStrings(): void {
  const extraction = validateMenuExtractionResponse({
    response: {
      dishes: [
        {
          name: 'CHICKEN BURGER',
          estimatedCalories: '650kcal',
          estimatedProteinG: '45g',
          estimatedCarbsG: '40',
          estimatedFatG: null,
          confidencePercent: 91,
        },
      ],
    },
    selectedDietPreferences: [],
  });

  const dish = extraction.dishes[0];
  assert(dish.estimatedCalories === null, 'expected invalid calorie string to be null');
  assert(dish.estimatedProteinG === null, 'expected invalid protein string to be null');
  assert(dish.estimatedCarbsG === 40, 'expected numeric carb string to parse');
  assert(dish.estimatedFatG === null, 'expected null fat to stay null');
}

function testExtractionValidatorSupportsLegacyMacroKeys(): void {
  const extraction = validateMenuExtractionResponse({
    response: {
      dishes: [
        {
          name: 'LEGACY MACRO DISH',
          estimatedCalories: 610,
          estimatedProtein: '39',
          estimatedCarbs: '52',
          estimatedFat: 24,
          confidencePercent: 86,
        },
      ],
    },
    selectedDietPreferences: [],
  });

  const dish = extraction.dishes[0];
  assert(dish.estimatedCalories === 610, 'expected calories to remain from canonical key');
  assert(dish.estimatedProteinG === 39, 'expected legacy estimatedProtein to map to estimatedProteinG');
  assert(dish.estimatedCarbsG === 52, 'expected legacy estimatedCarbs to map to estimatedCarbsG');
  assert(dish.estimatedFatG === 24, 'expected legacy estimatedFat to map to estimatedFatG');
}

export function runMenuAnalysisValidatorTests(): void {
  testMacroNumericStringsAreParsed();
  testMacroStringWithUnitsIsDropped();
  testExtractionValidatorParsesMacroStrings();
  testExtractionValidatorDropsInvalidMacroStrings();
  testExtractionValidatorSupportsLegacyMacroKeys();
}
