export type Goal = 'Lose fat' | 'Maintain weight' | 'Gain muscle';
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

export type UserProfile = {
  goal: Goal;
  dietaryPreferences: DietaryPreference[];
  allergies: Allergy[];
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
export type DishRecommendation = { name: string; reasonShort: string; tags: string[] };
export type MenuScanResult = {
  id: string;
  createdAt: string;
  inputImages: string[];
  topPicks: DishRecommendation[];
  caution: DishRecommendation[];
  avoid: DishRecommendation[];
  summaryText: string;
  disclaimerFlag: true;
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
