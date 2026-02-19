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
import { AppHeader } from '../ui/components/AppHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { Screen } from '../ui/components/Screen';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState(mockHomeGreeting);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>(mockTodayMacros);
  const [recent, setRecent] = React.useState<HistoryItem[]>(mockRecentItems);

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
      <AppHeader />
      <View style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.subtitleHeader}>Ready to scan?</Text>
          </View>
          <Pressable style={styles.avatar} hitSlop={8} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: 'https://dummyimage.com/120x120/e2e8f0/94a3b8.png&text=+' }} style={styles.avatarImage} />
          </Pressable>
        </View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}><Text style={styles.cardTitle}>Today</Text><View style={styles.eatenChip}><Text style={styles.eatenText}>Eaten</Text></View></View>
          <View style={styles.macroRow}>
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CAL</Text><Text style={styles.macroValue}>{Math.round(todayMacros.caloriesKcal)}</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>PROT</Text><Text style={styles.macroValue}>{Math.round(todayMacros.proteinG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>CARB</Text><Text style={styles.macroValue}>{Math.round(todayMacros.carbsG)}g</Text></View>
            <View style={styles.macroDivider} />
            <View style={styles.macroCell}><Text style={styles.macroLabel}>FAT</Text><Text style={styles.macroValue}>{Math.round(todayMacros.fatG)}g</Text></View>
          </View>
          {!hasTargets ? (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText}>Add your parameters to get your personalized daily goals.</Text>
              <SecondaryButton title="Add parameters" onPress={() => navigation.navigate('Profile', { section: 'baseParams' })} />
            </View>
          ) : null}
        </Card>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => navigation.navigate('ScanMenu')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconPurple]}><AppIcon name="scan" /></View>
              <Text style={styles.actionTitle}>Scan menu</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TrackMeal')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconOrange]}><AppIcon name="meal" /></View>
              <Text style={styles.actionTitle}>Track meal</Text>
            </Card>
          </Pressable>
        </View>
        <Text style={styles.recentHeader}>Recent</Text>
        {recent.map((item) => (
          <Pressable key={item.id} onPress={() => item.type === 'menu_scan' ? navigation.navigate('MenuResults', { resultId: item.payloadRef }) : navigation.navigate('TrackMeal', { mealId: item.payloadRef, readOnly: true })}>
            <Card style={styles.recentCard}>
              <View style={styles.recentMain}><Text style={styles.recentTitle}>{item.title}</Text><Text style={styles.recentTime}>{formatTimeAgo(item.createdAt)}</Text></View>
              <Text style={[styles.recentTag, item.type === 'menu_scan' ? styles.recentTagMenu : styles.recentTagMeal]}>{item.type === 'menu_scan' ? 'Menu' : 'Meal'}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={styles.disclaimer}>Nutritional values are estimates based on AI analysis.{'\n'}Please verify with professional advice if needed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: uiTheme.spacing.md, paddingBottom: uiTheme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { ...typography.h1, fontSize: 46 / 1.4, lineHeight: 40 },
  subtitleHeader: { fontSize: 34 / 2, color: uiTheme.colors.textSecondary },
  todayCard: { gap: uiTheme.spacing.md, borderRadius: uiTheme.radius.lg },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eatenChip: { backgroundColor: '#F3EAFA', borderRadius: uiTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  eatenText: { color: uiTheme.colors.accent, fontSize: 13, fontWeight: '700' },
  cardTitle: { ...typography.h3 },
  macroRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between' },
  macroCell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  macroLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  macroValue: { color: uiTheme.colors.textPrimary, fontSize: 36 / 1.2, fontWeight: '700', lineHeight: 36 },
  macroDivider: { width: 1, backgroundColor: '#EEF0F3', marginHorizontal: 2 },
  ctaBox: { backgroundColor: '#F3F6FF', borderRadius: uiTheme.radius.sm, padding: uiTheme.spacing.sm, gap: uiTheme.spacing.sm },
  ctaText: { color: uiTheme.colors.textSecondary, fontSize: 13, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: uiTheme.spacing.sm },
  actionItem: { flex: 1 },
  actionCard: { minHeight: 165, alignItems: 'center', justifyContent: 'center', gap: 14 },
  actionIconWrap: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  actionIconPurple: { backgroundColor: '#F1E9FB' },
  actionIconOrange: { backgroundColor: '#FFF1E2' },
  actionTitle: { color: uiTheme.colors.textPrimary, fontSize: 34 / 2, fontWeight: '700', textAlign: 'center' },
  recentHeader: { ...typography.h3, marginTop: 2 },
  recentCard: { flexDirection: 'row', gap: uiTheme.spacing.sm, alignItems: 'center', minHeight: 88 },
  recentMain: { flex: 1 },
  recentTitle: { color: uiTheme.colors.textPrimary, fontSize: 17, fontWeight: '600' },
  recentTime: { color: uiTheme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  recentTag: { borderRadius: uiTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 4, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
  recentTagMenu: { color: '#3B82F6', backgroundColor: '#EEF6FF' },
  recentTagMeal: { color: '#16A34A', backgroundColor: '#ECFDF3' },
  disclaimer: { marginTop: uiTheme.spacing.md, textAlign: 'center', color: '#9CA3AF', fontSize: 13, lineHeight: 18 },
});
