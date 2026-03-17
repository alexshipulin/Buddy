import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { trialRepo } from '../services/container';
import { useAppAlert } from '../ui/components/AppAlertProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;
type PlanKey = 'monthly' | 'yearly';

type Benefit = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
};

const TOTAL_TRIAL_DAYS = 7;

const BENEFITS: Benefit[] = [
  {
    id: 'ask',
    title: 'Ask Buddy',
    subtitle: 'Use science backed AI help',
    icon: '💬',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
  },
  {
    id: 'explain',
    title: 'Smarter explanations',
    subtitle: 'Deep dive into ingredients',
    icon: '✨',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
  },
  {
    id: 'learn',
    title: 'Learning on the way',
    subtitle: 'Smart tips to learn how to be healty',
    icon: '📖',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
  },
];

const PLAN_COPY: Record<PlanKey, { ctaSubtitle: string }> = {
  monthly: {
    ctaSubtitle: '7 days free, then $1.99/month',
  },
  yearly: {
    ctaSubtitle: '7 days free, then $9.99/year',
  },
};

export function PaywallScreen({ navigation, route }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppAlert();
  const [loading, setLoading] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>('yearly');

  const trialDaysLeft = Math.max(
    0,
    Math.min(TOTAL_TRIAL_DAYS, route.params?.trialDaysLeft ?? 5)
  );
  const trialProgress = trialDaysLeft / TOTAL_TRIAL_DAYS;

  const activatePremium = React.useCallback(async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    try {
      const trial = await trialRepo.getTrial();
      await trialRepo.saveTrial({ ...trial, isPremium: true });
      navigation.goBack();
    } catch {
      await showAlert({
        title: 'Something went wrong',
        message: 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, navigation, showAlert]);

  return (
    <View style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerRow}>
          <Pressable
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>

          <Pressable
            onPress={() => void activatePremium()}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
            disabled={loading}
          >
            <Text style={styles.restoreText}>Restore</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 220 + Math.max(insets.bottom, 16) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View style={styles.mainBlock}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>
                Unlock <Text style={styles.titleAccent}>Full</Text>
              </Text>
              <Text style={styles.subtitle}>Ask Buddy anything about</Text>
              <Text style={styles.subtitle}>menus and meals.</Text>
            </View>

            <View style={styles.trialCard}>
              <View style={styles.trialTopRow}>
                <Text style={styles.trialLabel}>Trial Status</Text>
                <Text style={styles.trialValue}>{`${trialDaysLeft} of ${TOTAL_TRIAL_DAYS} days left`}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(0, Math.min(100, trialProgress * 100))}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.benefitsList}>
              {BENEFITS.map((item) => (
                <View key={item.id} style={styles.benefitRow}>
                  <View style={[styles.benefitIconWrap, { backgroundColor: item.iconBg }]}>
                    <Text style={[styles.benefitIcon, { color: item.iconColor }]}>{item.icon}</Text>
                  </View>
                  <View style={styles.benefitTextWrap}>
                    <Text style={styles.benefitTitle}>{item.title}</Text>
                    <Text style={styles.benefitSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.planRow}>
              <Pressable
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' ? styles.planCardSelected : styles.planCardIdle,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                accessibilityRole="button"
                accessibilityLabel="Select monthly plan"
              >
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>$1.99/mo</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.planCard,
                  selectedPlan === 'yearly' ? styles.planCardSelected : styles.planCardIdle,
                ]}
                onPress={() => setSelectedPlan('yearly')}
                accessibilityRole="button"
                accessibilityLabel="Select yearly plan"
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                <Text style={styles.planName}>Yearly</Text>
                <Text style={styles.planPrice}>$9.99/yr</Text>
                <Text style={styles.planSave}>Save 60%</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={() => void activatePremium()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Start Premium"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaTitle}>Start Premium</Text>
                <Text style={styles.ctaSubtitle}>{PLAN_COPY[selectedPlan].ctaSubtitle}</Text>
              </>
            )}
          </Pressable>

          <View style={styles.legalRow}>
            <Pressable
              onPress={() =>
                void showAlert({
                  title: 'Terms of Service',
                  message: 'Terms will be available soon.',
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.legalText}>Terms of Service</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void showAlert({
                  title: 'Privacy Policy',
                  message: 'Privacy policy will be available soon.',
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.legalText}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  headerRow: {
    height: 48,
    paddingHorizontal: 24,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#64748B',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: -1,
  },
  restoreText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  mainBlock: {
    paddingTop: 20,
  },
  titleBlock: {
    alignItems: 'center',
    paddingBottom: 56,
    gap: 6,
  },
  title: {
    color: '#0F172A',
    fontSize: 45,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -0.75,
    marginBottom: 6,
  },
  titleAccent: {
    color: '#7C3AED',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 18,
    lineHeight: 29,
    fontWeight: '500',
    textAlign: 'center',
  },
  trialCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8F8F9',
    paddingHorizontal: 17,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 32,
  },
  trialTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trialLabel: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  trialValue: {
    color: '#4F46E5',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  benefitsList: {
    marginBottom: 32,
    gap: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 1,
  },
  benefitSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  planRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    position: 'relative',
  },
  planCardIdle: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  planCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planName: {
    color: '#0F172A',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  planSave: {
    color: '#16A34A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: 'transparent',
    gap: 16,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    minHeight: 72,
  },
  ctaButtonDisabled: {
    opacity: 0.8,
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
  },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  legalRow: {
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  legalText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
