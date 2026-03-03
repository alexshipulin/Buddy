import type { ActivityLevel, NutritionTargets, Sex, UserProfile } from '../domain/models';

const MODEL = 'gemini-2.5-flash';

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

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/**
 * Calls Gemini to compute personalised daily nutrition targets (cal / protein / carbs / fat)
 * from the user's profile. Throws on any error — callers should handle and show "Try again".
 */
export async function calculateNutritionTargets(user: UserProfile): Promise<NutritionTargets> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here') {
    throw new Error('AI service not configured. Add EXPO_PUBLIC_GEMINI_API_KEY to use this feature.');
  }

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `Compute for this input: ${JSON.stringify(input)}` },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.0,
      maxOutputTokens: 2048,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error('Network error. Check your connection and try again.');
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'calculateNutritionTargets.ts:HTTP_ERR',message:'HTTP error',data:{status:res.status,errText:errText.slice(0,500)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw new Error(`AI request failed (${res.status}). ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as GeminiResponse;

  // #region agent log
  fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'calculateNutritionTargets.ts:RESPONSE',message:'Gemini raw response structure',data:{hasCandidates:!!data?.candidates,candidateCount:data?.candidates?.length,firstCandidateKeys:data?.candidates?.[0] ? Object.keys(data.candidates[0]) : null,finishReason:(data?.candidates?.[0] as Record<string,unknown>)?.finishReason},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  let raw = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ?? '';

  // #region agent log
  fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'calculateNutritionTargets.ts:RAW',message:'Extracted raw text',data:{rawLength:raw.length,rawPreview:raw.slice(0,500),isEmpty:!raw},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  if (!raw) {
    const debugInfo = JSON.stringify(data).slice(0, 500);
    throw new Error(`Empty response from AI.\n\nDebug: ${debugInfo}`);
  }

  // Strip markdown code fences that some models wrap around JSON
  raw = raw.trim();
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: RawTargets;
  try {
    parsed = JSON.parse(raw) as RawTargets;
  } catch (parseErr) {
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'calculateNutritionTargets.ts:PARSE_FAIL',message:'JSON parse failed',data:{rawPreview:raw.slice(0,500),parseError:String(parseErr)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    throw new Error(`Could not parse AI response.\n\nRaw: ${raw.slice(0, 300)}`);
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
