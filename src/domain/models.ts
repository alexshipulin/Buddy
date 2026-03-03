export type Goal = 'Lose fat' | 'Maintain weight' | 'Gain muscle' | 'Eat healthier';
export type DietaryPreference =
  | 'Vegan or vegetarian'
  | 'Pescatarian'
  | 'Semi-vegetarian'
  | 'Gluten-free'
  | 'Lactose-free'
  | 'Keto'
  | 'Paleo (whole foods)';
export type ActivityLevel = 'Low' | 'Medium' | 'High';
export type Sex = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type Allergy = string;

/** Fixed list from TZ (MVP). UI must only offer these; no extra allergies. */
export const ALLERGY_OPTIONS: readonly string[] = [
  'Milk',
  'Eggs',
  'Fish',
  'Crustacean shellfish (shrimp, crab, lobster)',
  'Tree nuts (almonds, walnuts, cashews)',
  'Peanuts',
  'Wheat',
  'Soy',
] as const;

export type UserProfile = {
  goal: Goal;
  dietaryPreferences: DietaryPreference[];
  allergies: Allergy[];
  /** Dynamic list; normalize whitespace/casing for duplicates only. */
  dislikes?: string[];
  baseParams?: { heightCm: number; weightKg: number; activityLevel: ActivityLevel; age?: number; sex?: Sex };
};

export type MacroTotals = { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
export type HistoryItem = {
  id: string;
  type: 'menu_scan' | 'meal';
  title: string;
  createdAt: string;
  payloadRef: string;
  imageUris?: string[];
};
/** Menu scan dish (TZ v0.1). Used in MenuScanResult topPicks/caution/avoid. */
export type DishPick = {
  name: string;
  shortReason: string;
  pins: string[];
  /** Section-specific negative/risk pins used in caution/avoid cards (1..3). */
  riskPins?: string[];
  /** Quick actionable fix for caution items only; must start with "Try: ". */
  quickFix?: string | null;
  confidencePercent: number;
  dietBadges: string[];
  allergenNote: string | null;
  noLine: string | null;
  /** AI-estimated macros per dish (approximate). */
  estimatedCalories?: number | null;
  estimatedProteinG?: number | null;
  estimatedCarbsG?: number | null;
  estimatedFatG?: number | null;
};

export type MenuScanResult = {
  id: string;
  createdAt: string;
  inputImages: string[];
  topPicks: DishPick[];
  caution: DishPick[];
  avoid: DishPick[];
  summaryText: string;
  disclaimerFlag: true;
};

/** Legacy / other flows. Prefer DishPick for menu scan results. */
export type DishRecommendation = {
  name: string;
  reasonShort: string;
  tags: string[];
  macros?: MacroTotals;
  matchPercent?: number;
  warningLabel?: string;
};
export type MealEntry = {
  id: string;
  createdAt: string;
  title: string;
  macros: MacroTotals;
  notes?: string;
  source: 'photo' | 'text';
  imageUri?: string;
};
export type TrialState = {
  firstResultAt?: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  isPremium: boolean;
  scansUsedTodayCount: number;
  scansUsedTodayDate?: string;
};
export type ChatMessage = { id: string; role: 'system' | 'user' | 'assistant'; text: string; createdAt: string; sourceKey?: string };

/** AI-computed daily nutrition targets for the user. Recalculated whenever baseParams change. */
export type NutritionTargets = {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  bmrKcal: number;
  tdeeKcal: number;
  assumptions: { ageUsed: number; activityMult: number };
  computedAt: string;
};
