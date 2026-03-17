import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../app/navigation/types';
import { HistoryItem, MacroTotals, NutritionTargets, UserProfile } from '../domain/models';
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

/** Figma/Swift spec: action tile icon is 24×24pt (circle remains 56×56). */
const ACTION_TILE_ICON_SIZE = 24;

const MACRO_COLORS = {
  prot: '#FB923C',
  carb: '#60A5FA',
  fat: '#FACC15',
  cal: '#8C2BEE',
  track: '#F1F5F9',
} as const;

function ProgressBar({ progress, color, height = 6 }: { progress: number; color: string; height?: number }): React.JSX.Element {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${Math.round(clamped * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function MacroColumn({ label, eaten, target, color }: { label: string; eaten: number; target: number | null; color: string }): React.JSX.Element {
  const progress = target && target > 0 ? eaten / target : 0;
  return (
    <View style={styles.macroCol}>
      <Text style={styles.macroColLabel}>{label}</Text>
      <Text style={styles.macroColValue} maxFontSizeMultiplier={1.2}>{Math.round(eaten)}g</Text>
      <ProgressBar progress={progress} color={color} />
      {target != null ? (
        <Text style={styles.macroColTarget} maxFontSizeMultiplier={1.1}>of {Math.round(target)}g</Text>
      ) : null}
    </View>
  );
}

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState('Hello');
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>({ caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [targets, setTargets] = React.useState<NutritionTargets | null>(null);
  const [recent, setRecent] = React.useState<HistoryItem[]>([]);

  const load = React.useCallback(async (): Promise<void> => {
    const loadedUser = await userRepo.getUser();
    const loadedMacros = await computeTodayMacrosUseCase(new Date(), { historyRepo });
    const loadedRecent = await historyRepo.listRecent(10);
    const loadedTargets = await userRepo.getNutritionTargets();
    setUser(loadedUser);
    setTodayMacros(loadedMacros);
    setTargets(loadedTargets);
    setRecent(loadedRecent);
    const auth = await userRepo.getAuthState();
    setGreeting(auth.displayName ? `Hello, ${auth.displayName}` : 'Hello');
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
            <MaterialIcons name="perm-identity" size={24} color={appTheme.colors.accent} />
          </Pressable>
        </View>
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>Today</Text>
            <View style={styles.eatenChip}>
              <Text style={styles.eatenText} maxFontSizeMultiplier={1.2}>Eaten</Text>
            </View>
          </View>
          <View style={styles.calSection}>
            <View style={styles.calHeader}>
              <View>
                <Text style={styles.calLabel}>CALORIES</Text>
                <View style={styles.calValueRow}>
                  <Text style={styles.calValue} maxFontSizeMultiplier={1.2}>{Math.round(todayMacros.caloriesKcal)}</Text>
                  {targets ? (
                    <Text style={styles.calTarget} maxFontSizeMultiplier={1.1}>/ {Math.round(targets.caloriesKcal)} kcal</Text>
                  ) : null}
                </View>
              </View>
              {targets ? (
                <Text style={styles.calPercent} maxFontSizeMultiplier={1.2}>
                  {Math.min(100, Math.round((todayMacros.caloriesKcal / targets.caloriesKcal) * 100))}%
                </Text>
              ) : null}
            </View>
            <ProgressBar
              progress={targets ? todayMacros.caloriesKcal / targets.caloriesKcal : 0}
              color={MACRO_COLORS.cal}
              height={10}
            />
          </View>
          <View style={styles.macrosRow}>
            <MacroColumn label="PROT" eaten={todayMacros.proteinG} target={targets?.proteinG ?? null} color={MACRO_COLORS.prot} />
            <MacroColumn label="CARB" eaten={todayMacros.carbsG} target={targets?.carbsG ?? null} color={MACRO_COLORS.carb} />
            <MacroColumn label="FAT" eaten={todayMacros.fatG} target={targets?.fatG ?? null} color={MACRO_COLORS.fat} />
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
              <View style={[styles.actionIconWrap, styles.actionIconPurple]}><AppIcon name="scan" size={ACTION_TILE_ICON_SIZE} /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Scan menu</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TrackMeal')} style={styles.actionItem}>
            <Card style={styles.actionCard}>
              <View style={[styles.actionIconWrap, styles.actionIconOrange]}><AppIcon name="meal" size={ACTION_TILE_ICON_SIZE} /></View>
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Track meal</Text>
            </Card>
          </Pressable>
        </View>
        <Text style={styles.recentHeader} maxFontSizeMultiplier={1.2}>Recent</Text>
        {recent.length === 0 ? (
          <Card style={styles.recentPlaceholderCard}>
            <View style={styles.recentPlaceholderIconWrap}>
              <MaterialIcons name="history" size={20} color={appTheme.colors.muted} />
            </View>
            <Text style={styles.recentPlaceholderText} maxFontSizeMultiplier={1.2}>
              Start scanning to see recent dishes
            </Text>
          </Card>
        ) : (
          recent.map((item) => (
            <Pressable key={item.id} onPress={() => item.type === 'menu_scan' ? navigation.navigate('MenuResults', { resultId: item.payloadRef }) : navigation.navigate('TrackMeal', { mealId: item.payloadRef, readOnly: true })}>
              <Card style={styles.recentCard}>
                <View style={styles.recentMain}><Text style={styles.recentTitle} maxFontSizeMultiplier={1.2}>{item.title}</Text><Text style={styles.recentTime}>{formatTimeAgo(item.createdAt)}</Text></View>
                <Text style={[styles.recentTag, item.type === 'menu_scan' ? styles.recentTagMenu : styles.recentTagMeal]}>{item.type === 'menu_scan' ? 'Menu' : 'Meal'}</Text>
              </Card>
            </Pressable>
          ))
        )}
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Nutritional values are estimates based on AI analysis.{'\n'}Please verify with professional advice if needed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spec.spacing[16], paddingBottom: spec.spacing[40] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    minWidth: spec.minTouchTarget,
    minHeight: spec.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.accentSoft,
  },
  greeting: { ...typography.largeTitle },
  subtitleHeader: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[4] },
  todayCard: { gap: 24, paddingTop: 24, paddingBottom: 32, paddingHorizontal: 24 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eatenChip: {
    backgroundColor: 'rgba(140,43,238,0.1)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eatenText: { color: '#8C2BEE', fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', lineHeight: 28 },
  calSection: { gap: 8, paddingBottom: 8 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  calLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, lineHeight: 16 },
  calValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', lineHeight: 32 },
  calTarget: { fontSize: 14, fontWeight: '500', color: '#94A3B8', lineHeight: 20 },
  calPercent: { fontSize: 12, fontWeight: '700', color: '#8C2BEE', lineHeight: 16 },
  progressTrack: { backgroundColor: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' as const, width: '100%' as const },
  progressFill: { height: '100%' as const, borderRadius: 9999 },
  macrosRow: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 9 },
  macroCol: { flex: 1, gap: 8 },
  macroColLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: -0.25, lineHeight: 15 },
  macroColValue: { fontSize: 16, fontWeight: '700', color: '#0F172A', lineHeight: 24 },
  macroColTarget: { fontSize: 9, fontWeight: '500', color: '#94A3B8', lineHeight: 13.5 },
  ctaBox: { backgroundColor: appTheme.colors.infoSoft, borderRadius: spec.inputRadius, padding: spec.spacing[12], gap: spec.spacing[12] },
  ctaText: { ...typography.caption, color: appTheme.colors.muted, textAlign: 'center' },
  actionGrid: { flexDirection: 'row', gap: spec.spacing[16] },
  actionItem: { flex: 1 },
  actionCard: { minHeight: 165, alignItems: 'center', justifyContent: 'center', gap: spec.spacing[16] },
  actionIconWrap: { width: 56, height: 56, borderRadius: spec.primaryButtonRadius, alignItems: 'center', justifyContent: 'center' },
  actionIconPurple: { backgroundColor: appTheme.colors.accentSoft },
  actionIconOrange: { backgroundColor: appTheme.colors.warningSoft },
  actionTitle: { ...typography.h2, textAlign: 'center' },
  recentHeader: { ...typography.h2, marginTop: spec.spacing[4] },
  recentPlaceholderCard: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[8],
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentPlaceholderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F7',
  },
  recentPlaceholderText: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
  recentCard: { flexDirection: 'row', gap: spec.spacing[12], alignItems: 'center', minHeight: 88 },
  recentMain: { flex: 1 },
  recentTitle: { ...typography.bodySemibold },
  recentTime: { ...typography.caption, color: appTheme.colors.muted, marginTop: spec.spacing[4] },
  recentTag: { borderRadius: spec.chipRadius, paddingHorizontal: spec.chipPaddingX, paddingVertical: spec.spacing[4], ...appTheme.typography.caption, fontWeight: '700', overflow: 'hidden' },
  recentTagMenu: { color: appTheme.colors.info, backgroundColor: appTheme.colors.infoSoft },
  recentTagMeal: { color: appTheme.colors.success, backgroundColor: appTheme.colors.successSoft },
  disclaimer: { marginTop: spec.spacing[16], textAlign: 'center', ...typography.caption, color: appTheme.colors.muted },
});
