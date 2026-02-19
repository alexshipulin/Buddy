import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Chip } from '../components/Chip';
import { PrimaryButton } from '../components/PrimaryButton';
import { appTheme } from '../design/theme';
import { Allergy, DietaryPreference } from '../domain/models';
import { userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const allergies: Allergy[] = ['Milk', 'Eggs', 'Fish', 'Crustacean shellfish (shrimp, crab, lobster)', 'Tree nuts (almonds, walnuts, cashews)', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Celery', 'Lupin', 'Molluscs (squid, mussels, snails)', 'Mustard', 'Sulphites'];

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const [selectedPreferences, setSelectedPreferences] = React.useState<DietaryPreference[]>([]);
  const [selectedAllergies, setSelectedAllergies] = React.useState<Allergy[]>([]);
  const togglePref = (v: DietaryPreference): void => setSelectedPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleAllergy = (v: Allergy): void => setSelectedAllergies((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  const onSave = async (): Promise<void> => {
    const user = await userRepo.getUser();
    if (!user) return navigation.replace('GoalSelection');
    await userRepo.saveUser({ ...user, dietaryPreferences: selectedPreferences, allergies: selectedAllergies });
    goHome();
  };
  return (
    <AppScreen scroll>
      <View style={styles.wrap}>
        <View style={styles.progress}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} /></View>
        <Text style={styles.title}>Dietary profile</Text>
        <Text style={styles.subtitle}>Optional. You can change this later.</Text>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Diet preferences</Text>
          <View style={styles.chipsWrap}>
            <Pressable onPress={() => setSelectedPreferences([])} style={[styles.choiceChip, selectedPreferences.length === 0 && styles.choiceChipSelected]}>
              <Chip label="None" selected={selectedPreferences.length === 0} />
            </Pressable>
            {preferences.map((pref) => {
              const selected = selectedPreferences.includes(pref);
              return (
                <Pressable key={pref} onPress={() => togglePref(pref)} style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
                  <Chip label={pref} selected={selected} />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionTitle}>Common allergies</Text>
          <View style={styles.chipsWrap}>
            <Pressable onPress={() => setSelectedAllergies([])} style={[styles.choiceChip, selectedAllergies.length === 0 && styles.choiceChipSelected]}>
              <Chip label="None" selected={selectedAllergies.length === 0} />
            </Pressable>
            {allergies.map((allergy) => {
              const selected = selectedAllergies.includes(allergy);
              return (
                <Pressable key={allergy} onPress={() => toggleAllergy(allergy)} style={[styles.choiceChip, selected && styles.choiceChipSelected]}>
                  <Chip label={allergy} selected={selected} />
                </Pressable>
              );
            })}
          </View>
        </View>
        <PrimaryButton title="Save" onPress={onSave} />
        <Pressable onPress={goHome}><Text style={styles.skip}>Skip</Text></Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.md },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 28, height: 6, borderRadius: 6, backgroundColor: '#111827' },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '800' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
  content: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.md },
  sectionTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3, fontWeight: '700' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm },
  choiceChip: { borderRadius: appTheme.radius.pill, borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: '#F9FAFB' },
  choiceChipSelected: { borderColor: '#111827', backgroundColor: '#0F172A' },
  skip: { textAlign: 'center', color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body, fontWeight: '700' },
});
