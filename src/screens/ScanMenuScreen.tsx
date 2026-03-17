import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { Card } from '../components/Card';
import { appTheme } from '../design/theme';
import {
  AnalyzeMenuOutput,
  analyzeMenuUseCase,
  DailyScanLimitReachedError,
  MenuAnalysisFailedError,
  MenuAnalysisInvalidJsonError,
  MenuAnalysisValidationError,
} from '../services/analyzeMenuUseCase';
import { appPrefsRepo, dailyNutritionRepo, historyRepo, menuAnalysisProvider, trialRepo, userRepo } from '../services/container';
import { useAppAlert } from '../ui/components/AppAlertProvider';
import { abortInflight } from '../ai/inflight';
import {
  buildAIDebugIncidentReportByAnalysisId,
  buildAIDebugReport,
} from '../ai/aiDebugLog';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanMenu'>;

const ANALYZING_MESSAGES = [
  'Finding dishes that match your goal',
  'Scanning nutritional content',
  'Tailoring results to your tastes',
  'Almost ready…',
];

const BASE_FRAME_WIDTH = 390;
const BASE_FRAME_HEIGHT = 844;
const BASE_SCAN_WIDTH = 256;
const BASE_SCAN_HEIGHT = 384;

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
  const { showAlert } = useAppAlert();
  const cameraRef = React.useRef<CameraView | null>(null);
  const activeRunIdRef = React.useRef(0);
  const didAutoRequestPermissionRef = React.useRef(false);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [flashOn, setFlashOn] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [errorAnalysisId, setErrorAnalysisId] = React.useState<number | null>(null);
  const [rawAiOutput, setRawAiOutput] = React.useState<string | null>(null);
  const [rawAiModel, setRawAiModel] = React.useState<string | null>(null);
  const [showRawOutput, setShowRawOutput] = React.useState(false);

  const shareText = React.useCallback(
    async (text: string, title: string, successMessage: string): Promise<void> => {
      try {
        await Share.share({ message: text, title });
        await showAlert({
          title: 'Done',
          message: successMessage,
        });
      } catch {
        await showAlert({
          title: 'Could not share',
          message: 'Please try again.',
        });
      }
    },
    [showAlert]
  );

  const removePhoto = (uri: string): void => setPhotos((p) => p.filter((i) => i !== uri));
  const maxPhotos = 5;
  const hasCameraPermission = cameraPermission?.granted === true;
  const cameraStatusResolved = cameraPermission != null;
  const ensureCameraPermission = React.useCallback(async (): Promise<boolean> => {
    if (cameraPermission?.granted) return true;
    const next = await requestCameraPermission();
    if (next.granted) return true;

    if (!next.canAskAgain) {
      const { index } = await showAlert({
        title: 'Camera access is blocked',
        message: 'Enable camera in system settings to take menu photos.',
        actions: [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings' },
        ],
      });
      if (index === 1) {
        try {
          await Linking.openSettings();
        } catch {
          await showAlert({
            title: 'Could not open settings',
            message: 'Please open system settings manually and allow camera access.',
          });
        }
      }
      return false;
    }

    await showAlert({
      title: 'Camera access needed',
      message: 'Please allow camera to scan menus.',
    });
    return false;
  }, [cameraPermission?.granted, requestCameraPermission, showAlert]);

  React.useEffect(() => {
    if (!cameraStatusResolved || hasCameraPermission || didAutoRequestPermissionRef.current) return;
    if (cameraPermission?.canAskAgain) {
      didAutoRequestPermissionRef.current = true;
      void requestCameraPermission();
    }
  }, [
    cameraPermission?.canAskAgain,
    cameraStatusResolved,
    hasCameraPermission,
    requestCameraPermission,
  ]);

  const handleCameraMountError = React.useCallback(
    (event: { message?: string } | Error | undefined): void => {
      const message =
        typeof event === 'object' && event && 'message' in event
          ? String(event.message ?? '')
          : '';
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes('permission')) {
        return;
      }
      if (__DEV__) {
        console.warn('[ScanMenu] Camera mount error:', event);
      }
      setLoading(false);
      setErrorMessage(
        message
          ? `Camera is unavailable: ${message}`
          : 'Camera is unavailable on this device. Try using Import.'
      );
    },
    []
  );

  const takePhoto = async (): Promise<void> => {
    if (photos.length >= maxPhotos) return;
    const granted = await ensureCameraPermission();
    if (!granted) return;
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (shot?.uri) setPhotos((p) => [...p, shot.uri].slice(0, maxPhotos));
  };

  const addFromGallery = async (): Promise<void> => {
    if (photos.length >= maxPhotos) return;
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
      quality: 0.85,
    });
    if (selected.canceled) return;
    setPhotos((p) => [...p, ...selected.assets.map((a) => a.uri)].slice(0, maxPhotos));
  };

  const askSaveScansPreferenceIfNeeded = async (): Promise<boolean> => {
    const prefs = await appPrefsRepo.getPrefs();
    if (prefs.saveScansPromptHandled) return prefs.saveScansToPhotos;
    const { index } = await showAlert({
      title: 'Save scans to Photos?',
      message: 'So you can access them later.',
      actions: [
        { text: 'Not now', style: 'cancel' },
        { text: 'Allow' },
      ],
    });
    const shouldSave = index === 1;
    await appPrefsRepo.setSaveScansPreference(shouldSave);
    return shouldSave;
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
      analysisId: output.analysisId,
      paywallAfterOpen: output.shouldShowPaywallAfterResults,
      trialDaysLeft: output.trialDaysLeft,
    });
  };

  const dismissError = (): void => {
    setErrorMessage(null);
    setErrorAnalysisId(null);
    setRawAiOutput(null);
    setRawAiModel(null);
    setShowRawOutput(false);
  };

  const cancelCurrentAnalysis = React.useCallback((): void => {
    activeRunIdRef.current += 1;
    abortInflight('menu_scan');
    setLoading(false);
  }, []);

  React.useEffect(
    () => () => {
      cancelCurrentAnalysis();
    },
    [cancelCurrentAnalysis]
  );

  const onContinue = async (): Promise<void> => {
    if (loading) return;
    dismissError();
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setLoading(true);
    try {
      const output = await analyzeMenuUseCase(photos, {
        dailyNutritionRepo,
        historyRepo,
        menuProvider: menuAnalysisProvider,
        trialRepo,
        userRepo,
      });
      if (activeRunIdRef.current !== runId) return;
      await onSuccess(output);
    } catch (e) {
      if (activeRunIdRef.current !== runId) return;
      if (e instanceof Error && e.name === 'AbortError') return;
      const capturedAnalysisId =
        typeof (e as { analysisId?: unknown })?.analysisId === 'number'
          ? Math.floor((e as { analysisId: number }).analysisId)
          : null;
      setErrorAnalysisId(capturedAnalysisId && capturedAnalysisId > 0 ? capturedAnalysisId : null);
      if (e instanceof DailyScanLimitReachedError) {
        setErrorMessage('Daily limit reached. You can scan one menu per day on Free plan.');
      } else if (e instanceof MenuAnalysisInvalidJsonError) {
        if (__DEV__ && e.raw) {
          console.warn('[MenuScan] Raw model output:', e.raw);
        }
        const rawOrDetails = e.raw?.trim() ? e.raw : e.message;
        setRawAiOutput(rawOrDetails || null);
        setRawAiModel(e.model || null);
        setErrorMessage(
          e.message?.toLowerCase().includes('timeout')
            ? 'Analysis timed out. Please try again.'
            : 'Could not analyze this menu. Please try again.'
        );
      } else if (e instanceof MenuAnalysisValidationError) {
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
      if (activeRunIdRef.current === runId) {
        setLoading(false);
      }
    }
  };

  const isLimitError = errorMessage?.startsWith('Daily limit');
  const hasRawDebug = !!rawAiOutput;
  const scale = Math.min(screenWidth / BASE_FRAME_WIDTH, screenHeight / BASE_FRAME_HEIGHT);
  const scanWidth = Math.round(BASE_SCAN_WIDTH * scale);
  const scanHeight = Math.round(BASE_SCAN_HEIGHT * scale);
  const scanRadius = Math.max(20, Math.round(24 * scale));
  const cornerSize = Math.max(24, Math.round(32 * scale));
  const cornerStroke = Math.max(2, Math.round(3 * scale));
  const previewSlots = [photos[0] ?? null, photos[1] ?? null];
  const canContinue = photos.length > 0 && !loading;
  const canCapture = hasCameraPermission && photos.length < maxPhotos && !loading;

  return (
    <View style={styles.wrap}>
      {hasCameraPermission ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashOn ? 'on' : 'off'}
          onCameraReady={() => {}}
          onMountError={handleCameraMountError}
        />
      ) : (
        <View style={styles.cameraPermissionOverlay}>
          <View style={styles.cameraPermissionCard}>
            <Text style={styles.cameraPermissionTitle}>Camera access required</Text>
            <Text style={styles.cameraPermissionText}>
              Allow camera to scan menu photos, or use Import from gallery.
            </Text>
            <Pressable
              style={styles.cameraPermissionBtn}
              onPress={() => {
                void ensureCameraPermission();
              }}
            >
              <Text style={styles.cameraPermissionBtnText}>Allow camera</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Faux gradients (without extra deps) to match Figma shading */}
      <View pointerEvents="none" style={styles.topShadeStrong} />
      <View pointerEvents="none" style={styles.topShadeSoft} />
      <View pointerEvents="none" style={styles.bottomShadeSoft} />
      <View pointerEvents="none" style={styles.bottomShadeStrong} />

      <View pointerEvents="none" style={styles.scanFrameLayer}>
        <View
          style={[
            styles.scanFrame,
            {
              width: scanWidth,
              height: scanHeight,
              borderRadius: scanRadius,
            },
          ]}
        >
          <View
            style={[
              styles.scanCorner,
              styles.scanCornerTopLeft,
              {
                width: cornerSize,
                height: cornerSize,
                borderTopWidth: cornerStroke,
                borderLeftWidth: cornerStroke,
                borderTopLeftRadius: scanRadius,
              },
            ]}
          />
          <View
            style={[
              styles.scanCorner,
              styles.scanCornerTopRight,
              {
                width: cornerSize,
                height: cornerSize,
                borderTopWidth: cornerStroke,
                borderRightWidth: cornerStroke,
                borderTopRightRadius: scanRadius,
              },
            ]}
          />
          <View
            style={[
              styles.scanCorner,
              styles.scanCornerBottomLeft,
              {
                width: cornerSize,
                height: cornerSize,
                borderBottomWidth: cornerStroke,
                borderLeftWidth: cornerStroke,
                borderBottomLeftRadius: scanRadius,
              },
            ]}
          />
          <View
            style={[
              styles.scanCorner,
              styles.scanCornerBottomRight,
              {
                width: cornerSize,
                height: cornerSize,
                borderBottomWidth: cornerStroke,
                borderRightWidth: cornerStroke,
                borderBottomRightRadius: scanRadius,
              },
            ]}
          />
        </View>
      </View>

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backBtn}
          hitSlop={8}
          onPress={() => {
            if (loading) cancelCurrentAnalysis();
            navigation.goBack();
          }}
        >
          <Text style={styles.backText}>{'←'}</Text>
        </Pressable>
        <Text style={styles.title}>Scan menu</Text>
        <Pressable
          style={styles.flashBtn}
          hitSlop={8}
          onPress={() => setFlashOn((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={flashOn ? 'Turn flash off' : 'Turn flash on'}
        >
          <Text style={[styles.flashText, flashOn && styles.flashTextActive]}>⚡</Text>
        </Pressable>
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.thumbRow}>
          {previewSlots.map((uri, idx) => (
            <View key={`preview-${idx}`} style={styles.thumbWrap}>
              {uri ? (
                <>
                  <Image source={{ uri }} style={styles.thumb} />
                  <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => removePhoto(uri)}>
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                </>
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
            </View>
          ))}

          <Pressable
            style={[styles.counterTile, canContinue && styles.counterTileActive]}
            disabled={!canContinue}
            onPress={() => void onContinue()}
          >
            <Text style={styles.counterText}>{`${photos.length}/${maxPhotos}`}</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.importGroup} onPress={() => void addFromGallery()} disabled={loading}>
            <View style={styles.importBtn}>
              <View style={styles.importIconFrame}>
                <View style={styles.importIconDot} />
                <View style={styles.importIconHill} />
              </View>
            </View>
            <Text style={styles.importText}>Import</Text>
          </Pressable>

          <Pressable style={[styles.captureBtn, !canCapture && styles.captureBtnDisabled]} onPress={() => void takePhoto()} disabled={!canCapture}>
            <View style={styles.captureInner} />
          </Pressable>

          <Pressable
            style={styles.analyzeGroup}
            onPress={() => void onContinue()}
            disabled={!canContinue}
          >
            <View style={[styles.analyzeBtn, !canContinue && styles.analyzeBtnDisabled]}>
              <Text style={styles.analyzeBtnText}>Analyse</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <AnalyzingOverlay onCancel={cancelCurrentAnalysis} />
      ) : null}

      {errorMessage ? (
        <View style={styles.overlay}>
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            {errorAnalysisId ? (
              <Text style={styles.analysisIdText}>Scan ID #{errorAnalysisId}</Text>
            ) : null}
            <Pressable
              style={styles.copyErrorBtn}
              onPress={() => {
                if (errorMessage) {
                  void shareText(
                    errorMessage,
                    'Menu analysis error',
                    'Error message is ready to share.'
                  );
                }
              }}
            >
              <Text style={styles.copyErrorBtnText}>Share</Text>
            </Pressable>
            {errorAnalysisId ? (
              <Pressable
                style={styles.copyErrorBtn}
                onPress={() => {
                  void (async () => {
                    const [user, targets, today] = await Promise.all([
                      userRepo.getUser(),
                      userRepo.getNutritionTargets(),
                      dailyNutritionRepo.getToday(new Date()),
                    ]);
                    const report = await buildAIDebugIncidentReportByAnalysisId({
                      analysisId: errorAnalysisId,
                      context: {
                        errorMessage,
                        rawAiOutput,
                        rawAiModel,
                        user,
                        targets,
                        today,
                      },
                    });
                    await shareText(
                      report,
                      `AI incident report #${errorAnalysisId}`,
                      `AI incident report for scan #${errorAnalysisId} is ready to share.`
                    );
                  })();
                }}
              >
                <Text style={styles.copyErrorBtnText}>Share this scan incident report</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.copyErrorBtn}
              onPress={() => {
                void (async () => {
                  const report = await buildAIDebugReport(1200);
                  await shareText(
                    report,
                    'AI debug report',
                    'AI debug report is ready to share.'
                  );
                })();
              }}
            >
              <Text style={styles.copyErrorBtnText}>Share AI logs</Text>
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
                      {showRawOutput ? '▲ Hide details' : '▼ Show details'}
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
                          void shareText(
                            rawAiOutput,
                            'Raw AI response',
                            'Raw AI response is ready to share.'
                          );
                        }
                      }}
                    >
                      <Text style={styles.copyBtnText}>Share</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000' },
  camera: { ...StyleSheet.absoluteFillObject },
  cameraPermissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#05070D',
  },
  cameraPermissionCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  cameraPermissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  cameraPermissionText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cameraPermissionBtn: {
    alignSelf: 'flex-start',
    borderRadius: 22,
    backgroundColor: '#8C2BEE',
    paddingHorizontal: 18,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPermissionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  topShadeStrong: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 132,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  topShadeSoft: {
    position: 'absolute',
    top: 132,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  bottomShadeSoft: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 208,
    height: 104,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  bottomShadeStrong: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 208,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  scanFrameLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  scanCorner: {
    position: 'absolute',
    borderColor: '#FFFFFF',
  },
  scanCornerTopLeft: { top: -1, left: -1 },
  scanCornerTopRight: { top: -1, right: -1 },
  scanCornerBottomLeft: { bottom: -1, left: -1 },
  scanCornerBottomRight: { bottom: -1, right: -1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontSize: 24,
    lineHeight: 24,
    marginTop: -2,
  },
  title: {
    fontSize: 17,
    lineHeight: 25.5,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  flashBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '800',
  },
  flashTextActive: {
    color: '#FFE18B',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  thumbRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 32,
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#9CA3AF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  counterTile: {
    width: 48,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTileActive: {
    backgroundColor: 'rgba(17,24,39,0.6)',
  },
  counterText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', lineHeight: 11 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  importGroup: {
    width: 80,
    alignItems: 'center',
    gap: 4,
  },
  importBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  importIconFrame: {
    width: 20,
    height: 20,
    borderWidth: 1.4,
    borderColor: '#F3F4F6',
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 3,
    paddingHorizontal: 2,
  },
  importIconDot: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#F3F4F6',
  },
  importIconHill: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 2,
    transform: [{ skewX: '-26deg' }],
  },
  importText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16.5,
    textShadowColor: 'rgba(0,0,0,0.05)',
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  captureBtnDisabled: {
    opacity: 0.7,
  },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  analyzeGroup: {
    width: 103.88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtn: {
    width: 103.88,
    height: 44,
    borderRadius: 32,
    backgroundColor: '#8C2BEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.5,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0,
  },
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
  analysisIdText: {
    color: appTheme.colors.textSecondary,
    fontSize: appTheme.typography.footnote.fontSize,
    fontWeight: '600',
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
