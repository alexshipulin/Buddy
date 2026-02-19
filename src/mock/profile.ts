import { ActivityLevel, Sex, UserProfile } from '../domain/models';

export const mockProfile: UserProfile = {
  goal: 'Lose fat',
  dietaryPreferences: ['Gluten-free'],
  allergies: ['Eggs'],
  baseParams: {
    heightCm: 175,
    weightKg: 72,
    age: 28,
    sex: 'Male',
    activityLevel: 'Low',
  },
};

export const mockProfileMeta: {
  accountStatus: 'Guest' | 'Premium';
  trialText: string;
  sexOptions: Sex[];
  activityOptions: ActivityLevel[];
} = {
  accountStatus: 'Guest',
  trialText: '5 of 7 days left',
  sexOptions: ['Male', 'Female', 'Other', 'Prefer not to say'],
  activityOptions: ['Low', 'Medium', 'High'],
};
