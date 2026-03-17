import type { RawDish } from '../ai/menuAnalysis';
import type { ExtractedDish } from '../domain/models';

export function rawDishToExtracted(dish: RawDish): ExtractedDish {
  const p = dish.nutrition.proteinG;
  const f = dish.nutrition.fatG;

  return {
    name: dish.name,
    shortDescription: dish.short_description,
    estimatedCalories: dish.nutrition.caloriesKcal,
    estimatedProteinG: p,
    estimatedCarbsG: dish.nutrition.carbsG,
    estimatedFatG: f,
    confidencePercent: 80,
    allergenSignals:
      dish.detected_allergies.length > 0 ? { contains: dish.detected_allergies } : undefined,
    dislikes:
      dish.detected_dislikes.length > 0
        ? {
            containsDislikedIngredient: true,
            removableDislikedIngredients: dish.detected_dislikes,
          }
        : undefined,
    flags: {
      veggieForward: dish.diet_flags.vegetarian || undefined,
      leanProtein: (p >= 25 && f < 15) || undefined,
      wholeFood: dish.diet_flags.paleo || undefined,
    },
  };
}
