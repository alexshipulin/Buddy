import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { HistoryItem, MacroTotals, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockHomeGreeting, mockRecentItems, mockTodayMacros } from '../mock/home';
import { historyRepo, userRepo } from '../services/container';
import { computeTodayMacrosUseCase } from '../services/computeTodayMacrosUseCase';
import { formatTimeAgo } from '../utils/time';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { Screen } from '../ui/components/Screen';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState('Hello');
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>({ caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [recent, setRecent] = React.useState<HistoryItem[]>([]);

  const load = React.useCallback(async (): Promise<void> => {
    if (USE_MOCK_DATA) {
      setGreeting(mockHomeGreeting);
      setTodayMacros(mockTodayMacros);
      setRecent(mockRecentItems);
      return;
    }
    const loadedUser = await userRepo.getUser();
    const loadedMacros = await computeTodayMacrosUseCase(new Date(), { historyRepo });
    const loadedRecent = await historyRepo.listRecent(10);
    setUser(loadedUser);
    setTodayMacros(loadedMacros);
    setRecent(loadedRecent);
    const auth = await userRepo.getAuthState();
    setGreeting(auth.displayName ? `Hello, ${auth.displayName}` : 'Hello, Alex');
  }, []);
  useFocusEffect(React.useCallback(() => { void load(); return undefined; }, [load]));

  const hasTargets = Boolean(user?.baseParams);

  return (
    <Screen scroll>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>{greeting}</Text>
            <Text style={styles.subtitleHeader} maxFontSizeMultiplier={1.2}>Ready to scan?</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: 'https://dummyimage.com/120x120/e2e8f0/94a3b8.png&text=+' }} style={styles.avatarImage} />
          </Pressable>
        </View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>Today</Text>
            <View style={styles.eatenChip}>
              <Text style={styles.eatenText} maxFontSizeMultiplier={1.2}>Eaten</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CAL</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.caloriesKcal)}</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>PROT</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.proteinG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CARB</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.carbsG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>FAT</Text><Text style={styles.macroValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.fatG)}g</Text></View>
          </View>
          {!hasTargets ? (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>Add your parameters to get your personalized daily goals.</Text>
              <SecondaryButton title="Add parameters" onPress={() => navigation.navigate('Profile', { section: 'baseParams' })} />
            </View>
          ) : null}
        </Card>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => navigation.navigate('ScanMenu')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconPurple]}><AppIcon name="scan" /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Scan menu</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TrackMeal')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconOrange]}><AppIcon name="meal" /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Track meal</Text>
            </Card>
          </Pressable>
        </View>
        <Text style={styles.recentHeader} maxFontSizeMultiplier={1.2}>Recent</Text>
        {recent.map((item) => (
          <Pressable key={item.id} onPress={() => item.type === 'menu_scan' ? navigation.navigate('MenuResults', { resultId: item.payloadRef }) : navigation.navigate('TrackMeal', { mealId: item.payloadRef, readOnly: true })}>
            <Card style={styles.recentCard}>
              <View style={styles.recentMain}><Text style={styles.recentTitle} maxFontSizeMultiplier={1.2}>{item.title}</Text><Text style={styles.recentTime}>{formatTimeAgo(item.createdAt)}</Text></View>
              <Text style={[styles.recentTag, item.type === 'menu_scan' ? styles.recentTagMenu : styles.recentTagMeal]}>{item.type === 'menu_scan' ? 'Menu' : 'Meal'}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Nutritional values are estimates based on AI analysis.{'\n'}Please verify with professional advice if needed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spec.spacing[16], paddingBottom: spec.spacing[40] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', minWidth: spec.minTouchTarget, minHeight: spec.minTouchTarget },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { ...typography.hero },
  subtitleHeader: { ...typography.body, color: appTheme.colors.muted, marginTop: 4 },
  todayCard: { gap: spec.spacing[16] },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eatenChip: { backgroundColor: appTheme.colors.accentSoft, borderRadius: 14, paddingHorizontal: 12, height: 28, alignItems: 'center', justifyContent: 'center' },
  eatenText: { color: appTheme.colors.accent, ...appTheme.typography.caption, fontWeight: '700' },
  cardTitle: { ...typography.h2 },
  macroRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between' },
  macroCell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  macroLabel: { ...typography.overline, color: appTheme.colors.muted },
  macroValue: { ...typography.h1 },
  macroDivider: { width: 1, backgroundColor: appTheme.colors.border, marginHorizontal: 2 },
  ctaBox: { backgroundColor: appTheme.colors.infoSoft, borderRadius: spec.inputRadius, padding: spec.spacing[12], gap: spec.spacing[12] },
  ctaText: { ...typography.caption, color: appTheme.colors.muted, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: spec.spacing[16] },
  actionItem: { flex: 1 },
  actionCard: { minHeight: 165, alignItems: 'center', justifyContent: 'center', gap: 14 },
  actionIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionIconPurple: { backgroundColor: appTheme.colors.accentSoft },
  actionIconOrange: { backgroundColor: '#FFF1E2' },
  actionTitle: { ...typography.h2, textAlign: 'center' },
  recentHeader: { ...typography.h2, marginTop: spec.spacing[4] },
  recentCard: { flexDirection: 'row', gap: spec.spacing[12], alignItems: 'center', minHeight: 88 },
  recentMain: { flex: 1 },
  recentTitle: { ...typography.bodySemibold },
  recentTime: { ...typography.caption, color: appTheme.colors.muted, marginTop: 2 },
  recentTag: { borderRadius: spec.chipRadius, paddingHorizontal: 12, paddingVertical: 4, ...appTheme.typography.caption, fontWeight: '700', overflow: 'hidden' },
  recentTagMenu: { color: appTheme.colors.info, backgroundColor: appTheme.colors.infoSoft },
  recentTagMeal: { color: appTheme.colors.success, backgroundColor: appTheme.colors.successSoft },
  disclaimer: { marginTop: spec.spacing[16], textAlign: 'center', ...typography.caption, color: appTheme.colors.muted },
});
