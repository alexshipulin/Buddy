import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../app/navigation/types';
import { DailyNutritionState, getLocalDateKey } from '../domain/dayBudget';
import { HistoryItem, MacroTotals, NutritionTargets, UserProfile } from '../domain/models';
import { dailyNutritionRepo, historyRepo, userRepo } from '../services/container';
import { computeTodayMacrosUseCase } from '../services/computeTodayMacrosUseCase';
import { formatTimeAgo } from '../utils/time';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { Screen } from '../ui/components/Screen';
import { TodayAlertLine } from '../ui/components/TodayAlertLine';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';
import { getJson, setJson } from '../data/storage/storage';

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

const HOME_GREETINGS = [
  'Hello, friend',
  'Hello, buddy',
  'Hello, sunshine',
  'Hello, star',
  'Hello, legend',
  'Hello, champion',
  'Hello, explorer',
  'Hello, foodie',
  'Hello, rockstar',
  'Hello, darling',
  'Hello, trip',
] as const;

const GREETING_ROTATION_KEY = 'buddy_home_greeting_rotation_v1';
const GREETING_MIN_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

type GreetingRotationState = {
  order: number[];
  index: number;
  updatedAtMs: number;
};

function createShuffledGreetingOrder(): number[] {
  const order = HOME_GREETINGS.map((_, idx) => idx);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

function isValidGreetingState(state: GreetingRotationState | null): state is GreetingRotationState {
  if (!state) return false;
  if (!Number.isFinite(state.updatedAtMs) || !Number.isInteger(state.index)) return false;
  if (!Array.isArray(state.order) || state.order.length !== HOME_GREETINGS.length) return false;

  const seen = new Set<number>();
  for (const value of state.order) {
    if (!Number.isInteger(value)) return false;
    if (value < 0 || value >= HOME_GREETINGS.length) return false;
    if (seen.has(value)) return false;
    seen.add(value);
  }
  return state.index >= 0 && state.index < state.order.length;
}

async function resolveHomeGreeting(): Promise<string> {
  const now = Date.now();
  const saved = await getJson<GreetingRotationState | null>(GREETING_ROTATION_KEY, null);
  const fallback: GreetingRotationState = {
    order: createShuffledGreetingOrder(),
    index: 0,
    updatedAtMs: now,
  };

  if (!isValidGreetingState(saved)) {
    await setJson(GREETING_ROTATION_KEY, fallback);
    return HOME_GREETINGS[fallback.order[fallback.index]];
  }

  if (now - saved.updatedAtMs < GREETING_MIN_UPDATE_INTERVAL_MS) {
    return HOME_GREETINGS[saved.order[saved.index]];
  }

  let nextOrder = saved.order;
  let nextIndex = saved.index + 1;
  const previousGreeting = saved.order[saved.index];

  if (nextIndex >= nextOrder.length) {
    nextOrder = createShuffledGreetingOrder();
    if (nextOrder.length > 1 && nextOrder[0] === previousGreeting) {
      const temp = nextOrder[0];
      nextOrder[0] = nextOrder[1];
      nextOrder[1] = temp;
    }
    nextIndex = 0;
  }

  const nextState: GreetingRotationState = {
    order: nextOrder,
    index: nextIndex,
    updatedAtMs: now,
  };
  await setJson(GREETING_ROTATION_KEY, nextState);
  return HOME_GREETINGS[nextOrder[nextIndex]];
}

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

async function getWholeFoodsMealsCountFromRecent(
  recentItems: HistoryItem[],
  now: Date
): Promise<number> {
  const dateKey = getLocalDateKey(now);
  let count = 0;

  for (const item of recentItems) {
    if (item.type !== 'meal') continue;
    const itemDateKey = getLocalDateKey(new Date(item.createdAt));
    if (itemDateKey !== dateKey) continue;
    const meal = await historyRepo.getMealById(item.payloadRef);
    if (!meal) continue;

    const text = `${meal.title} ${meal.notes ?? ''}`.toLocaleLowerCase();
    if (text.includes('fresh')) count += 1;
  }

  return count;
}

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const [greeting, setGreeting] = React.useState('Hello');
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [todayMacros, setTodayMacros] = React.useState<MacroTotals>({ caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [todayState, setTodayState] = React.useState<DailyNutritionState | null>(null);
  const [wholeFoodsMealsCount, setWholeFoodsMealsCount] = React.useState(0);
  const [targets, setTargets] = React.useState<NutritionTargets | null>(null);
  const [recent, setRecent] = React.useState<HistoryItem[]>([]);
  const lastLoadedDateKeyRef = React.useRef(getLocalDateKey(new Date()));

  const load = React.useCallback(async (): Promise<void> => {
    const now = new Date();
    const [loadedUser, loadedMacros, loadedRecent, loadedTargets, loadedTodayState, nextGreeting] =
      await Promise.all([
        userRepo.getUser(),
        computeTodayMacrosUseCase(now, { historyRepo }),
        historyRepo.listRecent(10),
        userRepo.getNutritionTargets(),
        dailyNutritionRepo.getToday(now),
        resolveHomeGreeting(),
      ]);
    const wholeFoodsFromHeuristic = await getWholeFoodsMealsCountFromRecent(loadedRecent, now);
    const wholeFoodsCount = Math.max(
      Number(loadedTodayState.wholeFoodsMealsCount ?? 0),
      wholeFoodsFromHeuristic
    );

    setUser(loadedUser);
    setTodayMacros(loadedMacros);
    setTodayState(loadedTodayState);
    setWholeFoodsMealsCount(wholeFoodsCount);
    setTargets(loadedTargets);
    setRecent(loadedRecent);
    setGreeting(nextGreeting);
    lastLoadedDateKeyRef.current = getLocalDateKey(now);
  }, []);
  useFocusEffect(React.useCallback(() => { void load(); return undefined; }, [load]));
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      const currentKey = getLocalDateKey(new Date());
      if (currentKey === lastLoadedDateKeyRef.current) return;
      void load();
    }, 60_000);
    return () => clearInterval(intervalId);
  }, [load]);

  const hasTargets = Boolean(user?.baseParams);
  const alertDailyState = React.useMemo<DailyNutritionState | null>(() => {
    if (!todayState) return null;
    return {
      ...todayState,
      consumed: {
        calories: todayMacros.caloriesKcal,
        protein: todayMacros.proteinG,
        carbs: todayMacros.carbsG,
        fat: todayMacros.fatG,
      },
    };
  }, [todayMacros, todayState]);

  return (
    <Screen scroll>
      <View style={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.2}>{greeting}</Text>
            <Text style={styles.subtitleHeader} maxFontSizeMultiplier={1.2}>Ready to scan?</Text>
          </View>
          <Pressable style={styles.avatarAction} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="perm-identity" size={28} color={appTheme.colors.accent} />
            </View>
            <View style={styles.avatarFreeBadge}>
              <Text style={styles.avatarFreeText} maxFontSizeMultiplier={1}>Free</Text>
            </View>
          </Pressable>
        </View>
        <Card style={[styles.todayCard, !hasTargets && styles.todayCardNeedsParams]}>
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
          {targets && alertDailyState && user ? (
            <TodayAlertLine
              goal={user.goal}
              targets={targets}
              dailyState={alertDailyState}
              wholeFoodsMealsCount={wholeFoodsMealsCount}
              now={new Date()}
            />
          ) : null}
          {!hasTargets ? (
            <View style={styles.ctaBox}>
              <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>Add your parameters to get your personalized daily goals.</Text>
              <Pressable
                style={styles.ctaLink}
                onPress={() => navigation.navigate('Profile', { section: 'baseParams' })}
                hitSlop={8}
              >
                <Text style={styles.ctaLinkText} maxFontSizeMultiplier={1.2}>Add parameters</Text>
                <MaterialIcons name="chevron-right" size={20} color={appTheme.colors.accent} />
              </Pressable>
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
              <Text style={styles.actionTitle} maxFontSizeMultiplier={1.2}>Enter meal</Text>
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
  avatarAction: {
    width: 89,
    height: 58,
    position: 'relative',
  },
  avatarCircle: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 54,
    height: 54,
    borderRadius: 9999,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarFreeBadge: {
    position: 'absolute',
    top: 29,
    left: 9,
    width: 51,
    height: 20,
    borderRadius: 30,
    backgroundColor: '#27C840',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFreeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
  },
  greeting: { ...typography.largeTitle },
  subtitleHeader: { ...typography.body, color: appTheme.colors.muted, marginTop: spec.spacing[4] },
  todayCard: { gap: 24, paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24 },
  todayCardNeedsParams: { paddingBottom: 20 },
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
  ctaBox: {
    paddingTop: spec.spacing[4],
    gap: spec.spacing[8],
  },
  ctaText: {
    ...typography.body,
    color: appTheme.colors.muted,
    textAlign: 'left',
    lineHeight: 28,
  },
  ctaLink: {
    minHeight: spec.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaLinkText: {
    ...typography.bodySemibold,
    color: appTheme.colors.accent,
  },
  actionGrid: { flexDirection: 'row', gap: spec.spacing[16] },
  actionItem: { flex: 1 },
  actionCard: {
    minHeight: 165,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spec.spacing[16],
    position: 'relative',
  },
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
