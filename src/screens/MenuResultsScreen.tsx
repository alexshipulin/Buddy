import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { DishRecommendation, MenuScanResult } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockTopPicksResult } from '../mock/topPicks';
import { chatRepo, historyRepo } from '../services/container';
import { AppHeader } from '../ui/components/AppHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { Chip } from '../ui/components/Chip';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

function DishRow({ item, onWhy }: { item: DishRecommendation; onWhy: (s: string) => void }): React.JSX.Element {
  const match = Math.max(86, 98 - item.name.length % 7);
  return (
    <Card style={styles.dishCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.dishName}>{item.name}</Text>
        <Text style={styles.matchText}>{match}% match</Text>
      </View>
      <Text style={styles.reason}>{item.reasonShort}</Text>
      <View style={styles.macroRow}>
        <View style={styles.macroCell}><Text style={styles.macroLabel}>CALS</Text><Text style={styles.macroValue}>{280 + item.name.length * 2}</Text></View>
        <View style={styles.macroCell}><Text style={styles.macroLabel}>P</Text><Text style={styles.macroValue}>{20 + item.name.length % 20}g</Text></View>
        <View style={styles.macroCell}><Text style={styles.macroLabel}>C</Text><Text style={styles.macroValue}>{8 + item.tags.length * 3}g</Text></View>
        <View style={styles.macroCell}><Text style={styles.macroLabel}>F</Text><Text style={styles.macroValue}>{7 + item.name.length % 12}g</Text></View>
      </View>
      <View style={styles.tags}>{item.tags.slice(0, 4).map((tag) => <Chip key={`${item.name}_${tag}`} label={tag} />)}</View>
      <View style={styles.statusRow}>
        <Text style={styles.statusOk}>● Allergen safe</Text>
        <Text style={styles.statusConf}>✦ High confidence</Text>
      </View>
      <View style={styles.actionsRow}>
        <PrimaryButton title="I take it" style={styles.actionBtn} />
        <SecondaryButton title="Ask Buddy" style={styles.actionBtn} onPress={() => onWhy(item.reasonShort)} />
      </View>
    </Card>
  );
}

export function MenuResultsScreen({ navigation, route }: Props): React.JSX.Element {
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [whyText, setWhyText] = React.useState<string | null>(null);
  const [paywallHandled, setPaywallHandled] = React.useState(false);
  React.useEffect(() => { void (async () => {
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
  })(); }, [route.params?.resultId]);
  React.useEffect(() => {
    if (!result || paywallHandled || !route.params?.paywallAfterOpen) return;
    setPaywallHandled(true);
    navigation.navigate('Paywall', { source: 'first_result', trialDaysLeft: route.params?.trialDaysLeft ?? 7 });
  }, [navigation, paywallHandled, result, route.params?.paywallAfterOpen, route.params?.trialDaysLeft]);
  React.useEffect(() => { void (async () => {
    if (!result) return;
    const picks = result.topPicks.map((i, idx) => `${idx + 1}. ${i.name}`).join('\n');
    await chatRepo.addSystemMessageIfMissing(`result_${result.id}`, `${result.summaryText}\nTop picks:\n${picks}`);
  })(); }, [result]);

  return (
    <Screen scroll>
      <AppHeader title="Top picks" onBack={() => navigation.goBack()} rightAction={<AppIcon name="sparkles" size={16} />} />
      <View style={styles.wrap}>
        <Text style={styles.status}>Analysis complete</Text>
        <Text style={styles.title}>Menupicks</Text>
        <Text style={styles.subTitle}>Based on your goal and profile</Text>
        {!result ? <Card><Text style={styles.empty}>No results yet. Run a scan from Scan menu.</Text></Card> : (
          <>
            <Card><Text style={styles.summary}>{result.summaryText}</Text></Card>
            <Text style={styles.sectionHeader}>👍 Top picks</Text>
            {result.topPicks.map((item) => <DishRow key={`t_${item.name}`} item={item} onWhy={setWhyText} />)}
            <Text style={styles.sectionHeader}>⚠️ OK with caution</Text>
            {result.caution.map((item) => <DishRow key={`c_${item.name}`} item={item} onWhy={setWhyText} />)}
            <Text style={styles.sectionHeader}>🚫 Better avoid</Text>
            {result.avoid.map((item) => <DishRow key={`a_${item.name}`} item={item} onWhy={setWhyText} />)}
            <SecondaryButton title="Rescan Menu" onPress={() => navigation.navigate('ScanMenu')} />
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result.id })}><Text style={styles.chatLink}>Open chat with Buddy</Text></Pressable>
          </>
        )}
      </View>
      <Modal transparent visible={Boolean(whyText)} animationType="slide" onRequestClose={() => setWhyText(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setWhyText(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Why this recommendation?</Text>
            <Text style={styles.sheetText}>{whyText}</Text>
            <SecondaryButton title="Close" onPress={() => setWhyText(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: uiTheme.spacing.sm, paddingBottom: uiTheme.spacing.xl },
  status: { color: uiTheme.colors.textSecondary, fontSize: 13, textAlign: 'left' },
  title: { ...typography.h2 },
  subTitle: { color: uiTheme.colors.textSecondary, fontSize: 14 },
  empty: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  summary: { color: uiTheme.colors.textSecondary, fontSize: 16 },
  sectionHeader: { ...typography.h3, marginTop: 6 },
  dishCard: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dishName: { color: uiTheme.colors.textPrimary, fontSize: 23 / 1.3, fontWeight: '700', flex: 1 },
  matchText: { color: uiTheme.colors.success, fontSize: 13, fontWeight: '700' },
  reason: { color: uiTheme.colors.textSecondary, fontSize: 14 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEF1F6', paddingVertical: 8 },
  macroCell: { alignItems: 'center', flex: 1 },
  macroLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  macroValue: { fontSize: 15, color: uiTheme.colors.textPrimary, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusOk: { fontSize: 13, color: uiTheme.colors.success },
  statusConf: { fontSize: 13, color: '#64748B' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, minHeight: 44 },
  chatLink: { textAlign: 'center', color: uiTheme.colors.accent, fontSize: 14, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182755' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: uiTheme.radius.xl, borderTopRightRadius: uiTheme.radius.xl, padding: uiTheme.spacing.md, gap: uiTheme.spacing.sm },
  sheetTitle: { color: uiTheme.colors.textPrimary, fontSize: 17, fontWeight: '700' },
  sheetText: { color: uiTheme.colors.textSecondary, fontSize: 17 },
});
