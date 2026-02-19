import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { trialRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation, route }: Props): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const trialDaysLeft = route.params?.trialDaysLeft ?? 7;
  const onStartPremium = async (): Promise<void> => {
    setLoading(true);
    const trial = await trialRepo.getTrial();
    await trialRepo.saveTrial({ ...trial, isPremium: true });
    setLoading(false);
    navigation.goBack();
  };
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.headerAction}>Close</Text></Pressable>
          <Pressable><Text style={styles.headerAction}>Restore</Text></Pressable>
        </View>
        <Text style={styles.title}>Unlock Buddy</Text>
        <Text style={styles.subtitle}>{trialDaysLeft > 0 ? `${trialDaysLeft} of 7 days trial left` : 'Trial ended'}</Text>
        <Card style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Premium includes</Text>
          <Text style={styles.benefitItem}>- Unlimited menu scans</Text>
          <Text style={styles.benefitItem}>- Ask Buddy in chat</Text>
          <Text style={styles.benefitItem}>- Smarter meal suggestions</Text>
        </Card>
        <Card style={styles.planCard}>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>$39.99/year</Text>
          <Text style={styles.planHint}>Cancel anytime. Prices are mock for MVP.</Text>
        </Card>
        <PrimaryButton title={loading ? 'Activating...' : 'Start Premium'} onPress={() => void onStartPremium()} disabled={loading} />
        <SecondaryButton title="Not now" onPress={() => navigation.goBack()} />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: appTheme.spacing.md, paddingBottom: appTheme.spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  headerAction: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small, fontWeight: '600' },
  title: { fontSize: appTheme.typography.title, color: appTheme.colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body, textAlign: 'center' },
  benefitsCard: { gap: 8 },
  benefitsTitle: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3, fontWeight: '700' },
  benefitItem: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
  planCard: { gap: 4, backgroundColor: '#F8F1FF', borderColor: '#E9D5FF' },
  planName: { color: appTheme.colors.textPrimary, fontSize: appTheme.typography.h3, fontWeight: '700' },
  planPrice: { color: appTheme.colors.accent, fontSize: appTheme.typography.h2, fontWeight: '800' },
  planHint: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small },
});
