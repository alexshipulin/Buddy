"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPinWhitelist = getPinWhitelist;
exports.getCautionPinWhitelist = getCautionPinWhitelist;
exports.getAvoidPinWhitelist = getAvoidPinWhitelist;
exports.getDietMismatchPin = getDietMismatchPin;
exports.buildDeterministicPins = buildDeterministicPins;
const LOSE_FAT_PINS = [
    'Low calorie',
    'High fiber',
    'Lean protein',
    'Low sodium',
    'Low sugar',
    'Portion-friendly',
    'Filling',
    'Veggie-rich',
    'Grilled/steamed',
    'Light dressing',
    'Whole foods',
    'Not fried',
];
const MAINTAIN_WEIGHT_PINS = [
    'Balanced',
    'Moderate protein',
    'Whole grains',
    'Vegetables',
    'Lean protein',
    'Fiber',
    'Low sodium',
    'Variety',
    'Healthy fats',
    'Portion-aware',
    'Fresh',
    'Whole foods',
];
const GAIN_MUSCLE_PINS = [
    'High protein',
    'Best protein',
    'Lean protein',
    'Calorie sufficient',
    'Strength support',
    'Recovery',
    'Balanced',
    'Whole foods',
    'Nutrient dense',
    'No empty calories',
    'Healthy fats',
    'Carbs included',
];
const EAT_HEALTHIER_PINS = [
    'Whole foods',
    'Veggie-rich',
    'Less processed',
    'Fiber',
    'Low sodium',
    'Low sugar',
    'Healthy fats',
    'Balanced',
    'Fresh',
    'Variety',
    'Nutrient dense',
    'Grilled/steamed',
];
const GOAL_PINS = {
    'Lose fat': LOSE_FAT_PINS,
    'Maintain weight': MAINTAIN_WEIGHT_PINS,
    'Gain muscle': GAIN_MUSCLE_PINS,
    'Eat healthier': EAT_HEALTHIER_PINS,
};
// ── Risk pin whitelists ────────────────────────────────────────────────────────
// "Diet Mismatch" is NOT included here; it is replaced by a computed goal-specific
// pin (e.g. "Not Keto") and injected at runtime by GeminiMenuAnalysisProvider.
const CAUTION_LOSE_FAT_PINS = [
    'High calories',
    'High Fat',
    'Fried',
    'Sugary',
    'Heavy Sauce',
    'Refined Carbs',
    'High Sodium',
    'Allergen',
    'Dislike',
];
const CAUTION_MAINTAIN_WEIGHT_PINS = [
    'High Sodium',
    'High Sugar',
    'High Fat',
    'Fried',
    'Heavy Sauce',
    'Refined Carbs',
    'Low Fiber',
    'Allergen',
    'Dislike',
];
const CAUTION_GAIN_MUSCLE_PINS = [
    'Low Protein',
    'Too Low Cals',
    'No Carbs',
    'Small Portion',
    'High Sugar',
    'Fried',
    'Heavy Sauce',
    'Allergen',
    'Dislike',
];
const CAUTION_EAT_HEALTHIER_PINS = [
    'Processed',
    'High Sodium',
    'Added Sugar',
    'Fried',
    'Heavy Sauce',
    'Refined Carbs',
    'High sat fat',
    'Allergen',
    'Dislike',
];
const AVOID_LOSE_FAT_PINS = [
    'High calories',
    'Deep-fried',
    'Fried',
    'Added Sugar',
    'High sat fat',
    'Creamy',
    'Heavy Sauce',
    'High carbs',
    'Refined Carbs',
    'Processed',
    'Allergen',
    'Dislike',
];
const AVOID_MAINTAIN_WEIGHT_PINS = [
    'Very High Sodium',
    'Added Sugar',
    'Deep-fried',
    'Fried',
    'High sat fat',
    'Creamy',
    'Heavy Sauce',
    'Ultra-processed',
    'Processed',
    'Refined Carbs',
    'Allergen',
    'Dislike',
];
const AVOID_GAIN_MUSCLE_PINS = [
    'Very Low Protein',
    'Too Low Cals',
    'No Carbs',
    'Tiny Portion',
    'Added Sugar',
    'Deep-fried',
    'Fried',
    'High sat fat',
    'Processed',
    'Allergen',
    'Dislike',
];
const AVOID_EAT_HEALTHIER_PINS = [
    'Ultra-processed',
    'Processed',
    'Very High Sodium',
    'Added Sugar',
    'Deep-fried',
    'Fried',
    'High sat fat',
    'Creamy',
    'Heavy Sauce',
    'Refined Carbs',
    'Allergen',
    'Dislike',
];
const GOAL_CAUTION_PINS = {
    'Lose fat': CAUTION_LOSE_FAT_PINS,
    'Maintain weight': CAUTION_MAINTAIN_WEIGHT_PINS,
    'Gain muscle': CAUTION_GAIN_MUSCLE_PINS,
    'Eat healthier': CAUTION_EAT_HEALTHIER_PINS,
};
const GOAL_AVOID_PINS = {
    'Lose fat': AVOID_LOSE_FAT_PINS,
    'Maintain weight': AVOID_MAINTAIN_WEIGHT_PINS,
    'Gain muscle': AVOID_GAIN_MUSCLE_PINS,
    'Eat healthier': AVOID_EAT_HEALTHIER_PINS,
};
/** Returns the pin whitelist for the given goal (12 pins). Pins in AI response must be a subset of this list. */
function getPinWhitelist(goal) {
    return [...GOAL_PINS[goal]];
}
/** Returns caution risk pins whitelist for the given goal (excludes diet-mismatch pin; see getDietMismatchPin). */
function getCautionPinWhitelist(goal) {
    return [...GOAL_CAUTION_PINS[goal]];
}
/** Returns avoid risk pins whitelist for the given goal (excludes diet-mismatch pin; see getDietMismatchPin). */
function getAvoidPinWhitelist(goal) {
    return [...GOAL_AVOID_PINS[goal]];
}
const DIET_MISMATCH_PIN_MAP = {
    'Vegan or vegetarian': 'Not Vegan',
    'Pescatarian': 'Not Pescatarian',
    'Semi-vegetarian': 'Not Semi-vegetarian',
    'Gluten-free': 'Not Gluten-free',
    'Lactose-free': 'Not Lactose-free',
    'Keto': 'Not Keto',
    'Paleo (whole foods)': 'Not Paleo',
};
/**
 * Returns a specific diet-mismatch risk pin based on the user's first dietary preference,
 * e.g. "Not Keto" instead of the generic "Diet Mismatch".
 * Returns null when the user has no dietary preferences.
 */
