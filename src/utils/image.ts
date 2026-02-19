import * as ImagePicker from 'expo-image-picker';

export async function takeMenuPhotoBase64(): Promise<{ base64: string; mimeType: string } | null> {
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  return {
    base64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function pickImageFromGalleryBase64(): Promise<{ base64: string; mimeType: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  return {
    base64: asset.base64,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}
