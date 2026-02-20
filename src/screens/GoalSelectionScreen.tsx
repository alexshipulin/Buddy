import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Goal } from '../domain/models';
import { userRepo } from '../services/container';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { BottomCTA } from '../ui/components/BottomCTA';
import { Screen } from '../ui/components/Screen';
import { AppIcon } from '../ui/components/AppIcon';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSelection'>;
type GoalCard = Goal | 'Eat healthier';
const goals: GoalCard[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

const BOTTOM_CTA_HEIGHT = 56 + spec.screenPaddingBottomOffset * 2 + 16; // button + padding + safe area estimate

export function GoalSelectionScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = React.useState<GoalCard | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - spec.screenPaddingHorizontal * 2 - spec.spacing[16]) / 2;

  const onContinue = async (): Promise<void> => {
    if (!selected) return;
    const mappedGoal: Goal = selected === 'Eat healthier' ? 'Maintain weight' : selected;
    await userRepo.saveUser({ goal: mappedGoal, dietaryPreferences: [], allergies: [] });
    navigation.navigate('DietaryProfile');
  };

  return (
    <Screen bottomCTAPadding={BOTTOM_CTA_HEIGHT}>
      <ScreenHeader leftLabel="Welcome" title="Goal" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.stepIndicator, { marginTop: spec.stepMarginTop, marginBottom: spec.stepMarginBottom }]}>
            <View style={styles.dot} />
            <View style={[styles.dotActive, { width: spec.stepActiveWidth, height: spec.stepActiveHeight }]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>Select your goal</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Buddy will tailor picks for you.</Text>
          <View style={styles.listGrid}>
            {goals.map((goal) => (
              <Pressable key={goal} onPress={() => setSelected(goal)} style={[styles.gridItem, { width: cardWidth }]}>
                <Card style={[styles.card, selected === goal && styles.cardSelected]}>
                  <View style={styles.cardTop}>
                    <View style={styles.goalIcon}>
                      <AppIcon name={goal === 'Gain muscle' ? 'meal' : goal === 'Maintain weight' ? 'sparkles' : goal === 'Eat healthier' ? 'profile' : 'diet'} />
                    </View>
                    <View style={selected === goal ? styles.radioChecked : styles.radio} />
                  </View>
                  <Text style={styles.goalText} maxFontSizeMultiplier={1.2}>{goal}</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <BottomCTA>
        <PrimaryButton title="Continue" onPress={onContinue} disabled={!selected} />
      </BottomCTA>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spec.spacing[24] },
  content: {
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spec.stepGap },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  title: { ...typography.h1, textAlign: 'center', marginTop: spec.spacing[16] },
  subtitle: { ...typography.body, color: appTheme.colors.muted, textAlign: 'center', marginTop: spec.spacing[8], marginBottom: spec.stepMarginBottom },
  listGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spec.spacing[16], justifyContent: 'space-between' },
  gridItem: { minWidth: 0 },
  card: { minHeight: 170, justifyContent: 'space-between', borderWidth: 1, borderColor: appTheme.colors.border },
  cardSelected: { borderColor: appTheme.colors.ink, borderWidth: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: appTheme.colors.border },
  radioChecked: { width: 24, height: 24, borderRadius: 12, backgroundColor: appTheme.colors.ink },
  goalText: { ...typography.h2 },
});
