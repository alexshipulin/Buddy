import { MenuAnalysisValidationError, validateMenuAnalysisResponse } from './menuAnalysisValidator';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildValidResponse(): { dishes: Array<Record<string, unknown>> } {
  return {
    dishes: [
      {
        name: 'SALMON BOWL',
        menuSection: 'Mains',
        shortDescription: 'Salmon, rice and vegetables.',
        estimatedCalories: 620,
        estimatedProteinG: 38,
        estimatedCarbsG: 52,
        estimatedFatG: 20,
        confidencePercent: 84,
        dietBadges: ['Gluten-free'],
        flags: {
          leanProtein: true,
          veggieForward: true,
          wholeFood: true,
        },
        allergenSignals: {
          contains: ['Fish'],
          unclear: false,
        },
        dislikes: {
          containsDislikedIngredient: false,
        },
      },
      {
        name: 'Build: rice + tuna + avocado',
        shortDescription: 'Custom builder combo.',
        estimatedCalories: null,
        estimatedProteinG: null,
        estimatedCarbsG: null,
        estimatedFatG: null,
        confidencePercent: 62,
        constructorMeta: {
          isCustom: true,
          components: ['rice', 'tuna', 'avocado'],
        },
      },
    ],
  };
}

function testValidResponsePasses(): void {
  const validated = validateMenuAnalysisResponse({ response: buildValidResponse() });
  assert(validated.dishes.length === 2, 'Expected two dishes in positive fixture');
  assert(validated.dishes[0].name === 'SALMON BOWL', 'Expected dish name to pass through');
}

function testInvalidShapeFails(): void {
  let thrown: unknown = null;
  try {
    validateMenuAnalysisResponse({
      response: {
        dishes: [
          {
            name: '',
            estimatedCalories: 'a lot',
            confidencePercent: 140,
          },
        ],
      },
    });
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof MenuAnalysisValidationError, 'Expected MenuAnalysisValidationError');
  if (!(thrown instanceof MenuAnalysisValidationError)) return;
  assert(thrown.issues.length > 0, 'Expected validation issues for invalid fixture');
}

function testSingleConstructorComponentIsSanitized(): void {
  const validated = validateMenuAnalysisResponse({
    response: {
      dishes: [
        {
          name: 'Custom bowl',
          estimatedCalories: 500,
          estimatedProteinG: 30,
          estimatedCarbsG: 40,
          estimatedFatG: 18,
          confidencePercent: 70,
          constructorMeta: {
            isCustom: true,
            components: ['rice'],
          },
        },
      ],
    },
  });

  assert(validated.dishes.length === 1, 'Expected one dish');
  assert(
    validated.dishes[0].constructorMeta?.isCustom === true,
    'Expected isCustom to be preserved'
  );
  assert(
    validated.dishes[0].constructorMeta?.components == null,
    'Expected invalid short components list to be dropped'
  );
}

export function runMenuAnalysisValidatorTests(): void {
  testValidResponsePasses();
  testInvalidShapeFails();
  testSingleConstructorComponentIsSanitized();
}
