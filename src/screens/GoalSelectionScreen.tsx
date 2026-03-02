import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { Goal } from '../domain/models';
import { userRepo } from '../services/container';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../ui/components/Card';
import { BottomCTA, getCTATotalHeight } from '../ui/components/BottomCTA';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { AppIcon } from '../ui/components/AppIcon';
import { getPagePaddingX, layout } from '../design/layout';
import { appTheme } from '../design/theme';
import { spec } from '../design/spec';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'GoalSelection'>;
const goals: Goal[] = ['Lose fat', 'Maintain weight', 'Gain muscle', 'Eat healthier'];

export function GoalSelectionScreen({ navigation }: Props): React.JSX.Element {
  const [selected, setSelected] = React.useState<Goal | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagePaddingX = getPagePaddingX(width);
  const contentWidth = width - pagePaddingX * 2;
  const cardGap = spec.spacing[16];
  const cardWidth = (contentWidth - cardGap) / 2;
  const scrollPaddingBottom = getCTATotalHeight(insets.bottom) + spec.spacing[12];

  const onContinue = async (): Promise<void> => {
    if (!selected) return;
    // #region agent log
    fetch('http://127.0.0.1:7904/ingest/be21fb7a-55ce-4d98-bd61-5f937a7671fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'01b4c8'},body:JSON.stringify({sessionId:'01b4c8',location:'GoalSelectionScreen.tsx:onContinue',message:'saving goal with empty dislikes',hypothesisId:'D',data:{goal:selected,dislikes:[]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await userRepo.saveUser({ goal: selected, dietaryPreferences: [], allergies: [], dislikes: [] });
    navigation.navigate('DietaryProfile');
  };

  const onSkip = (): void => {
    userRepo.saveUser({ goal: 'Maintain weight', dietaryPreferences: [], allergies: [], dislikes: [] }).then(() => {
      navigation.navigate('DietaryProfile');
    });
  };

  return (
    <Screen hasBottomCTA>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <View style={styles.stepIndicator}>
          <View style={styles.dot} />
          <View style={[styles.dotActive, { width: spec.stepActiveWidth, height: spec.stepActiveHeight }]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <View style={[styles.headerSpacer, styles.headerSpacerRight]}>
          <Pressable onPress={onSkip} hitSlop={8} style={styles.skipWrap}>
            <Text style={styles.skipText} maxFontSizeMultiplier={1.2}>Skip</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>What should I focus on?</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>Pick a focus - you can change it anytime</Text>
          <View style={[styles.listGrid, { width: contentWidth }]}>
            {goals.map((goal, index) => {
              const isSelected = selected === goal;
              return (
                <Pressable 
                  key={goal} 
                  onPress={() => setSelected(goal)} 
                  style={[
                    styles.gridItem, 
                    { width: cardWidth },
                    index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight,
                  ]}
                >
                  <Card style={[styles.card, isSelected && styles.cardSelected]}>
                    <View style={styles.cardTop}>
                      <AppIcon name={goal === 'Gain muscle' ? 'meal' : goal === 'Maintain weight' ? 'sparkles' : goal === 'Eat healthier' ? 'profile' : 'diet'} />
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.goalText, isSelected && styles.goalTextSelected]} maxFontSizeMultiplier={1.2}>{goal}</Text>
                  </Card>
                </Pressable>
              );
            })}
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
  /** No white bar: transparent so no separate background (Figma) */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: layout.topContentOffset + spec.stepMarginTop,
    paddingBottom: spec.stepMarginBottom,
    backgroundColor: 'transparent',
  },
  headerSpacer: { flex: 1 },
  headerSpacerRight: { alignItems: 'flex-end' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: spec.stepGap },
  skipWrap: { minWidth: spec.minTouchTarget, minHeight: spec.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: spec.headerPillFontSize, fontWeight: '600', color: appTheme.colors.muted },
  dot: { width: spec.stepDotSize, height: spec.stepDotSize, borderRadius: spec.stepDotSize / 2, backgroundColor: appTheme.colors.border },
  dotActive: { borderRadius: spec.stepActiveHeight / 2, backgroundColor: appTheme.colors.ink },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 0 },
  content: {
    alignSelf: 'center',
    width: '100%',
  },
  title: { ...typography.largeTitle, textAlign: 'center', marginTop: 0 },
  subtitle: { ...typography.body, color: appTheme.colors.muted, textAlign: 'center', marginTop: spec.spacing[8], marginBottom: 0 },
  listGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    marginTop: spec.stepMarginBottom,
  },
  gridItem: { 
    marginBottom: spec.spacing[16],
  },
  gridItemLeft: {
    marginRight: spec.spacing[16],
  },
  gridItemRight: {
    marginRight: 0,
  },
  card: { minHeight: 170, justifyContent: 'space-between', borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface },
  cardSelected: { 
    borderColor: appTheme.colors.primary, 
    borderWidth: 2,
    backgroundColor: appTheme.colors.accentSoft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: appTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  goalText: { ...typography.h2, color: appTheme.colors.textPrimary },
  goalTextSelected: { color: appTheme.colors.primary },
});
