import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../app/navigation/types';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { trialRepo, userRepo } from '../services/container';
import { calculateNutritionTargets } from '../services/calculateNutritionTargets';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { clearAICache } from '../ai/aiCache';
import {
  getUserFacingAuthErrorMessage,
  isAuthCancelledError,
  signInWithProvider,
  signOut,
} from '../auth';

const SEX_OPTIONS: Sex[] = ['Male', 'Female', 'Other', 'Prefer not to say'];
const ACTIVITY_OPTIONS: ActivityLevel[] = ['Low', 'Medium', 'High'];
const TRIAL_TOTAL_DAYS = 7;
const IOS_INPUT_TEXT_NUDGE = Platform.OS === 'ios' ? -1 : 0;

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function activityLabel(value: ActivityLevel): string {
  if (value === 'Medium') return 'Mid';
  return value;
}

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL?.trim();
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim();

  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [trialText, setTrialText] = React.useState('0 of 7 days left');
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState('');
  const [activity, setActivity] = React.useState<ActivityLevel>('Low');
  const [sex, setSex] = React.useState<Sex>('Male');
  const [calcStatus, setCalcStatus] = React.useState<'idle' | 'calculating' | 'success' | 'error'>('idle');
  const [calcError, setCalcError] = React.useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [authDisplayName, setAuthDisplayName] = React.useState('');
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const loadAuthState = React.useCallback(async (): Promise<void> => {
    const authState = await userRepo.getAuthState();
    setIsSignedIn(authState.signedIn);
    setAuthDisplayName(authState.displayName ?? '');
  }, []);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      await loadAuthState();
      if (!active) return;
      const loadedUser = await userRepo.getUser();
      if (!active) return;
      setUser(loadedUser ?? null);
      if (loadedUser?.baseParams) {
        setHeight(String(loadedUser.baseParams.heightCm));
        setWeight(String(loadedUser.baseParams.weightKg));
        setAge(loadedUser.baseParams.age ? String(loadedUser.baseParams.age) : '');
        setActivity(loadedUser.baseParams.activityLevel);
        setSex(loadedUser.baseParams.sex ?? 'Prefer not to say');
      }

      const trial = await trialRepo.getTrial();
      if (!active) return;
      if (trial.isPremium) {
        setTrialText('Premium');
      } else {
        const daysLeft = trialRepo.getTrialDaysLeft(trial);
        setTrialText(`${daysLeft} of ${TRIAL_TOTAL_DAYS} days left`);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadAuthState]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadAuthState();
    });
    return unsubscribe;
  }, [loadAuthState, navigation]);

  const triggerCalculation = React.useCallback(async (profile: UserProfile): Promise<void> => {
    if (calcStatus === 'calculating') return;
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
  }, [calcStatus]);

  const save = async (): Promise<void> => {
    const current = await userRepo.ensureUser();
    const heightText = height.trim().replace(',', '.');
    const weightText = weight.trim().replace(',', '.');
    const ageText = age.trim();

    const hasHeightInput = heightText.length > 0;
    const hasWeightInput = weightText.length > 0;

    const h = Number(heightText);
    const w = Number(weightText);
    const a = Number(ageText);

    const heightValid = hasHeightInput && Number.isFinite(h) && h > 0;
    const weightValid = hasWeightInput && Number.isFinite(w) && w > 0;

    if ((hasHeightInput || hasWeightInput) && !(heightValid && weightValid)) {
      await showAlert({
        title: 'Check your parameters',
        message: 'Enter valid Height and Weight (both fields) before saving.',
        actions: [{ text: 'OK' }],
      });
      return;
    }

    const nextBaseParams =
      heightValid && weightValid
        ? {
            heightCm: h,
            weightKg: w,
            age: Number.isFinite(a) && a > 0 ? a : undefined,
            activityLevel: activity,
            sex,
          }
        : current.baseParams;

    const next: UserProfile = {
      ...current,
      baseParams: nextBaseParams,
    };

    await userRepo.saveUser(next);
    setUser(next);

    const prev = current.baseParams;
    const cur = next.baseParams;
    const paramsChanged =
      (prev?.heightCm ?? null) !== (cur?.heightCm ?? null) ||
      (prev?.weightKg ?? null) !== (cur?.weightKg ?? null) ||
      (prev?.age ?? null) !== (cur?.age ?? null) ||
      (prev?.activityLevel ?? null) !== (cur?.activityLevel ?? null) ||
      (prev?.sex ?? 'Prefer not to say') !== (cur?.sex ?? 'Prefer not to say');

    if (cur && paramsChanged) {
      void triggerCalculation(next);
    }
  };

  const openExternalLink = React.useCallback(
    async (url: string | undefined, label: string, envVarName: string): Promise<void> => {
      if (!url) {
        await showAlert({
          title: `${label} unavailable`,
          message: `Set ${envVarName} to enable this link.`,
          actions: [{ text: 'OK' }],
        });
        return;
      }

      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          await showAlert({
            title: 'Cannot open link',
            message: `Unable to open ${label}.`,
            actions: [{ text: 'OK' }],
          });
          return;
        }

        await Linking.openURL(url);
      } catch {
        await showAlert({
          title: 'Cannot open link',
          message: `Unable to open ${label}.`,
          actions: [{ text: 'OK' }],
        });
      }
    },
    [showAlert]
  );

  const cycleSex = React.useCallback((): void => {
    Keyboard.dismiss();
    const currentIdx = SEX_OPTIONS.findIndex((item) => item === sex);
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % SEX_OPTIONS.length;
    setSex(SEX_OPTIONS[nextIdx]);
  }, [sex]);

  const handleLoginWithApple = React.useCallback(async (): Promise<void> => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithProvider('apple');
      await loadAuthState();
    } catch (error) {
      if (!isAuthCancelledError(error)) {
        await showAlert({
          title: 'Sign in failed',
          message: getUserFacingAuthErrorMessage(error),
          actions: [{ text: 'OK' }],
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, loadAuthState, showAlert]);

  const handleLogout = React.useCallback(async (): Promise<void> => {
    const { index } = await showAlert({
      title: 'Log out?',
      message: 'You can log in again at any time.',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive' },
      ],
    });
    if (index !== 1) return;

    try {
      await signOut();
      setIsSignedIn(false);
      setAuthDisplayName('');
    } catch (error) {
      await showAlert({
        title: 'Logout failed',
        message: getUserFacingAuthErrorMessage(error),
        actions: [{ text: 'OK' }],
      });
    }
  }, [showAlert]);

  const handleResetAiScanCache = React.useCallback(async (): Promise<void> => {
    const { index } = await showAlert({
      title: 'Reset AI scan cache?',
      message: 'This clears cached AI scan results so repeated scans run fresh AI analysis.',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset' },
      ],
    });
    if (index !== 1) return;

    try {
      const removedCount = await clearAICache();
      await showAlert({
        title: 'Done',
        message:
          removedCount > 0
            ? `Removed ${removedCount} AI cache entries.`
            : 'AI cache is already empty.',
        actions: [{ text: 'OK' }],
      });
    } catch {
      await showAlert({
        title: 'Reset failed',
        message: 'Could not clear AI cache. Please try again.',
        actions: [{ text: 'OK' }],
      });
    }
  }, [showAlert]);

  const showCalculationState = calcStatus !== 'idle';
  const headerPaddingTop = Platform.OS === 'ios' ? Math.max(insets.top, 24) : 24;
  const contentBottomPadding = insets.bottom;
  const statusLabel = isSignedIn ? authDisplayName.trim() || 'Signed in' : 'Guest';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="chevron-left" size={22} color="#64748B" />
          </Pressable>

          {isSignedIn ? (
            <View style={styles.headerRightSpacer} />
          ) : (
            <Pressable
              style={styles.loginButton}
              onPress={() => void handleLoginWithApple()}
              disabled={isSigningIn}
              accessibilityRole="button"
              accessibilityLabel="Login with Apple"
            >
              {isSigningIn ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.loginButtonText} maxFontSizeMultiplier={1.2}>
                  Login with Apple
                </Text>
              )}
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.premiumCard}>
            <View style={styles.premiumGlow} />
            <View style={styles.premiumIconWrap}>
              <MaterialIcons name="diamond" size={16} color="#A855F7" />
            </View>
            <Text style={styles.premiumTitle} maxFontSizeMultiplier={1.2}>
              Unlock Premium
            </Text>
            <Text style={styles.premiumSubtitle} maxFontSizeMultiplier={1.2}>
              Get unlimited recipes and{"\n"}advanced AI analysis.
            </Text>
            <Pressable style={styles.blackButton} onPress={() => navigation.navigate('Paywall')}>
              <Text style={styles.blackButtonText} maxFontSizeMultiplier={1.2}>
                Upgrade to Premium
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
            PERSONAL PARAMETERS
          </Text>
          <View style={styles.sectionCard}>
            <View style={styles.fieldsRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <View style={styles.inputShell}>
                  <View style={styles.inputTextWrap}>
                    <TextInput
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="decimal-pad"
                      style={styles.inputFieldText}
                      maxFontSizeMultiplier={1.2}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <View style={styles.inputShell}>
                  <View style={styles.inputTextWrap}>
                    <TextInput
                      value={weight}
                      onChangeText={setWeight}
                      keyboardType="decimal-pad"
                      style={styles.inputFieldText}
                      maxFontSizeMultiplier={1.2}
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.fieldsRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Age</Text>
                <View style={styles.inputShell}>
                  <View style={styles.inputTextWrap}>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      style={styles.inputFieldText}
                      maxFontSizeMultiplier={1.2}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Sex</Text>
                <Pressable style={styles.inputShell} onPress={cycleSex}>
                  <View style={styles.inputTextWrap}>
                    <Text style={styles.inputValueText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                      {sex}
                    </Text>
                  </View>
                  <MaterialIcons name="expand-more" size={20} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            <View style={styles.activityWrap}>
              <Text style={styles.fieldLabel}>Activity Level</Text>
              <View style={styles.activityTabs}>
                {ACTIVITY_OPTIONS.map((option) => {
                  const active = option === activity;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.activityTab, active && styles.activityTabActive]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setActivity(option);
                      }}
                    >
                      <Text
                        style={[styles.activityTabText, active && styles.activityTabTextActive]}
                        maxFontSizeMultiplier={1.1}
                      >
                        {activityLabel(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.blackButtonLarge} onPress={() => void save()}>
              {calcStatus === 'calculating' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.blackButtonLargeText} maxFontSizeMultiplier={1.2}>
                  Save Changes
                </Text>
              )}
            </Pressable>

            {showCalculationState ? (
              <Text
                style={[
                  styles.calcStateText,
                  calcStatus === 'success' && styles.calcStateTextSuccess,
                  calcStatus === 'error' && styles.calcStateTextError,
                ]}
                maxFontSizeMultiplier={1.1}
              >
                {calcStatus === 'success'
                  ? 'Daily targets updated.'
                  : calcStatus === 'error'
                    ? calcError ?? 'Calculation failed. Please try again.'
                    : 'Calculating your daily targets...'}
              </Text>
            ) : null}
          </View>

          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
            DIETARY PROFILE
          </Text>
          <View style={styles.sectionCardCompact}>
            <Pressable style={styles.dietaryRow} onPress={() => navigation.navigate('DietaryProfile')}>
              <View style={styles.dietaryLeft}>
                <View style={styles.dietaryIconWrap}>
                  <MaterialIcons name="restaurant-menu" size={18} color="#16A34A" />
                </View>
                <View style={styles.dietaryTextWrap}>
                  <Text style={styles.dietaryTitle} maxFontSizeMultiplier={1.2}>
                    Edit dietary profile
                  </Text>
                  <Text style={styles.dietarySubtitle} maxFontSizeMultiplier={1.2}>
                    Preferences, allergies, diet type
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.1}>
            ACCOUNT
          </Text>
          <View style={[styles.sectionCardCompact, styles.accountCard]}>
            <View style={[styles.accountRow, styles.accountRowStatus]}>
              <Text style={styles.accountLabel} maxFontSizeMultiplier={1.2}>
                Status
              </Text>
              <View style={[styles.guestPill, isSignedIn && styles.signedInPill]}>
                <Text
                  style={[styles.guestPillText, isSignedIn && styles.signedInPillText]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel} maxFontSizeMultiplier={1.2}>
                Trial
              </Text>
              <Text style={styles.trialValue} maxFontSizeMultiplier={1.1}>
                {trialText}
              </Text>
            </View>
          </View>

          <View style={styles.legalWrap}>
            <View style={styles.legalCard}>
              <Pressable
                style={[styles.legalRow, styles.legalRowFirst]}
                onPress={() =>
                  void openExternalLink(termsUrl, 'Terms of Service', 'EXPO_PUBLIC_TERMS_URL')
                }
              >
                <Text style={styles.legalRowText} maxFontSizeMultiplier={1.2}>
                  Terms of Service
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
              </Pressable>
              <Pressable
                style={[styles.legalRow, styles.legalRowSecond]}
                onPress={() =>
                  void openExternalLink(privacyUrl, 'Privacy Policy', 'EXPO_PUBLIC_PRIVACY_URL')
                }
              >
                <Text style={styles.legalRowText} maxFontSizeMultiplier={1.2}>
                  Privacy Policy
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.cacheResetButton}
            onPress={() => void handleResetAiScanCache()}
            accessibilityRole="button"
            accessibilityLabel="Reset AI scan cache"
          >
            <Text style={styles.cacheResetButtonText} maxFontSizeMultiplier={1.2}>
              Reset AI scan cache
            </Text>
          </Pressable>

          <View style={styles.disclaimerWrap}>
            <Text style={styles.disclaimerText} maxFontSizeMultiplier={1.2}>
              Disclaimer: This app is for informational purposes only and does not constitute medical advice.
              Consult with a healthcare professional before starting any diet or exercise program.
            </Text>
          </View>
          {isSignedIn ? (
            <Pressable
              style={styles.logoutButton}
              onPress={() => void handleLogout()}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Text style={styles.logoutText} maxFontSizeMultiplier={1.2}>
                Log out
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingBottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerRightSpacer: {
    width: 32,
    height: 32,
  },
  loginButton: {
    minHeight: 32,
    height: 32,
    borderRadius: 32,
    paddingHorizontal: 16,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 24,
    gap: 24,
  },
  premiumCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    padding: 21,
    alignItems: 'center',
    backgroundColor: '#F0EEFC',
    overflow: 'hidden',
  },
  premiumGlow: {
    position: 'absolute',
    right: -16,
    top: -16,
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: '#E9D5FF',
    opacity: 0.2,
  },
  premiumIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  premiumTitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  premiumSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
  },
  blackButton: {
    marginTop: 16,
    width: '100%',
    height: 44,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionLabel: {
    marginTop: -4,
    paddingLeft: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#6B7280',
  },
  sectionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 20,
    gap: 20,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldCol: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  inputShell: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputTextWrap: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  inputFieldText: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    padding: 0,
    transform: [{ translateY: IOS_INPUT_TEXT_NUDGE }],
  },
  inputValueText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#111827',
    transform: [{ translateY: IOS_INPUT_TEXT_NUDGE }],
  },
  activityWrap: {
    gap: 8,
  },
  activityTabs: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 5,
  },
  activityTab: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTabActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  activityTabText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activityTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blackButtonLarge: {
    height: 52,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackButtonLargeText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  calcStateText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  calcStateTextSuccess: {
    color: '#16A34A',
  },
  calcStateTextError: {
    color: '#DC2626',
  },
  sectionCardCompact: {
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    padding: 16,
  },
  accountCard: {
    gap: 12,
  },
  dietaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dietaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dietaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietaryTextWrap: {
    width: 180,
  },
  dietaryTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
  },
  dietarySubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  accountRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountRowStatus: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 13,
  },
  accountLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: '#111827',
  },
  guestPill: {
    maxWidth: 160,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestPillText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#374151',
  },
  signedInPill: {
    backgroundColor: '#DCFCE7',
  },
  signedInPillText: {
    color: '#166534',
  },
  trialValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#16A34A',
  },
  legalWrap: {
    paddingTop: 8,
  },
  legalCard: {
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    overflow: 'hidden',
  },
  legalRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legalRowFirst: {
    paddingTop: 16,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229,231,235,0.5)',
  },
  legalRowSecond: {
    paddingVertical: 16,
  },
  legalRowText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#111827',
  },
  cacheResetButton: {
    alignSelf: 'center',
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cacheResetButtonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#475569',
  },
  disclaimerWrap: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  disclaimerText: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  logoutButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#EF4444',
  },
});
