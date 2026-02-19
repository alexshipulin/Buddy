import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Dimensions, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Divider } from '../components/Divider';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { appTheme } from '../design/theme';
import { ActivityLevel, Sex, UserProfile } from '../domain/models';
import { trialRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ route }: Props): React.JSX.Element {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [trialText, setTrialText] = React.useState('Free');
  const [height, setHeight] = React.useState(''); const [weight, setWeight] = React.useState('');
  const [age, setAge] = React.useState(''); const [activity, setActivity] = React.useState<ActivityLevel>('Medium'); const [sex, setSex] = React.useState<Sex>('Prefer not to say');
  React.useEffect(() => { void (async () => {
    const u = await userRepo.getUser(); setUser(u);
    if (u?.baseParams) { setHeight(String(u.baseParams.heightCm)); setWeight(String(u.baseParams.weightKg)); setAge(u.baseParams.age ? String(u.baseParams.age) : ''); setActivity(u.baseParams.activityLevel); setSex(u.baseParams.sex ?? 'Prefer not to say'); }
    const trial = await trialRepo.getTrial(); setTrialText(trial.isPremium ? 'Premium' : `Trial left: ${trialRepo.getTrialDaysLeft(trial)}d`);
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',runId:'pre-fix',hypothesisId:'H2_H3',location:'src/screens/ProfileScreen.tsx:25',message:'Profile loaded state',data:{hasBaseParams:Boolean(u?.baseParams),activityLevel:u?.baseParams?.activityLevel ?? null,windowHeight:Dimensions.get('window').height},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  })(); }, []);
  React.useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      // #region agent log
      fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',runId:'pre-fix',hypothesisId:'H2',location:'src/screens/ProfileScreen.tsx:31',message:'Keyboard shown on Profile',data:{keyboardHeight:event.endCoordinates?.height ?? null,screenY:event.endCoordinates?.screenY ?? null,currentActivityValue:activity},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    });
    return () => showSub.remove();
  }, [activity]);
  const save = async (): Promise<void> => {
    const current = await userRepo.getUser();
    if (!current) return;
    const h = Number(height); const w = Number(weight); const a = Number(age);
    const next: UserProfile = {
      ...current,
      baseParams: Number.isFinite(h) && Number.isFinite(w) && h > 0 && w > 0 ? { heightCm: h, weightKg: w, age: Number.isFinite(a) && a > 0 ? a : undefined, activityLevel: activity, sex } : undefined,
    };
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',runId:'pre-fix',hypothesisId:'H3',location:'src/screens/ProfileScreen.tsx:41',message:'Saving base params',data:{height:h,weight:w,age:a,activity,sex},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await userRepo.saveUser(next); setUser(next);
  };
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>Profile</Text>
        <Card><SectionHeader title="Account" /><Text style={styles.value}>Local account (MVP)</Text></Card>
        <Card>
          <SectionHeader title="Goal" />
          <Text style={styles.value}>{user?.goal ?? '-'}</Text>
          <Divider />
          <SectionHeader title="Dietary profile" />
          <View style={styles.chipsRow}>{(user?.dietaryPreferences ?? []).length ? user!.dietaryPreferences.map((p) => <Chip key={p} label={p} />) : <Text style={styles.muted}>No preferences</Text>}</View>
          <View style={styles.chipsRow}>{(user?.allergies ?? []).length ? user!.allergies.map((a) => <Chip key={a} label={a} />) : <Text style={styles.muted}>No allergies</Text>}</View>
        </Card>
        <Card>
          <SectionHeader title="Basic parameters" rightText={route.params?.section === 'baseParams' ? 'Requested from Home' : undefined} />
          <TextInput style={styles.input} keyboardType="number-pad" value={height} onChangeText={setHeight} placeholder="Height (cm)" />
          <TextInput style={styles.input} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} placeholder="Weight (kg)" />
          <TextInput style={styles.input} keyboardType="number-pad" value={age} onChangeText={setAge} placeholder="Age (optional)" />
          <TextInput
            style={styles.input}
            value={activity}
            onChangeText={(t) => {
              // #region agent log
              fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',runId:'pre-fix',hypothesisId:'H3',location:'src/screens/ProfileScreen.tsx:66',message:'Activity text changed',data:{typedValue:t},timestamp:Date.now()})}).catch(()=>{});
              // #endregion
              setActivity((t as ActivityLevel) || 'Medium');
            }}
            placeholder="Activity level: Low / Medium / High"
          />
          <TextInput style={styles.input} value={sex} onChangeText={(t) => setSex((t as Sex) || 'Prefer not to say')} placeholder="Sex" />
          <PrimaryButton title="Save" onPress={() => void save()} />
        </Card>
        <Card><SectionHeader title="Access" /><Text style={styles.value}>{trialText}</Text></Card>
        <Text style={styles.disclaimer}>Information is educational only and not medical advice.</Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.xl },
  title: { fontSize: appTheme.typography.h2, fontWeight: '700', color: appTheme.colors.textPrimary },
  value: { color: appTheme.colors.textPrimary, marginTop: 8, marginBottom: 8, fontSize: appTheme.typography.body },
  muted: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs, marginTop: 8 },
  input: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF', marginTop: 8 },
  disclaimer: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
});
