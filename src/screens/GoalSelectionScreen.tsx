import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { appTheme } from '../design/theme';
import { Goal } from '../domain/models';
import { userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSelection'>;
const goals: Goal[] = ['Lose fat', 'Maintain weight', 'Gain muscle'];

export function GoalSelectionScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = React.useState<Goal | null>(null);
  const onContinue = async (): Promise<void> => {
    if (!selected) return;
    await userRepo.saveUser({ goal: selected, dietaryPreferences: [], allergies: [] });
    navigation.navigate('DietaryProfile');
  };
  return (
    <AppScreen scroll>
      <View style={styles.wrap}>
        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.title}>Select your goal</Text>
        <Text style={styles.subtitle}>Buddy will tailor picks for you.</Text>
        <View style={styles.listGrid}>
          {goals.map((goal) => (
            <Pressable key={goal} onPress={() => setSelected(goal)} style={styles.gridItem}>
              <Card style={[styles.card, selected === goal ? styles.cardSelected : null]}>
                <View style={styles.radioWrap}>
                  <View style={selected === goal ? styles.radioChecked : styles.radio} />
                </View>
                <Text style={styles.goalText}>{goal}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
        <PrimaryButton title="Continue" onPress={onContinue} disabled={!selected} style={!selected ? styles.continueDisabled : undefined} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.md },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: appTheme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 24, borderRadius: 8, backgroundColor: '#111827' },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, textAlign: 'center' },
  listGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.sm },
  gridItem: { width: '48%' },
  card: { minHeight: 180, justifyContent: 'space-between', borderWidth: 1, borderColor: appTheme.colors.border },
  cardSelected: { borderColor: '#000000', borderWidth: 2 },
  radioWrap: { flexDirection: 'row', justifyContent: 'flex-end' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E5E7EB' },
  radioChecked: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#000000' },
  goalText: { fontSize: appTheme.typography.h3, color: appTheme.colors.textPrimary, fontWeight: '700' },
  continueDisabled: { opacity: 0.6 },
});
