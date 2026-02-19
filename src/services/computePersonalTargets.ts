import { MacroTotals, UserProfile } from '../domain/models';

function activityMultiplier(level: 'Low' | 'Medium' | 'High'): number {
  if (level === 'Low') return 1.3;
  if (level === 'Medium') return 1.5;
  return 1.7;
}

export function computePersonalTargets(user: UserProfile): MacroTotals | null {
  if (!user.baseParams) return null;
  const { heightCm, weightKg, age, activityLevel, sex } = user.baseParams;
  const ageVal = age ?? 30;
  const sexOffset = sex === 'Female' ? -161 : 5;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageVal + sexOffset;
  const maintenanceKcal = bmr * activityMultiplier(activityLevel);
  let target = maintenanceKcal;
  if (user.goal === 'Lose fat') target -= 350;
  if (user.goal === 'Gain muscle') target += 250;
  const caloriesKcal = Math.max(1200, Math.round(target));
  const proteinG = Math.round(weightKg * (user.goal === 'Gain muscle' ? 2 : 1.8));
  const fatG = Math.round((caloriesKcal * 0.28) / 9);
  const carbsG = Math.round((caloriesKcal - proteinG * 4 - fatG * 9) / 4);
  return { caloriesKcal, proteinG, carbsG, fatG };
}
