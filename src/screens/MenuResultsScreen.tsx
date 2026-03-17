import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import {
  DishPick,
  DishPin,
  DishRecommendation,
  MacroTotals,
  MenuScanResult,
  NutritionTargets,
  UserProfile,
} from '../domain/models';
import { addMealUseCase } from '../services/addMealUseCase';
import { computePersonalTargets } from '../services/computePersonalTargets';
import { computeTodayMacrosUseCase } from '../services/computeTodayMacrosUseCase';
import { chatRepo, historyRepo, userRepo } from '../services/container';
import { createId } from '../utils/id';
import { Chip } from '../components/Chip';
import { Card } from '../ui/components/Card';
import { Chip as UiChip } from '../ui/components/Chip';
import { MacroBar } from '../ui/components/MacroBar';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';


type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

type DishWithContextNote = DishPick & { contextNote?: string };

function getContextNote(item: DishPick): string | undefined {
  const value = (item as DishWithContextNote).contextNote;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getContextNoteColor(contextNote: string): string {
  const lower = contextNote.toLowerCase();
  if (
    lower.includes('great') ||
    contextNote.includes('Helps') ||
    lower.includes('need more protein')
  ) {
    return appTheme.colors.success;
  }
  return appTheme.colors.warning;
}

function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '-';
}

function formatList(items: string[] | undefined): string {
  if (!items || items.length === 0) return 'none';
  return items.join(', ');
}

function formatPinsLine(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const labels = items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'label' in item) {
        const label = (item as DishPin).label;
        return typeof label === 'string' ? label : null;
      }
      return null;
    })
    .filter((label): label is string => !!label);
  return labels.length > 0 ? labels.join(', ') : null;
}

function formatMacroProgress(params: {
  label: string;
  consumed: number;
  target: number;
}): string {
  const consumed = Math.round(params.consumed);
  const target = Math.round(params.target);
  const remaining = Math.round(target - consumed);
  const progress = target > 0 ? Math.round((consumed / target) * 100) : 0;
  return `${params.label}: consumed=${consumed} target=${target} remaining=${remaining} progress=${progress}%`;
}

function buildUserContextLines(params: {
  user: UserProfile | null;
  eatenToday: MacroTotals | null;
  savedTargets: NutritionTargets | null;
}): string[] {
  const { user, eatenToday, savedTargets } = params;
  const computedTargets = user ? computePersonalTargets(user) : null;
  const targets = savedTargets
    ? {
        caloriesKcal: savedTargets.caloriesKcal,
        proteinG: savedTargets.proteinG,
        carbsG: savedTargets.carbsG,
        fatG: savedTargets.fatG,
      }
    : computedTargets;
  const lines = [
    'USER CONTEXT',
    `goal: ${user?.goal ?? 'n/a'}`,
    `dietaryPreferences: ${formatList(user?.dietaryPreferences)}`,
    `allergies: ${formatList(user?.allergies)}`,
    `dislikes: ${formatList(user?.dislikes)}`,
    `targetsSource: ${savedTargets ? 'saved_nutrition_targets' : computedTargets ? 'computed_from_base_params' : 'unavailable'}`,
    '',
    'DAY BUDGET CONTEXT',
  ];

  if (!eatenToday) {
    lines.push('dailyProgress: unavailable');
    lines.push('');
    return lines;
  }

  if (!targets) {
    lines.push(
      `consumedOnly: kcal=${Math.round(eatenToday.caloriesKcal)} P=${Math.round(eatenToday.proteinG)} C=${Math.round(eatenToday.carbsG)} F=${Math.round(eatenToday.fatG)}`
    );
    lines.push('targets: unavailable (add base parameters to compute daily targets)');
    lines.push('');
    return lines;
  }

  lines.push(`calories: ${formatMacroProgress({ label: 'kcal', consumed: eatenToday.caloriesKcal, target: targets.caloriesKcal })}`);
  lines.push(`protein: ${formatMacroProgress({ label: 'proteinG', consumed: eatenToday.proteinG, target: targets.proteinG })}`);
  lines.push(`carbs: ${formatMacroProgress({ label: 'carbsG', consumed: eatenToday.carbsG, target: targets.carbsG })}`);
  lines.push(`fat: ${formatMacroProgress({ label: 'fatG', consumed: eatenToday.fatG, target: targets.fatG })}`);
  lines.push('');
  return lines;
}

