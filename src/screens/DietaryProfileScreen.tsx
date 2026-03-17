import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { ALLERGY_OPTIONS, Allergy, DietaryPreference, Goal } from '../domain/models';
import { appPrefsRepo, userRepo } from '../services/container';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../ui/components/Chip';
import { BottomCTA, getCTATotalHeight } from '../ui/components/BottomCTA';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { layout } from '../design/layout';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

const DISLIKES_OPTIONS = [
  'Spicy', 'Avocado', 'Coriander', 'Mushrooms', 'Onions',
  'Garlic', 'Olives', 'Seafood', 'Mayonnaise', 'Tomatoes',
];

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const goals: Goal[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = getCTATotalHeight(insets.bottom) + spec.spacing[12] / 2;
  const [selectedPreferences, setSelectedPreferences] = React.useState<DietaryPreference[]>([]);
  const [selectedAllergies, setSelectedAllergies] = React.useState<Allergy[]>([]);
  const [selectedDislikes, setSelectedDislikes] = React.useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal>('Maintain weight');
  const toggleDislike = (v: string): void =>
    setSelectedDislikes((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  React.useEffect(() => {
    void (async () => {
      const user = await userRepo.getUser();
      if (user) {
        if (user.goal) setSelectedGoal(user.goal);
        if (user.dietaryPreferences?.length) setSelectedPreferences(user.dietaryPreferences);
        if (user.allergies?.length) {
          const allowed = user.allergies.filter((a) => ALLERGY_OPTIONS.includes(a));
          if (allowed.length) setSelectedAllergies(allowed);
        }
        if (user.dislikes?.length) setSelectedDislikes(user.dislikes);
      }
    })();
  }, []);

  const togglePref = (v: DietaryPreference): void => setSelectedPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleAllergy = (v: Allergy): void => setSelectedAllergies((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const goHome = async (): Promise<void> => {
    await appPrefsRepo.markOnboardingCompleted();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };
  const onSave = async (): Promise<void> => {
    const user = (await userRepo.getUser()) ?? {
      goal: 'Maintain weight' as Goal,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
    };
    await userRepo.saveUser({
      ...user,
      goal: selectedGoal,
      dietaryPreferences: selectedPreferences,
      allergies: selectedAllergies,
      dislikes: selectedDislikes,
    });
    await goHome();
  };

  return (
    <Screen safeBottom={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <View style={styles.stepIndicator}>
          <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} />
        </View>
        <View style={[styles.headerSpacer, styles.headerSpacerRight]}>
          <Pressable onPress={() => { void goHome(); }} hitSlop={8} style={styles.skipWrap}>
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>Skip</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>Dietary profile</Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Optional. You can change this later.</Text>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Main goal</Text>
        <View style={styles.chipsWrap}>
          {goals.map((goal) => (
            <Chip
              key={goal}
              label={goal}
              selected={selectedGoal === goal}
              onPress={() => setSelectedGoal(goal)}
            />
          ))}
        </View>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>I don't like</Text>
        <View style={styles.chipsWrap}>
          <Pressable onPress={() => setSelectedDislikes([])}>
            <Chip label="None" selected={selectedDislikes.length === 0} />
          </Pressable>
          {DISLIKES_OPTIONS.map((item) => {
            const selected = selectedDislikes.includes(item);
            return (
              <Pressable key={item} onPress={() => toggleDislike(item)}>
                <Chip label={item} selected={selected} />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Diet preferences</Text>
        <View style={styles.chipsWrap}>
          <Chip label="None" selected={selectedPreferences.length === 0} onPress={() => setSelectedPreferences([])} />
          {preferences.map((pref) => <Chip key={pref} label={pref} selected={selectedPreferences.includes(pref)} onPress={() => togglePref(pref)} />)}
        </View>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Common allergies</Text>
        <View style={styles.chipsWrap}>
          <Chip label="None" selected={selectedAllergies.length === 0} onPress={() => setSelectedAllergies([])} />
          {ALLERGY_OPTIONS.map((allergy) => (
            <Chip key={allergy} label={allergy} selected={selectedAllergies.includes(allergy)} onPress={() => toggleAllergy(allergy)} />
          ))}
        </View>
      </ScrollView>
      <BottomCTA>
        <PrimaryButton title="Save" onPress={onSave} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** No white bar: transparent so no separate background (Figma) */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: layout.topContentOffset + spec.stepMarginTop,
    paddingBottom: spec.stepMarginBottom,
    backgroundColor: 'transparent',
  },
  headerSpacer: { flex: 1 },
  headerSpacerRight: { alignItems: 'flex-end' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: spec.stepGap },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { width: spec.stepActiveWidth, height: spec.stepActiveHeight, borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  skipWrap: { minWidth: spec.minTouchTarget, minHeight: spec.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: spec.headerPillFontSize, fontWeight: '600', color: appTheme.colors.muted },
  scroll: { flex: 1 },
  scrollContent: { gap: spec.spacing[12] },
  title: { ...typography.h1, marginTop: 0 },
  subtitle: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[8] },
  sectionTitle: { ...typography.h2, marginTop: spec.spacing[24] },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[12] },
});
