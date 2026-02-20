import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { Allergy, DietaryPreference } from '../domain/models';
import { userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const allergies: Allergy[] = ['Milk', 'Eggs', 'Fish', 'Crustacean shellfish (shrimp, crab, lobster)', 'Tree nuts (almonds, walnuts, cashews)', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Celery', 'Lupin', 'Molluscs (squid, mussels, snails)', 'Mustard', 'Sulphites'];
const DISLIKES_PRESET = ['Avocado', 'Mushrooms', 'Olives', 'Cilantro', 'Onions'];

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const [selectedPreferences, setSelectedPreferences] = React.useState<DietaryPreference[]>([]);
  const [selectedAllergies, setSelectedAllergies] = React.useState<Allergy[]>([]);
  const [selectedDislikes, setSelectedDislikes] = React.useState<string[]>([]);
  const [customDislikes, setCustomDislikes] = React.useState<string[]>([]);
  const [addOtherVisible, setAddOtherVisible] = React.useState(false);
  const [addOtherInput, setAddOtherInput] = React.useState('');

  const togglePref = (v: DietaryPreference): void => setSelectedPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleAllergy = (v: Allergy): void => setSelectedAllergies((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleDislike = (v: string): void => setSelectedDislikes((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const addCustomDislike = (): void => {
    const trimmed = addOtherInput.trim();
    if (trimmed && !customDislikes.includes(trimmed) && !DISLIKES_PRESET.includes(trimmed)) {
      setCustomDislikes((prev) => [...prev, trimmed]);
      setSelectedDislikes((prev) => [...prev, trimmed]);
      setAddOtherInput('');
      setAddOtherVisible(false);
    }
  };

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  const onSave = async (): Promise<void> => {
    const user = await userRepo.getUser();
    if (!user) return navigation.replace('GoalSelection');
    await userRepo.saveUser({ ...user, dietaryPreferences: selectedPreferences, allergies: selectedAllergies });
    goHome();
  };

  const allDislikes = [...DISLIKES_PRESET, ...customDislikes];

  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <ScreenHeader leftLabel="Goal" title="Dietary profile" onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <View style={[styles.stepIndicator, { marginTop: spec.stepMarginTop, marginBottom: spec.stepMarginBottom }]}>
          <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} />
        </View>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>Dietary profile</Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Optional. You can change this later.</Text>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Diet preferences</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedPreferences.length === 0} onPress={() => setSelectedPreferences([])} />
            {preferences.map((pref) => <Chip key={pref} label={pref} selected={selectedPreferences.includes(pref)} onPress={() => togglePref(pref)} />)}
          </View>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Common allergies</Text>
          <View style={styles.chipsWrap}>
            <Chip label="None" selected={selectedAllergies.length === 0} onPress={() => setSelectedAllergies([])} />
            {allergies.slice(0, 8).map((allergy) => <Chip key={allergy} label={allergy} selected={selectedAllergies.includes(allergy)} onPress={() => toggleAllergy(allergy)} />)}
          </View>
          <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Dislikes</Text>
          <View style={styles.chipsWrap}>
            {allDislikes.map((label) => (
              <Chip key={label} label={label} selected={selectedDislikes.includes(label)} onPress={() => toggleDislike(label)} />
            ))}
            <Pressable style={styles.addOther} onPress={() => setAddOtherVisible(true)}>
              <Text style={styles.addOtherText}>+ Add other</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={[styles.actions, { paddingBottom: insets.bottom + spec.screenPaddingBottomOffset }]}>
          <PrimaryButton title="Save" onPress={onSave} />
          <Pressable onPress={goHome}><Text style={styles.skip} maxFontSizeMultiplier={1.2}>Skip</Text></Pressable>
        </View>
      </View>

      <Modal visible={addOtherVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOtherVisible(false)}>
          <Pressable style={styles.addOtherModal} onPress={() => undefined}>
            <Text style={styles.addOtherModalTitle}>Add dislike</Text>
            <TextInput
              style={styles.addOtherInput}
              placeholder="e.g. Broccoli"
              value={addOtherInput}
              onChangeText={setAddOtherInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.addOtherModalActions}>
              <PrimaryButton title="Add" onPress={addCustomDislike} style={styles.addOtherModalBtn} />
              <Pressable onPress={() => { setAddOtherVisible(false); setAddOtherInput(''); }}>
                <Text style={styles.addOtherCancel}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 0 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spec.stepGap },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { width: spec.stepActiveWidth, height: spec.stepActiveHeight, borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  title: { ...typography.h1, marginTop: 0 },
  subtitle: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[8] },
  content: { gap: spec.spacing[12], paddingBottom: spec.spacing[24] },
  sectionTitle: { ...typography.h2, marginTop: spec.spacing[24] },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[12] },
  addOther: {
    minHeight: spec.chipHeight,
    borderRadius: spec.chipRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: spec.chipPaddingX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOtherText: { color: appTheme.colors.muted, fontSize: appTheme.typography.body.fontSize, fontWeight: '500' },
  actions: { marginTop: 'auto', gap: spec.spacing[12] },
  skip: { textAlign: 'center', color: appTheme.colors.muted, ...appTheme.typography.bodySemibold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spec.spacing[20] },
  addOtherModal: { backgroundColor: appTheme.colors.surface, borderRadius: spec.cardRadius, padding: spec.cardPadding, gap: spec.spacing[16] },
  addOtherModalTitle: { ...typography.h2 },
  addOtherInput: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: spec.inputRadius, paddingHorizontal: spec.inputPaddingX, paddingVertical: spec.spacing[12], fontSize: appTheme.typography.body.fontSize, minHeight: spec.inputHeight },
  addOtherModalActions: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[16] },
  addOtherModalBtn: { flex: 1 },
  addOtherCancel: { color: appTheme.colors.muted, ...appTheme.typography.bodySemibold },
});
