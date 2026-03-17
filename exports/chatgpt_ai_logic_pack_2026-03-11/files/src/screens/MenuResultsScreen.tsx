import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { DailyNutritionState } from '../domain/dayBudget';
import { DishPick, Goal, MenuScanResult, NutritionTargets } from '../domain/models';
import {
  buildFallbackTargets,
  buildRankingContext,
  createFallbackDailyState,
  rankExtractedDishes,
  rankedDishToDishPick,
  type RankedDish,
  type RankingContext,
} from '../domain/recommendationRanking';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, dailyNutritionRepo, historyRepo, userRepo } from '../services/container';
import { createId } from '../utils/id';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { MacroBar } from '../ui/components/MacroBar';
import { Screen } from '../ui/components/Screen';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';
import { logAIDebug } from '../ai/aiDebugLog';


type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

type DishWithBuildMeta = {
  dish: DishPick;
  isBuild: boolean;
  buildIngredients: string;
};

type DishSection = 'top' | 'caution' | 'avoid';

type RankingViewState = {
  source: 'deterministic' | 'legacy';
  topPicks: DishPick[];
  caution: DishPick[];
  avoid: DishPick[];
  topEmptyReason: 'none' | 'ai_empty' | 'budget';
  context: RankingContext;
  ranked: RankedDish[];
};

const MAX_BUILD_VARIANTS_PER_SECTION = 2;
const TOP_PRIMARY_LIMIT = 6;

function dishIdentityKey(dish: DishPick): string {
  return [
    dish.name.trim().toLocaleLowerCase(),
    dish.estimatedCalories ?? 'na',
    dish.estimatedProteinG ?? 'na',
    dish.estimatedCarbsG ?? 'na',
    dish.estimatedFatG ?? 'na',
  ].join('|');
}

