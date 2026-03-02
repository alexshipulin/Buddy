import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { ALLERGY_OPTIONS, Allergy, DietaryPreference } from '../domain/models';
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

function normalizeDislikeKey(s: string): string {
  return s.trim().toLowerCase();
}

export function DietaryProfileScreen({ navigation }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = getCTATotalHeight(insets.bottom) + spec.spacing[12];
  const [selectedPreferences, setSelectedPreferences] = React.useState<DietaryPreference[]>([]);
  const [selectedAllergies, setSelectedAllergies] = React.useState<Allergy[]>([]);
  const [dislikes, setDislikes] = React.useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = React.useState('');

  React.useEffect(() => {
    void (async () => {
      const user = await userRepo.getUser();
      // #region agent log
      fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'DietaryProfileScreen.tsx:useEffect',message:'user loaded',hypothesisId:'D',data:{hasUser:!!user,goal:user?.goal,prefsCount:user?.dietaryPreferences?.length??0,allergiesCount:user?.allergies?.length??0,dislikesCount:user?.dislikes?.length??0,dislikes:user?.dislikes??[]},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (user) {
        if (user.dietaryPreferences?.length) setSelectedPreferences(user.dietaryPreferences);
        if (user.allergies?.length) {
          const allowed = user.allergies.filter((a) => ALLERGY_OPTIONS.includes(a));
          if (allowed.length) setSelectedAllergies(allowed);
        }
        if (user.dislikes?.length) setDislikes(user.dislikes);
      }
    })();
  }, []);

  const togglePref = (v: DietaryPreference): void => setSelectedPreferences((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleAllergy = (v: Allergy): void => setSelectedAllergies((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const addDislike = (): void => {
    const trimmed = dislikeInput.trim();
    if (!trimmed) return;
    const key = normalizeDislikeKey(trimmed);
    if (dislikes.some((d) => normalizeDislikeKey(d) === key)) return;
    setDislikes((prev) => [...prev, trimmed]);
    setDislikeInput('');
  };
  const removeDislike = (item: string): void => setDislikes((prev) => prev.filter((d) => d !== item));

  const goHome = (): void => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  const onSave = async (): Promise<void> => {
    const user = await userRepo.getUser();
    if (!user) return navigation.replace('GoalSelection');
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'DietaryProfileScreen.tsx:onSave',message:'saving profile',hypothesisId:'D',data:{goal:user.goal,prefs:selectedPreferences,allergies:selectedAllergies,dislikes,dislikesCount:dislikes.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await userRepo.saveUser({
      ...user,
      dietaryPreferences: selectedPreferences,
      allergies: selectedAllergies,
      dislikes,
    });
    goHome();
  };

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
          {ALLERGY_OPTIONS.map((allergy) => (
            <Chip key={allergy} label={allergy} selected={selectedAllergies.includes(allergy)} onPress={() => toggleAllergy(allergy)} />
          ))}
        </View>
        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>Dislikes</Text>
        <View style={styles.dislikeRow}>
          <TextInput
            style={styles.dislikeInput}
            placeholder="Add an ingredient you dislike"
            placeholderTextColor={appTheme.colors.placeholder}
            value={dislikeInput}
            onChangeText={setDislikeInput}
            onSubmitEditing={addDislike}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.addDislikeBtn} onPress={addDislike}>
            <Text style={styles.addDislikeBtnText}>Add</Text>
          </Pressable>
        </View>
        <View style={styles.chipsWrap}>
          {dislikes.map((label) => (
            <View key={label} style={styles.removableChip}>
              <Text style={styles.removableChipText} numberOfLines={1}>{label}</Text>
              <Pressable hitSlop={8} onPress={() => removeDislike(label)} style={styles.removeChipBtn}>
                <Text style={styles.removeChipIcon}>×</Text>
              </Pressable>
            </View>
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
  dislikeRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginTop: spec.spacing[4] },
  dislikeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: spec.inputRadius,
    paddingHorizontal: spec.inputPaddingX,
    paddingVertical: spec.spacing[12],
    fontSize: appTheme.typography.body.fontSize,
    minHeight: spec.inputHeight,
    color: appTheme.colors.textPrimary,
  },
  addDislikeBtn: {
    minHeight: spec.inputHeight,
    paddingHorizontal: spec.spacing[16],
    justifyContent: 'center',
    borderRadius: spec.inputRadius,
    backgroundColor: appTheme.colors.ink,
  },
  addDislikeBtnText: { ...typography.bodySemibold, color: appTheme.colors.primaryText },
  removableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: spec.chipHeight,
    paddingLeft: spec.chipPaddingX,
    paddingRight: spec.spacing[4],
    borderRadius: spec.chipRadius,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    maxWidth: '100%',
  },
  removableChipText: { ...typography.caption, color: appTheme.colors.textPrimary, maxWidth: 160 },
  removeChipBtn: { padding: spec.spacing[4], marginLeft: spec.spacing[4] },
  removeChipIcon: { fontSize: 20, color: appTheme.colors.muted, fontWeight: '600' },
});
