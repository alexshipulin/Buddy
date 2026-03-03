import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Animated, Clipboard, Easing, Image, ImageStyle, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { AppScreen } from '../components/AppScreen';
import { appTheme } from '../design/theme';
import {
  AnalyzeMenuOutput,
  analyzeMenuUseCase,
  DailyScanLimitReachedError,
  MenuAnalysisFailedError,
  MenuAnalysisInvalidJsonError,
  MenuAnalysisValidationError,
} from '../services/analyzeMenuUseCase';
import { appPrefsRepo, historyRepo, menuAnalysisProvider, trialRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanMenu'>;

// Show detailed AI debug panel in dev builds or when explicitly enabled via env.
const SHOW_AI_DEBUG = __DEV__ || process.env.EXPO_PUBLIC_SHOW_AI_DEBUG === 'true';

const ANALYZING_MESSAGES = [
  'Finding dishes that match your goal',
  'Scanning nutritional content',
  'Tailoring results to your tastes',
  'Almost ready…',
];

function AnalyzingOverlay({ onCancel }: { onCancel: () => void }): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const orbScale = React.useRef(new Animated.Value(1)).current;
  const textOpacity = React.useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.12, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [orbScale]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 3600);
    return () => clearInterval(interval);
  }, [textOpacity]);

  return (
    // Modal renders in a native window above everything — covers status bar and home indicator
    <Modal visible animationType="fade" transparent={false} statusBarTranslucent onRequestClose={onCancel}>
      <View style={[loadStyles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Close — iOS HIG: 44pt touch target at 16pt leading, 8pt from top of safe area */}
        <View style={loadStyles.header}>
          <Pressable style={loadStyles.cancelBtn} hitSlop={8} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel">
            <View style={loadStyles.cancelCircle}>
              <Text style={loadStyles.cancelIcon}>✕</Text>
            </View>
          </Pressable>
        </View>

        {/* Centered orb + text */}
        <View style={loadStyles.center}>
          <View style={loadStyles.orbContainer}>
            <View style={loadStyles.orbGlow} />
            <Animated.View style={[loadStyles.orb, { transform: [{ scale: orbScale }] }]}>
              <View style={loadStyles.orbHighlight} />
            </Animated.View>
          </View>

          <View style={loadStyles.textBlock}>
            <Text style={loadStyles.title}>Analyzing…</Text>
            <Animated.Text style={[loadStyles.subtitle, { opacity: textOpacity }]}>
              {ANALYZING_MESSAGES[msgIndex]}
            </Animated.Text>
          </View>
        </View>

        {/* Footer */}
        <View style={loadStyles.footer}>
          <Text style={loadStyles.brand}>BUDDY AI</Text>
        </View>
      </View>
    </Modal>
  );
}

const ORB_SIZE = 120;
const GLOW_SIZE = ORB_SIZE * 1.9;

const loadStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cancelBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIcon: {
    fontSize: 14,
    lineHeight: 14,
    color: '#64748B',
    fontWeight: '400',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  orbContainer: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  orbGlow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: '#EDE9FE',
    opacity: 0.6,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    overflow: 'hidden',
  },
  orbHighlight: {
    position: 'absolute',
    top: 10,
    left: 18,
    width: 44,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    opacity: 0.2,
    transform: [{ rotate: '-12deg' }],
  },
  textBlock: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94A3B8',
    height: 22,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
    opacity: 0.3,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#94A3B8',
  },
});

