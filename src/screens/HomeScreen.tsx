import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { ProgressBarRow } from '../components/ProgressBarRow';
import { SecondaryButton } from '../components/SecondaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { appTheme } from '../design/theme';
import { HistoryItem, MacroTotals, UserProfile } from '../domain/models';
import { historyRepo, userRepo } from '../services/container';
import { computePersonalTargets } from '../services/computePersonalTargets';
import { computeTodayMacrosUseCase } from '../services/computeTodayMacrosUseCase';
import { formatTimeAgo } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState('Hi');
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>({ caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [recent, setRecent] = React.useState<HistoryItem[]>([]);

  const load = React.useCallback(async (): Promise<void> => {
    const loadedUser = await userRepo.getUser();
    const loadedMacros = await computeTodayMacrosUseCase(new Date(), { historyRepo });
    const loadedRecent = await historyRepo.listRecent(10);
    setUser(loadedUser);
    setTodayMacros(loadedMacros);
    setRecent(loadedRecent);
    const auth = await userRepo.getAuthState();
    setGreeting(auth.displayName ? `Hi, ${auth.displayName}` : 'Hi');
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',runId:'pre-fix',hypothesisId:'H1_H5',location:'src/screens/HomeScreen.tsx:35',message:'Home render data and icon mode',data:{hasBaseParams:Boolean(loadedUser?.baseParams),recentCount:loadedRecent.length,avatarMode:'text-letter',actionCardIconMode:'none-text-only'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);
  useFocusEffect(React.useCallback(() => { void load(); return undefined; }, [load]));

  const targets = computePersonalTargets(user ?? { goal: 'Maintain weight', dietaryPreferences: [], allergies: [] });
  const hasTargets = Boolean(user?.baseParams && targets);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.subtitleHeader}>Ready to scan?</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Profile')}><Text style={styles.avatarText}>A</Text></Pressable>
        </View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}><Text style={styles.cardTitle}>Today</Text><View style={styles.eatenChip}><Text style={styles.eatenText}>Eaten</Text></View></View>
          {hasTargets ? (
            <>
              <ProgressBarRow label="Calories" valueLabel={`${Math.round(todayMacros.caloriesKcal)} / ${Math.round(targets!.caloriesKcal)} kcal`} progress={Math.min(todayMacros.caloriesKcal / targets!.caloriesKcal, 1)} />
              <ProgressBarRow label="Protein" valueLabel={`${Math.round(todayMacros.proteinG)} / ${Math.round(targets!.proteinG)} g`} progress={Math.min(todayMacros.proteinG / Math.max(1, targets!.proteinG), 1)} />
              <ProgressBarRow label="Carbs" valueLabel={`${Math.round(todayMacros.carbsG)} / ${Math.round(targets!.carbsG)} g`} progress={Math.min(todayMacros.carbsG / Math.max(1, targets!.carbsG), 1)} />
              <ProgressBarRow label="Fat" valueLabel={`${Math.round(todayMacros.fatG)} / ${Math.round(targets!.fatG)} g`} progress={Math.min(todayMacros.fatG / Math.max(1, targets!.fatG), 1)} />
            </>
          ) : (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText}>Add your parameters to get your personalized daily goals.</Text>
              <SecondaryButton title="Add parameters" onPress={() => navigation.navigate('Profile', { section: 'baseParams' })} />
            </View>
          )}
        </Card>
        <View style={styles.actionGrid}>
          <Pressable onPress={() => navigation.navigate('ScanMenu')} style={styles.actionItem}><Card style={styles.actionCard}><Text style={styles.actionTitle}>Scan menu</Text></Card></Pressable>
          <Pressable onPress={() => navigation.navigate('TrackMeal')} style={styles.actionItem}><Card style={styles.actionCard}><Text style={styles.actionTitle}>Track meal</Text></Card></Pressable>
        </View>
        <SectionHeader title="Recent" />
        {recent.map((item) => (
          <Pressable key={item.id} onPress={() => item.type === 'menu_scan' ? navigation.navigate('MenuResults', { resultId: item.payloadRef }) : navigation.navigate('TrackMeal', { mealId: item.payloadRef, readOnly: true })}>
            <Card style={styles.recentCard}>
              <Text style={styles.recentIcon}>{item.type === 'menu_scan' ? 'Menu' : 'Meal'}</Text>
              <View style={styles.recentMain}><Text style={styles.recentTitle}>{item.title}</Text><Text style={styles.recentTime}>{formatTimeAgo(item.createdAt)}</Text></View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: appTheme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: appTheme.colors.accent, fontWeight: '700' },
  greeting: { fontSize: 38, color: appTheme.colors.textPrimary, fontWeight: '800' },
  subtitleHeader: { fontSize: appTheme.typography.small, color: appTheme.colors.textSecondary },
  todayCard: { gap: appTheme.spacing.sm },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eatenChip: { backgroundColor: '#F3EAFA', borderRadius: appTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  eatenText: { color: appTheme.colors.accent, fontSize: appTheme.typography.small, fontWeight: '700' },
  cardTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3, fontWeight: '700' },
  ctaBox: { backgroundColor: '#F3F6FF', borderRadius: appTheme.radius.md, padding: appTheme.spacing.sm, gap: appTheme.spacing.sm },
  ctaText: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: appTheme.spacing.sm },
  actionItem: { flex: 1 },
  actionCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3, fontWeight: '700', textAlign: 'center' },
  recentCard: { flexDirection: 'row', gap: appTheme.spacing.sm, alignItems: 'center' },
  recentIcon: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, fontWeight: '700', width: 50, textAlign: 'center', backgroundColor: '#EEF2FF', borderRadius: appTheme.radius.pill, paddingVertical: 4 },
  recentMain: { flex: 1 },
  recentTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.body, fontWeight: '600' },
  recentTime: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, marginTop: 2 },
});
