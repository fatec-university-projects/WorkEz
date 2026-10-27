import { Platform } from 'react-native';
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { apiRequest } from './api';
import { authService } from './authService';
import { safeStorage as AsyncStorage } from './storage';

const STORAGE_KEY_PUSH_TOKEN = '@workez_push_token';

function isNativeNotificationsAvailable(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  try {
    // No Expo Go para Android (SDK 53+), push notifications e ExpoTopicSubscriptionModule não estão disponíveis
    if (
      Platform.OS === 'android' &&
      (isRunningInExpoGo() ||
        Constants.executionEnvironment === 'storeClient' ||
        (Constants as any).appOwnership === 'expo')
    ) {
      return false;
    }

    // Verifica se o módulo nativo exigido pelo expo-notifications existe no binário atual antes do require()
    if (Platform.OS === 'android' && !requireOptionalNativeModule('ExpoTopicSubscriptionModule')) {
      return false;
    }

    if (!requireOptionalNativeModule('ExpoNotificationPresenter')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

let cachedNotificationsModule: typeof import('expo-notifications') | null | undefined;

function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (cachedNotificationsModule !== undefined) {
    return cachedNotificationsModule;
  }

  if (!isNativeNotificationsAvailable()) {
    cachedNotificationsModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as typeof import('expo-notifications');
    if (typeof mod?.setNotificationHandler !== 'function') {
      cachedNotificationsModule = null;
      return null;
    }

    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: mod.AndroidNotificationPriority.HIGH,
      }),
    });
    cachedNotificationsModule = mod;
    return mod;
  } catch (err) {
    console.warn('[NotificationService] Módulo nativo expo-notifications indisponível neste ambiente:', err);
    cachedNotificationsModule = null;
    return null;
  }
}

export interface NotificationPayloadData {
  type?: 'new_opportunity' | 'new_proposal' | 'provider_on_the_way' | 'chat_message' | 'test' | string;
  serviceId?: string;
  proposalId?: string;
  categoryId?: string;
  [key: string]: any;
}

class NotificationService {
  private pushToken: string | null = null;
  private responseListenerSubscription: { remove: () => void } | null = null;
  private receivedListenerSubscription: { remove: () => void } | null = null;

  /**
   * Obtém o token de notificação Expo e solicita permissões se necessário.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      const Notifications = getNotificationsModule();
      if (Platform.OS === 'web' || !Notifications) {
        // Ambiente Web ou Expo Go no Android: gerar um mock token persistente para testes
        let fallbackToken = await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN);
        if (!fallbackToken) {
          fallbackToken = `ExponentPushToken[${Platform.OS}-${Math.random().toString(36).substring(2, 12)}]`;
          await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, fallbackToken);
        }
        this.pushToken = fallbackToken;
        return fallbackToken;
      }

      // Android: Canal de notificação obrigatório no Android 8.0+
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'WorkEz Notificações',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563eb',
          sound: 'default',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Permissão para notificações push não concedida.');
        return null;
      }

      // Obtenção do Expo Push Token
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      ).catch((err) => {
        console.warn('[NotificationService] Não foi possível obter token remoto (emulador/sem EAS):', err?.message);
        // Fallback gracioso para emulador/dev local
        return { data: `ExponentPushToken[dev-${Platform.OS}-${Math.random().toString(36).substring(2, 10)}]` };
      });

      this.pushToken = tokenData.data;
      await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, this.pushToken);
      return this.pushToken;
    } catch (error) {
      console.warn('[NotificationService] Erro ao registrar notificações:', error);
      return null;
    }
  }

  /**
   * Envia o token obtido para o backend do WorkEz associando ao usuário autenticado.
   */
  async registerDeviceWithBackend(userId: string): Promise<boolean> {
    try {
      const token = this.pushToken || (await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN)) || (await this.registerForPushNotificationsAsync());
      if (!token || !userId) return false;

      const res = await apiRequest('/api/Notifications/register-device', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          expoPushToken: token,
          platform: Platform.OS,
        }),
      });

      if (res.data) {
        console.log('[NotificationService] Dispositivo registrado com sucesso no backend:', token);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[NotificationService] Falha ao registrar dispositivo no backend:', err);
      return false;
    }
  }

  /**
   * Remove o dispositivo do backend ao deslogar.
   */
  async unregisterDeviceFromBackend(): Promise<void> {
    try {
      const token = this.pushToken || (await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN));
      if (token) {
        await apiRequest('/api/Notifications/remove-device', {
          method: 'POST',
          body: JSON.stringify({ expoPushToken: token }),
        });
        await AsyncStorage.removeItem(STORAGE_KEY_PUSH_TOKEN);
        this.pushToken = null;
      }
    } catch (err) {
      console.warn('[NotificationService] Falha ao desregistrar token no backend:', err);
    }
  }

  /**
   * Adiciona o ouvinte para cliques em notificações recebidas (Deep Linking).
   */
  setupNotificationListeners(onNavigate: (route: string) => void) {
    if (Platform.OS === 'web') return;

    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    // Limpa ouvintes anteriores se existirem
    this.removeNotificationListeners();

    // 1. Notificação clicada enquanto o app estava aberto em background ou fechado
    this.responseListenerSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationPayloadData;
      this.handleDeepLink(data, onNavigate);
    });

    // 2. Notificação recebida com app em primeiro plano
    this.receivedListenerSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[NotificationService] Notificação recebida em foreground:', notification.request.content.title);
    });

    // 3. Verifica se o app foi aberto diretamente por um clique em notificação
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as NotificationPayloadData;
        this.handleDeepLink(data, onNavigate);
      }
    });
  }

  /**
   * Resolve a rota correta com base no payload da notificação (Deep Linking)
   */
  private handleDeepLink(data: NotificationPayloadData | undefined, onNavigate: (route: string) => void) {
    if (!data || !data.type) return;

    console.log('[NotificationService] Tratando deep link para:', data);

    switch (data.type) {
      case 'new_opportunity':
        if (data.serviceId) {
          onNavigate(`/provider/new-call/${data.serviceId}`);
        } else {
          onNavigate('/provider/calls');
        }
        break;

      case 'new_proposal':
        if (data.serviceId) {
          onNavigate(`/client/found?id=${data.serviceId}`);
        } else {
          onNavigate('/client/services');
        }
        break;

      case 'provider_on_the_way':
        if (data.serviceId) {
          onNavigate(`/client/tracking/${data.serviceId}`);
        }
        break;

      case 'chat_message': {
        const targetId = data.proposalId || data.serviceId;
        if (targetId) {
          authService.getUser().then((user) => {
            const isProvider = user?.role === 'ServiceProvider';
            onNavigate(isProvider ? `/provider/chat/${targetId}` : `/client/chat/${targetId}`);
          }).catch(() => {
            onNavigate(`/client/chat/${targetId}`);
          });
        }
        break;
      }

      default:
        console.log('[NotificationService] Tipo de notificação sem rota específica:', data.type);
        break;
    }
  }

  removeNotificationListeners() {
    if (this.responseListenerSubscription) {
      this.responseListenerSubscription.remove();
      this.responseListenerSubscription = null;
    }
    if (this.receivedListenerSubscription) {
      this.receivedListenerSubscription.remove();
      this.receivedListenerSubscription = null;
    }
  }
}

export const notificationService = new NotificationService();
