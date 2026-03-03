import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockProfile, mockProfileMeta } from '../mock/profile';
import { trialRepo, userRepo } from '../services/container';
import { calculateNutritionTargets } from '../services/calculateNutritionTargets';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { BottomCTA, getCTATotalHeight } from '../ui/components/BottomCTA';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SelectField } from '../ui/components/SelectField';
import { SegmentedControl } from '../ui/components/SegmentedControl';
import { TextField } from '../ui/components/TextField';
import { getPagePaddingX, layout } from '../design/layout';
import { shadowTokens } from '../design/tokens';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

/** Horizontal space for card shadow so it is not clipped (≥ shadowRadius). */
const CARD_SHADOW_MARGIN = shadowTokens.card.shadowRadius;

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollPaddingBottom = getCTATotalHeight(insets.bottom) + spec.spacing[12];
  const pagePaddingX = getPagePaddingX(screenWidth);
  const scrollContentWidth = screenWidth - pagePaddingX * 2;

  const [trialText, setTrialText] = React.useState('Free');
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState('');
  const [activity, setActivity] = React.useState<ActivityLevel>('Low');
  const [sex, setSex] = React.useState<Sex>('Male');
  const [calcStatus, setCalcStatus] = React.useState<'idle' | 'calculating' | 'success' | 'error'>('idle');
  const [calcError, setCalcError] = React.useState<string | null>(null);
  const [calcErrorExpanded, setCalcErrorExpanded] = React.useState(false);
  const [savedUser, setSavedUser] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    void (async () => {
      if (USE_MOCK_DATA) {
        setUser(mockProfile);
        setHeight(String(mockProfile.baseParams?.heightCm ?? ''));
        setWeight(String(mockProfile.baseParams?.weightKg ?? ''));
        setAge(String(mockProfile.baseParams?.age ?? ''));
        setActivity(mockProfile.baseParams?.activityLevel ?? 'Low');
        setSex(mockProfile.baseParams?.sex ?? 'Male');
        setTrialText(mockProfileMeta.trialText);
        return;
      }
      const u = await userRepo.getUser();
      setUser(u ?? null);
      if (u?.baseParams) {
        setHeight(String(u.baseParams.heightCm));
        setWeight(String(u.baseParams.weightKg));
        setAge(u.baseParams.age ? String(u.baseParams.age) : '');
        setActivity(u.baseParams.activityLevel);
        setSex(u.baseParams.sex ?? 'Prefer not to say');
      }
      const trial = await trialRepo.getTrial();
      setTrialText(trial.isPremium ? 'Premium' : `Trial left: ${trialRepo.getTrialDaysLeft(trial)}d`);
    })();
  }, []);

  const triggerCalculation = React.useCallback(async (profile: UserProfile): Promise<void> => {
    setCalcStatus('calculating');
    setCalcError(null);
    try {
      const targets = await calculateNutritionTargets(profile);
      await userRepo.saveNutritionTargets(targets);
      setCalcStatus('success');
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'Calculation failed. Please try again.');
      setCalcStatus('error');
    }
  }, []);

  const save = async (): Promise<void> => {
    if (USE_MOCK_DATA) return;
    const current = await userRepo.getUser();
    if (!current) return;
    const h = Number(height);
    const w = Number(weight);
    const a = Number(age);
    const next: UserProfile = {
      ...current,
      baseParams:
        Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0
          ? {
              heightCm: h,
              weightKg: w,
              age: Number.isFinite(a) && a > 0 ? a : undefined,
              activityLevel: activity,
              sex,
            }
          : undefined,
    };
    await userRepo.saveUser(next);
    setUser(next);
    setSavedUser(next);

    const prev = current.baseParams;
    const cur = next.baseParams;
    const paramsChanged =
      !prev || !cur ||
      prev.heightCm !== cur.heightCm ||
      prev.weightKg !== cur.weightKg ||
      (prev.age ?? 0) !== (cur.age ?? 0) ||
      prev.activityLevel !== cur.activityLevel ||
      (prev.sex ?? 'Prefer not to say') !== (cur.sex ?? 'Prefer not to say');

    if (cur && paramsChanged) {
      void triggerCalculation(next);
    }
  };

  return (
    <Screen safeTop={false}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        paddingHorizontal={CARD_SHADOW_MARGIN}
        style={{ marginBottom: layout.sectionSpacingY }}
        rightAction={
          <Pressable style={styles.loginPill} hitSlop={8}>
            <Text style={styles.loginPillText} maxFontSizeMultiplier={1.2}>Login</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.wrap, { paddingBottom: scrollPaddingBottom, paddingHorizontal: CARD_SHADOW_MARGIN }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shadowBleedWrap}>
        <Card style={styles.premiumCard}>
          <AppIcon name="sparkles" />
          <Text style={styles.premiumTitle} maxFontSizeMultiplier={1.2}>Unlock Premium</Text>
          <Text style={styles.premiumSubtitle} maxFontSizeMultiplier={1.2}>Get unlimited recipes and advanced AI analysis.</Text>
          <PrimaryButton title="Upgrade to Premium" onPress={() => navigation.navigate('Paywall')} />
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>DIETARY PROFILE</Text>
          <Pressable style={styles.profileLink} onPress={() => navigation.navigate('DietaryProfile')}>
            <AppIcon name="diet" />
            <View style={styles.linkBody}>
              <Text style={styles.linkTitle} maxFontSizeMultiplier={1.2}>Edit dietary profile</Text>
              <Text style={styles.linkSubtitle} maxFontSizeMultiplier={1.2}>Preferences, allergies, diet type</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </Card>
        {calcStatus === 'calculating' && (
          <Card style={styles.calcCard}>
            <ActivityIndicator size="small" color={appTheme.colors.accent} />
            <Text style={styles.calcText}>Calculating your daily targets…</Text>
          </Card>
        )}
        {calcStatus === 'success' && (
          <Card style={styles.calcCard}>
            <Text style={styles.calcSuccess}>✓ Daily targets updated</Text>
            <Text style={styles.calcSubtext}>Your calorie and macro goals are ready on the home screen.</Text>
          </Card>
        )}
        {calcStatus === 'error' && (
          <Card style={styles.calcCard}>
            <Pressable onPress={() => setCalcErrorExpanded((v) => !v)} style={styles.calcErrorTap}>
              <Text style={styles.calcErrorText}>{calcError?.split('\n')[0] ?? 'Error'}</Text>
              <Text style={styles.calcErrorHint}>{calcErrorExpanded ? 'Hide details ▲' : 'Tap for details ▼'}</Text>
            </Pressable>
            {calcErrorExpanded && calcError && calcError.includes('\n') && (
              <Text style={styles.calcErrorDetail} selectable>{calcError.slice(calcError.indexOf('\n') + 1)}</Text>
            )}
            <Pressable
              style={styles.retryBtn}
              onPress={() => { setCalcErrorExpanded(false); if (savedUser ?? user) void triggerCalculation((savedUser ?? user)!); }}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </Card>
        )}
        <Card>
          <Text style={styles.sectionLabel}>PERSONAL PARAMETERS</Text>
          <View style={styles.paramsContent}>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <TextField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" />
              </View>
              <View style={styles.gridItem}>
                <TextField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
              </View>
              <View style={styles.gridItem}>
                <TextField label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Optional" />
              </View>
              <View style={styles.gridItem}>
                <SelectField
                  label="Sex"
                  value={sex}
                  onChange={setSex}
                  options={mockProfileMeta.sexOptions.map((item) => ({ label: item, value: item }))}
                />
              </View>
            </View>
            <View style={styles.segmentWrap}>
              <Text style={styles.inputLabel} maxFontSizeMultiplier={1.2}>Activity Level</Text>
              <SegmentedControl value={activity} options={mockProfileMeta.activityOptions} onChange={setActivity} />
            </View>
          </View>
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Status</Text>
            <View style={styles.guestPill}><Text style={styles.guestText} maxFontSizeMultiplier={1.2}>Guest</Text></View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Trial</Text>
            <Text style={styles.trialText} maxFontSizeMultiplier={1.2}>{trialText}</Text>
          </View>
        </Card>
        <Card style={styles.legalCard}>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Terms of Service</Text><Text style={styles.chevron}>{'>'}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Privacy Policy</Text><Text style={styles.chevron}>{'>'}</Text></View>
        </Card>
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Disclaimer: This app is for informational purposes only and does not constitute medical advice.</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      <BottomCTA>
        <PrimaryButton title="Save Changes" onPress={() => void save()} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  wrap: { flexGrow: 1 },
  /** Negative margin so cards keep same width; shadow has room from wrap paddingHorizontal. iOS grouped-list gap between cards. */
  shadowBleedWrap: { marginHorizontal: -CARD_SHADOW_MARGIN, gap: layout.sectionSpacingY },
  sectionLabel: { ...typography.overline, color: appTheme.colors.muted, marginBottom: spec.spacing[8] },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: spec.minTouchTarget,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
  },
  fieldTitle: { ...typography.body, color: appTheme.colors.textPrimary, fontWeight: '500' },
  guestPill: { backgroundColor: appTheme.colors.border, borderRadius: spec.chipRadius, paddingHorizontal: spec.chipPaddingX, paddingVertical: spec.spacing[4] },
  guestText: { ...appTheme.typography.caption, color: appTheme.colors.ink, fontWeight: '700' },
  trialText: { color: appTheme.colors.success, fontWeight: '700' },
  profileLink: {
    minHeight: 72,
    borderRadius: spec.inputRadius,
    backgroundColor: appTheme.colors.infoSoft,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spec.spacing[12],
    gap: spec.spacing[8],
  },
  linkBody: { flex: 1 },
  linkTitle: { ...typography.bodySemibold },
  linkSubtitle: { ...typography.caption, color: appTheme.colors.muted },
  chevron: { color: appTheme.colors.muted, fontWeight: '700', fontSize: appTheme.typography.callout.fontSize },
  paramsContent: { gap: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[12] },
  gridItem: { width: '48%', minWidth: 0 },
  inputLabel: { ...typography.caption, color: appTheme.colors.muted },
  segmentWrap: { marginTop: spec.spacing[12], marginBottom: spec.spacing[16], gap: spec.spacing[8] },
  premiumCard: { alignItems: 'center', gap: spec.spacing[8], paddingVertical: spec.spacing[20] },
  premiumTitle: { ...typography.h2, textAlign: 'center' },
  premiumSubtitle: { ...typography.body, color: appTheme.colors.muted, textAlign: 'center', marginBottom: spec.spacing[8] },
  legalCard: { gap: spec.spacing[8] },
  disclaimer: { ...typography.caption, color: appTheme.colors.muted, textAlign: 'center' },
  calcCard: { flexDirection: 'row', alignItems: 'center', gap: spec.spacing[12], flexWrap: 'wrap' },
  calcText: { ...typography.body, color: appTheme.colors.muted, flex: 1 },
  calcSuccess: { ...typography.bodySemibold, color: appTheme.colors.success, flex: 1 },
  calcSubtext: { ...typography.caption, color: appTheme.colors.muted, width: '100%' },
  calcErrorTap: { flex: 1 },
  calcErrorText: { ...typography.body, color: appTheme.colors.danger },
  calcErrorHint: { ...typography.caption, color: appTheme.colors.muted, marginTop: 4 },
  calcErrorDetail: { ...typography.caption, color: appTheme.colors.muted, backgroundColor: '#F8F8F8', borderRadius: 8, padding: 8, width: '100%', fontFamily: 'monospace' as const, fontSize: 11 },
  retryBtn: {
    paddingHorizontal: spec.spacing[16],
    paddingVertical: spec.spacing[8],
    borderRadius: spec.chipRadius,
    borderWidth: 1,
    borderColor: appTheme.colors.danger,
  },
  retryBtnText: { ...typography.caption, color: appTheme.colors.danger, fontWeight: '700' },
  loginPill: {
    minHeight: spec.headerPillHeight,
    minWidth: spec.minTouchTarget,
    maxHeight: spec.headerPillHeight,
    borderRadius: spec.headerPillRadius,
    paddingHorizontal: spec.headerPillPaddingX,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  loginPillText: {
    fontSize: spec.headerPillFontSize,
    fontWeight: '600' as const,
    color: '#15803D',
  },
});
