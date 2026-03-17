import { Goal, DishPin, UserProfile } from '../domain/models';
import { RawDish } from '../ai/menuAnalysis';

export function computePositivePins(dish: RawDish, goal: Goal): DishPin[] {
  const nutrition =
    dish?.nutrition && typeof dish.nutrition === 'object'
      ? dish.nutrition
      : { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const cooking =
    dish?.cooking_flags && typeof dish.cooking_flags === 'object'
      ? dish.cooking_flags
      : { fried: false, high_sugar: false, heavy_sauce: false, processed: false };
  const diet =
    dish?.diet_flags && typeof dish.diet_flags === 'object'
      ? dish.diet_flags
      : {
          vegan: false,
          vegetarian: false,
          gluten_free: false,
          lactose_free: false,
          keto: false,
          paleo: false,
        };

  const { caloriesKcal, proteinG, carbsG, fatG } = nutrition;
  const { fried, high_sugar, heavy_sauce, processed } = cooking;
  const { vegan, vegetarian, gluten_free, lactose_free, keto, paleo } = diet;

  const pins: DishPin[] = [];
  const push = (label: string): void => {
    if (pins.length >= 4) return;
    pins.push({ label, variant: 'positive' });
  };

  if (goal === 'Lose fat') {
    if (proteinG >= 22 && fatG < 20) push('Lean protein');
    if (caloriesKcal < 400) push('Low-calorie');
    if ((vegan || paleo) && carbsG >= 20) push('High fiber');
    if (!fried && !heavy_sauce && caloriesKcal < 550) push('Grilled/steamed');
    if (!heavy_sauce && !processed) push('Low sodium');
    if (!high_sugar) push('Low sugar');
    if (proteinG >= 20 && carbsG >= 15) push('Filling');
    if (caloriesKcal < 500 && proteinG >= 15) push('Portion-aware');
    if (vegan || vegetarian) push('Vegetables');
    if (!heavy_sauce && caloriesKcal < 450) push('Light dressing');
    if (paleo) push('Whole foods');
  } else if (goal === 'Maintain weight') {
    if (proteinG >= 18 && carbsG >= 20 && fatG < 28) push('Balanced');
    if (proteinG >= 22 && fatG < 20) push('Lean protein');
    if (proteinG >= 18 && proteinG < 28) push('Moderate protein');
    if (carbsG >= 35 && !processed) push('Whole grains');
    if (vegan || vegetarian) push('Vegetables');
    if ((vegan || paleo) && carbsG >= 20) push('High fiber');
    if (!heavy_sauce && !processed) push('Low sodium');
    if (fatG >= 10 && fatG < 28 && !fried) push('Healthy fats');
    if (caloriesKcal < 500 && proteinG >= 15) push('Portion-aware');
    if (paleo) push('Whole foods');
  } else if (goal === 'Gain muscle') {
    if (proteinG >= 28) push('High protein');
    if (proteinG >= 22 && fatG < 20) push('Lean protein');
    if (caloriesKcal >= 450) push('Enough calories');
    if (proteinG >= 18 && carbsG >= 20 && fatG < 28) push('Balanced');
    if (fatG >= 10 && fatG < 28 && !fried) push('Healthy fats');
    if (carbsG >= 30) push('Carbs included');
    if (proteinG >= 20 && caloriesKcal < 600) push('Nutrient-rich');
    if (paleo) push('Whole foods');
  } else if (goal === 'Eat healthier') {
    if (paleo) push('Whole foods');
    if (vegan || vegetarian) push('Vegetables');
    if ((vegan || paleo) && carbsG >= 20) push('High fiber');
    if (!heavy_sauce && !processed) push('Low sodium');
    if (!high_sugar) push('Low sugar');
    if (fatG >= 10 && fatG < 28 && !fried) push('Healthy fats');
    if (proteinG >= 18 && carbsG >= 20 && fatG < 28) push('Balanced');
    if (proteinG >= 20 && caloriesKcal < 600) push('Nutrient-rich');
    if (!fried && !heavy_sauce && caloriesKcal < 550) push('Grilled/steamed');
  }

  // Keep destructured flags marked as used while preserving pure deterministic behavior.
  void gluten_free;
  void lactose_free;
  void keto;

  if (pins.length === 0) {
    return [{ label: 'Balanced', variant: 'positive' }];
  }
  return pins.slice(0, 4);
}

export function computeRiskPins(dish: RawDish, user: UserProfile): DishPin[] {
  const nutrition =
    dish?.nutrition && typeof dish.nutrition === 'object'
      ? dish.nutrition
      : { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const cooking =
    dish?.cooking_flags && typeof dish.cooking_flags === 'object'
      ? dish.cooking_flags
      : { fried: false, high_sugar: false, heavy_sauce: false, processed: false };
  const diet =
    dish?.diet_flags && typeof dish.diet_flags === 'object'
      ? dish.diet_flags
      : {
          vegan: false,
          vegetarian: false,
          gluten_free: false,
          lactose_free: false,
          keto: false,
          paleo: false,
        };
  const detectedAllergies = Array.isArray(dish?.detected_allergies) ? dish.detected_allergies : [];
  const detectedDislikes = Array.isArray(dish?.detected_dislikes) ? dish.detected_dislikes : [];

  const { caloriesKcal, proteinG, carbsG, fatG } = nutrition;
  const { fried, high_sugar, heavy_sauce, processed } = cooking;
  const { vegan, vegetarian, gluten_free, lactose_free, keto, paleo } = diet;

  const pins: DishPin[] = [];
  const push = (label: string): void => {
    if (pins.length >= 3) return;
    pins.push({ label, variant: 'risk' });
  };

  // Step 1: profile-based pins first.
  const allergyMatch = detectedAllergies.some((a) =>
    user.allergies.some(
      (ua) =>
        ua.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(ua.toLowerCase())
    )
  );
  if (allergyMatch) push('Allergen');

  const dislikeMatch = detectedDislikes.find((d) =>
    (user.dislikes ?? []).some((ud) => ud.toLowerCase() === d.toLowerCase())
  );
  if (dislikeMatch) push(`Contains ${dislikeMatch}`);

  for (const pref of user.dietaryPreferences) {
    if (pref === 'Vegan or vegetarian' && !vegan && !vegetarian) {
      push('Non-vegan');
      break;
    }
    if (pref === 'Gluten-free' && !gluten_free) {
      push('Contains gluten');
      break;
    }
    if (pref === 'Lactose-free' && !lactose_free) {
      push('Contains lactose');
      break;
    }
    if (pref === 'Keto' && !keto) {
      push('High carbs');
      break;
    }
    if (pref === 'Paleo (whole foods)' && !paleo) {
      push('Processed');
      break;
    }
  }

  // Step 2: goal-specific pins (Gain muscle only).
  if (user.goal === 'Gain muscle') {
    if (proteinG < 18) push('Very Low Protein');
    if (proteinG < 25) push('Low Protein');
    if (caloriesKcal < 350) push('Small portion');
    if (carbsG < 20) push('No Carbs');
  }

  // Step 3: universal risk pins.
  if (fried) push('Fried');
  if (high_sugar) push('High sugar');
  if (heavy_sauce) push('Heavy sauce');
  if (caloriesKcal >= 650) push('High-calorie');
  if (fatG >= 38) push('High sat fat');
  if (fatG >= 30) push('High fat');
  if (carbsG >= 65) push('High carbs');
  if (carbsG >= 55 && processed) push('Refined Carbs');
  if (processed && fried) push('Ultra-processed');
  if (processed) push('Processed');
  if (heavy_sauce || processed) push('High sodium');
  if (!vegan && !paleo && carbsG < 15) push('Low Fiber');

  if (pins.length === 0) {
    if (user.goal === 'Gain muscle') return [{ label: 'Low Protein', variant: 'risk' }];
    if (user.goal === 'Lose fat') return [{ label: 'High-calorie', variant: 'risk' }];
    if (user.goal === 'Maintain weight') return [{ label: 'High-calorie', variant: 'risk' }];
    return [{ label: 'Processed', variant: 'risk' }];
  }

  return pins.slice(0, 3);
}
