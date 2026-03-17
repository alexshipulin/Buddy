import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DailyNutritionState } from '../../domain/dayBudget';
import { Goal, NutritionTargets } from '../../domain/models';
import { getTodayAlertText } from '../../domain/todayAlert';

type Props = {
  goal: Goal;
  targets: NutritionTargets;
  dailyState: DailyNutritionState;
  wholeFoodsMealsCount: number;
  now: Date;
};

export function TodayAlertLine(props: Props): React.JSX.Element | null {
  const text = getTodayAlertText(props);
  if (!text) return null;
  const separatorIndex = text.indexOf(':');
  const hasPrefix = separatorIndex > 0;
  const prefix = hasPrefix ? text.slice(0, separatorIndex + 1) : text;
  const body = hasPrefix ? text.slice(separatorIndex + 1).trimStart() : '';

  return (
    // Figma - today frame
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialIcons name="info-outline" size={12} color="#8C2BEE" />
      </View>
      <Text accessibilityRole="text" style={styles.text} maxFontSizeMultiplier={1.2}>
        <Text style={styles.prefix}>{prefix}</Text>
        {body ? ` ${body}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    minHeight: 45.375,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(140,43,238,0.10)',
    backgroundColor: 'rgba(140,43,238,0.05)',
    paddingLeft: 17,
    paddingRight: 17,
    paddingTop: 8.375,
    paddingBottom: 9,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconWrap: {
    width: 11.667,
    height: 11.667,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: '#334155',
    fontSize: 11,
    lineHeight: 13.75,
    textAlign: 'left',
    fontWeight: '400',
  },
  prefix: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
