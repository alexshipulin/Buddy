import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../app/navigation/types';
import { MealEntry } from '../domain/models';
import { analyzeMealPhoto, analyzeMealText } from '../services/aiService';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, dailyNutritionRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Chip } from '../ui/components/Chip';
import { MacroBar } from '../ui/components/MacroBar';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { abortInflight } from '../ai/inflight';
import { nextAnalysisRunId } from '../ai/analysisRunId';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackMeal'>;
type Mode = 'photo' | 'text';

const PHOTO_ANALYZING_MESSAGES = [
  'Recognizing your dish from photo',
  'Estimating calories and macros',
  'Preparing title and badges',
  'Almost ready…',
];

const TEXT_ANALYZING_MESSAGES = [
  'Reading your meal description',
  'Estimating calories and macros',
  'Preparing title and badges',
  'Almost ready…',
];

const LOADING_ORB_SIZE = 120;
const LOADING_GLOW_SIZE = LOADING_ORB_SIZE * 1.9;

function isAbortError(error: unknown): boolean {
  const domExceptionCtor: unknown =
    typeof globalThis !== 'undefined' && 'DOMException' in globalThis
      ? (globalThis as Record<string, unknown>).DOMException
      : undefined;
  const isDomAbort =
    typeof domExceptionCtor === 'function' &&
    error instanceof (domExceptionCtor as typeof Error) &&
    (error as Error).name === 'AbortError';
  if (isDomAbort) return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

function MealAnalyzingOverlay({
  visible,
  mode,
  analysisId,
  onCancel,
}: {
  visible: boolean;
  mode: Mode;
  analysisId?: number | null;
  onCancel: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const orbScale = React.useRef(new Animated.Value(1)).current;
  const textOpacity = React.useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = React.useState(0);
  const messages = mode === 'photo' ? PHOTO_ANALYZING_MESSAGES : TEXT_ANALYZING_MESSAGES;

  React.useEffect(() => {
    if (!visible) return undefined;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.12,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [orbScale, visible]);

  React.useEffect(() => {
    if (!visible) return undefined;
    setMsgIndex(0);
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length, mode, textOpacity, visible]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={[styles.loadingRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.loadingHeader}>
          <Pressable
            style={styles.loadingCancelBtn}
            hitSlop={8}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel meal analysis"
          >
            <View style={styles.loadingCancelCircle}>
              <Text style={styles.loadingCancelIcon}>✕</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.loadingCenter}>
          <View style={styles.loadingOrbContainer}>
            <View style={styles.loadingOrbGlow} />
            <Animated.View style={[styles.loadingOrb, { transform: [{ scale: orbScale }] }]}>
              <View style={styles.loadingOrbHighlight} />
            </Animated.View>
          </View>
          <View style={styles.loadingTextBlock}>
            <Text style={styles.loadingTitle}>Analyzing meal…</Text>
            <Animated.Text style={[styles.loadingSubtitle, { opacity: textOpacity }]}>
              {messages[msgIndex]}
            </Animated.Text>
            {typeof analysisId === 'number' ? (
              <Text style={styles.loadingAnalysisId}>Analysis ID #{analysisId}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.loadingFooter}>
          <Text style={styles.loadingBrand}>BUDDY AI</Text>
        </View>
      </View>
    </Modal>
  );
}

function uniqueStrings(values: string[]): string[] {
  const normalized = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase();
    if (normalized.has(key)) return;
    normalized.add(key);
    result.push(trimmed);
  });
  return result;
}

function deriveMealSignals(params: {
  macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number };
  source: 'photo' | 'text';
  title: string;
  notes?: string;
}): Pick<MealEntry, 'pins' | 'riskPins'> {
  const { macros, source, title, notes } = params;
  const contextText = `${title} ${notes ?? ''}`.toLocaleLowerCase();
  const topPins: string[] = [];
  const riskPins: string[] = [];

  if (macros.proteinG >= 35) topPins.push('High protein');
  if (macros.caloriesKcal <= 600) topPins.push('Portion-aware');
  if (macros.carbsG <= 35) topPins.push('Lower carbs');
  if (macros.fatG <= 20) topPins.push('Lower fat');
  if (contextText.includes('fresh') || contextText.includes('salad') || contextText.includes('veggie')) {
    topPins.push('Fresh');
  }
  if (source === 'photo') topPins.push('Photo-logged');
  if (source === 'text') topPins.push('Text-logged');

  if (macros.caloriesKcal >= 800) riskPins.push('High calories');
  if (macros.carbsG >= 70) riskPins.push('High carbs');
  if (macros.fatG >= 35) riskPins.push('High fat');
  if (macros.proteinG < 20) riskPins.push('Low protein');

  const uniqueTop = uniqueStrings(topPins).slice(0, 4);
  const uniqueRisk = uniqueStrings(riskPins).slice(0, 3);
  return {
    pins: uniqueTop.length > 0 ? uniqueTop : ['Balanced'],
    riskPins: uniqueRisk.length > 0 ? uniqueRisk : undefined,
  };
}

export function TrackMealScreen({ navigation, route }: Props): React.JSX.Element {
  const { showAlert } = useAppAlert();
  const cancelRequestedRef = React.useRef(false);
  const [meal, setMeal] = React.useState<MealEntry | null>(null);
  const [mealLoadError, setMealLoadError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>('photo');
  const [activeAnalysisMode, setActiveAnalysisMode] = React.useState<Mode>('photo');
  const [titleInput, setTitleInput] = React.useState('');
  const [descriptionInput, setDescriptionInput] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = React.useState<number | null>(null);

  const pickFromCamera = React.useCallback(async (): Promise<void> => {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const pickFromLibrary = React.useCallback(async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  React.useEffect(() => { void (async () => {
    if (!route.params?.mealId) return;
    const loadedMeal = await historyRepo.getMealById(route.params.mealId);
    if (!loadedMeal) {
      setMealLoadError('Meal not found');
      setMeal(null);
      return;
    }
    setMealLoadError(null);
    setMeal(loadedMeal);
  })(); }, [route.params?.mealId]);
  const saveMeal = async (source: 'photo' | 'text'): Promise<void> => {
    if (saving) return;
    const imageRequiredMissing = source === 'photo' && !imageUri;
    const textRequiredMissing = source === 'text' && !descriptionInput.trim();
    if (imageRequiredMissing || textRequiredMissing) return;

    cancelRequestedRef.current = false;
    setActiveAnalysisMode(source);
    setSaving(true);
    const analysisId = await nextAnalysisRunId();
    setActiveAnalysisId(analysisId);
    const mealId = createId('meal');
    const userTitle = titleInput.trim();
    const textDescription = descriptionInput.trim();

    try {
      const analysis =
        source === 'photo' && imageUri
          ? await analyzeMealPhoto(imageUri, { analysisId })
          : await analyzeMealText(textDescription || userTitle, { analysisId });
      if (cancelRequestedRef.current) return;

      const finalTitle = userTitle || analysis.title || 'Meal';
      const notes = analysis.shortReason;
      const fallbackSignals = deriveMealSignals({
        macros: analysis.macros,
        source,
        title: finalTitle,
        notes,
      });

      await addMealUseCase({
        id: mealId,
        analysisId: analysis.analysisId ?? analysisId,
        createdAt: new Date().toISOString(),
        title: finalTitle,
        source,
        imageUri,
        notes,
        macros: analysis.macros,
        pins: analysis.pins?.length ? analysis.pins : fallbackSignals.pins,
        riskPins: analysis.riskPins?.length ? analysis.riskPins : fallbackSignals.riskPins,
        dietBadges: analysis.dietBadges,
        confidencePercent: analysis.confidencePercent,
        allergenNote: analysis.allergenNote,
        noLine: analysis.noLine,
        menuSection: analysis.menuSection,
      }, { historyRepo, dailyNutritionRepo });

      await chatRepo.addSystemMessageIfMissing(
        `meal_${mealId}`,
        `Logged: ${finalTitle}. ${analysis.shortReason}`
      );

      setTitleInput('');
      setDescriptionInput('');
      setImageUri(undefined);
      navigation.replace('TrackMeal', { mealId, readOnly: true });
    } catch (error) {
      if (isAbortError(error) || cancelRequestedRef.current) {
        return;
      }
      console.warn('Meal save failed:', error);
      await showAlert({
        title: 'Could not add meal',
        message: `Please try again. Analysis ID #${analysisId}`,
      });
    } finally {
      setSaving(false);
      setActiveAnalysisId(null);
    }
  };
  if (route.params?.readOnly) {
    const fallbackSignals = meal
      ? deriveMealSignals({
          macros: meal.macros,
          source: meal.source,
          title: meal.title,
          notes: meal.notes,
        })
      : null;
    const displayPins = meal?.pins?.length ? meal.pins : (fallbackSignals?.pins ?? []);
    const displayRiskPins = meal?.riskPins?.length ? meal.riskPins : (fallbackSignals?.riskPins ?? []);
    const hasPins = displayPins.length > 0;
    const hasRiskPins = displayRiskPins.length > 0;
    const hasDietBadges = (meal?.dietBadges?.length ?? 0) > 0;
    const riskVariant = meal?.menuSection === 'avoid' ? 'danger' : 'warning';

    return (
      <Screen scroll safeTop={false} contentContainerStyle={styles.screenContent}>
        <ScreenHeader onBack={() => navigation.goBack()} style={{ marginBottom: uiTheme.spacing.md }} />
        <View style={styles.wrap}>
          <Text style={styles.title}>Meal details</Text>
          <View style={styles.readOnlyWrap}>
            {mealLoadError ? <Text style={styles.readOnlyHint}>{mealLoadError}</Text> : null}
            {!meal && !mealLoadError ? <Text style={styles.readOnlyHint}>Loading...</Text> : null}
            {meal ? (
              <>
                {meal.imageUri ? (
                  <Image source={{ uri: meal.imageUri }} style={styles.readOnlyImage} resizeMode="cover" />
                ) : null}
                <Text style={styles.readOnlyTitle} maxFontSizeMultiplier={1.2}>{meal.title}</Text>
                {typeof meal.analysisId === 'number' ? (
                  <Text style={styles.readOnlyAnalysisId} maxFontSizeMultiplier={1.2}>
                    Analysis ID #{meal.analysisId}
                  </Text>
                ) : null}
                {meal.notes ? (
                  <Text
                    style={styles.readOnlyReason}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    ellipsizeMode="clip"
                    maxFontSizeMultiplier={1.2}
                  >
                    {meal.notes}
                  </Text>
                ) : null}
                <MacroBar
                  calories={meal.macros.caloriesKcal}
                  proteinG={meal.macros.proteinG}
                  carbsG={meal.macros.carbsG}
                  fatG={meal.macros.fatG}
                />
                {typeof meal.confidencePercent === 'number' ? (
                  <View style={styles.confidenceRow}>
                    <View style={styles.confidenceChip}>
                      <Text style={styles.confidenceChipText} maxFontSizeMultiplier={1.2}>
                        {meal.confidencePercent}% confidence
                      </Text>
                    </View>
                    {meal.confidencePercent >= 70 ? (
                      <Text style={styles.highConfidenceText} maxFontSizeMultiplier={1.2}>High confidence</Text>
                    ) : null}
                  </View>
                ) : null}
                {(hasPins || hasRiskPins || hasDietBadges) ? (
                  <View style={styles.chipsRow}>
                    {displayPins.map((pin) => (
                      <Chip key={`${meal.id}_pin_${pin}`} label={pin} small />
                    ))}
                    {meal.dietBadges?.map((badge) => (
                      <Chip key={`${meal.id}_diet_${badge}`} label={badge} small />
                    ))}
                    {displayRiskPins.map((pin) => (
                      <Chip key={`${meal.id}_risk_${pin}`} label={pin} small variant={riskVariant} />
                    ))}
                  </View>
                ) : null}
                {meal.allergenNote != null && meal.allergenNote !== 'Allergen safe' ? (
                  <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{meal.allergenNote}</Text>
                ) : null}
                {meal.noLine != null ? (
                  <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{meal.noLine}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.screenContent}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Enter meal</Text>
        {
          <>
            <Text style={styles.subtitle}>Log what you ate</Text>
            <View style={styles.segmented}>
              <Pressable
                style={[styles.segmentBtn, mode === 'photo' && styles.segmentBtnActive]}
                onPress={() => setMode('photo')}
                disabled={saving}
              >
                <Text style={[styles.segmentText, mode === 'photo' && styles.segmentTextActive]}>Photo</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, mode === 'text' && styles.segmentBtnActive]}
                onPress={() => setMode('text')}
                disabled={saving}
              >
                <Text style={[styles.segmentText, mode === 'text' && styles.segmentTextActive]}>Text</Text>
              </Pressable>
            </View>
            {mode === 'photo' ? (
              <View style={styles.formCard}>
                <Pressable
                  style={styles.cameraPlaceholder}
                  onPress={() => void pickFromCamera()}
                  disabled={Boolean(imageUri) || saving}
                >
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" /> : (
                    <View style={styles.placeholderCenter}>
                      <AppIcon name="camera" size={22} />
                      <Text style={styles.placeholderText}>Take a photo of your meal</Text>
                    </View>
                  )}
                </Pressable>
                <View style={styles.photoActions}>
                  {imageUri ? <SecondaryButton title="Retake" onPress={() => void pickFromCamera()} disabled={saving} /> : null}
                  <SecondaryButton title="Import" onPress={() => void pickFromLibrary()} disabled={saving} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Meal name (optional)"
                  value={titleInput}
                  onChangeText={setTitleInput}
                  editable={!saving}
                />
              </View>
            ) : (
              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Meal name (optional)"
                  value={titleInput}
                  onChangeText={setTitleInput}
                  editable={!saving}
                />
                <TextInput
                  style={styles.textArea}
                  multiline
                  placeholder="Describe your meal. Example: chicken salad with olive oil."
                  value={descriptionInput}
                  onChangeText={setDescriptionInput}
                  editable={!saving}
                />
              </View>
            )}
            <View style={styles.bottomActions}>
              <PrimaryButton title="Add Meal" loading={saving} onPress={() => void saveMeal(mode)} disabled={saving || (mode === 'photo' ? !imageUri : !descriptionInput.trim())} />
              <SecondaryButton title="Cancel" disabled={saving} onPress={() => navigation.goBack()} />
            </View>
          </>
        }
      </View>
      <MealAnalyzingOverlay
        visible={saving}
        mode={activeAnalysisMode}
        analysisId={activeAnalysisId}
        onCancel={() => {
          cancelRequestedRef.current = true;
          abortInflight('meal_photo');
          abortInflight('meal_text');
          setSaving(false);
          setActiveAnalysisId(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: uiTheme.spacing['3xl'] },
  wrap: { gap: uiTheme.spacing.md, paddingBottom: uiTheme.spacing.lg },
  title: { ...typography.h2 },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEEF2', borderRadius: uiTheme.radius.sm, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: uiTheme.radius.sm, paddingVertical: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: uiTheme.colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: uiTheme.colors.textPrimary, fontWeight: '700' },
  formCard: { gap: uiTheme.spacing.sm },
  cameraPlaceholder: {
    height: 420,
    borderRadius: uiTheme.radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  placeholderCenter: { alignItems: 'center', gap: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 17 },
  previewImage: { width: '100%', height: '100%' },
  photoActions: { gap: uiTheme.spacing.sm },
  input: { borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  bottomActions: { marginTop: uiTheme.spacing.lg, gap: uiTheme.spacing.sm },
  readOnlyWrap: { gap: spec.spacing[12] },
  readOnlyImage: {
    width: '100%',
    height: 220,
    borderRadius: spec.cardRadius,
    marginBottom: spec.spacing[4],
  },
  readOnlyTitle: {
    ...typography.title3,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  readOnlyReason: {
    ...typography.body,
    color: appTheme.colors.textSecondary,
    lineHeight: 22,
  },
  readOnlyAnalysisId: {
    ...typography.footnote,
    color: appTheme.colors.muted,
    fontWeight: '600',
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
  extraLine: { ...typography.footnote, color: appTheme.colors.textSecondary },
  readOnlyHint: {
    ...typography.body,
    color: appTheme.colors.textSecondary,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingHeader: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loadingCancelBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCancelCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCancelIcon: {
    fontSize: 14,
    lineHeight: 14,
    color: '#64748B',
    fontWeight: '400',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingOrbContainer: {
    width: LOADING_GLOW_SIZE,
    height: LOADING_GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  loadingOrbGlow: {
    position: 'absolute',
    width: LOADING_GLOW_SIZE,
    height: LOADING_GLOW_SIZE,
    borderRadius: LOADING_GLOW_SIZE / 2,
    backgroundColor: '#EDE9FE',
    opacity: 0.6,
  },
  loadingOrb: {
    width: LOADING_ORB_SIZE,
    height: LOADING_ORB_SIZE,
    borderRadius: LOADING_ORB_SIZE / 2,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    overflow: 'hidden',
  },
  loadingOrbHighlight: {
    position: 'absolute',
    top: 10,
    left: 18,
    width: 44,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
    transform: [{ rotate: '-12deg' }],
  },
  loadingTextBlock: {
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#1E293B',
  },
  loadingSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94A3B8',
    height: 22,
    textAlign: 'center',
  },
  loadingAnalysisId: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  loadingFooter: {
    alignItems: 'center',
    paddingBottom: 24,
    opacity: 0.3,
  },
  loadingBrand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#94A3B8',
  },
});
