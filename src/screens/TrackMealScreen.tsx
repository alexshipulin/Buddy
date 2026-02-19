import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../app/navigation/types';
import { TEST_MODE } from '../config/flags';
import { analyzeMealPhoto } from '../services/aiService';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';
import { AppIcon } from '../ui/components/AppIcon';
import { Card } from '../ui/components/Card';
import { PrimaryButton } from '../ui/components/PrimaryButton';
import { Screen } from '../ui/components/Screen';
import { SecondaryButton } from '../ui/components/SecondaryButton';
import { uiTheme } from '../ui/theme';
import { typography } from '../ui/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackMeal'>;
type Mode = 'photo' | 'text';

function toStableMacros(seedText: string): { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number } {
  let hash = 0;
  for (let i = 0; i < seedText.length; i += 1) hash = (hash * 31 + seedText.charCodeAt(i)) % 997;
  return { caloriesKcal: 430 + (hash % 80), proteinG: 28 + (hash % 10), carbsG: 35 + (hash % 12), fatG: 13 + (hash % 7) };
}

export function TrackMealScreen({ navigation, route }: Props): React.JSX.Element {
  const [mealTitle, setMealTitle] = React.useState<string | null>(null);
  const [mealInfo, setMealInfo] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<Mode>('photo');
  const [titleInput, setTitleInput] = React.useState('');
  const [descriptionInput, setDescriptionInput] = React.useState('');
  const [imageUri, setImageUri] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { void (async () => {
    if (!route.params?.mealId) return;
    const meal = await historyRepo.getMealById(route.params.mealId);
    if (!meal) return setMealTitle('Meal not found');
    setMealTitle(meal.title);
    setMealInfo(`${meal.macros.caloriesKcal} kcal | P ${meal.macros.proteinG}g | C ${meal.macros.carbsG}g | F ${meal.macros.fatG}g`);
  })(); }, [route.params?.mealId]);
  const saveMeal = async (source: 'photo' | 'text'): Promise<void> => {
    setSaving(true);
    const title = titleInput.trim() || 'Meal';
    const mealId = createId('meal');
    let macros = toStableMacros(`${title}-${descriptionInput}-${source}`);
    let notes = source === 'text' ? descriptionInput.trim() : undefined;

    if (source === 'photo' && imageUri && TEST_MODE) {
      try {
        const analysis = await analyzeMealPhoto(imageUri);
        macros = analysis.macros;
        notes = analysis.description;
      } catch (error) {
        console.warn('AI meal analysis failed, using fallback:', error);
      }
    }

    try {
      await addMealUseCase({
        id: mealId,
        createdAt: new Date().toISOString(),
        title,
        source,
        imageUri,
        notes,
        macros,
      }, { historyRepo });
      await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${title}. Today updated.`);
      Alert.alert('Saved');
      setTitleInput('');
      setDescriptionInput('');
      setImageUri(undefined);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen keyboardAvoiding>
      <View style={styles.wrap}>
        <Text style={styles.title}>{route.params?.readOnly ? 'Meal details' : 'Track meal'}</Text>
        {route.params?.readOnly ? <Card><Text style={styles.cardTitle}>{mealTitle ?? 'Loading...'}</Text>{mealInfo ? <Text style={styles.infoText}>{mealInfo}</Text> : null}</Card> : (
          <>
            <Text style={styles.subtitle}>Log what you ate</Text>
            <View style={styles.segmented}>
              <Pressable style={[styles.segmentBtn, mode === 'photo' && styles.segmentBtnActive]} onPress={() => setMode('photo')}><Text style={[styles.segmentText, mode === 'photo' && styles.segmentTextActive]}>Photo</Text></Pressable>
              <Pressable style={[styles.segmentBtn, mode === 'text' && styles.segmentBtnActive]} onPress={() => setMode('text')}><Text style={[styles.segmentText, mode === 'text' && styles.segmentTextActive]}>Text</Text></Pressable>
            </View>
            {mode === 'photo' ? (
              <View style={styles.formCard}>
                <Pressable style={styles.cameraPlaceholder} onPress={() => void ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : (
                    <View style={styles.placeholderCenter}>
                      <AppIcon name="camera" size={22} />
                      <Text style={styles.placeholderText}>Take a photo of your meal</Text>
                    </View>
                  )}
                </Pressable>
                <SecondaryButton title="Import" onPress={() => void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }).then((r) => !r.canceled && setImageUri(r.assets[0]?.uri))} />
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
              </View>
            ) : (
              <View style={styles.formCard}>
                <TextInput style={styles.input} placeholder="Meal name (optional)" value={titleInput} onChangeText={setTitleInput} />
                <TextInput style={styles.textArea} multiline placeholder="Describe your meal. Example: chicken salad with olive oil." value={descriptionInput} onChangeText={setDescriptionInput} />
              </View>
            )}
            <View style={styles.bottomActions}>
              <PrimaryButton title="Add Meal" loading={saving} onPress={() => void saveMeal(mode)} disabled={saving || (mode === 'photo' ? !imageUri : !descriptionInput.trim())} />
              <SecondaryButton title="Cancel" disabled={saving} onPress={() => navigation.goBack()} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: uiTheme.spacing.md },
  title: { ...typography.h2 },
  subtitle: { color: uiTheme.colors.textSecondary, fontSize: 17 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEEF2', borderRadius: uiTheme.radius.sm, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: uiTheme.radius.sm, paddingVertical: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: uiTheme.colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: uiTheme.colors.textPrimary, fontWeight: '700' },
  formCard: { gap: uiTheme.spacing.sm },
  cameraPlaceholder: { minHeight: 280, borderRadius: uiTheme.radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden' },
  placeholderCenter: { alignItems: 'center', gap: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 17 },
  previewImage: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: uiTheme.colors.border, borderRadius: uiTheme.radius.sm, paddingHorizontal: uiTheme.spacing.sm, paddingVertical: 10, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  bottomActions: { marginTop: 'auto', gap: uiTheme.spacing.sm },
  cardTitle: { ...typography.h3 },
  infoText: { marginTop: uiTheme.spacing.sm, color: uiTheme.colors.textSecondary, fontSize: 17 },
});