function buildDiversityKey(ingredients: string): string {
  return ingredients
    .split('+')
    .map((token) => token.trim().toLocaleLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
}

function getBuildMeta(dish: DishPick): DishWithBuildMeta {
  const name = (dish.name ?? '').trim();
  const match = name.match(/^(?:build|custom)\s*:\s*(.+)$/i);
  const isBuild = Boolean(match);
  const buildIngredients = (match?.[1] ?? '')
    .trim()
    .toLocaleLowerCase();
  return { dish, isBuild, buildIngredients };
}

function orderDishesInSection(items: DishPick[]): DishWithBuildMeta[] {
  const withMeta = items.map(getBuildMeta);
  const ready: DishWithBuildMeta[] = [];
  const build: DishWithBuildMeta[] = [];
  for (const item of withMeta) {
    if (item.isBuild) build.push(item);
    else ready.push(item);
  }
  const uniqueBuild: DishWithBuildMeta[] = [];
  const seenBuildKeys = new Set<string>();
  for (const item of build) {
    if (uniqueBuild.length >= MAX_BUILD_VARIANTS_PER_SECTION) break;
    const key = buildDiversityKey(item.buildIngredients);
    if (key && seenBuildKeys.has(key)) continue;
    if (key) seenBuildKeys.add(key);
    uniqueBuild.push(item);
  }

  return [...ready, ...uniqueBuild];
}

function toSuggestedChangeText(quickFix: string | null | undefined): string | null {
  if (!quickFix) return null;
  const raw = quickFix.replace(/^Try:\s*/i, '').trim();
  if (!raw) return null;
  const normalized = raw.toLocaleLowerCase();

  if (normalized.startsWith('ask ')) {
    return raw.endsWith('.') ? raw : `${raw}.`;
  }

  if (normalized.startsWith('no ')) {
    return `Ask to remove ${normalized.slice(3).trim()}.`;
  }
  if (normalized === 'grilled not fried') {
    return 'Ask for grilled instead of fried.';
  }
  if (normalized.startsWith('half portion')) {
    return 'Ask for half portion.';
  }
  if (normalized.startsWith('swap ')) {
    return `Ask to ${normalized}.`;
  }
  if (normalized.startsWith('extra ') || normalized.startsWith('less ')) {
    return `Ask for ${normalized}.`;
  }
  return `Ask to ${normalized}.`;
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
  const { isBuild, buildIngredients } = getBuildMeta(item);
  return (
    <Card style={styles.topPickCard}>
      {isBuild ? (
        <View style={styles.buildTitleBlock}>
          <Text style={styles.buildTitle} maxFontSizeMultiplier={1.2}>BUILD</Text>
          <Text style={styles.buildIngredientsText} maxFontSizeMultiplier={1.2}>{buildIngredients}</Text>
        </View>
      ) : (
        <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      )}
      <Text
        style={styles.reason}
        maxFontSizeMultiplier={1.2}
      >
        {item.shortReason}
      </Text>
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
            <Chip key={`${item.name}_pin_${pin}`} label={pin} small />
          ))}
          {item.dietBadges?.map((badge) => (
            <Chip key={`${item.name}_diet_${badge}`} label={badge} small />
          ))}
        </View>
      )}
      {item.allergenNote != null && item.allergenNote !== 'Allergen safe' && (
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
}: {
  item: DishPick;
  onTakeDish: (d: DishPick) => void;
  onAskBuddy: (d: DishPick) => void;
}): React.JSX.Element {
  const { isBuild, buildIngredients } = getBuildMeta(item);
  const suggestedChange = toSuggestedChangeText(item.quickFix);
  return (
    <View style={styles.compactCard}>
      <View style={styles.compactHead}>
        {isBuild ? (
          <View style={styles.buildCompactTitleBlock}>
            <Text style={styles.buildCompactTitle} maxFontSizeMultiplier={1.2}>BUILD</Text>
            <Text style={styles.buildCompactIngredientsText} maxFontSizeMultiplier={1.2}>{buildIngredients}</Text>
          </View>
        ) : (
          <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
        )}
      </View>
      {suggestedChange ? (
        <View style={styles.suggestedBlock}>
          <Text style={styles.suggestedLabel} maxFontSizeMultiplier={1.2}>Suggested change</Text>
          <Text style={styles.suggestedText} maxFontSizeMultiplier={1.2}>{suggestedChange}</Text>
        </View>
      ) : null}
      <Text
        style={styles.compactReason}
        maxFontSizeMultiplier={1.2}
      >
        {item.shortReason}
      </Text>
      <MacroBar
        calories={item.estimatedCalories}
        proteinG={item.estimatedProteinG}
        carbsG={item.estimatedCarbsG}
        fatG={item.estimatedFatG}
      />
      {(item.riskPins?.length ?? 0) > 0 && (
        <View style={styles.riskPinsRow}>
          {item.riskPins?.slice(0, 3).map((pin) => (
            <Chip key={`${item.name}_caution_risk_${pin}`} label={pin} small variant="warning" />
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
  const { isBuild, buildIngredients } = getBuildMeta(item);
  return (
    <View style={styles.compactCard}>
      {isBuild ? (
        <View style={styles.buildCompactTitleBlock}>
          <Text style={styles.buildCompactTitle} maxFontSizeMultiplier={1.2}>BUILD</Text>
          <Text style={styles.buildCompactIngredientsText} maxFontSizeMultiplier={1.2}>{buildIngredients}</Text>
        </View>
      ) : (
        <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      )}
      <Text
        style={styles.compactReason}
        maxFontSizeMultiplier={1.2}
      >
        {item.shortReason}
      </Text>
      <MacroBar
        calories={item.estimatedCalories}
        proteinG={item.estimatedProteinG}
        carbsG={item.estimatedCarbsG}
        fatG={item.estimatedFatG}
      />
      {(item.riskPins?.length ?? 0) > 0 && (
        <View style={styles.riskPinsRow}>
          {item.riskPins?.slice(0, 3).map((pin) => (
            <Chip key={`${item.name}_avoid_risk_${pin}`} label={pin} small variant="danger" />
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
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [goal, setGoal] = React.useState<Goal>('Maintain weight');
  const [targets, setTargets] = React.useState<NutritionTargets | null>(null);
  const [todayState, setTodayState] = React.useState<DailyNutritionState | null>(null);
  const [selectedAllergies, setSelectedAllergies] = React.useState<string[]>([]);
  const [selectedDislikes, setSelectedDislikes] = React.useState<string[]>([]);
  const [paywallHandled, setPaywallHandled] = React.useState(false);
  const lastLoggedRankingKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      const [user, loadedTargets, loadedToday] = await Promise.all([
        userRepo.getUser(),
        userRepo.getNutritionTargets(),
        dailyNutritionRepo.getToday(new Date()),
      ]);
      setGoal(user?.goal ?? 'Maintain weight');
      setTargets(loadedTargets);
      setTodayState(loadedToday);
      setSelectedAllergies(user?.allergies ?? []);
      setSelectedDislikes(user?.dislikes ?? []);

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

  const rankingData = React.useMemo<RankingViewState | null>(() => {
    if (!result) return null;

    const now = new Date();
    const activeTargets = targets ?? buildFallbackTargets(goal);
    const activeDailyState = todayState ?? createFallbackDailyState(now);

    if ((result.extractedDishes?.length ?? 0) > 0) {
      const ranked = rankExtractedDishes({
        dishes: result.extractedDishes ?? [],
        goal,
        targets: activeTargets,
        dailyState: activeDailyState,
        selectedAllergies,
        selectedDislikes,
        now,
      });

      const topPicks = ranked.top.map((item) => rankedDishToDishPick(item, selectedAllergies));
      const caution = ranked.caution.map((item) => rankedDishToDishPick(item, selectedAllergies));
      const avoid = ranked.avoid.map((item) => rankedDishToDishPick(item, selectedAllergies));
      const topEmptyReason: RankingViewState['topEmptyReason'] =
        topPicks.length > 0 ? 'none' : caution.length > 0 || avoid.length > 0 ? 'budget' : 'ai_empty';

      return {
        source: 'deterministic',
        topPicks,
        caution,
        avoid,
        topEmptyReason,
        context: ranked.context,
        ranked: ranked.ranked,
      };
    }

    const context = buildRankingContext({
      goal,
      targets: activeTargets,
      dailyState: activeDailyState,
      selectedAllergies,
      selectedDislikes,
      now,
    });

    const legacyTop = result.topPicks ?? [];
    const legacyCaution = result.caution ?? [];
    const legacyAvoid = result.avoid ?? [];

    return {
      source: 'legacy',
      topPicks: legacyTop,
      caution: legacyCaution,
      avoid: legacyAvoid,
      topEmptyReason:
        legacyTop.length > 0 ? 'none' : legacyCaution.length > 0 || legacyAvoid.length > 0 ? 'budget' : 'ai_empty',
      context,
      ranked: [],
    };
  }, [goal, result, selectedAllergies, selectedDislikes, targets, todayState]);

  React.useEffect(() => {
    void (async () => {
      if (!result || !rankingData) return;
      const picks = rankingData.topPicks.slice(0, TOP_PRIMARY_LIMIT).map((i, idx) => `${idx + 1}. ${i.name}`).join('\n');
      await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, `${result.summaryText}\nTop picks:\n${picks}`);
    })();
  }, [rankingData, result]);

  React.useEffect(() => {
    if (!result || !rankingData || typeof result.analysisId !== 'number') return;
    const analysisId = result.analysisId;
    const logKey = [
      result.id,
      analysisId,
      rankingData.source,
      rankingData.topPicks.length,
      rankingData.caution.length,
      rankingData.avoid.length,
      rankingData.context.dailyState.mealsLoggedCount,
      rankingData.context.remaining.calories,
      rankingData.context.remaining.protein,
      rankingData.context.remaining.carbs,
      rankingData.context.remaining.fat,
      selectedAllergies.join(','),
      selectedDislikes.join(','),
    ].join('|');
    if (lastLoggedRankingKeyRef.current === logKey) return;
    lastLoggedRankingKeyRef.current = logKey;

    logAIDebug({
      level: 'info',
      task: 'menu_scan',
      stage: 'ranking.context',
      message: 'Deterministic ranking context prepared',
      analysisId,
      details: {
        source: rankingData.source,
        goal,
        mealsLoggedCount: rankingData.context.dailyState.mealsLoggedCount,
        firstMealFlexActive: rankingData.context.firstMealFlex,
        remainingCalories: rankingData.context.remaining.calories,
        remainingProtein: rankingData.context.remaining.protein,
        remainingCarbs: rankingData.context.remaining.carbs,
        remainingFat: rankingData.context.remaining.fat,
        remainingMeals: rankingData.context.remainingMeals,
        selectedAllergies,
        selectedDislikes,
        extractedDishCount: result.extractedDishes?.length ?? 0,
      },
    });

    if (rankingData.source === 'deterministic') {
      const maxDishLogs = 450;
      const dishesForLogs = rankingData.ranked.slice(0, maxDishLogs);
      dishesForLogs.forEach((rankedDish) => {
        const debug = (rankedDish.debug ?? {}) as Record<string, unknown>;
        const list = (key: string): string[] =>
          Array.isArray(debug[key]) ? (debug[key] as unknown[]).map((item) => String(item)) : [];
        const num = (key: string): number | undefined =>
          typeof debug[key] === 'number' && Number.isFinite(debug[key] as number)
            ? Number(debug[key])
            : undefined;
        const bool = (key: string): boolean =>
          debug[key] === true;

        logAIDebug({
          level: 'info',
          task: 'menu_scan',
          stage: 'ranking.dish',
          message: `Ranked dish: ${rankedDish.dish.name}`,
          analysisId,
          details: {
            dishName: rankedDish.dish.name,
            calories: rankedDish.dish.estimatedCalories,
            protein: rankedDish.dish.estimatedProteinG,
            carbs: rankedDish.dish.estimatedCarbsG,
            fat: rankedDish.dish.estimatedFatG,
            confidencePercent: rankedDish.dish.confidencePercent,
            flags: rankedDish.dish.flags ?? null,
            allergenSignals: rankedDish.dish.allergenSignals ?? null,
            sectionAssigned: rankedDish.section,
            score: rankedDish.score,
            hardConflictReasons: list('hardConflictReasons'),
            softPressureReasons: list('softPressureReasons'),
            caloriePressure: num('caloriePressure'),
            carbPressure: num('carbPressure'),
            fatPressure: num('fatPressure'),
            proteinCoverage: num('proteinCoverage'),
            promotedFromCaution: bool('promotedFromCaution'),
            explanation: rankedDish.explanation,
            quickFix: rankedDish.quickFix,
          },
        });
      });

      if (rankingData.ranked.length > dishesForLogs.length) {
        logAIDebug({
          level: 'warn',
          task: 'menu_scan',
          stage: 'ranking.dish_logs_truncated',
          message: 'Per-dish logs truncated due to safety cap',
          analysisId,
          details: {
            totalRanked: rankingData.ranked.length,
            loggedDishes: dishesForLogs.length,
          },
        });
      }
    }

    logAIDebug({
      level: 'info',
      task: 'menu_scan',
      stage: 'ranking.final_buckets',
      message: 'Final deterministic buckets prepared',
      analysisId,
      details: {
        topCount: rankingData.topPicks.length,
        cautionCount: rankingData.caution.length,
        avoidCount: rankingData.avoid.length,
        topDishNames: rankingData.topPicks.map((dish) => dish.name),
        cautionDishNames: rankingData.caution.map((dish) => dish.name),
        avoidDishNames: rankingData.avoid.map((dish) => dish.name),
      },
    });
  }, [goal, rankingData, result, selectedAllergies, selectedDislikes]);

  const dishSectionByKey = React.useMemo(() => {
    const map = new Map<string, DishSection>();
    if (!rankingData) return map;
    rankingData.topPicks.forEach((dish) => map.set(dishIdentityKey(dish), 'top'));
    rankingData.caution.forEach((dish) => map.set(dishIdentityKey(dish), 'caution'));
    rankingData.avoid.forEach((dish) => map.set(dishIdentityKey(dish), 'avoid'));
    return map;
  }, [rankingData]);

  const resolveDishSection = React.useCallback(
    (dish: DishPick): DishSection => dishSectionByKey.get(dishIdentityKey(dish)) ?? 'caution',
    [dishSectionByKey]
  );

  const handleTakeDish = React.useCallback(async (dish: DishPick): Promise<void> => {
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
        pins: dish.pins,
        riskPins: dish.riskPins,
        dietBadges: dish.dietBadges,
        confidencePercent: dish.confidencePercent,
        allergenNote: dish.allergenNote,
        noLine: dish.noLine,
        menuSection: resolveDishSection(dish),
      },
      { historyRepo, dailyNutritionRepo },
    );
    const updatedToday = await dailyNutritionRepo.getToday(new Date());
    setTodayState(updatedToday);
    const macroSummary = `${macros.caloriesKcal} kcal | P ${macros.proteinG}g | C ${macros.carbsG}g | F ${macros.fatG}g`;
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}. ${macroSummary}`);
    await showAlert({
      title: 'Added',
      message: `${dish.name} logged to your day.`,
    });
  }, [resolveDishSection, showAlert]);

  const scrollPaddingBottom = insets.bottom + spec.spacing[24];
  const orderedTopPicksAll = React.useMemo(
    () => orderDishesInSection(rankingData?.topPicks ?? []),
    [rankingData?.topPicks]
  );
  const orderedTopPicks = React.useMemo(
    () => orderedTopPicksAll.slice(0, TOP_PRIMARY_LIMIT),
    [orderedTopPicksAll]
  );
  const orderedCaution = React.useMemo(() => {
    const overflowTop = orderedTopPicksAll.slice(TOP_PRIMARY_LIMIT).map((item) => item.dish);
    return orderDishesInSection([...(rankingData?.caution ?? []), ...overflowTop]);
  }, [orderedTopPicksAll, rankingData?.caution]);
  const orderedAvoid = React.useMemo(
    () => orderDishesInSection(rankingData?.avoid ?? []),
    [rankingData?.avoid]
  );
  const firstMealFlexActive = rankingData?.context.firstMealFlex ?? false;
  const topOverflowCount = Math.max(0, orderedTopPicksAll.length - TOP_PRIMARY_LIMIT);

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
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>Menu picks</Text>
            <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>Based on your goal and profile</Text>
            {typeof result?.analysisId === 'number' ? (
              <Text style={styles.analysisIdText} maxFontSizeMultiplier={1.2}>
                Scan ID #{result.analysisId}
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
                  {orderedTopPicks.length === 0 ? (
                    <View style={styles.topEmptyCard}>
                      <Text style={styles.topEmptyTitle} maxFontSizeMultiplier={1.2}>
                        {rankingData?.topEmptyReason === 'ai_empty'
                          ? 'No Top picks found in this menu'
                          : 'Nothing to recommend as a Top Picks'}
                      </Text>
                      <Text style={styles.topEmptySubtitle} maxFontSizeMultiplier={1.2}>
                        {rankingData?.topEmptyReason === 'ai_empty'
                          ? "Buddy couldn't find strong top matches for your goal in these photos."
                          : 'Check OK with caution for the best available options right now.'}
                      </Text>
                    </View>
                  ) : (
                    orderedTopPicks.map(({ dish: item }, index) => (
                      <TopPickCard
                        key={`t_${item.name}_${index}`}
                        item={item}
                        onTakeDish={handleTakeDish}
                        onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })}
                      />
                    ))
                  )}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMuted]}>
                <SectionTitle icon="⚠" iconColor={appTheme.colors.warning} title="OK with caution" />
                {topOverflowCount > 0 ? (
                  <Text style={styles.sectionHint} maxFontSizeMultiplier={1.2}>
                    Top picks are capped for readability. Extra strong options are listed here.
                  </Text>
                ) : null}
                {firstMealFlexActive ? (
                  <Text style={styles.sectionHint} maxFontSizeMultiplier={1.2}>
                    First-meal flex is active until 14:00.
                  </Text>
                ) : null}
                <View style={styles.cardsColumn}>
                  {orderedCaution.map(({ dish: item }, index) => (
                    <CautionCard key={`c_${item.name}_${index}`} item={item} onTakeDish={handleTakeDish} onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })} />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMutedMore]}>
                <SectionTitle icon="⊘" iconColor={appTheme.colors.danger} title="Better avoid" />
                <View style={styles.cardsColumn}>
                  {orderedAvoid.map(({ dish: item }, index) => (
                    <AvoidCard key={`a_${item.name}_${index}`} item={item} onTakeDish={handleTakeDish} onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })} />
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
  titleBlock: { gap: 2 },
  pageTitle: { ...typography.h1, color: appTheme.colors.textPrimary },
  pageSubtitle: { ...typography.body, color: appTheme.colors.textSecondary },
  analysisIdText: { ...typography.footnote, color: appTheme.colors.muted, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spec.spacing[8] },
  section: { marginBottom: spec.spacing[32] },
  sectionMuted: { opacity: 0.85 },
  sectionMutedMore: { opacity: 0.7 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginBottom: spec.spacing[16] },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { ...typography.h2, color: appTheme.colors.textPrimary },
  sectionHint: {
    ...typography.footnote,
    color: appTheme.colors.textSecondary,
    marginTop: -spec.spacing[8],
    marginBottom: spec.spacing[8],
  },
  cardsColumn: { gap: spec.spacing[20] },
  topEmptyCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
    paddingHorizontal: spec.cardPadding,
    paddingVertical: spec.spacing[16],
    gap: spec.spacing[8],
    ...appTheme.shadows.card,
  },
  topEmptyTitle: {
    ...typography.bodySemibold,
    color: appTheme.colors.textPrimary,
  },
  topEmptySubtitle: {
    ...typography.body,
    color: appTheme.colors.textSecondary,
    lineHeight: 22,
  },
  topPickCard: { gap: spec.spacing[12] },
  dishName: {
    ...typography.title3,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  buildTitleBlock: {
    gap: 4,
  },
  buildTitle: {
    ...typography.title3,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  buildIngredientsText: {
    ...typography.bodySemibold,
    color: appTheme.colors.textPrimary,
    textTransform: 'none',
  },
  reason: { ...typography.caption, color: appTheme.colors.textSecondary, lineHeight: 20 },
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
  buildCompactTitleBlock: {
    flex: 1,
    gap: 2,
  },
  buildCompactTitle: {
    ...typography.bodySemibold,
    color: appTheme.colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  buildCompactIngredientsText: {
    ...typography.caption,
    color: appTheme.colors.textPrimary,
    textTransform: 'none',
    lineHeight: 20,
  },
  suggestedBlock: {
    gap: 2,
    marginTop: spec.spacing[4],
  },
  suggestedLabel: {
    ...typography.caption,
    color: appTheme.colors.warning,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  suggestedText: {
    ...typography.caption,
    color: appTheme.colors.textPrimary,
    lineHeight: 20,
  },
  compactReason: { ...typography.caption, color: appTheme.colors.textSecondary },
  riskPinsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  emptyCard: { padding: spec.cardPadding },
  emptyText: { ...typography.body, color: appTheme.colors.textSecondary },
});
