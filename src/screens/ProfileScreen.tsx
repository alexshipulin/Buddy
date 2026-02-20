import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockProfile, mockProfileMeta } from '../mock/profile';
import { trialRepo, userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { BottomCTA } from '../ui/components/BottomCTA';
import { Screen } from '../ui/components/Screen';
import { SelectField } from '../ui/components/SelectField';
import { SegmentedControl } from '../ui/components/SegmentedControl';
import { TextField } from '../ui/components/TextField';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const BOTTOM_CTA_HEIGHT = 56 + spec.screenPaddingBottomOffset * 2 + 16;

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [trialText, setTrialText] = React.useState('Free');
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState('');
  const [activity, setActivity] = React.useState<ActivityLevel>('Low');
  const [sex, setSex] = React.useState<Sex>('Male');

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
  };

  return (
    <Screen keyboardAvoiding bottomCTAPadding={BOTTOM_CTA_HEIGHT}>
      <ScreenHeader leftLabel="Home" title="Profile" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
        <Card style={styles.premiumCard}>
          <AppIcon name="sparkles" />
          <Text style={styles.premiumTitle} maxFontSizeMultiplier={1.2}>Unlock Premium</Text>
          <Text style={styles.premiumSubtitle} maxFontSizeMultiplier={1.2}>Get unlimited recipes and advanced AI analysis.</Text>
          <PrimaryButton title="Upgrade to Premium" onPress={() => navigation.navigate('Paywall')} />
        </Card>
        <Card style={styles.legalCard}>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Terms of Service</Text><Text style={styles.chevron}>{'>'}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle} maxFontSizeMultiplier={1.2}>Privacy Policy</Text><Text style={styles.chevron}>{'>'}</Text></View>
        </Card>
        <Text style={styles.disclaimer} maxFontSizeMultiplier={1.2}>Disclaimer: This app is for informational purposes only and does not constitute medical advice.</Text>
      </ScrollView>
      <BottomCTA>
        <PrimaryButton title="Save Changes" onPress={() => void save()} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { gap: spec.spacing[16], paddingBottom: spec.spacing[24] },
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
});