function getDietMismatchPin(dietaryPreferences) {
    if (!dietaryPreferences.length)
        return null;
    return DIET_MISMATCH_PIN_MAP[dietaryPreferences[0]] ?? null;
}
function normalizeAllergenName(allergen) {
    const normalized = allergen.trim().toLocaleLowerCase();
    if (normalized === 'peanuts')
        return 'peanut';
    if (normalized === 'tree nuts (almonds, walnuts, cashews)')
        return 'tree nuts';
    if (normalized === 'crustacean shellfish (shrimp, crab, lobster)')
        return 'shellfish';
    return normalized;
}
function pushUnique(target, value) {
    if (!value)
        return;
    if (!target.includes(value))
        target.push(value);
}
function buildDeterministicPins(params) {
    const pins = [];
    const riskPins = [];
    const flags = params.flags ?? {};
    const allergenSignals = params.allergenSignals;
    const dislikeSignals = params.dislikeSignals;
    if (params.protein >= 35) {
        pushUnique(pins, params.goal === 'Gain muscle' ? 'Best protein' : 'High protein');
    }
    else if (params.protein >= 24) {
        pushUnique(pins, 'Lean protein');
    }
    if (params.calories > 0 && params.calories <= 650)
        pushUnique(pins, 'Portion-aware');
    if (params.carbs > 0 && params.carbs <= 45)
        pushUnique(pins, 'Lower carb');
    if (flags.wholeFood)
        pushUnique(pins, 'Whole foods');
    if (flags.veggieForward)
        pushUnique(pins, 'Veggie-forward');
    if (!flags.processed && !flags.fried && params.section === 'top')
        pushUnique(pins, 'Fresh');
    if (pins.length === 0 && params.section === 'top')
        pushUnique(pins, 'Balanced');
    if (params.calories >= 850)
        pushUnique(riskPins, 'High calories');
    if (params.fat >= 34)
        pushUnique(riskPins, 'High fat');
    if (params.carbs >= 75)
        pushUnique(riskPins, 'High carbs');
    if (flags.fried)
        pushUnique(riskPins, 'Fried');
    if (flags.processed)
        pushUnique(riskPins, 'Processed');
    if (flags.dessert)
        pushUnique(riskPins, 'Dessert');
    if (flags.sugaryDrink)
        pushUnique(riskPins, 'Sugary drink');
    if (flags.highFatSauce)
        pushUnique(riskPins, 'Heavy sauce');
    if (flags.refinedCarbHeavy)
        pushUnique(riskPins, 'Refined carbs');
    const selectedAllergies = params.selectedAllergies
        .map(normalizeAllergenName)
        .filter(Boolean);
    const contained = (allergenSignals?.contains ?? [])
        .map(normalizeAllergenName)
        .filter(Boolean);
    for (const selected of selectedAllergies) {
        if (contained.some((item) => item.includes(selected) || selected.includes(item))) {
            pushUnique(riskPins, `Contains ${selected}`);
        }
    }
    if (allergenSignals?.unclear)
        pushUnique(riskPins, 'Allergen unclear');
    if (allergenSignals?.noListedAllergen)
        pushUnique(pins, 'No listed allergen');
    if (dislikeSignals?.containsDislikedIngredient) {
        pushUnique(riskPins, (dislikeSignals.removableDislikedIngredients?.length ?? 0) > 0
            ? 'Dislike (removable)'
            : 'Dislike');
    }
    return {
        pins: pins.slice(0, 4),
        riskPins: riskPins.slice(0, 4),
    };
}