export function ScanMenuScreen({ navigation }: Props): React.JSX.Element {
  const cameraRef = React.useRef<CameraView | null>(null);
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [rawAiOutput, setRawAiOutput] = React.useState<string | null>(null);
  const [rawAiModel, setRawAiModel] = React.useState<string | null>(null);
  const [showRawOutput, setShowRawOutput] = React.useState(false);

  const removePhoto = (uri: string): void => setPhotos((p) => p.filter((i) => i !== uri));
  const maxPhotos = 5;

  const takePhoto = async (): Promise<void> => {
    if (photos.length >= maxPhotos) return;
    const granted = cameraPermission?.granted || (await requestCameraPermission()).granted;
    if (!granted) return Alert.alert('Camera access needed', 'Please allow camera to scan menus.');
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (shot?.uri) setPhotos((p) => [...p, shot.uri].slice(0, maxPhotos));
  };

  const addFromGallery = async (): Promise<void> => {
    if (photos.length >= maxPhotos) return;
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
      quality: 0.7,
    });
    if (selected.canceled) return;
    setPhotos((p) => [...p, ...selected.assets.map((a) => a.uri)].slice(0, maxPhotos));
  };

  const askSaveScansPreferenceIfNeeded = async (): Promise<boolean> => {
    const prefs = await appPrefsRepo.getPrefs();
    if (prefs.saveScansPromptHandled) return prefs.saveScansToPhotos;
    return new Promise<boolean>((resolve) => {
      Alert.alert('Save scans to Photos?', 'So you can access them later.', [
        { text: 'Not now', style: 'cancel', onPress: () => { void appPrefsRepo.setSaveScansPreference(false); resolve(false); } },
        { text: 'Allow', onPress: () => { void appPrefsRepo.setSaveScansPreference(true); resolve(true); } },
      ]);
    });
  };

  const maybeSaveToGallery = async (uris: string[]): Promise<void> => {
    if (!(await askSaveScansPreferenceIfNeeded()) || uris.length === 0) return;
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) return;
    await Promise.all(uris.map((u) => MediaLibrary.createAssetAsync(u).catch(() => null)));
  };

  const onSuccess = async (output: AnalyzeMenuOutput): Promise<void> => {
    await maybeSaveToGallery(photos);
    navigation.navigate('MenuResults', {
      resultId: output.resultId,
      paywallAfterOpen: output.shouldShowPaywallAfterResults,
      trialDaysLeft: output.trialDaysLeft,
    });
  };

  const dismissError = (): void => {
    setErrorMessage(null);
    setRawAiOutput(null);
    setRawAiModel(null);
    setShowRawOutput(false);
  };

  const onContinue = async (): Promise<void> => {
    dismissError();
    setLoading(true);
    try {
      const output = await analyzeMenuUseCase(photos, {
        historyRepo,
        menuProvider: menuAnalysisProvider,
        trialRepo,
        userRepo,
      });
      await onSuccess(output);
    } catch (e) {
      if (e instanceof DailyScanLimitReachedError) {
        setErrorMessage('Daily limit reached. You can scan one menu per day on Free plan.');
      } else if (e instanceof MenuAnalysisInvalidJsonError) {
        if (__DEV__ && e.issues?.length) {
          console.warn('[MenuScan] Validation issues:', e.issues);
        }
        if (__DEV__ && e.raw) {
          console.warn('[MenuScan] Raw model output:', e.raw);
        }
        setRawAiOutput(e.raw || null);
        setRawAiModel(e.model || null);
        setErrorMessage('Could not analyze this menu. Please try again.');
      } else if (e instanceof MenuAnalysisValidationError) {
        // Fallback: validation thrown outside the standard path
        if (__DEV__ && e.issues?.length) {
          console.warn('[MenuScan] Validation issues:', e.issues);
        }
        setErrorMessage('Could not analyze this menu. Please try again.');
      } else if (e instanceof MenuAnalysisFailedError) {
        setErrorMessage(e.message || 'Analysis failed. Please try again.');
      } else {
        setErrorMessage(e instanceof Error ? e.message : 'Failed to analyze menu');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLimitError = errorMessage?.startsWith('Daily limit');
  const hasRawDebug = SHOW_AI_DEBUG && !!rawAiOutput;

  return (
    <AppScreen padded={false} respectInsets={false} style={styles.wrap}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => {}}
        onMountError={() => {}}
      />
      <View style={[styles.topOverlay, { paddingTop: insets.top + appTheme.spacing.sm }]}>
        <Pressable style={styles.backBtn} hitSlop={8} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title}>Scan menu</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + appTheme.spacing.md }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb as ImageStyle} />
              <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => removePhoto(uri)}>
                <Text style={styles.removeText}>X</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.bottomRow}>
          <Pressable style={styles.importBtn} onPress={() => void addFromGallery()}>
            <Text style={styles.importText}>Import</Text>
          </Pressable>
          <Pressable style={styles.captureBtn} onPress={() => void takePhoto()}>
            <View style={styles.captureInner} />
          </Pressable>
          <View style={styles.placeholder} />
        </View>
        <PrimaryButton title="Continue" onPress={() => void onContinue()} disabled={photos.length === 0 || loading} />
      </View>

      {loading ? (
        <AnalyzingOverlay onCancel={() => navigation.goBack()} />
      ) : null}

      {errorMessage ? (
        <View style={styles.overlay}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              style={styles.copyErrorBtn}
              onPress={() => {
                if (errorMessage) {
                  Clipboard.setString(errorMessage);
                  Alert.alert('Copied', 'Error message copied to clipboard.');
                }
              }}
            >
              <Text style={styles.copyErrorBtnText}>Copy</Text>
            </Pressable>

            {/* Developer debug panel — raw AI response */}
            {hasRawDebug && (
              <View style={styles.debugSection}>
                <View style={styles.debugHeader}>
                  <Pressable
                    onPress={() => setShowRawOutput((v) => !v)}
                    style={styles.debugToggle}
                    hitSlop={8}
                  >
                    <Text style={styles.debugToggleText}>
                      {showRawOutput ? '▲ Hide AI response' : '▼ Show AI response'}
                    </Text>
                  </Pressable>
                  {rawAiModel ? (
                    <Text style={styles.debugModelLabel}>Model: {rawAiModel}</Text>
                  ) : null}
                </View>
                {showRawOutput && (
                  <View style={styles.rawOutputContainer}>
                    <ScrollView style={styles.rawOutputScroll} nestedScrollEnabled>
                      <Text style={styles.rawOutputText} selectable>
                        {rawAiOutput}
                      </Text>
                    </ScrollView>
                    <Pressable
                      style={styles.copyBtn}
                      onPress={() => {
                        if (rawAiOutput) {
                          Clipboard.setString(rawAiOutput);
                          Alert.alert('Copied', 'Raw AI response copied to clipboard.');
                        }
                      }}
                    >
                      <Text style={styles.copyBtnText}>Copy</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <View style={styles.errorActions}>
              <Pressable style={styles.errorSecondaryBtn} onPress={dismissError}>
                <Text style={styles.errorSecondaryText}>{isLimitError ? 'Close' : 'Dismiss'}</Text>
              </Pressable>
              {isLimitError ? (
                <Pressable
                  style={styles.errorPrimaryBtn}
                  onPress={() => {
                    dismissError();
                    navigation.navigate('Paywall', { source: 'limit' });
                  }}
                >
                  <Text style={styles.errorPrimaryText}>Open paywall</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.errorPrimaryBtn} onPress={dismissError}>
                  <Text style={styles.errorPrimaryText}>Try again</Text>
                </Pressable>
              )}
            </View>
          </Card>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000' },
  camera: { ...StyleSheet.absoluteFillObject },
  topOverlay: {
    paddingHorizontal: appTheme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: appTheme.typography.body.fontSize, color: '#FFFFFF', fontWeight: '700' },
  bottomOverlay: {
    marginTop: 'auto',
    paddingHorizontal: appTheme.spacing.md,
    gap: appTheme.spacing.md,
  },
  thumbRow: { gap: appTheme.spacing.sm, paddingVertical: 2 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 58, height: 78, borderRadius: appTheme.radius.md, backgroundColor: '#FFFFFF44' },
  removeBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#111827AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  importBtn: {
    width: 84,
    height: 54,
    borderRadius: appTheme.radius.md,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importText: { color: '#FFFFFF', fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  captureBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF' },
  placeholder: { width: 84 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#11182755',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: { width: '88%', alignItems: 'center', gap: appTheme.spacing.md },
  errorTitle: {
    color: appTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: appTheme.typography.body.fontSize,
  },
  errorText: {
    color: appTheme.colors.textSecondary,
    fontSize: appTheme.typography.small.fontSize,
    textAlign: 'center',
  },
  copyErrorBtn: {
    alignSelf: 'center',
    paddingVertical: appTheme.spacing.sm,
    paddingHorizontal: appTheme.spacing.md,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.border,
  },
  copyErrorBtnText: {
    fontSize: appTheme.typography.footnote.fontSize,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
  },
  // Debug section styles
  debugSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.border,
    paddingTop: appTheme.spacing.sm,
    gap: appTheme.spacing.xs,
  },
  debugHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  debugToggle: { paddingVertical: 2 },
  debugToggleText: {
    color: appTheme.colors.accent,
    fontSize: appTheme.typography.footnote.fontSize,
    fontWeight: '600',
  },
  debugModelLabel: {
    color: appTheme.colors.textSecondary,
    fontSize: appTheme.typography.footnote.fontSize - 1,
    fontFamily: 'monospace',
  },
  rawOutputContainer: { gap: appTheme.spacing.xs },
  rawOutputScroll: {
    maxHeight: 180,
    backgroundColor: '#F3F4F6',
    borderRadius: appTheme.radius.sm,
    padding: appTheme.spacing.xs,
  },
  rawOutputText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#111827',
    lineHeight: 14,
  },
  copyBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: appTheme.spacing.sm,
    borderRadius: appTheme.radius.sm,
    backgroundColor: '#E5E7EB',
  },
  copyBtnText: {
    fontSize: appTheme.typography.footnote.fontSize,
    fontWeight: '600',
    color: '#374151',
  },
  // Action buttons
  errorActions: { flexDirection: 'row', gap: appTheme.spacing.sm, marginTop: appTheme.spacing.xs },
  errorSecondaryBtn: {
    paddingVertical: appTheme.spacing.sm,
    paddingHorizontal: appTheme.spacing.md,
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  errorSecondaryText: {
    color: appTheme.colors.textSecondary,
    fontWeight: '600',
    fontSize: appTheme.typography.footnote.fontSize,
  },
  errorPrimaryBtn: {
    paddingVertical: appTheme.spacing.sm,
    paddingHorizontal: appTheme.spacing.md,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.primary,
  },
  errorPrimaryText: {
    color: appTheme.colors.primaryText,
    fontWeight: '600',
    fontSize: appTheme.typography.footnote.fontSize,
  },
});
