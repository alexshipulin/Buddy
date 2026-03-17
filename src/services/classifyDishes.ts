import { DishPin, DishRecommendation, MacroTotals, UserProfile } from '../domain/models';
import { RawDish } from '../ai/menuAnalysis';
import { computePersonalTargets } from './computePersonalTargets';
import { computeDishContext } from './computeDishContext';
import { computePositivePins, computeRiskPins } from './computePins';
import { getMealPeriod } from './mealTiming';

export type ClassifiedResults = {
  topPicks: DishRecommendation[];
  caution: DishRecommendation[];
  avoid: DishRecommendation[];
};

function checkDietMismatch(
  flags: RawDish['diet_flags'] | undefined,
  prefs: UserProfile['dietaryPreferences']
): boolean {
  const safeFlags =
    flags && typeof flags === 'object'
      ? flags
      : {
          vegan: false,
          vegetarian: false,
          gluten_free: false,
          lactose_free: false,
          keto: false,
          paleo: false,
        };
  for (const pref of prefs) {
    if (pref === 'Vegan or vegetarian' && !safeFlags.vegan && !safeFlags.vegetarian) return true;
    if (pref === 'Pescatarian' && !safeFlags.vegetarian && !safeFlags.vegan) return true;
    if (pref === 'Gluten-free' && !safeFlags.gluten_free) return true;
    if (pref === 'Lactose-free' && !safeFlags.lactose_free) return true;
    if (pref === 'Keto' && !safeFlags.keto) return true;
    if (pref === 'Paleo (whole foods)' && !safeFlags.paleo) return true;
  }
  return false;
}

function mapDish(
  dish: RawDish,
  rating: 'top' | 'caution' | 'avoid',
  user: UserProfile,
  contextNote?: string
): DishRecommendation {
  const pins: DishPin[] =
    rating === 'top' ? computePositivePins(dish, user.goal) : computeRiskPins(dish, user);
  const nutrition =
    dish?.nutrition && typeof dish.nutrition === 'object'
      ? dish.nutrition
      : { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const reasonShort =
    typeof dish?.short_description === 'string' && dish.short_description.trim()
      ? dish.short_description
      : 'No description available.';

  return {
    name: dish.name,
    reasonShort,
    contextNote,
    pins,
    nutrition,
  };
}

export function classifyDishes(
  dishes: RawDish[],
  user: UserProfile,
  eatenToday: MacroTotals,
  now: Date = new Date()
): ClassifiedResults {
  const dailyTargets = computePersonalTargets(user);
  const mealPeriod = getMealPeriod(now);
  const topPicks: DishRecommendation[] = [];
  const caution: DishRecommendation[] = [];
  const avoid: DishRecommendation[] = [];

  for (const dish of dishes) {
    const dishContext = computeDishContext({
      dish,
      goal: user.goal,
      dailyTargets,
      eatenToday,
      mealPeriod,
    });

    // Step 1: AVOID — allergy match
    const detectedAllergies = Array.isArray(dish.detected_allergies) ? dish.detected_allergies : [];
    const detectedDislikes = Array.isArray(dish.detected_dislikes) ? dish.detected_dislikes : [];
    const hasAllergy = detectedAllergies.some((a) =>
      user.allergies.some(
        (ua) =>
          ua.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(ua.toLowerCase())
      )
    );
    if (hasAllergy) {
      avoid.push(mapDish(dish, 'avoid', user, dishContext.contextNote));
      continue;
    }

    // Step 2: CAUTION — dislikes match
    const hasDislike = detectedDislikes.some((d) =>
      (user.dislikes ?? []).some((ud) => ud.toLowerCase() === d.toLowerCase())
    );
    if (hasDislike) {
      caution.push(mapDish(dish, 'caution', user, dishContext.contextNote));
      continue;
    }

    // Step 3: CAUTION — diet preference mismatch
    if (checkDietMismatch(dish.diet_flags, user.dietaryPreferences)) {
      caution.push(mapDish(dish, 'caution', user, dishContext.contextNote));
      continue;
    }

    // Step 4: CAUTION — budget downgrade
    if (dishContext.shouldDowngrade) {
      caution.push(mapDish(dish, 'caution', user, dishContext.contextNote));
      continue;
    }

    // Step 5: TOP
    topPicks.push(mapDish(dish, 'top', user, dishContext.contextNote));
  }

  return { topPicks, caution, avoid };
}
