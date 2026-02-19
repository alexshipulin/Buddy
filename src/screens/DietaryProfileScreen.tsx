import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Allergy, DietaryPreference } from '../domain/models';
import { userRepo } from '../services/container';
import { AppHeader } from '../ui/components/AppHeader';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const allergies: Allergy[] = ['Milk', 'Eggs', 'Fish', 'Crustacean shellfish (shrimp, crab, lobster)', 'Tree nuts (almonds, walnuts, cashews)', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Celery', 'Lupin', 'Molluscs (squid, mussels, snails)', 'Mustard', 'Sulphites'];
const dislikes = ['Avocado', 'Mushrooms', 'Olives', 'Cilantro', 'Onions'];

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
    <Screen>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <View style={styles.progress}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} /></View>
        <Text style={styles.title}>Dietary profile</Text>
        <Text style={styles.subtitle}>Optional. You can change this later.</Text>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Diet preferences</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedPreferences.length === 0} onPress={() => setSelectedPreferences([])} />
            {preferences.map((pref) => <Chip key={pref} label={pref.replace('Vegan or vegetarian', 'Vegetarian')} selected={selectedPreferences.includes(pref)} onPress={() => togglePref(pref)} />)}
          </View>
          <Text style={styles.sectionTitle}>Common allergies</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedAllergies.length === 0} onPress={() => setSelectedAllergies([])} />
            {allergies.slice(0, 8).map((allergy) => <Chip key={allergy} label={allergy} selected={selectedAllergies.includes(allergy)} onPress={() => toggleAllergy(allergy)} />)}
          </View>
          <Text style={styles.sectionTitle}>Dislikes</Text>
          <View style={styles.chipsWrap}>
            {dislikes.map((label) => <Chip key={label} label={label} />)}
            <Pressable style={styles.addOther}>
              <Text style={styles.addOtherText}>+ Add other</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={styles.actions}>
          <PrimaryButton title="Save" onPress={onSave} />
          <Pressable onPress={goHome}><Text style={styles.skip}>Skip</Text></Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: uiTheme.spacing.md },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 28, height: 6, borderRadius: 6, backgroundColor: '#111827' },
  title: { ...typography.h2 },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  content: { gap: uiTheme.spacing.md, paddingBottom: uiTheme.spacing.lg },
  sectionTitle: { ...typography.h3 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: uiTheme.spacing.sm },
  addOther: {
    minHeight: 42,
    borderRadius: uiTheme.radius.pill,
    borderWidth: 1,
    borderColor: '#D7DCE5',
    borderStyle: 'dashed',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOtherText: { color: '#64748B', fontSize: 16, fontWeight: '500' },
  actions: { marginTop: 'auto', gap: uiTheme.spacing.sm },
  skip: { textAlign: 'center', color: uiTheme.colors.textSecondary, fontSize: 17, fontWeight: '700' },
});