function formatDishLine(section: 'TOP' | 'CAUTION' | 'AVOID', index: number, dish: DishPick): string[] {
  const contextNote = getContextNote(dish);
  const lines = [
    `[${section}] #${index + 1} ${dish.name}`,
    `reason: ${dish.shortReason}`,
    `macros: kcal=${formatNumber(dish.estimatedCalories)} P=${formatNumber(dish.estimatedProteinG)} C=${formatNumber(dish.estimatedCarbsG)} F=${formatNumber(dish.estimatedFatG)}`,
    `confidence: ${formatNumber(dish.confidencePercent)}%`,
  ];
  if (contextNote) lines.push(`contextNote: ${contextNote}`);
  const pinsLine = formatPinsLine((dish as unknown as { pins?: unknown[] }).pins);
  if (pinsLine) lines.push(`pins: ${pinsLine}`);
  if (dish.riskPins?.length) lines.push(`riskPins: ${dish.riskPins.join(', ')}`);
  if (dish.dietBadges?.length) lines.push(`dietBadges: ${dish.dietBadges.join(', ')}`);
  if (dish.quickFix) lines.push(`quickFix: ${dish.quickFix}`);
  if (dish.allergenNote) lines.push(`allergenNote: ${dish.allergenNote}`);
  if (dish.noLine) lines.push(`noLine: ${dish.noLine}`);
  lines.push('');
  return lines;
}

function buildScanCopyText(params: {
  result: MenuScanResult;
  analysisId: number | null;
  topPlaceholderReason: string;
  userContextLines: string[];
}): string {
  const { result, analysisId, topPlaceholderReason, userContextLines } = params;
  const lines: string[] = [
    'Buddy scan report',
    `generatedAt: ${new Date().toISOString()}`,
    `scanResultId: ${result.id}`,
    `analysisId: ${analysisId ?? 'n/a'}`,
    `createdAt: ${result.createdAt}`,
    `inputImagesCount: ${result.inputImages.length}`,
    `inputImages: ${result.inputImages.join(', ')}`,
    `summary: ${result.summaryText}`,
    `topPlaceholderReason: ${topPlaceholderReason}`,
    '',
    ...userContextLines,
    `topCount: ${result.topPicks.length}`,
    `cautionCount: ${result.caution.length}`,
    `avoidCount: ${result.avoid.length}`,
    '',
    'TOP PICKS',
    '',
  ];

  result.topPicks.forEach((dish, index) => {
    lines.push(...formatDishLine('TOP', index, dish));
  });

  lines.push('CAUTION', '');
  result.caution.forEach((dish, index) => {
    lines.push(...formatDishLine('CAUTION', index, dish));
  });

  lines.push('AVOID', '');
  result.avoid.forEach((dish, index) => {
    lines.push(...formatDishLine('AVOID', index, dish));
  });

  return lines.join('\n').trim();
}

function normalizePins(
  rawPins: unknown,
  fallbackVariant: DishPin['variant'] = 'positive'
): DishPin[] {
  if (!Array.isArray(rawPins)) return [];
  return rawPins
    .map((pin) => {
      if (pin && typeof pin === 'object' && 'label' in pin && 'variant' in pin) {
        const p = pin as DishPin;
        if (
          typeof p.label === 'string' &&
          (p.variant === 'positive' || p.variant === 'risk' || p.variant === 'neutral')
        ) {
          return p;
        }
      }
      if (typeof pin === 'string') {
        return { label: pin, variant: fallbackVariant } as DishPin;
      }
      return null;
    })
    .filter((pin): pin is DishPin => !!pin)
    .slice(0, 4);
}

