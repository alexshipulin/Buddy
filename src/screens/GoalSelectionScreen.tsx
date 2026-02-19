import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Goal } from '../domain/models';
import { userRepo } from '../services/container';
import { AppHeader } from '../ui/components/AppHeader';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSelection'>;
type GoalCard = Goal | 'Eat healthier';
const goals: GoalCard[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

export function GoalSelectionScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = React.useState<GoalCard | null>(null);
  const onContinue = async (): Promise<void> => {
    if (!selected) return;
    const mappedGoal: Goal = selected === 'Eat healthier' ? 'Maintain weight' : selected;
    await userRepo.saveUser({ goal: mappedGoal, dietaryPreferences: [], allergies: [] });
    navigation.navigate('DietaryProfile');
  };
  return (
    <Screen>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.wrap}>
        <View style={styles.progress}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.title}>Choose your goal</Text>
        <Text style={styles.subtitle}>Buddy will tailor picks for you.</Text>
        <View style={styles.listGrid}>
          {goals.map((goal) => (
            <Pressable key={goal} onPress={() => setSelected(goal)} style={styles.gridItem}>
              <Card style={[styles.card, selected === goal ? styles.cardSelected : null]}>
                <View style={styles.cardTop}>
                  <View style={styles.goalIcon}>
                    <AppIcon name={goal === 'Gain muscle' ? 'meal' : goal === 'Maintain weight' ? 'sparkles' : goal === 'Eat healthier' ? 'profile' : 'diet'} />
                  </View>
                  <View style={selected === goal ? styles.radioChecked : styles.radio} />
                </View>
                <Text style={styles.goalText}>{goal}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
        <View style={styles.bottomCta}>
          <PrimaryButton title="Continue" onPress={onContinue} disabled={!selected} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: uiTheme.spacing.md },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: uiTheme.spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 24, borderRadius: 8, backgroundColor: '#111827' },
  title: { ...typography.h1, fontSize: 48 / 1.8, lineHeight: 34, textAlign: 'center' },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17, textAlign: 'center' },
  listGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: uiTheme.spacing.sm, marginTop: uiTheme.spacing.sm },
  gridItem: { width: '48%' },
  card: { minHeight: 190, justifyContent: 'space-between', borderWidth: 1, borderColor: uiTheme.colors.border },
  cardSelected: { borderColor: '#000000', borderWidth: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalIcon: { transform: [{ scale: 0.95 }] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E5E7EB' },
  radioChecked: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#000000', borderWidth: 5, borderColor: '#EEF1F8' },
  goalText: { ...typography.h2, fontSize: 40 / 2, lineHeight: 30 },
  bottomCta: { marginTop: 'auto', paddingTop: uiTheme.spacing.lg },
});
