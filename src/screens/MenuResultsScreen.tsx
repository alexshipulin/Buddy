import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { DishRecommendation, MenuScanResult } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockTopPicksResult } from '../mock/topPicks';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

function DishRow({
  item,
  onWhy,
  onTakeDish,
}: {
  item: DishRecommendation;
  onWhy: (s: string) => void;
  onTakeDish: (item: DishRecommendation) => void;
}): React.JSX.Element {
  return (
    <Card style={styles.dishCard}>
      <Text style={styles.dishName} maxFontSizeMultiplier={1.2}>{item.name}</Text>
      <Text style={styles.reason} maxFontSizeMultiplier={1.2}>{item.reasonShort}</Text>
      <View style={styles.tags}>
        {item.tags.slice(0, 4).map((tag) => (
          <Chip key={`${item.name}_${tag}`} label={tag} small />
        ))}
      </View>
      <View style={styles.actionsRow}>
        <PrimaryButton title="I take it" style={styles.actionBtn} onPress={() => onTakeDish(item)} />
        <Pressable onPress={() => onWhy(item.reasonShort)}>
          <Text style={styles.whyLink} maxFontSizeMultiplier={1.2}>Why?</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export function MenuResultsScreen({ navigation, route }: Props): React.JSX.Element {
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
    await addMealUseCase(
      {
        id: mealId,
        createdAt: new Date().toISOString(),
        title: dish.name,
        source: 'text',
        macros: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        notes: dish.reasonShort,
      },
      { historyRepo },
    );
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${dish.name}.`);
    Alert.alert('Added', `${dish.name} logged to your day.`);
  }, []);

  return (
    <Screen scroll>
      <ScreenHeader leftLabel="Home" title="Top picks" onBack={() => navigation.goBack()} rightAction={<Text style={styles.sparkle}>✦</Text>} />
      <View style={styles.wrap}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>Top picks</Text>
        <Text style={styles.subTitle} maxFontSizeMultiplier={1.2}>Based on your goal and profile</Text>
        {!result ? (
          <Card><Text style={styles.empty} maxFontSizeMultiplier={1.2}>No results yet. Run a scan from Scan menu.</Text></Card>
        ) : (
          <>
            <Card style={styles.summaryCard}><Text style={styles.summary} maxFontSizeMultiplier={1.2}>{result.summaryText}</Text></Card>
            <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.2}>Top picks</Text>
            {result.topPicks.map((item) => <DishRow key={`t_${item.name}`} item={item} onWhy={setWhyText} onTakeDish={handleTakeDish} />)}
            <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.2}>OK with caution</Text>
            {result.caution.map((item) => <DishRow key={`c_${item.name}`} item={item} onWhy={setWhyText} onTakeDish={handleTakeDish} />)}
            <Text style={styles.sectionHeader} maxFontSizeMultiplier={1.2}>Better avoid</Text>
            {result.avoid.map((item) => <DishRow key={`a_${item.name}`} item={item} onWhy={setWhyText} onTakeDish={handleTakeDish} />)}
            <SecondaryButton title="Rescan Menu" onPress={() => navigation.navigate('ScanMenu')} />
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result.id })} style={styles.chatLinkWrap}>
              <Text style={styles.chatLink} maxFontSizeMultiplier={1.2}>Open chat with Buddy</Text>
            </Pressable>
          </>
        )}
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
  wrap: { gap: spec.spacing[12], paddingBottom: spec.spacing[40] },
  sparkle: { color: appTheme.colors.accent, fontSize: 16 },
  title: { ...typography.h1 },
  subTitle: { ...typography.body, color: appTheme.colors.muted },
  empty: { ...typography.body, color: appTheme.colors.muted },
  summaryCard: { padding: spec.spacing[20] },
  summary: { ...typography.body, color: appTheme.colors.muted },
  sectionHeader: { ...typography.h2, marginTop: spec.spacing[8] },
  dishCard: { gap: spec.spacing[12] },
  dishName: { ...typography.h2 },
  reason: { ...typography.body, color: appTheme.colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[8] },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[16] },
  actionBtn: { flex: 1 },
  whyLink: { ...typography.bodySemibold, color: appTheme.colors.accent },
  chatLinkWrap: { alignItems: 'center', paddingVertical: spec.spacing[8] },
  chatLink: { ...typography.bodySemibold, color: appTheme.colors.accent, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182755' },
  sheet: {
    backgroundColor: appTheme.colors.surface,
    borderTopLeftRadius: spec.sheetRadius,
    borderTopRightRadius: spec.sheetRadius,
    padding: spec.cardPadding,
    gap: spec.spacing[16],
  },
  sheetTitle: { ...typography.bodySemibold },
  sheetText: { ...typography.body, color: appTheme.colors.muted },
});
