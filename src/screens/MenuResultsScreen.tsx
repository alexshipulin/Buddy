import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { DishRecommendation, MenuScanResult } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockTopPicksResult } from '../mock/topPicks';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

const BOTTOM_BAR_PADDING = spec.screenPaddingBottomOffset;
const BOTTOM_BAR_APPROX_HEIGHT = spec.primaryButtonHeight + spec.spacing[12] + spec.minTouchTarget + BOTTOM_BAR_PADDING * 2;
const SCROLL_PADDING_BOTTOM = BOTTOM_BAR_APPROX_HEIGHT + spec.spacing[24];

type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

function TopPickCard({
  item,
  onTakeDish,
  onAskBuddy,
}: {
  item: DishRecommendation;
  onTakeDish: (d: DishRecommendation) => void;
  onAskBuddy: (d: DishRecommendation) => void;
}): React.JSX.Element {
  const hasMacros = Boolean(item.macros);
  return (
    <Card style={styles.topPickCard}>
      <View style={styles.cardHead}>
        <View style={styles.cardHeadText}>
          <Text style={styles.dishName} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.name}</Text>
          <Text style={styles.reason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
        </View>
        {item.matchPercent != null && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText} maxFontSizeMultiplier={1.2}>{item.matchPercent}% match</Text>
          </View>
        )}
      </View>
      {hasMacros && item.macros && (
        <View style={styles.macroGrid}>
          <View style={styles.macroCol}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>Cals</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.caloriesKcal}</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>P</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.proteinG}g</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>C</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.carbsG}g</Text>
          </View>
          <View style={[styles.macroCol, styles.macroColBorder]}>
            <Text style={styles.macroLabel} maxFontSizeMultiplier={1.2}>F</Text>
            <Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{item.macros.fatG}g</Text>
          </View>
        </View>
      )}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag) => (
            <Chip key={`${item.name}_${tag}`} label={tag} small />
          ))}
        </View>
      )}
      <View style={styles.statusRow}>
        {item.warningLabel ? (
          <View style={styles.statusItem}>
            <Text style={styles.statusWarningIcon}>⚠</Text>
            <Text style={styles.statusText} maxFontSizeMultiplier={1.2}>{item.warningLabel}</Text>
          </View>
        ) : (
          <View style={styles.statusItem}>
            <Text style={styles.statusOkIcon}>✓</Text>
            <Text style={styles.statusText} maxFontSizeMultiplier={1.2}>Allergen safe</Text>
          </View>
        )}
        <View style={styles.statusItem}>
          <Text style={styles.sparkleIcon}>✦</Text>
          <Text style={styles.statusMuted} maxFontSizeMultiplier={1.2}>High confidence analysis</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <PrimaryButton title="I take it" style={styles.takeBtn} onPress={() => onTakeDish(item)} />
        <SecondaryButton title="Ask Buddy" style={styles.askBtn} onPress={() => onAskBuddy(item)} />
      </View>
    </Card>
  );
}

