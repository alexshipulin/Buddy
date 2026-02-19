import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { USE_MOCK_DATA } from '../config/local';
import { mockProfile, mockProfileMeta } from '../mock/profile';
import { trialRepo, userRepo } from '../services/container';
import { AppHeader } from '../ui/components/AppHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { SegmentedControl } from '../ui/components/SegmentedControl';
import { SelectField } from '../ui/components/SelectField';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({}: Props): React.JSX.Element {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [trialText, setTrialText] = React.useState('Free');
  const [height, setHeight] = React.useState(''); const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState(''); const [activity, setActivity] = React.useState<ActivityLevel>('Low'); const [sex, setSex] = React.useState<Sex>('Male');
  React.useEffect(() => { void (async () => {
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
    const u = await userRepo.getUser(); setUser(u);
    if (u?.baseParams) { setHeight(String(u.baseParams.heightCm)); setWeight(String(u.baseParams.weightKg)); setAge(u.baseParams.age ? String(u.baseParams.age) : ''); setActivity(u.baseParams.activityLevel); setSex(u.baseParams.sex ?? 'Prefer not to say'); }
    const trial = await trialRepo.getTrial(); setTrialText(trial.isPremium ? 'Premium' : `Trial left: ${trialRepo.getTrialDaysLeft(trial)}d`);
  })(); }, []);
  const save = async (): Promise<void> => {
    if (USE_MOCK_DATA) return;
    const current = await userRepo.getUser();
    if (!current) return;
    const h = Number(height); const w = Number(weight); const a = Number(age);
    const next: UserProfile = {
      ...current,
      baseParams: Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0 ? { heightCm: h, weightKg: w, age: Number.isFinite(a) && a > 0 ? a : undefined, activityLevel: activity, sex } : undefined,
    };
    await userRepo.saveUser(next); setUser(next);
  };
  return (
    <Screen keyboardAvoiding>
      <AppHeader title="Profile" rightAction={<AppIcon name="profile" size={16} />} />
      <View style={styles.wrap}>
        <Card>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle}>Status</Text>
            <View style={styles.guestPill}><Text style={styles.guestText}>Guest</Text></View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldTitle}>Trial</Text>
            <Text style={styles.trialText}>{trialText}</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>DIETARY PROFILE</Text>
          <Pressable style={styles.profileLink}>
            <AppIcon name="diet" />
            <View style={styles.linkBody}>
              <Text style={styles.linkTitle}>Edit dietary profile</Text>
              <Text style={styles.linkSubtitle}>Preferences, allergies, diet type</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </Pressable>
        </Card>
        <Card>
          <Text style={styles.sectionLabel}>PERSONAL PARAMETERS</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={height} onChangeText={setHeight} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput style={styles.input} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={age} onChangeText={setAge} />
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
              <Text style={styles.inputLabel}>Activity Level</Text>
              <SegmentedControl value={activity} options={mockProfileMeta.activityOptions} onChange={setActivity} />
            </View>
            <PrimaryButton title="Save Changes" onPress={() => void save()} />
          </ScrollView>
        </Card>
        <Card style={styles.premiumCard}>
          <AppIcon name="sparkles" />
          <Text style={styles.premiumTitle}>Unlock Premium</Text>
          <Text style={styles.premiumSubtitle}>Get unlimited recipes and advanced AI analysis.</Text>
          <PrimaryButton title="Upgrade to Premium" />
        </Card>
        <Card style={styles.legalCard}>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle}>Terms of Service</Text><Text style={styles.chevron}>{'>'}</Text></View>
          <View style={styles.rowBetween}><Text style={styles.fieldTitle}>Privacy Policy</Text><Text style={styles.chevron}>{'>'}</Text></View>
        </Card>
        <Text style={styles.disclaimer}>Disclaimer: This app is for informational purposes only and does not constitute medical advice.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: uiTheme.spacing.md, paddingBottom: uiTheme.spacing.xl },
  sectionLabel: { fontSize: 13, color: '#6B7280', fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 42,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F7',
  },
  fieldTitle: { color: uiTheme.colors.textPrimary, fontSize: 17, fontWeight: '500' },
  guestPill: { backgroundColor: '#F3F4F6', borderRadius: uiTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  guestText: { fontSize: 13, color: '#374151', fontWeight: '700' },
  trialText: { color: uiTheme.colors.success, fontWeight: '700' },
  profileLink: { minHeight: 72, borderRadius: uiTheme.radius.sm, backgroundColor: '#F8FAFD', borderWidth: 1, borderColor: '#EEF2F6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  linkBody: { flex: 1 },
  linkTitle: { ...typography.body, fontWeight: '700' },
  linkSubtitle: { fontSize: 13, color: '#6B7280' },
  chevron: { color: '#9CA3AF', fontWeight: '700', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: uiTheme.spacing.sm },
  gridItem: { width: '48%', gap: 6 },
  inputLabel: { fontSize: 13, color: '#6B7280' },
  input: {
    borderWidth: 1,
    borderColor: uiTheme.colors.border,
    borderRadius: uiTheme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    color: uiTheme.colors.textPrimary,
    fontSize: 16,
  },
  segmentWrap: { marginTop: uiTheme.spacing.sm, marginBottom: uiTheme.spacing.md, gap: 8 },
  premiumCard: { alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 20 },
  premiumTitle: { ...typography.h3, textAlign: 'center' },
  premiumSubtitle: { color: uiTheme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  legalCard: { gap: 6 },
  disclaimer: { color: '#9CA3AF', fontSize: 12, textAlign: 'center' },
});
