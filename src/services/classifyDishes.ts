import { RawDish } from '../ai/menuAnalysis';
import { DishRecommendation, MacroTotals, UserProfile } from '../domain/models';
import { computePersonalTargets } from './computePersonalTargets';
import { computeDishContext } from './computeDishContext';
import { getMealPeriod, getMealsRemainingAfter } from './mealTiming';

export type ClassifiedResults = {
  topPicks: DishRecommendation[];
  caution: DishRecommendation[];
  avoid: DishRecommendation[];
};

function buildTags(dish: RawDish): string[] {
  const tags: string[] = [];
  if (dish.nutrition.proteinG >= 25) tags.push('High protein');
  if (tags.length < 3 && dish.nutrition.caloriesKcal < 400) tags.push('Lower cal');
  if (tags.length < 3 && dish.nutrition.carbsG < 20) tags.push('Low carb');
  if (tags.length < 3 && dish.diet_flags.vegan) tags.push('Vegan');
  if (tags.length < 3 && dish.diet_flags.gluten_free) tags.push('Gluten-free');
  if (tags.length < 3 && dish.diet_flags.keto) tags.push('Keto');
  return tags.slice(0, 3);
}

function mapDish(dish: RawDish, contextNote?: string): DishRecommendation {
  return {
    name: dish.name,
    reasonShort: dish.short_description,
    contextNote,
    tags: buildTags(dish),
    nutrition: dish.nutrition,
  };
}

export function classifyDishes(
  dishes: RawDish[],
  user: UserProfile,
  eatenToday: MacroTotals,
  now: Date = new Date()
): ClassifiedResults {
  const topPicks: DishRecommendation[] = [];
  const caution: DishRecommendation[] = [];
  const avoid: DishRecommendation[] = [];

  const userAllergies = (user.allergies ?? []).map((a) => a.toLowerCase());
  const userDislikes = (user.dislikes ?? []).map((d) => d.toLowerCase());
  const dailyTargets = computePersonalTargets(user);
  const mealPeriod = getMealPeriod(now);
  // Kept for explicit meal-timing context at pipeline level.
  getMealsRemainingAfter(mealPeriod);

  for (const dish of dishes) {
    const dishContext = computeDishContext({
      dish,
      goal: user.goal,
      dailyTargets,
      eatenToday,
      mealPeriod,
    });

    // 1. AVOID — allergy match (case-insensitive includes)
    const hasAllergen = dish.detected_allergies.some((allergen) => {
      const a = allergen.toLowerCase();
      return userAllergies.some((ua) => a.includes(ua) || ua.includes(a));
    });
    if (hasAllergen) {
      avoid.push(mapDish(dish));
      continue;
    }

    // 2. CAUTION — dislike match
    const hasDislike = dish.detected_dislikes.some((dislike) => {
      const d = dislike.toLowerCase();
      return userDislikes.some((ud) => d.includes(ud) || ud.includes(d));
    });
    if (hasDislike) {
      caution.push(mapDish(dish, dishContext.contextNote));
      continue;
    }

    // 3. CAUTION — dietary preference violation
    const hasPrefViolation = (user.dietaryPreferences ?? []).some((pref) => {
      switch (pref) {
        case 'Vegan or vegetarian':
          return !dish.diet_flags.vegan && !dish.diet_flags.vegetarian;
        case 'Pescatarian':
          return !dish.diet_flags.vegetarian && !dish.diet_flags.vegan;
        case 'Gluten-free':
          return !dish.diet_flags.gluten_free;
        case 'Lactose-free':
          return !dish.diet_flags.lactose_free;
        case 'Keto':
          return !dish.diet_flags.keto;
        case 'Paleo (whole foods)':
          return !dish.diet_flags.paleo;
        default:
          return false;
      }
    });
    if (hasPrefViolation) {
      caution.push(mapDish(dish, dishContext.contextNote));
      continue;
    }

    // 4. CAUTION — budget/context downgrade
    if (dishContext.shouldDowngrade) {
      caution.push(mapDish(dish, dishContext.contextNote));
      continue;
    }

    // 5. TOP — everything else
    topPicks.push(mapDish(dish, dishContext.contextNote));
  }

  return { topPicks, caution, avoid };
}
