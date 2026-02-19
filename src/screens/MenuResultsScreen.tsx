import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { SectionHeader } from '../components/SectionHeader';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { DishRecommendation, MenuScanResult } from '../domain/models';
import { chatRepo, historyRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'MenuResults'>;

function DishRow({ item, onWhy }: { item: DishRecommendation; onWhy: (s: string) => void }): React.JSX.Element {
  return (
    <Card style={styles.dishCard}>
      <Text style={styles.dishName}>{item.name}</Text>
      <Text style={styles.reason}>{item.reasonShort}</Text>
      <View style={styles.tags}>{item.tags.slice(0, 6).map((tag) => <Chip key={`${item.name}_${tag}`} label={tag} />)}</View>
      <Pressable style={styles.whyBtn} onPress={() => onWhy(item.reasonShort)}><Text style={styles.whyText}>Why?</Text></Pressable>
    </Card>
  );
}

export function MenuResultsScreen({ navigation, route }: Props): React.JSX.Element {
  const [result, setResult] = React.useState<MenuScanResult | null>(null);
  const [whyText, setWhyText] = React.useState<string | null>(null);
  const [paywallHandled, setPaywallHandled] = React.useState(false);
  React.useEffect(() => { void (async () => {
    if (route.params?.resultId) return setResult(await historyRepo.getScanResultById(route.params.resultId));
    const first = (await historyRepo.listRecent(20)).find((i) => i.type === 'menu_scan');
    setResult(first ? await historyRepo.getScanResultById(first.payloadRef) : null);
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
    <AppScreen scroll>
      <View style={styles.wrap}>
        <Text style={styles.status}>Analysis Complete</Text>
        <Text style={styles.title}>Top picks</Text>
        <Text style={styles.subTitle}>Based on your goal and profile</Text>
        {!result ? <Card><Text style={styles.empty}>No results yet. Run a scan from Scan menu.</Text></Card> : (
          <>
            <Card><Text style={styles.summary}>{result.summaryText}</Text></Card>
            <SectionHeader title="Top picks" />
            {result.topPicks.map((item) => <DishRow key={`t_${item.name}`} item={item} onWhy={setWhyText} />)}
            <SectionHeader title="OK with caution" /><Text style={styles.sectionHint}>Some trade-offs. Check ingredients.</Text>
            {result.caution.map((item) => <DishRow key={`c_${item.name}`} item={item} onWhy={setWhyText} />)}
            <SectionHeader title="Better avoid" /><Text style={styles.sectionHint}>Likely mismatch for your goal or preferences.</Text>
            {result.avoid.map((item) => <DishRow key={`a_${item.name}`} item={item} onWhy={setWhyText} />)}
            <SecondaryButton title="Rescan" onPress={() => navigation.navigate('ScanMenu')} />
            <Pressable onPress={() => navigation.navigate('Chat', { resultId: result.id })}><Text style={styles.chatLink}>Open chat with Buddy</Text></Pressable>
            <Text style={styles.disclaimer}>Educational guidance only. Not medical advice.</Text>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.xl },
  status: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, textAlign: 'center' },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '700' },
  subTitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  empty: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
  summary: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
  dishCard: { gap: appTheme.spacing.xs },
  dishName: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.body, fontWeight: '700' },
  reason: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs },
  whyBtn: { alignSelf: 'flex-start', marginTop: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: appTheme.radius.pill, backgroundColor: appTheme.colors.accentSoft },
  whyText: { color: appTheme.colors.accent, fontSize: appTheme.typography.small, fontWeight: '700' },
  sectionHint: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, marginTop: -8 },
  disclaimer: { marginTop: appTheme.spacing.md, color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  chatLink: { textAlign: 'center', color: appTheme.colors.accent, fontSize: appTheme.typography.small, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182755' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: appTheme.radius.xl, borderTopRightRadius: appTheme.radius.xl, padding: appTheme.spacing.md, gap: appTheme.spacing.sm },
  sheetTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.body, fontWeight: '700' },
  sheetText: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
});
