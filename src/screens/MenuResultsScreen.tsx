import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

const BOTTOM_BAR_PADDING = spec.screenPaddingBottomOffset;
const BOTTOM_BAR_APPROX_HEIGHT = spec.minTouchTarget + BOTTOM_BAR_PADDING * 2;
const SCROLL_PADDING_BOTTOM = BOTTOM_BAR_APPROX_HEIGHT + spec.spacing[12];

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
  return (
    <Card style={styles.topPickCard}>
      <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.reason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
      <View style={styles.confidenceRow}>
        <View style={styles.confidenceChip}>
          <Text style={styles.confidenceChipText} maxFontSizeMultiplier={1.2}>{item.confidencePercent}% confidence</Text>
        </View>
        {highConfidence && (
          <Text style={styles.highConfidenceText} maxFontSizeMultiplier={1.2}>High confidence</Text>
        )}
      </View>
      {(item.pins?.length ?? 0) > 0 && (
        <View style={styles.chipsRow}>
          {item.pins.map((pin) => (
            <Chip key={`${item.name}_pin_${pin}`} label={pin} small />
          ))}
        </View>
      )}
      {(item.dietBadges?.length ?? 0) > 0 && (
        <View style={styles.chipsRow}>
          {item.dietBadges.map((badge) => (
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
        <PrimaryButton title="I take it" style={styles.takeBtn} onPress={() => onTakeDish(item)} />
        <Pressable onPress={() => onAskBuddy(item)} style={styles.askBuddyCardLink} hitSlop={8}>
          <Text style={styles.askBuddyCardLinkText} maxFontSizeMultiplier={1.2}>Ask Buddy</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function CautionCard({
  item,
  onTakeDish,
}: {
  item: DishPick;
  onTakeDish: (d: DishPick) => void;
}): React.JSX.Element {
  const firstPin = item.pins?.[0];
  return (
    <Pressable style={styles.compactCard} onPress={() => onTakeDish(item)}>
      <View style={styles.compactHead}>
        <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
        {firstPin != null && (
          <View style={styles.cautionTag}>
            <Text style={styles.cautionTagText} maxFontSizeMultiplier={1.2}>{firstPin}</Text>
          </View>
        )}
      </View>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
    </Pressable>
  );
}

function AvoidCard({ item }: { item: DishPick }): React.JSX.Element {
  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.shortReason}</Text>
    </View>
  );
}

function SectionTitle({
  icon,
  iconColor,
  title,
}: {
  icon: string;
  iconColor: string;
  title: string;
}): React.JSX.Element {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionIcon, { color: iconColor }]}>{icon}</Text>
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
        // #region agent log
        fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'MenuResultsScreen.tsx:useEffect:byId',message:'loaded by resultId',hypothesisId:'C',data:{found:!!byId,hasPins:byId?Array.isArray((byId as any).topPicks?.[0]?.pins):null,firstPick:byId?(byId as any).topPicks?.[0]:null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (byId) return setResult(byId);
      }
      const first = (await historyRepo.listRecent(20)).find((i) => i.type === 'menu_scan');
      const latestResult = first ? await historyRepo.getScanResultById(first.payloadRef) : null;
      // #region agent log
      fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'MenuResultsScreen.tsx:useEffect:latest',message:'loaded latest result',hypothesisId:'C',data:{found:!!latestResult,hasPins:latestResult?Array.isArray((latestResult as any).topPicks?.[0]?.pins):null,topPicksCount:latestResult?(latestResult as any).topPicks?.length:null,firstPickKeys:latestResult?(Object.keys((latestResult as any).topPicks?.[0]??{})):null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
    await addMealUseCase(
      {
        id: mealId,
        createdAt: new Date().toISOString(),
        title: dish.name,
        source: 'text',
        macros: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        notes: dish.shortReason,
      },
      { historyRepo },
    );
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}.`);
    Alert.alert('Added', `${dish.name} logged to your day.`);
  }, []);

  const scrollPaddingBottom = insets.bottom + (result ? SCROLL_PADDING_BOTTOM : spec.spacing[24]);
  const bottomBarPaddingBottom = insets.bottom + BOTTOM_BAR_PADDING;

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
                <SectionTitle icon="👍" iconColor={appTheme.colors.success} title="Top picks" />
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
                    <CautionCard key={`c_${item.name}`} item={item} onTakeDish={handleTakeDish} />
                  ))}
                </View>
              </View>

              <View style={[styles.section, styles.sectionMutedMore]}>
                <SectionTitle icon="⊘" iconColor={appTheme.colors.danger} title="Better avoid" />
                <View style={styles.cardsColumn}>
                  {result.avoid.map((item) => (
                    <AvoidCard key={`a_${item.name}`} item={item} />
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Audit fix: render sticky actions only when result exists (prevents undefined resultId navigation) */}
        {result ? (
          <View
            style={[
              styles.bottomBar,
              {
                paddingBottom: bottomBarPaddingBottom,
                paddingTop: BOTTOM_BAR_PADDING,
              },
            ]}
          >
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result.id })} style={styles.askBuddyLinkWrap}>
              <Text style={styles.askBuddyLink} maxFontSizeMultiplier={1.2}>Ask Buddy</Text>
            </Pressable>
          </View>
        ) : null}
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
  cardsColumn: { gap: spec.spacing[16] },
  topPickCard: { gap: spec.spacing[16] },
  dishName: { ...typography.h2, color: appTheme.colors.textPrimary, marginBottom: spec.spacing[4] },
  reason: { ...typography.caption, color: appTheme.colors.textSecondary, marginBottom: spec.spacing[8] },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8], marginBottom: spec.spacing[8] },
  confidenceChip: {
    backgroundColor: appTheme.colors.successSoft,
    paddingHorizontal: spec.spacing[8],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.radius.input,
  },
  confidenceChipText: { fontSize: appTheme.typography.caption1.fontSize, fontWeight: '700', color: appTheme.colors.success },
  highConfidenceText: { ...typography.footnote, color: appTheme.colors.success, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8], marginBottom: spec.spacing[8] },
  extraLine: { ...typography.caption, color: appTheme.colors.textSecondary, marginBottom: spec.spacing[4] },
  cardActions: { flexDirection: 'row', gap: spec.spacing[12], marginTop: spec.spacing[4], alignItems: 'center' },
  takeBtn: { flex: 1 },
  askBuddyCardLink: { justifyContent: 'center', minHeight: spec.minTouchTarget, paddingVertical: spec.spacing[4] },
  askBuddyCardLinkText: { ...typography.bodySemibold, color: appTheme.colors.accent },
  compactCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    padding: spec.cardPadding,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
    ...appTheme.shadows.card,
  },
  compactHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spec.spacing[4] },
  compactTitle: { ...typography.bodySemibold, color: appTheme.colors.textPrimary, flex: 1 },
  compactReason: { ...typography.caption, color: appTheme.colors.textSecondary },
  cautionTag: {
    backgroundColor: appTheme.colors.warningSoft,
    paddingHorizontal: spec.spacing[8],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.inputRadius,
  },
  cautionTagText: { fontSize: appTheme.typography.caption1.fontSize, fontWeight: '700', color: appTheme.colors.warning },
  emptyCard: { padding: spec.cardPadding },
  emptyText: { ...typography.body, color: appTheme.colors.textSecondary },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spec.screenPaddingHorizontal,
  },
  askBuddyLinkWrap: { alignItems: 'center', paddingVertical: spec.spacing[8], minHeight: spec.minTouchTarget, justifyContent: 'center' },
  askBuddyLink: { ...typography.bodySemibold, color: appTheme.colors.accent },
});
