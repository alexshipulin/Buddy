import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Allergy, DietaryPreference } from '../domain/models';
import { userRepo } from '../services/container';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../ui/components/Chip';
import { BottomCTA, getCTATotalHeight } from '../ui/components/BottomCTA';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { layout } from '../design/layout';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'DietaryProfile'>;
const preferences: DietaryPreference[] = ['Vegan or vegetarian', 'Pescatarian', 'Semi-vegetarian', 'Gluten-free', 'Lactose-free', 'Keto', 'Paleo (whole foods)'];
const allergies: Allergy[] = ['Milk', 'Eggs', 'Fish', 'Crustacean shellfish (shrimp, crab, lobster)', 'Tree nuts (almonds, walnuts, cashews)', 'Peanuts', 'Wheat', 'Soy', 'Sesame', 'Celery', 'Lupin', 'Molluscs (squid, mussels, snails)', 'Mustard', 'Sulphites'];
const DISLIKES_PRESET = ['Avocado', 'Mushrooms', 'Olives', 'Cilantro', 'Onions'];

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = getCTATotalHeight(insets.bottom) + spec.spacing[12];
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

  return (
    <Screen hasBottomCTA>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <View style={styles.stepIndicator}>
          <View style={styles.dot} /><View style={styles.dot} /><View style={styles.dotActive} /><View style={styles.dot} />
        </View>
        <View style={[styles.headerSpacer, styles.headerSpacerRight]}>
          <Pressable onPress={goHome} hitSlop={8} style={styles.skipWrap}>
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
      <BottomCTA>
        <PrimaryButton title="Save" onPress={onSave} />
      </BottomCTA>

      <Modal visible={addOtherVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOtherVisible(false)}>
          <Pressable style={styles.addOtherModal} onPress={() => undefined}>
            <Text style={styles.addOtherModalTitle}>Add dislike</Text>
            <TextInput
              style={styles.addOtherInput}
              placeholder="e.g. Broccoli"
              placeholderTextColor={appTheme.colors.placeholder}
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spec.spacing[20] },
  addOtherModal: { backgroundColor: appTheme.colors.surface, borderRadius: spec.cardRadius, padding: spec.cardPadding, gap: spec.spacing[16], ...appTheme.shadows.modal },
  addOtherModalTitle: { ...typography.h2 },
  addOtherInput: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: spec.inputRadius, paddingHorizontal: spec.inputPaddingX, paddingVertical: spec.spacing[12], fontSize: appTheme.typography.body.fontSize, minHeight: spec.inputHeight },
  addOtherModalActions: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[16] },
  addOtherModalBtn: { flex: 1 },
  addOtherCancel: { color: appTheme.colors.muted, ...appTheme.typography.bodySemibold },
});
