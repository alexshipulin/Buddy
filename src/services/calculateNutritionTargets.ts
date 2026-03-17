import type { ActivityLevel, Goal, NutritionTargets, Sex, UserProfile } from '../domain/models';
import { logAIDebug } from '../ai/aiDebugLog';
import { createId } from '../utils/id';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  Low: 1.2,
  Medium: 1.45,
  High: 1.7,
};

const GOAL_CALORIES_FACTOR: Record<Goal, number> = {
  'Lose fat': 0.8,
  'Maintain weight': 1.0,
  'Gain muscle': 1.1,
  'Eat healthier': 1.0,
};

const GOAL_PROTEIN_PER_KG: Record<Goal, number> = {
  'Lose fat': 2.0,
  'Maintain weight': 1.6,
  'Gain muscle': 2.2,
  'Eat healthier': 1.6,
};

const GOAL_FAT_SHARE: Record<Goal, number> = {
  'Lose fat': 0.27,
  'Maintain weight': 0.3,
  'Gain muscle': 0.25,
  'Eat healthier': 0.3,
};

function mapSex(sex: Sex | undefined): 'male' | 'female' {
  return sex === 'Female' ? 'female' : 'male';
}

function resolveAge(age: number | undefined): number {
  if (typeof age === 'number' && Number.isFinite(age) && age > 0) return Math.round(age);
  // Midpoint fallback bucket for unknown age in MVP.
  return 34;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function computeBmrKcal(params: { sex: 'male' | 'female'; weightKg: number; heightCm: number; ageYears: number }): number {
  const { sex, weightKg, heightCm, ageYears } = params;
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears);
  return sex === 'female' ? base - 161 : base - 5;
}

export async function calculateNutritionTargets(user: UserProfile): Promise<NutritionTargets> {
  const sessionId = createId('nutrition_targets');
  const startedAt = Date.now();
  logAIDebug({
    level: 'info',
    task: 'nutrition_targets',
    stage: 'targets.start',
    message: 'Nutrition targets local calculation started',
    sessionId,
    details: { goal: user.goal, hasBaseParams: Boolean(user.baseParams) },
  });

  const { baseParams, goal } = user;
  if (!baseParams) {
    throw new Error('Personal parameters (height, weight, activity) are required.');
  }

  const sex = mapSex(baseParams.sex);
  const ageYears = resolveAge(baseParams.age);
  const activityMult = ACTIVITY_MULTIPLIER[baseParams.activityLevel];

  const bmrRaw = computeBmrKcal({
    sex,
    weightKg: baseParams.weightKg,
    heightCm: baseParams.heightCm,
    ageYears,
  });
  const tdeeRaw = bmrRaw * activityMult;

  let caloriesRaw = tdeeRaw * GOAL_CALORIES_FACTOR[goal];
  if (goal === 'Lose fat') {
    const minCalories = sex === 'female' ? 1300 : 1600;
    caloriesRaw = Math.max(caloriesRaw, minCalories);
  }

  const proteinRaw = baseParams.weightKg * GOAL_PROTEIN_PER_KG[goal];
  let fatRaw = (caloriesRaw * GOAL_FAT_SHARE[goal]) / 9;
  let carbsRaw = (caloriesRaw - (proteinRaw * 4) - (fatRaw * 9)) / 4;

  if (carbsRaw < 50) {
    carbsRaw = 50;
    fatRaw = Math.max(0, (caloriesRaw - (proteinRaw * 4) - (carbsRaw * 4)) / 9);
  }

  const result: NutritionTargets = {
    caloriesKcal: roundToStep(caloriesRaw, 50),
    proteinG: roundToStep(proteinRaw, 5),
    carbsG: roundToStep(carbsRaw, 5),
    fatG: roundToStep(fatRaw, 5),
    bmrKcal: Math.round(bmrRaw),
    tdeeKcal: Math.round(tdeeRaw),
    assumptions: {
      ageUsed: ageYears,
      activityMult,
    },
    computedAt: new Date().toISOString(),
  };

  logAIDebug({
    level: 'info',
    task: 'nutrition_targets',
    stage: 'targets.success',
    message: 'Nutrition targets calculated locally',
    sessionId,
    durationMs: Date.now() - startedAt,
    details: {
      caloriesKcal: result.caloriesKcal,
      proteinG: result.proteinG,
      carbsG: result.carbsG,
      fatG: result.fatG,
    },
  });

  return result;
}
