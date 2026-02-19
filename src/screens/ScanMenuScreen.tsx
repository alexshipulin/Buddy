import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, ImageStyle, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../app/navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { Card } from '../components/Card';
import { AppScreen } from '../components/AppScreen';
import { appTheme } from '../design/theme';
import { AnalyzeMenuOutput, analyzeMenuUseCase, DailyScanLimitReachedError } from '../services/analyzeMenuUseCase';
import { appPrefsRepo, historyRepo, menuAnalysisProvider, trialRepo, userRepo } from '../services/container';

type Props = NativeStackScreenProps<RootStackParamList, 'ScanMenu'>;

export function ScanMenuScreen({ navigation }: Props): React.JSX.Element {
  const cameraRef = React.useRef<CameraView | null>(null);
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const removePhoto = (uri: string): void => setPhotos((p) => p.filter((i) => i !== uri));
  const takePhoto = async (): Promise<void> => {
    if (photos.length >= 3) return;
    const granted = cameraPermission?.granted || (await requestCameraPermission()).granted;
    if (!granted) return Alert.alert('Camera access needed', 'Please allow camera to scan menus.');
    const shot = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (shot?.uri) setPhotos((p) => [...p, shot.uri].slice(0, 3));
  };
  const addFromGallery = async (): Promise<void> => {
    if (photos.length >= 3) return;
    const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 - photos.length, quality: 0.7 });
    if (selected.canceled) return;
    setPhotos((p) => [...p, ...selected.assets.map((a) => a.uri)].slice(0, 3));
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
    navigation.navigate('MenuResults', { resultId: output.resultId, paywallAfterOpen: output.shouldShowPaywallAfterResults, trialDaysLeft: output.trialDaysLeft });
  };
  const onContinue = async (): Promise<void> => {
    setLoading(true);
    try {
      const output = await analyzeMenuUseCase(photos, { historyRepo, menuProvider: menuAnalysisProvider, trialRepo, userRepo });
      await onSuccess(output);
    } catch (e) {
      if (e instanceof DailyScanLimitReachedError) {
        Alert.alert('Daily limit reached', 'You can scan one menu per day on Free plan.', [{ text: 'Close', style: 'cancel' }, { text: 'Open paywall', onPress: () => navigation.navigate('Paywall', { source: 'limit' }) }]);
      } else {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to analyze menu');
      }
    } finally {
      setLoading(false);
    }
  };

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
        <Pressable style={styles.backBtn} hitSlop={8} onPress={() => navigation.goBack()}><Text style={styles.backText}>{'<'}</Text></Pressable>
        <Text style={styles.title}>Scan menu</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + appTheme.spacing.md }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb as ImageStyle} />
              <Pressable style={styles.removeBtn} hitSlop={8} onPress={() => removePhoto(uri)}><Text style={styles.removeText}>X</Text></Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.bottomRow}>
          <Pressable style={styles.importBtn} onPress={() => void addFromGallery()}><Text style={styles.importText}>Import</Text></Pressable>
          <Pressable style={styles.captureBtn} onPress={() => void takePhoto()}><View style={styles.captureInner} /></Pressable>
          <View style={styles.placeholder} />
        </View>
        <PrimaryButton title="Continue" onPress={() => void onContinue()} disabled={photos.length === 0 || loading} />
      </View>
      {loading ? (
        <View style={styles.overlay}>
          <Card style={styles.overlayCard}><Text style={styles.overlayTitle}>Analyzing...</Text><Text style={styles.overlayText}>This may take a few seconds.</Text></Card>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000' },
  camera: { ...StyleSheet.absoluteFillObject },
  topOverlay: { paddingHorizontal: appTheme.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: appTheme.typography.body.fontSize, color: '#FFFFFF', fontWeight: '700' },
  bottomOverlay: { marginTop: 'auto', paddingHorizontal: appTheme.spacing.md, gap: appTheme.spacing.md },
  thumbRow: { gap: appTheme.spacing.sm, paddingVertical: 2 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 58, height: 78, borderRadius: appTheme.radius.md, backgroundColor: '#FFFFFF44' },
  removeBtn: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827AA', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  importBtn: { width: 84, height: 54, borderRadius: appTheme.radius.md, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  importText: { color: '#FFFFFF', fontSize: appTheme.typography.small.fontSize, fontWeight: '600' },
  captureBtn: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FFFFFF' },
  placeholder: { width: 84 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#11182755', alignItems: 'center', justifyContent: 'center' },
  overlayCard: { width: '82%', alignItems: 'center', gap: appTheme.spacing.xs },
  overlayTitle: { color: appTheme.colors.textPrimary, fontWeight: '700', fontSize: appTheme.typography.body.fontSize },
  overlayText: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.small.fontSize },
});
