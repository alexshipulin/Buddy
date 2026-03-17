import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../app/navigation/types';
import { TEST_MODE } from '../config/flags';
import { MealEntry } from '../domain/models';
import { analyzeMealPhoto } from '../services/aiService';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { MacroBar } from '../ui/components/MacroBar';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackMeal'>;
type Mode = 'photo' | 'text';

function toStableMacros(seedText: string): { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number } {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) hash = (hash * 31 + seedText.charCodeAt(i)) % 997;
  return { caloriesKcal: 430 + (hash % 80), proteinG: 28 + (hash % 10), carbsG: 35 + (hash % 12), fatG: 13 + (hash % 7) };
}

function normalizeLine(value?: string | null): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : null;
}

function buildMealReason(meal: MealEntry): string {
  const fromNotes = normalizeLine(meal.notes);
  if (fromNotes) return fromNotes;
  if (meal.menuSection) return 'Logged from menu analysis.';
  if (meal.source === 'photo') return 'Logged from meal photo.';
  return 'Logged meal.';
}

export function TrackMealScreen({ navigation, route }: Props): React.JSX.Element {
  const isReadOnly = Boolean(route.params?.readOnly);
  const [mealDetails, setMealDetails] = React.useState<MealEntry | null>(null);
  const [detailsState, setDetailsState] = React.useState<'idle' | 'loading' | 'ready' | 'missing'>(
    route.params?.mealId ? 'loading' : 'idle'
  );
  const [mode, setMode] = React.useState<Mode>('photo');
  const [titleInput, setTitleInput] = React.useState('');
  const [descriptionInput, setDescriptionInput] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { void (async () => {
    if (!route.params?.mealId) return;
    setDetailsState('loading');
    const meal = await historyRepo.getMealById(route.params.mealId);
    if (!meal) {
      setMealDetails(null);
      setDetailsState('missing');
      return;
    }
    setMealDetails(meal);
    setDetailsState('ready');
  })(); }, [route.params?.mealId]);
  const saveMeal = async (source: 'photo' | 'text'): Promise<void> => {
    setSaving(true);
    const title = titleInput.trim() || 'Meal';
    const mealId = createId('meal');
    let macros = toStableMacros(`${title}-${descriptionInput}-${source}`);
    let notes = source === 'text' ? normalizeLine(descriptionInput) ?? undefined : undefined;

    if (source === 'photo' && imageUri && TEST_MODE) {
      try {
        const analysis = await analyzeMealPhoto(imageUri);
        macros = analysis.macros;
        notes = normalizeLine(analysis.description) ?? undefined;
      } catch (error) {
        console.warn('AI meal analysis failed, using fallback:', error);
      }
    }

    if (source === 'photo' && !notes) {
      notes = 'Logged from meal photo.';
    }

    try {
      await addMealUseCase({
        id: mealId,
        createdAt: new Date().toISOString(),
        title,
        source,
        imageUri,
        notes,
        macros,
      }, { historyRepo });
      await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${title}. Today updated.`);
      Alert.alert('Saved');
      setTitleInput('');
      setDescriptionInput('');
      setImageUri(undefined);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen keyboardAvoiding={!isReadOnly} scroll={isReadOnly}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{isReadOnly ? 'Meal details' : 'Track meal'}</Text>
        {isReadOnly ? (
          detailsState === 'missing' ? (
            <Card><Text style={styles.cardTitle}>Meal not found</Text><Text style={styles.infoText}>This meal may have been removed from history.</Text></Card>
          ) : detailsState !== 'ready' || !mealDetails ? (
            <Card><Text style={styles.cardTitle}>Loading...</Text></Card>
          ) : (
            <Card style={styles.detailsCard}>
              <Text style={styles.detailsName} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {mealDetails.title}
              </Text>
              <Text style={styles.detailsReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                {buildMealReason(mealDetails)}
              </Text>
              <MacroBar
                calories={mealDetails.macros.caloriesKcal}
                proteinG={mealDetails.macros.proteinG}
                carbsG={mealDetails.macros.carbsG}
                fatG={mealDetails.macros.fatG}
              />
              {typeof mealDetails.confidencePercent === 'number' && (mealDetails.riskPins?.length ?? 0) === 0 ? (
                <View style={styles.confidenceRow}>
                  <View style={styles.confidenceChip}>
                    <Text style={styles.confidenceChipText} maxFontSizeMultiplier={1.2}>
                      {mealDetails.confidencePercent}% confidence
                    </Text>
                  </View>
                  {mealDetails.confidencePercent >= 70 ? (
                    <Text style={styles.highConfidenceText} maxFontSizeMultiplier={1.2}>High confidence</Text>
                  ) : null}
                </View>
              ) : null}
              {(mealDetails.pins?.length || mealDetails.riskPins?.length || mealDetails.dietBadges?.length) ? (
                <View style={styles.chipsRow}>
                  {(mealDetails.riskPins?.length ?? 0) > 0 ? (
                    <>
                      {(mealDetails.riskPins ?? []).map((pin) => (
                        <Chip
                          key={`meal_risk_${pin}`}
                          label={pin}
                          small
                          variant={mealDetails.menuSection === 'avoid' ? 'danger' : 'warning'}
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      {(mealDetails.pins ?? []).map((pin) => (
                        <Chip key={`meal_pin_${pin}`} label={pin} small />
                      ))}
                      {(mealDetails.dietBadges ?? []).map((badge) => (
                        <Chip key={`meal_diet_${badge}`} label={badge} small />
                      ))}
                    </>
                  )}
                </View>
              ) : null}
              {normalizeLine(mealDetails.quickFix) ? (
                <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>
                  Suggested change: {normalizeLine(mealDetails.quickFix)}
                </Text>
              ) : null}
              {normalizeLine(mealDetails.allergenNote) ? (
                <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{normalizeLine(mealDetails.allergenNote)}</Text>
              ) : null}
              {normalizeLine(mealDetails.noLine) ? (
                <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{normalizeLine(mealDetails.noLine)}</Text>
              ) : null}
            </Card>
          )
        ) : (
          <>
            <Text style={styles.subtitle}>Log what you ate</Text>
            <View style={styles.segmented}>
              <Pressable style={[styles.segmentBtn, mode === 'photo' && styles.segmentBtnActive]} onPress={() => setMode('photo')}><Text style={[styles.segmentText, mode === 'photo' && styles.segmentTextActive]}>Photo</Text></Pressable>
              <Pressable style={[styles.segmentBtn, mode === 'text' && styles.segmentBtnActive]} onPress={() => setMode('text')}><Text style={[styles.segmentText, mode === 'text' && styles.segmentTextActive]}>Text</Text></Pressable>
            </View>
            {mode === 'photo' ? (
              <View style={styles.formCard}>
                <Pressable style={styles.cameraPlaceholder} onPress={() => void ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : (
                    <View style={styles.placeholderCenter}>
                      <AppIcon name="camera" size={22} />
                      <Text style={styles.placeholderText}>Take a photo of your meal</Text>
                    </View>
                  )}
                </Pressable>
                <SecondaryButton title="Import" onPress={() => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))} />
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
              </View>
            ) : (
              <View style={styles.formCard}>
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
                <TextInput style={styles.textArea} multiline placeholder="Describe your meal. Example: chicken salad with olive oil." value={descriptionInput} onChangeText={setDescriptionInput} />
              </View>
            )}
            <View style={styles.bottomActions}>
              <PrimaryButton title="Add Meal" loading={saving} onPress={() => void saveMeal(mode)} disabled={saving || (mode === 'photo' ? !imageUri : !descriptionInput.trim())} />
              <SecondaryButton title="Cancel" disabled={saving} onPress={() => navigation.goBack()} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: uiTheme.spacing.md },
  title: { ...typography.h2 },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEEF2', borderRadius: uiTheme.radius.sm, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: uiTheme.radius.sm, paddingVertical: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: uiTheme.colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: uiTheme.colors.textPrimary, fontWeight: '700' },
  formCard: { gap: uiTheme.spacing.sm },
  cameraPlaceholder: { minHeight: 280, borderRadius: uiTheme.radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden' },
  placeholderCenter: { alignItems: 'center', gap: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 17 },
  previewImage: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  bottomActions: { marginTop: 'auto', gap: uiTheme.spacing.sm },
  cardTitle: { ...typography.h3, color: appTheme.colors.textPrimary },
  infoText: { marginTop: uiTheme.spacing.sm, color: uiTheme.colors.textSecondary, fontSize: 17 },
  detailsCard: { gap: spec.spacing[12] },
  detailsName: {
    ...typography.title3,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailsReason: {
    ...typography.body,
    color: appTheme.colors.textSecondary,
    lineHeight: 22,
  },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8] },
  confidenceChip: {
    backgroundColor: appTheme.colors.successSoft,
    paddingHorizontal: spec.spacing[12],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.radius.input,
  },
  confidenceChipText: {
    fontSize: appTheme.typography.caption1.fontSize,
    fontWeight: '700',
    color: appTheme.colors.success,
  },
  highConfidenceText: {
    ...typography.footnote,
    color: appTheme.colors.success,
    fontWeight: '600',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  extraLine: {
    ...typography.footnote,
    color: appTheme.colors.textSecondary,
  },
});
