import { Platform } from 'react-native';

const IMGBB_API_KEY = '629b8d074045e854a1cfec6530224d37';
const IMGBB_UPLOAD_URL = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;

export const imageService = {
  async uploadImage(uri: string): Promise<string> {
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // React Native FormData format for file upload
    // Fetch the local file URI to get a native binary Blob
    const localResponse = await fetch(uri);
    const blob = await localResponse.blob();

    const formData = new FormData();
    formData.append('image', blob, filename);

    try {
      const response = await fetch(IMGBB_UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao fazer upload da imagem: ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data && resJson.data.url) {
        return resJson.data.url;
      } else {
        throw new Error(resJson.error?.message || 'Falha no upload do ImgBB');
      }
    } catch (error) {
      console.error('ImgBB upload error:', error);
      throw error;
    }
  }
};