function toDishRecommendation(
  item: DishPick,
  section: 'top' | 'caution' | 'avoid'
): DishRecommendation {
  const fallbackVariant: DishPin['variant'] = section === 'top' ? 'positive' : 'risk';
  const fromPins = normalizePins(item.pins as unknown, fallbackVariant);
  const fromRiskPins = normalizePins(item.riskPins as unknown, 'risk');
  const pins = fromPins.length > 0 ? fromPins : fromRiskPins;

  return {
    name: item.name,
    reasonShort: item.shortReason,
    contextNote: getContextNote(item),
    pins,
    nutrition: {
      caloriesKcal: item.estimatedCalories ?? 0,
      proteinG: item.estimatedProteinG ?? 0,
      carbsG: item.estimatedCarbsG ?? 0,
      fatG: item.estimatedFatG ?? 0,
    },
  };
}

function DishRow({
  item,
}: {
  item: DishRecommendation;
}): React.JSX.Element {
  return (
    <Card style={styles.dishCard}>
      <Text style={styles.dishName}>{item.name}</Text>
      <Text style={styles.reason}>{item.reasonShort}</Text>
      {item.contextNote ? (
        <Text style={styles.contextNote}>{item.contextNote}</Text>
      ) : null}
      <MacroBar
        calories={item.nutrition.caloriesKcal}
        proteinG={item.nutrition.proteinG}
        carbsG={item.nutrition.carbsG}
        fatG={item.nutrition.fatG}
      />
      <View style={styles.pins}>
        {item.pins.slice(0, 4).map((pin) => (
          <Chip
            key={`${item.name}_${pin.label}`}
            label={pin.label}
            variant={pin.variant}
          />
        ))}
      </View>
    </Card>
  );
}

