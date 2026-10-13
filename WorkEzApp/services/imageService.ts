import { Platform } from 'react-native';
import { apiRequest } from './api';

async function toDataUrl(uri: string, base64?: string | null): Promise<string> {
  if (base64) {
    return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  }
  if (uri.startsWith('data:')) {
    return uri;
  }
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not convert URI to data URL, returning original URI:', e);
    return uri;
  }
}

export const imageService = {
  async uploadImage(uri: string, base64?: string | null): Promise<string> {
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // 1. Tenta upload direto para o servidor da WorkEz API (/api/Uploads)
    try {
      // Método mais rápido e confiável (JSON Base64)
      if (base64 || uri.startsWith('data:')) {
        const rawData = base64 || uri;
        const b64Res = await apiRequest<{ url: string }>('/api/Uploads/base64', {
          method: 'POST',
          body: JSON.stringify({ data: rawData, filename }),
        });

        if (b64Res.data?.url) {
          return b64Res.data.url;
        }
      }

      // Método multipart FormData para arquivos locais
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append('file', blob, filename);
      } else {
        const normalizedUri = Platform.OS === 'ios' && uri.startsWith('file://')
          ? uri.replace('file://', '')
          : uri;

        formData.append('file', {
          uri: normalizedUri,
          name: filename,
          type,
        } as any);
      }

      const uploadRes = await apiRequest<{ url: string }>('/api/Uploads', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.data?.url) {
        return uploadRes.data.url;
      }
    } catch (uploadError) {
      console.warn('[imageService] Erro ao enviar imagem para a API local:', uploadError);
    }

    // 2. Fallback caso o servidor esteja inacessível
    return await toDataUrl(uri, base64);
  }
};
