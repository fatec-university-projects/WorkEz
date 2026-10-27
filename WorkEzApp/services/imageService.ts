import { Platform } from 'react-native';
import { apiRequest } from './api';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
  /**
   * Redimensiona e comprime fotos de perfil para ~312x312 (quadrado 1:1) com compressão JPEG otimizada.
   * Evita carregar fotos pesadas na rede para avatares que não podem ser maximizados.
   */
  async compressProfileImage(
    uri: string,
    targetSize = 312,
    quality = 0.82
  ): Promise<{ uri: string; base64?: string }> {
    // 1. Tenta compressão e redimensionamento nativo via expo-image-manipulator
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: targetSize, height: targetSize } }],
        { compress: quality, format: SaveFormat.JPEG, base64: true }
      );

      if (manipResult && manipResult.uri) {
        return {
          uri: manipResult.uri,
          base64: manipResult.base64 ? `data:image/jpeg;base64,${manipResult.base64}` : undefined,
        };
      }
    } catch (manipError) {
      console.warn('[imageService] expo-image-manipulator falhou, tentando fallback canvas:', manipError);
    }

    // 2. Fallback via HTML5 Canvas (Web)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const resized = await new Promise<{ uri: string; base64?: string }>((resolve, reject) => {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = targetSize;
              canvas.height = targetSize;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve({ uri });

              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve({
                uri: dataUrl,
                base64: dataUrl,
              });
            } catch (canvasErr) {
              resolve({ uri });
            }
          };
          img.onerror = () => resolve({ uri });
          img.src = uri;
        });

        return resized;
      } catch (canvasError) {
        console.warn('[imageService] Fallback canvas falhou:', canvasError);
      }
    }

    // 3. Fallback: retorna URI original caso nenhum redimensionador esteja disponível
    return { uri };
  },

  /**
   * Upload específico para foto de perfil: aplica a compressão de 312x312 antes de enviar para o servidor.
   */
  async uploadProfileImage(uri: string, targetSize = 312): Promise<string> {
    const compressed = await this.compressProfileImage(uri, targetSize);
    return await this.uploadImage(compressed.uri, compressed.base64);
  },

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
