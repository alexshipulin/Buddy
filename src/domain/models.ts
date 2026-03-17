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

export type DishQualityFlags = {
  leanProtein?: boolean;
  veggieForward?: boolean;
  wholeFood?: boolean;
  fried?: boolean;
  dessert?: boolean;
  sugaryDrink?: boolean;
  refinedCarbHeavy?: boolean;
  highFatSauce?: boolean;
  processed?: boolean;
};

export type DishAllergenSignals = {
  contains?: string[];
  unclear?: boolean;
  noListedAllergen?: boolean;
};

export type DishDislikeSignals = {
  containsDislikedIngredient?: boolean;
  removableDislikedIngredients?: string[];
};

export type DishConstructorMeta = {
  isCustom?: boolean;
  components?: string[];
};

/** Flat extraction object returned by AI before deterministic app-side ranking. */
export type ExtractedDish = {
  id?: string;
  name: string;
  menuSection?: string | null;
  shortDescription?: string | null;
  estimatedCalories: number | null;
  estimatedProteinG: number | null;
  estimatedCarbsG: number | null;
  estimatedFatG: number | null;
  confidencePercent: number;
  dietBadges?: string[];
  flags?: DishQualityFlags;
  allergenSignals?: DishAllergenSignals;
  dislikes?: DishDislikeSignals;
  constructorMeta?: DishConstructorMeta;
};

export type MenuExtractionResponse = {
  dishes: ExtractedDish[];
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

export type PinVariant = 'positive' | 'risk';

export type DishPin = {
  label: string;
  variant: PinVariant;
};

export type MenuScanResult = {
  id: string;
  /** Sequential local analysis id used for debugging and support. */
  analysisId?: number;
  /** Raw extraction used for deterministic app-side ranking (v2+). */
  extractedDishes?: ExtractedDish[];
  /** Version marker for recommendation pipeline. */
  recommendationVersion?: number;
  createdAt: string;
  inputImages: string[];
  /** Backward-compat grouped buckets for old screens/history payloads. */
  topPicks: DishPick[];
  caution: DishPick[];
  avoid: DishPick[];
  topPlaceholderReason?: string;
  summaryText: string;
  disclaimerFlag: true;
};

/** Legacy / other flows. Prefer DishPick for menu scan results. */
export type DishRecommendation = {
  name: string;
  reasonShort: string;
  contextNote?: string;
  pins: DishPin[];
  nutrition?: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
};
export type MealEntry = {
  id: string;
  /** Sequential local analysis id used for debugging and support. */
  analysisId?: number;
  createdAt: string;
  title: string;
  macros: MacroTotals;
  notes?: string;
  source: 'photo' | 'text';
  imageUri?: string;
  pins?: string[];
  riskPins?: string[];
  dietBadges?: string[];
  confidencePercent?: number;
  allergenNote?: string | null;
  noLine?: string | null;
  quickFix?: string | null;
  menuSection?: 'top' | 'caution' | 'avoid';
};
export type TrialState = {
  firstResultAt?: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  isPremium: boolean;
  scansUsedTodayCount: number;
  scansUsedTodayDate?: string;
  /** Timestamp (ms) until which AI quota is considered exhausted (429 across all models). */
  aiQuotaExhaustedUntil?: number;
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