function TopPickCard({
  item,
  onTakeDish,
  onAskBuddy,
}: {
  item: DishPick;
  onTakeDish: (d: DishPick) => void;
  onAskBuddy: (d: DishPick) => void;
}): React.JSX.Element {
  const highConfidence = item.confidencePercent >= 70;
  const hasPins = (item.pins?.length ?? 0) > 0;
  const hasDietBadges = (item.dietBadges?.length ?? 0) > 0;
  const contextNote = getContextNote(item);
  return (
    <Card style={styles.topPickCard}>
      <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.reason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
      {contextNote ? (
        <Text style={[styles.contextNote, { color: getContextNoteColor(contextNote) }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {contextNote}
        </Text>
      ) : null}
      <MacroBar
        calories={item.estimatedCalories}
        proteinG={item.estimatedProteinG}
        carbsG={item.estimatedCarbsG}
        fatG={item.estimatedFatG}
      />
      <View style={styles.confidenceRow}>
        <View style={styles.confidenceChip}>
          <Text style={styles.confidenceChipText} maxFontSizeMultiplier={1.2}>{item.confidencePercent}% confidence</Text>
        </View>
        {highConfidence && (
          <Text style={styles.highConfidenceText} maxFontSizeMultiplier={1.2}>High confidence</Text>
        )}
      </View>
      {(hasPins || hasDietBadges) && (
        <View style={styles.chipsRow}>
          {item.pins?.map((pin) => (
            <UiChip key={`${item.name}_pin_${pin}`} label={pin} small />
          ))}
          {item.dietBadges?.map((badge) => (
            <UiChip key={`${item.name}_diet_${badge}`} label={badge} small />
          ))}
        </View>
      )}
      {item.allergenNote != null && (
        <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{item.allergenNote}</Text>
      )}
      {item.noLine != null && (
        <Text style={styles.extraLine} maxFontSizeMultiplier={1.2}>{item.noLine}</Text>
      )}
      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [styles.takeBtn, pressed && styles.btnPressed]}
          onPress={() => onTakeDish(item)}
        >
          <Text style={styles.takeBtnText} maxFontSizeMultiplier={1.2}>I take it</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.askBuddyBtn, pressed && styles.btnPressed]}
          onPress={() => onAskBuddy(item)}
        >
          <Text style={styles.askBuddyBtnText} maxFontSizeMultiplier={1.2}>Ask Buddy</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function CautionCard({
  item,
  onTakeDish,
  onAskBuddy,
  onShowQuickFix,
}: {
  item: DishPick;
  onTakeDish: (d: DishPick) => void;
  onAskBuddy: (d: DishPick) => void;
  onShowQuickFix: (quickFix: string) => void;
}): React.JSX.Element {
  const contextNote = getContextNote(item);
  return (
    <View style={styles.compactCard}>
      <View style={styles.compactHead}>
        <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
        {item.quickFix ? (
          <Pressable style={styles.quickFixInfoBtn} onPress={() => onShowQuickFix(item.quickFix ?? '')} hitSlop={8}>
            <Text style={styles.quickFixInfoBtnText} maxFontSizeMultiplier={1.2}>i</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
      {contextNote ? (
        <Text style={[styles.contextNote, { color: getContextNoteColor(contextNote) }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {contextNote}
        </Text>
      ) : null}
      <MacroBar
        calories={item.estimatedCalories}
        proteinG={item.estimatedProteinG}
        carbsG={item.estimatedCarbsG}
        fatG={item.estimatedFatG}
      />
      {(item.riskPins?.length ?? 0) > 0 && (
        <View style={styles.riskPinsRow}>
          {item.riskPins?.slice(0, 3).map((pin) => (
            <UiChip key={`${item.name}_caution_risk_${pin}`} label={pin} small variant="warning" />
          ))}
        </View>
      )}
      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [styles.takeBtn, pressed && styles.btnPressed]}
          onPress={() => onTakeDish(item)}
        >
          <Text style={styles.takeBtnText} maxFontSizeMultiplier={1.2}>I take it</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.askBuddyBtn, pressed && styles.btnPressed]}
          onPress={() => onAskBuddy(item)}
        >
          <Text style={styles.askBuddyBtnText} maxFontSizeMultiplier={1.2}>Ask Buddy</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AvoidCard({
  item,
  onTakeDish,
  onAskBuddy,
}: {
  item: DishPick;
  onTakeDish: (d: DishPick) => void;
  onAskBuddy: (d: DishPick) => void;
}): React.JSX.Element {
  const contextNote = getContextNote(item);
  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
      {contextNote ? (
        <Text style={[styles.contextNote, { color: getContextNoteColor(contextNote) }]} numberOfLines={2} maxFontSizeMultiplier={1.2}>
          {contextNote}
        </Text>
      ) : null}
      <MacroBar
        calories={item.estimatedCalories}
        proteinG={item.estimatedProteinG}
        carbsG={item.estimatedCarbsG}
        fatG={item.estimatedFatG}
      />
      {(item.riskPins?.length ?? 0) > 0 && (
        <View style={styles.riskPinsRow}>
          {item.riskPins?.slice(0, 3).map((pin) => (
            <UiChip key={`${item.name}_avoid_risk_${pin}`} label={pin} small variant="danger" />
          ))}
        </View>
      )}
      <View style={styles.cardActions}>
        <Pressable
          style={({ pressed }) => [styles.takeBtn, pressed && styles.btnPressed]}
          onPress={() => onTakeDish(item)}
        >
          <Text style={styles.takeBtnText} maxFontSizeMultiplier={1.2}>I take it</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.askBuddyBtn, pressed && styles.btnPressed]}
          onPress={() => onAskBuddy(item)}
        >
          <Text style={styles.askBuddyBtnText} maxFontSizeMultiplier={1.2}>Ask Buddy</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionTitle({
  icon,
  materialIcon,
  iconColor,
  title,
}: {
  icon?: string;
  materialIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.sectionTitleRow}>
      {materialIcon ? (
        <MaterialIcons name={materialIcon} size={22} color={iconColor} />
      ) : icon ? (
        <Text style={[styles.sectionIcon, { color: iconColor }]}>{icon}</Text>
      ) : null}
      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{title}</Text>
    </View>
  );
}

export function MenuResultsScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [paywallHandled, setPaywallHandled] = React.useState(false);
  const analysisIdFromRoute =
    typeof route.params?.analysisId === 'number' && Number.isFinite(route.params.analysisId)
      ? Math.max(1, Math.floor(route.params.analysisId))
      : null;
  const displayAnalysisId =
    (typeof result?.analysisId === 'number' && Number.isFinite(result.analysisId)
      ? Math.max(1, Math.floor(result.analysisId))
      : null) ??
    analysisIdFromRoute;
  const topPlaceholderReason = result?.topPlaceholderReason?.trim()
    ? result.topPlaceholderReason.trim()
    : 'You’ve hit your goal for today.';

  React.useEffect(() => {
    void (async () => {
      if (route.params?.resultId) {
        const byId = await historyRepo.getScanResultById(route.params.resultId);
        if (byId) return setResult(byId);
      }
      const first = (await historyRepo.listRecent(20)).find((i) => i.type === 'menu_scan');
      const latestResult = first ? await historyRepo.getScanResultById(first.payloadRef) : null;
      if (latestResult) {
        setResult(latestResult);
        return;
      }
      setResult(null);
    })();
  }, [route.params?.resultId]);

  React.useEffect(() => {
    if (!result || paywallHandled || !route.params?.paywallAfterOpen) return;
    setPaywallHandled(true);
    navigation.navigate('Paywall', { source: 'first_result', trialDaysLeft: route.params?.trialDaysLeft ?? 7 });
  }, [navigation, paywallHandled, result, route.params?.paywallAfterOpen, route.params?.trialDaysLeft]);

  React.useEffect(() => {
    void (async () => {
      if (!result) return;
      const picks = result.topPicks.map((i, idx) => `${idx + 1}. ${i.name}`).join('\n');
      await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, `${result.summaryText}\nTop picks:\n${picks}`);
    })();
  }, [result]);

  const handleTakeDish = React.useCallback(async (dish: DishPick, section: 'top' | 'caution' | 'avoid'): Promise<void> => {
    const mealId = createId('meal');
    const macros = {
      caloriesKcal: dish.estimatedCalories ?? 0,
      proteinG: dish.estimatedProteinG ?? 0,
      carbsG: dish.estimatedCarbsG ?? 0,
      fatG: dish.estimatedFatG ?? 0,
    };
    await addMealUseCase(
      {
        id: mealId,
        createdAt: new Date().toISOString(),
        title: dish.name,
        source: 'text',
        macros,
        notes: dish.shortReason,
        pins: dish.pins && dish.pins.length > 0 ? dish.pins : undefined,
        riskPins: dish.riskPins && dish.riskPins.length > 0 ? dish.riskPins : undefined,
        dietBadges: dish.dietBadges && dish.dietBadges.length > 0 ? dish.dietBadges : undefined,
        confidencePercent: Number.isFinite(dish.confidencePercent) ? dish.confidencePercent : undefined,
        allergenNote: dish.allergenNote ?? null,
        noLine: dish.noLine ?? null,
        quickFix: section === 'caution' ? dish.quickFix ?? null : undefined,
        menuSection: section,
      },
      { historyRepo },
    );
    const macroSummary = `${macros.caloriesKcal} kcal | P ${macros.proteinG}g | C ${macros.carbsG}g | F ${macros.fatG}g`;
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}. ${macroSummary}`);
    Alert.alert('Added', `${dish.name} logged to your day.`);
  }, []);

  const handleShowQuickFix = React.useCallback((quickFix: string): void => {
    if (!quickFix) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Suggested change',
          message: quickFix,
          options: ['OK'],
          cancelButtonIndex: 0,
        },
        () => {}
      );
      return;
    }
    Alert.alert('Suggested change', quickFix);
  }, []);

  const handleCopyScanReport = React.useCallback(async (): Promise<void> => {
    if (!result) {
      Alert.alert('Nothing to copy', 'No scan result is loaded yet.');
      return;
    }

    const [user, eatenToday, savedTargets] = await Promise.all([
      userRepo.getUser(),
      computeTodayMacrosUseCase(new Date(), { historyRepo }),
      userRepo.getNutritionTargets(),
    ]);

    const userContextLines = buildUserContextLines({ user, eatenToday, savedTargets });
    const text = buildScanCopyText({
      result,
      analysisId: displayAnalysisId,
      topPlaceholderReason,
      userContextLines,
    });
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Scan report copied to clipboard.');
  }, [displayAnalysisId, result, topPlaceholderReason]);

  const scrollPaddingBottom = insets.bottom + spec.spacing[24];

  return (
    <Screen scroll={false} padded={false} safeTop={false} safeBottom={false}>
      <View style={styles.root}>
        {/* Custom header: iOS-style back (chevron only), no title, no menu */}
        <View style={[styles.header, { paddingTop: insets.top + spec.headerPaddingTopOffset }]}>
	          <View style={styles.headerRow}>
	            <Pressable
	              style={styles.headerBackWrap}
	              onPress={() => navigation.goBack()}
	              hitSlop={8}
	            >
	              <Text style={styles.headerBackChevron}>‹</Text>
	            </Pressable>
	            <View style={styles.headerSpacer} />
	            <Pressable
	              style={({ pressed }) => [
	                styles.headerCopyWrap,
	                !result && styles.headerCopyWrapDisabled,
	                pressed && result && styles.btnPressed,
	              ]}
	              onPress={() => {
	                void handleCopyScanReport();
	              }}
	              disabled={!result}
	              hitSlop={8}
	            >
	              <Text style={[styles.headerCopyText, !result && styles.headerCopyTextDisabled]} maxFontSizeMultiplier={1.2}>
	                Copy
	              </Text>
	            </Pressable>
	          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>Menu picks</Text>
            <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>Based on your goal and profile</Text>
            {displayAnalysisId ? (
              <Text style={styles.scanIdText} maxFontSizeMultiplier={1.2}>
                Scan ID #{displayAnalysisId}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollPaddingBottom, paddingHorizontal: spec.screenPaddingHorizontal },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!result ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText} maxFontSizeMultiplier={1.2}>No results yet. Run a scan from Scan menu.</Text>
            </Card>
          ) : (
            <>
              <View style={styles.section}>
                <SectionTitle materialIcon="local-fire-department" iconColor="#EA4545" title="Top picks" />
                <View style={styles.cardsColumn}>
                  {result.topPicks.length > 0 ? (
                    result.topPicks.map((item) => (
                      <DishRow
                        key={`t_${item.name}`}
                        item={toDishRecommendation(item, 'top')}
                      />
                    ))
                  ) : (
                    <Card style={styles.topPlaceholderCard}>
                      <Text style={styles.topPlaceholderTitle} maxFontSizeMultiplier={1.2}>
                        No top picks for now
                      </Text>
                      <Text style={styles.topPlaceholderText} maxFontSizeMultiplier={1.2}>
                        {topPlaceholderReason}
                      </Text>
                    </Card>
                  )}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMuted]}>
                <SectionTitle icon="⚠" iconColor={appTheme.colors.warning} title="OK with caution" />
                <View style={styles.cardsColumn}>
                  {result.caution.map((item) => (
                    <DishRow
                      key={`c_${item.name}`}
                      item={toDishRecommendation(item, 'caution')}
                    />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMutedMore]}>
                <SectionTitle icon="⊘" iconColor={appTheme.colors.danger} title="Better avoid" />
                <View style={styles.cardsColumn}>
                  {result.avoid.map((item) => (
                    <DishRow
                      key={`a_${item.name}`}
                      item={toDishRecommendation(item, 'avoid')}
                    />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: appTheme.colors.background },
  header: {
    paddingHorizontal: spec.screenPaddingHorizontal,
    paddingBottom: spec.spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: spec.spacing[4],
  },
  headerBackWrap: {
    minWidth: spec.minTouchTarget,
    minHeight: spec.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackChevron: { fontSize: 32, color: appTheme.colors.textPrimary, fontWeight: '300' },
  headerSpacer: { width: spec.minTouchTarget, height: spec.minTouchTarget },
  headerCopyWrap: {
    minWidth: spec.minTouchTarget,
    minHeight: spec.minTouchTarget,
    paddingHorizontal: spec.spacing[12],
    borderRadius: spec.radius.pill,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.surface,
  },
  headerCopyWrapDisabled: {
    backgroundColor: appTheme.colors.warningSoft,
  },
  headerCopyText: {
    ...typography.footnote,
    color: appTheme.colors.textPrimary,
    fontWeight: '700',
  },
  headerCopyTextDisabled: {
    color: appTheme.colors.textSecondary,
  },
  titleBlock: { gap: 2 },
  pageTitle: { ...typography.h1, color: appTheme.colors.textPrimary },
  pageSubtitle: { ...typography.body, color: appTheme.colors.textSecondary },
  scanIdText: { ...typography.bodySemibold, color: appTheme.colors.textSecondary, marginTop: spec.spacing[4] },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spec.spacing[8] },
  section: { marginBottom: spec.spacing[32] },
  sectionMuted: { opacity: 0.85 },
  sectionMutedMore: { opacity: 0.7 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginBottom: spec.spacing[16] },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { ...typography.h2, color: appTheme.colors.textPrimary },
  cardsColumn: { gap: spec.spacing[20] },
  dishCard: { gap: spec.spacing[12] },
  topPickCard: { gap: spec.spacing[12] },
  dishName: {
    ...typography.title3,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reason: { ...typography.body, color: appTheme.colors.textSecondary, lineHeight: 22 },
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
  pins: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  extraLine: { ...typography.footnote, color: appTheme.colors.textSecondary },
  cardActions: {
    flexDirection: 'row',
    gap: spec.spacing[12],
    marginTop: spec.spacing[4],
    alignItems: 'center',
  },
  takeBtn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#0F172A',
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  takeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  askBuddyBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askBuddyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
    textAlign: 'center',
  },
  btnPressed: { opacity: 0.85 },
  compactCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    padding: spec.cardPadding,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
    gap: spec.spacing[8],
    ...appTheme.shadows.card,
  },
  compactHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactTitle: { ...typography.bodySemibold, color: appTheme.colors.textPrimary, flex: 1 },
  compactReason: { ...typography.caption, color: appTheme.colors.textSecondary },
  contextNote: {
    color: appTheme.colors.warning,
    fontSize: appTheme.typography.small.fontSize,
    fontStyle: 'italic',
  },
  riskPinsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  quickFixInfoBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spec.spacing[8],
  },
  quickFixInfoBtnText: {
    color: appTheme.colors.warning,
    fontSize: appTheme.typography.caption1.fontSize,
    fontWeight: '700',
  },
  topPlaceholderCard: { padding: spec.cardPadding, gap: spec.spacing[8] },
  topPlaceholderTitle: { ...typography.bodySemibold, color: appTheme.colors.textPrimary },
  topPlaceholderText: { ...typography.body, color: appTheme.colors.textSecondary },
  emptyCard: { padding: spec.cardPadding },
  emptyText: { ...typography.body, color: appTheme.colors.textSecondary },
});