function CautionCard({
  item,
  onTakeDish,
}: {
  item: DishRecommendation;
  onTakeDish: (d: DishRecommendation) => void;
}): React.JSX.Element {
  const firstTag = item.tags[0];
  return (
    <Pressable style={styles.compactCard} onPress={() => onTakeDish(item)}>
      <View style={styles.compactHead}>
        <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
        {firstTag && (
          <View style={styles.cautionTag}>
            <Text style={styles.cautionTagText} maxFontSizeMultiplier={1.2}>{firstTag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
    </Pressable>
  );
}

function AvoidCard({ item }: { item: DishRecommendation }): React.JSX.Element {
  return (
    <View style={styles.compactCard}>
      <Text style={styles.compactTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.compactReason} numberOfLines={2} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
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
  const [whyText, setWhyText] = React.useState<string | null>(null);
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

  const handleTakeDish = React.useCallback(async (dish: DishRecommendation): Promise<void> => {
    const mealId = createId('meal');
    const macros = dish.macros ?? { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    await addMealUseCase(
      {
        id: mealId,
        createdAt: new Date().toISOString(),
        title: dish.name,
        source: 'text',
        macros,
        notes: dish.reasonShort,
      },
      { historyRepo },
    );
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}.`);
    Alert.alert('Added', `${dish.name} logged to your day.`);
  }, []);

  const scrollPaddingBottom = insets.bottom + SCROLL_PADDING_BOTTOM;
  const bottomBarPaddingBottom = insets.bottom + BOTTOM_BAR_PADDING;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.root}>
        {/* Custom header: back, Analysis Complete, more */}
        <View style={[styles.header, { paddingTop: insets.top + spec.headerPaddingTopOffset }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              hitSlop={8}
            >
              <Text style={styles.headerBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.headerCenter} maxFontSizeMultiplier={1.2}>Analysis Complete</Text>
            <Pressable style={styles.headerBtn} hitSlop={8}>
              <Text style={styles.headerBtnText}>⋯</Text>
            </Pressable>
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
                  {result.topPicks.map((item) => (
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

        {/* Fixed bottom bar */}
        <View
          style={[
            styles.bottomBar,
            styles.bottomBarBg,
            {
              paddingBottom: bottomBarPaddingBottom,
              paddingTop: BOTTOM_BAR_PADDING,
            },
          ]}
        >
          <View style={styles.bottomBarContent}>
            <Pressable
              style={({ pressed }) => [styles.rescanBtn, pressed && styles.rescanPressed]}
              onPress={() => navigation.navigate('ScanMenu')}
            >
              <Text style={styles.rescanIcon}>⊙</Text>
              <Text style={styles.rescanBtnText} maxFontSizeMultiplier={1.2}>Rescan Menu</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result?.id })} style={styles.chatLinkWrap}>
              <Text style={styles.chatLink} maxFontSizeMultiplier={1.2}>Open chat with Buddy</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal transparent visible={Boolean(whyText)} animationType="slide" onRequestClose={() => setWhyText(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setWhyText(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.2}>Why this recommendation?</Text>
            <Text style={styles.sheetText} maxFontSizeMultiplier={1.2}>{whyText}</Text>
            <SecondaryButton title="Close" onPress={() => setWhyText(null)} />
          </Pressable>
        </Pressable>
      </Modal>
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { fontSize: 22, color: appTheme.colors.textPrimary, fontWeight: '300' },
  headerCenter: {
    fontSize: spec.headerPillFontSize,
    fontWeight: '600',
    color: appTheme.colors.textSecondary,
  },
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spec.spacing[8] },
  cardHeadText: { flex: 1, minWidth: 0 },
  dishName: { ...typography.h2, color: appTheme.colors.textPrimary, marginBottom: spec.spacing[4] },
  reason: { ...typography.caption, color: appTheme.colors.textSecondary },
  matchBadge: {
    backgroundColor: appTheme.colors.successSoft,
    paddingHorizontal: spec.spacing[8],
    paddingVertical: spec.spacing[4],
    borderRadius: spec.radius.input,
  },
  matchText: { fontSize: appTheme.typography.caption1.fontSize, fontWeight: '700', color: appTheme.colors.success },
  macroGrid: {
    flexDirection: 'row',
    backgroundColor: appTheme.colors.background,
    borderRadius: spec.radius.input,
    padding: spec.spacing[12],
  },
  macroCol: { flex: 1, alignItems: 'center' },
  macroColBorder: { borderLeftWidth: 1, borderLeftColor: appTheme.colors.border },
  macroLabel: {
    ...typography.overline,
    color: appTheme.colors.textSecondary,
    marginBottom: spec.spacing[4],
  },
  macroValue: { ...typography.h3, color: appTheme.colors.textPrimary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  statusRow: {
    paddingTop: spec.spacing[12],
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
    gap: spec.spacing[4],
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[8] },
  statusOkIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.success },
  statusWarningIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.warning },
  sparkleIcon: { fontSize: appTheme.typography.footnote.fontSize, color: appTheme.colors.textSecondary },
  statusText: { ...typography.caption, color: appTheme.colors.textSecondary },
  statusMuted: { ...typography.caption, color: appTheme.colors.textSecondary, opacity: 0.9 },
  cardActions: { flexDirection: 'row', gap: spec.spacing[12], marginTop: spec.spacing[4] },
  takeBtn: { flex: 1 },
  askBtn: { minWidth: 0 },
  compactCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: spec.cardRadius,
    padding: spec.cardPadding,
    borderWidth: spec.cardBorderWidth,
    borderColor: appTheme.colors.border,
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
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  bottomBarBg: { backgroundColor: 'rgba(255,255,255,0.95)' },
  bottomBarContent: { paddingHorizontal: spec.screenPaddingHorizontal, gap: spec.spacing[12] },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[8],
    minHeight: spec.primaryButtonHeight,
    borderRadius: spec.primaryButtonRadius,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  rescanPressed: { opacity: 0.9 },
  rescanIcon: { fontSize: 20, color: appTheme.colors.textPrimary },
  rescanBtnText: {
    fontSize: appTheme.typography.bodySemibold.fontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  chatLinkWrap: { alignItems: 'center', paddingVertical: spec.spacing[4] },
  chatLink: { ...typography.bodySemibold, color: appTheme.colors.accent },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182755' },
  sheet: {
    backgroundColor: appTheme.colors.surface,
    borderTopLeftRadius: spec.sheetRadius,
    borderTopRightRadius: spec.sheetRadius,
    padding: spec.cardPadding,
    gap: spec.spacing[16],
  },
  sheetTitle: { ...typography.bodySemibold },
  sheetText: { ...typography.body, color: appTheme.colors.textSecondary },
});
