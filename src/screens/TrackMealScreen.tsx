import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../app/navigation/types';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { appTheme } from '../design/theme';
import { addMealUseCase } from '../services/addMealUseCase';
import { chatRepo, historyRepo } from '../services/container';
import { createId } from '../utils/id';

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
  React.useEffect(() => { void (async () => {
    if (!route.params?.mealId) return;
    const meal = await historyRepo.getMealById(route.params.mealId);
    if (!meal) return setMealTitle('Meal not found');
    setMealTitle(meal.title);
    setMealInfo(`${meal.macros.caloriesKcal} kcal | P ${meal.macros.proteinG}g | C ${meal.macros.carbsG}g | F ${meal.macros.fatG}g`);
  })(); }, [route.params?.mealId]);
  const saveMeal = async (source: 'photo' | 'text'): Promise<void> => {
    const title = titleInput.trim() || 'Meal';
    const mealId = createId('meal');
    await addMealUseCase({
      id: mealId,
      createdAt: new Date().toISOString(),
      title,
      source,
      imageUri,
      notes: source === 'text' ? descriptionInput.trim() : undefined,
      macros: toStableMacros(`${title}-${descriptionInput}-${source}`),
    }, { historyRepo });
    await chatRepo.addSystemMessageIfMissing(`meal_${mealId}`, `Logged: ${title}. Today updated.`);
    Alert.alert('Saved');
    setTitleInput(''); setDescriptionInput(''); setImageUri(undefined);
  };
  return (
    <AppScreen>
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
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <Text style={styles.placeholderText}>Take a photo of your meal</Text>}
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
            <PrimaryButton title="Add Meal" onPress={() => void saveMeal(mode)} disabled={mode === 'photo' ? !imageUri : !descriptionInput.trim()} />
            <SecondaryButton title="Cancel" onPress={() => navigation.goBack()} />
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: appTheme.spacing.md },
  title: { fontSize: appTheme.typography.h2, color: appTheme.colors.textPrimary, fontWeight: '700' },
  subtitle: { color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
  segmented: { flexDirection: 'row', backgroundColor: '#ECEEF2', borderRadius: appTheme.radius.md, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: appTheme.radius.md, paddingVertical: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { color: appTheme.colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: appTheme.colors.textPrimary, fontWeight: '700' },
  formCard: { gap: appTheme.spacing.sm },
  cameraPlaceholder: { minHeight: 280, borderRadius: appTheme.radius.xl, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden' },
  placeholderText: { color: '#9CA3AF', fontSize: appTheme.typography.body },
  previewImage: { width: '100%', height: '100%' },
  input: { borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: appTheme.colors.border, borderRadius: appTheme.radius.md, paddingHorizontal: appTheme.spacing.sm, paddingVertical: 10, textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  cardTitle: { fontSize: appTheme.typography.h3, fontWeight: '700', color: appTheme.colors.textPrimary },
  infoText: { marginTop: appTheme.spacing.xs, color: appTheme.colors.textSecondary, fontSize: appTheme.typography.body },
});
