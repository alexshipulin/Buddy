"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeterministicExplanation = buildDeterministicExplanation;
function firstOf(list) {
    return list.length > 0 ? list[0] : null;
}
function pickPressureReason(list) {
    if (list.length === 0)
        return null;
    const fat = list.find((item) => item.toLocaleLowerCase().includes('fat'));
    if (fat)
        return fat;
    const carb = list.find((item) => item.toLocaleLowerCase().includes('carb'));
    if (carb)
        return carb;
    const calorie = list.find((item) => item.toLocaleLowerCase().includes('calorie'));
    if (calorie)
        return calorie;
    return list[0];
}
function buildDeterministicExplanation(ctx) {
    const hard = firstOf(ctx.hardConflictReasons);
    if (hard) {
        return { explanation: hard, quickFix: null };
    }
    const allergen = firstOf(ctx.allergenReasons);
    if (allergen) {
        return {
            explanation: allergen,
            quickFix: allergen === 'No listed allergen' ? null : 'Ask staff to confirm ingredients.',
        };
    }
    const dislike = firstOf(ctx.dislikeReasons);
    if (dislike) {
        return {
            explanation: dislike,
            quickFix: dislike.includes('removable')
                ? 'Ask to remove disliked ingredients.'
                : null,
        };
    }
    const pressure = pickPressureReason(ctx.softPressureReasons);
    if (pressure) {
        return {
            explanation: pressure,
            quickFix: pressure.includes('fat')
                ? 'Keep later meals lower in fat.'
                : pressure.includes('carb')
                    ? 'Keep later meals lower in carbs.'
                    : pressure.includes('calorie')
                        ? 'Go lighter later today.'
                        : null,
        };
    }
    const quality = firstOf(ctx.qualityReasons);
    if (quality) {
        return { explanation: quality, quickFix: null };
    }
    const protein = firstOf(ctx.proteinReasons);
    if (protein) {
        return {
            explanation: protein,
            quickFix: protein.includes('Low protein')
                ? 'Add a protein-focused meal later.'
                : null,
        };
    }
    const topByGoal = {
        'Lose fat': 'Better fit for calorie control and protein support.',
        'Maintain weight': 'Better fit for a balanced day.',
        'Gain muscle': 'Good protein and energy support for your goal.',
        'Eat healthier': 'Whole-food and balanced option for your goal.',
    };
    return {
        explanation: topByGoal[ctx.goal],
        quickFix: null,
    };
}
