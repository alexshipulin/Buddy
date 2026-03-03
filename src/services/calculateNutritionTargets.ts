import type { ActivityLevel, NutritionTargets, Sex, UserProfile } from '../domain/models';
import { requireApiKey, runWithFallback, sanitizeJsonText } from '../ai/geminiClient';

const SYSTEM_PROMPT = `You are a nutrition calculator in a mobile app. Return ONLY JSON.

Rules:
- If age_years null use bucket midpoint: 24,34,44,54,65.
- BMR (Mifflin): male: 10*w + 6.25*h - 5*a - 5; female: 10*w + 6.25*h - 5*a - 161
- TDEE = BMR * mult; mult: low 1.2, med 1.45, high 1.7
- Cal target: Lose fat 0.8*TDEE, Maintain weight 1.0*TDEE, Gain muscle 1.1*TDEE, Eat healthier 1.0*TDEE
- Protein g/kg: Lose fat 2.0, Maintain weight 1.6, Gain muscle 2.2, Eat healthier 1.6
- Fat share of cal: Lose fat 0.27, Maintain weight 0.30, Gain muscle 0.25, Eat healthier 0.30
- fat_g = (cal*fatShare)/9
- carbs_g = (cal - protein_g*4 - fat_g*9)/4
- Min calories: male 1600, female 1300 (apply only if goal=Lose fat).
- If carbs_g < 50: set carbs_g=50 and recompute fat_g from remaining calories.
- Round: calories to nearest 50; macros to nearest 5.

Output JSON exactly:
{ "calories_kcal":N, "protein_g":N, "carbs_g":N, "fat_g":N, "bmr_kcal":N, "tdee_kcal":N, "assumptions":{"age_used":N,"activity_mult":N} }`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    calories_kcal: { type: 'number' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    bmr_kcal: { type: 'number' },
    tdee_kcal: { type: 'number' },
    assumptions: {
      type: 'object',
      properties: {
        age_used: { type: 'number' },
        activity_mult: { type: 'number' },
      },
      required: ['age_used', 'activity_mult'],
    },
  },
  required: ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'bmr_kcal', 'tdee_kcal', 'assumptions'],
};

function mapSex(sex: Sex | undefined): 'male' | 'female' {
  return sex === 'Female' ? 'female' : 'male';
}

function mapActivity(activity: ActivityLevel): 'low' | 'med' | 'high' {
  if (activity === 'Medium') return 'med';
  if (activity === 'High') return 'high';
  return 'low';
}

type RawTargets = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  bmr_kcal: number;
  tdee_kcal: number;
  assumptions: { age_used: number; activity_mult: number };
};

export async function calculateNutritionTargets(user: UserProfile): Promise<NutritionTargets> {
  const apiKey = requireApiKey();

  const { baseParams, goal } = user;
  if (!baseParams) {
    throw new Error('Personal parameters (height, weight, activity) are required.');
  }

  const input = {
    goal,
    sex: mapSex(baseParams.sex),
    height_cm: baseParams.heightCm,
    weight_kg: baseParams.weightKg,
    age_years: baseParams.age ?? null,
    age_bucket: null,
    activity: mapActivity(baseParams.activityLevel),
  };

  const parts = [
    { text: SYSTEM_PROMPT },
    { text: `Compute for this input: ${JSON.stringify(input)}` },
  ];

  const structuredBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  };

  const buildPlainBody = (): object => ({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
  });

  const { rawText } = await runWithFallback({
    taskType: 'nutrition_targets',
    apiKey,
    body: structuredBody,
    supportsPlainFallback: true,
    buildPlainBody,
  });

  if (!rawText) {
    throw new Error('Empty response from AI.');
  }

  const cleaned = sanitizeJsonText(rawText);

  let parsed: RawTargets;
  try {
    parsed = JSON.parse(cleaned) as RawTargets;
  } catch {
    throw new Error(`Could not parse AI response.\n\nRaw: ${rawText.slice(0, 300)}`);
  }

  if (typeof parsed.calories_kcal !== 'number' || typeof parsed.protein_g !== 'number') {
    throw new Error(`AI response missing fields.\n\nParsed: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return {
    caloriesKcal: parsed.calories_kcal,
    proteinG: parsed.protein_g,
    carbsG: parsed.carbs_g ?? 0,
    fatG: parsed.fat_g ?? 0,
    bmrKcal: parsed.bmr_kcal ?? 0,
    tdeeKcal: parsed.tdee_kcal ?? 0,
    assumptions: {
      ageUsed: parsed.assumptions?.age_used ?? 0,
      activityMult: parsed.assumptions?.activity_mult ?? 0,
    },
    computedAt: new Date().toISOString(),
  };
}
