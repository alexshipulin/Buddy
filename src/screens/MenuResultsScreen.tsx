import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { DishPick, MenuScanResult } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockTopPicksResult } from '../mock/topPicks';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { MacroBar } from '../ui/components/MacroBar';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';


type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

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
  return (
    <Card style={styles.topPickCard}>
      <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.reason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
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
  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
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
  const insets = useSafeAreaInsets();
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [paywallHandled, setPaywallHandled] = React.useState(false);

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
      setResult(USE_MOCK_DATA ? mockTopPicksResult : null);
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
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>Menu picks</Text>
            <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>Based on your goal and profile</Text>
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
                  {result.topPicks.slice(0, 3).map((item) => (
                    <TopPickCard
                      key={`t_${item.name}`}
                      item={item}
                      onTakeDish={handleTakeDish}
                      onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })}
                    />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMuted]}>
                <SectionTitle icon="⚠" iconColor={appTheme.colors.warning} title="OK with caution" />
                <View style={styles.cardsColumn}>
                  {result.caution.map((item) => (
                    <CautionCard key={`c_${item.name}`} item={item} onTakeDish={handleTakeDish} onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })} onShowQuickFix={handleShowQuickFix} />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMutedMore]}>
                <SectionTitle icon="⊘" iconColor={appTheme.colors.danger} title="Better avoid" />
                <View style={styles.cardsColumn}>
                  {result.avoid.map((item) => (
                    <AvoidCard key={`a_${item.name}`} item={item} onTakeDish={handleTakeDish} onAskBuddy={() => navigation.navigate('Chat', { resultId: result.id })} />
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
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spec.spacing[8] },
  section: { marginBottom: spec.spacing[32] },
  sectionMuted: { opacity: 0.85 },
  sectionMutedMore: { opacity: 0.7 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginBottom: spec.spacing[16] },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { ...typography.h2, color: appTheme.colors.textPrimary },
  cardsColumn: { gap: spec.spacing[20] },
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
  emptyCard: { padding: spec.cardPadding },
  emptyText: { ...typography.body, color: appTheme.colors.textSecondary },
});
