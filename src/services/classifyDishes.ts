import { DishPin, DishRecommendation, Goal, MacroTotals, UserProfile } from '../domain/models';
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

function qualityMismatch(
  dish: RawDish,
  goal: Goal,
  fatOverTolerance: boolean,
  isSmallSide: boolean,
  proteinAlmostDone: boolean,
  isEvening: boolean,
  firstMealFlex: boolean,
  loseFatCalThreshold: number,
  eatHealthierCalThreshold: number
): string | null {
  // Guard: if nutrition data is missing or incomplete, skip quality checks
  if (!dish.nutrition || dish.nutrition.caloriesKcal == null) {
    return null;
  }

  const flags: Partial<RawDish['cooking_flags']> = dish.cooking_flags ?? {};
  const nut = dish.nutrition ?? { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  switch (goal) {
    case 'Gain muscle':
      if (fatOverTolerance && nut.fatG > 45) return 'Too much fat for muscle gain';
      if (isSmallSide) return null;
      if (flags.high_sugar && !(proteinAlmostDone && isEvening))
        return 'High sugar — not ideal for muscle gain';
      if (flags.fried) return 'Fried option — consider occasionally';
      if (firstMealFlex && !flags.high_sugar) return null;
      if (nut.proteinG < 15 && nut.caloriesKcal >= 150) return 'Low protein for muscle gain';
      return null;

    case 'Lose fat':
      // High calorie items always caution
      if (nut.caloriesKcal > loseFatCalThreshold) return 'High calorie for fat loss goal';
      // Fried
      if (flags.fried) return 'Fried option — high in fat and calories';
      // High sugar / desserts
      if (flags.high_sugar) return 'High sugar — avoid for fat loss';
      // Heavy sauce
      if (flags.heavy_sauce && nut.fatG > 20) return 'Rich sauce adds significant fat';
      return null;

    case 'Maintain weight':
      // Very high calorie
      if (nut.caloriesKcal > 750) return 'Large meal — balance with lighter choices';
      // Fried
      if (flags.fried) return 'Fried option — enjoy occasionally';
      if (flags.processed && nut.proteinG < 30) return 'Processed food — occasional treat only';
      // High sugar
      if (flags.high_sugar) return 'High sugar — occasional treat';
      return null;

    case 'Eat healthier':
      // Processed
      if (flags.processed) return 'Processed food — not ideal for clean eating';
      // Fried
      if (flags.fried) return 'Fried — better grilled or baked';
      // High sugar
      if (flags.high_sugar) return 'High sugar content';
      // Heavy sauce
      if (flags.heavy_sauce) return 'Heavy sauce — consider lighter option';
      if (nut.caloriesKcal > eatHealthierCalThreshold)
        return 'Quite large for a balanced eating goal';
      return null;

    default:
      return null;
  }
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

    // Step 3.5: CAUTION — quality mismatch for goal
    const fatOverTolerance = dailyTargets ? eatenToday.fatG > dailyTargets.fatG * 1.4 : false;
    const isSmallSide = dish.nutrition.caloriesKcal < 250 && dish.nutrition.fatG < 20;
    const proteinAlmostDone = dailyTargets ? eatenToday.proteinG >= 0.8 * dailyTargets.proteinG : false;
    const isEvening = mealPeriod === 'dinner';
    const firstMealFlex =
      mealPeriod === 'breakfast' &&
      eatenToday.caloriesKcal === 0 &&
      eatenToday.proteinG === 0 &&
      eatenToday.carbsG === 0 &&
      eatenToday.fatG === 0;
    const remaining = dailyTargets
      ? {
          caloriesKcal: dailyTargets.caloriesKcal - eatenToday.caloriesKcal,
          carbsG: dailyTargets.carbsG - eatenToday.carbsG,
          fatG: dailyTargets.fatG - eatenToday.fatG,
          proteinG: dailyTargets.proteinG - eatenToday.proteinG,
        }
      : null;
    const loseFatCalThreshold = remaining
      ? Math.min(Math.round(remaining.caloriesKcal * 0.55), 600)
      : 600;
    const eatHealthierCalThreshold = dailyTargets
      ? Math.min(Math.round(dailyTargets.caloriesKcal * 0.35), 850)
      : 800;

    const qualityIssue = qualityMismatch(
      dish,
      user.goal,
      fatOverTolerance,
      isSmallSide,
      proteinAlmostDone,
      isEvening,
      firstMealFlex,
      loseFatCalThreshold,
      eatHealthierCalThreshold
    );
    if (qualityIssue) {
      caution.push(mapDish(dish, 'caution', user, qualityIssue));
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
