import { useState, useCallback, useEffect } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  MessageCircle, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BadgeDollarSign,
  Wrench,
  Play,
  ShieldCheck,
  QrCode,
  Camera,
  Check,
  X as XIcon,
  Eye,
  Plus
} from 'lucide-react-native';
import { 
  View, 
  Text, 
  Image,
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { WorkEzTheme } from '../../../constants/theme';
import { apiRequest, getWebSocketUrl, resolveImageUrl, validateCheckIn, uploadChecklistPhotos } from '../../../services/api';
import { imageService } from '../../../services/imageService';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ServiceDetail {
  id: string;
  category: string;
  description: string;
  address?: string;
  addressApproximate?: string;
  startTime?: string;
  createdAt?: string;
  date?: string;
  status: string;
  clientName: string;
  clientPhone?: string;
  clientPhoto?: string;
  imageUrl?: string;
  images?: string[];
  price?: number;
  startCheckInCode?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  completedClientSignatureUrl?: string;
}

export default function AcceptedService() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [actionLoading, setActionLoading] = useState(false);

  // Security OTP Check-in Modal State (Branch 5)
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Photos state (Branch 5)
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const { data: service, loading, error, refetch } = useFetch<ServiceDetail>(
    id ? `/api/Services/${id}` : null
  );

  const attachedImages: string[] = (() => {
    if (Array.isArray(service?.images) && service.images.length > 0) {
      return service.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    }
    if (typeof service?.imageUrl === 'string' && service.imageUrl.trim().length > 0) {
      const trimmed = service.imageUrl.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
          }
        } catch {}
      }
      return [service.imageUrl];
    }
    return [];
  })();

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  // Conexão WebSocket em tempo real para sincronizar status instantaneamente
  useEffect(() => {
    if (!id) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    async function connect() {
      if (!isMounted) return;
      try {
        const wsUrl = await getWebSocketUrl(`/ws/tracking?serviceId=${id}`);
        if (!isMounted) return;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Provider Accepted WS] Conectado em tempo real ao chamado:', id);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[Provider Accepted WS] Atualização recebida:', data.eventType);
            if (isMounted) {
              refetch();
            }
          } catch (e) {
            console.warn('[Provider Accepted WS] Erro ao processar socket:', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 4000);
          }
        };
      } catch (e) {
        console.warn('[Provider Accepted WS] Erro ao conectar socket:', e);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [id, refetch]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/provider/calls' as any);
    }
  };

  const handleOpenChat = () => {
    if (!id) return;
    router.push({
      pathname: '/provider/chat/[id]',
      params: { id, serviceId: id }
    } as any);
  };

  // Status normalizado
  const currentStatus = (service?.status || '').toLowerCase();
  const isAccepted = currentStatus === 'accepted';
  const isOnTheWay = currentStatus === 'on-the-way' || currentStatus === 'ontheway';
  const isInProgress = currentStatus === 'in-progress' || currentStatus === 'inprogress';
  const isWaitingPayment = currentStatus === 'waiting-payment' || currentStatus === 'waitingpayment';
  const isCompleted = currentStatus === 'completed';
  const isCancelled = currentStatus === 'cancelled';

  // Transições de Ações
  const handleStartDisplacement = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await apiRequest<{ id: string; status: string }>(`/api/Services/${id}/start-displacement`, {
        method: 'POST'
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Erro: ${res.error}`);
        } else {
          Alert.alert('Erro', res.error);
        }
      } else {
        refetch();
      }
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível se conectar ao servidor.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro: ${msg}`);
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Abre modal para validar código OTP de 4 dígitos antes de destravar a execução
  const handleStartService = () => {
    setCheckInCode('');
    setCheckInError(null);
    setCheckInModalVisible(true);
  };
  const handleOpenCheckInModal = handleStartService;

  const handleValidateCheckIn = async () => {
    if (!id) return;
    const clean = checkInCode.trim().replace(/\s/g, '');
    if (clean.length < 4) {
      setCheckInError('O código de check-in deve conter 4 dígitos.');
      return;
    }

    setCheckInSubmitting(true);
    setCheckInError(null);
    try {
      const res = await validateCheckIn(id, clean);
      if (res.error) {
        setCheckInError(res.error);
      } else {
        setCheckInModalVisible(false);
        setCheckInCode('');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Check-in realizado com sucesso! Atendimento iniciado.');
        } else {
          Alert.alert('Sucesso', 'Check-in presencial validado! Atendimento iniciado.');
        }
        refetch();
      }
    } catch (err: any) {
      setCheckInError(err?.message || 'Erro ao conectar ao servidor.');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  // Redireciona para anexo de até 3 fotos e confirmação de valor final
  const handleCompleteService = () => {
    if (!id) return;
    router.push({
      pathname: '/provider/inform-value/[id]',
      params: { id }
    } as any);
  };

  // Upload opcional de fotos de vistoria inicial (Antes)
  const handlePickBeforePhoto = async () => {
    if (!id) return;
    const currentPhotos = service?.beforePhotos || [];
    if (currentPhotos.length >= 3) {
      Alert.alert('Limite atingido', 'Você já anexou 3 fotos de início.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Precisamos de permissão para acessar suas fotos!');
        } else {
          Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos!');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingBefore(true);
        try {
          const uploadedUrl = await imageService.uploadImage(asset.uri, asset.base64);
          const updated = [...currentPhotos, uploadedUrl].slice(0, 3);
          const uploadRes = await uploadChecklistPhotos(id, 'before', updated);
          if (uploadRes.error) {
            Alert.alert('Erro', uploadRes.error);
          } else {
            refetch();
          }
        } catch (err) {
          console.error(err);
          Alert.alert('Erro', 'Falha ao fazer upload da foto de vistoria.');
        } finally {
          setUploadingBefore(false);
        }
      }
    } catch (e) {
      console.warn('Erro ao selecionar foto:', e);
    }
  };

  if (loading && !service) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do serviço...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={44} color="#EF4444" />
        <Text style={styles.errorTitle}>Não foi possível carregar o chamado</Text>
        <Text style={styles.errorSub}>{error || 'Serviço não encontrado no sistema.'}</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={handleBack}>
          <Text style={styles.btnSecondaryText}>Voltar para Meus Chamados</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedPrice = service.price !== undefined && service.price !== null
    ? `R$ ${Number(service.price).toFixed(2).replace('.', ',')}`
    : 'A combinar';

  // Configurações do Header
  const getHeaderProps = () => {
    if (isCancelled) {
      return {
        title: 'Chamado Cancelado',
        subtitle: 'Este chamado foi cancelado',
        badge: 'Cancelado',
        badgeStyle: styles.badgeDanger,
        badgeTextStyle: styles.badgeDangerText
      };
    }
    if (isCompleted) {
      return {
        title: 'Serviço Concluído',
        subtitle: 'Chamado finalizado com sucesso',
        badge: 'Concluído',
        badgeStyle: styles.badgeSuccess,
        badgeTextStyle: styles.badgeSuccessText
      };
    }
    if (isWaitingPayment) {
      return {
        title: 'Aguardando Pagamento',
        subtitle: 'Serviço finalizado, aguardando liberação do cliente',
        badge: 'Pagamento',
        badgeStyle: styles.badgeWarning,
        badgeTextStyle: styles.badgeWarningText
      };
    }
    if (isInProgress) {
      return {
        title: 'Serviço em Execução',
        subtitle: 'Trabalho em andamento no local',
        badge: 'Em Execução',
        badgeStyle: styles.badgePrimary,
        badgeTextStyle: styles.badgePrimaryText
      };
    }
    if (isOnTheWay) {
      return {
        title: 'A Caminho do Local',
        subtitle: 'Deslocamento até o cliente em andamento',
        badge: 'A Caminho',
        badgeStyle: styles.badgePrimary,
        badgeTextStyle: styles.badgePrimaryText
      };
    }
    return {
      title: 'Chamado Aceito',
      subtitle: 'Aguardando início do deslocamento',
      badge: 'Aceito',
      badgeStyle: styles.badgeSuccess,
      badgeTextStyle: styles.badgeSuccessText
    };
  };

  const headerProps = getHeaderProps();

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <ScreenHeader
        title={headerProps.title}
        subtitle={headerProps.subtitle}
        showBack
        onBack={handleBack}
        rightElement={
          <View style={headerProps.badgeStyle}>
            <Text style={headerProps.badgeTextStyle}>{headerProps.badge}</Text>
          </View>
        }
      />

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: 120 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 16)) }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de status contextual */}
        {isCancelled ? (
          <View style={[styles.statusBanner, styles.bannerDanger]}>
            <AlertCircle size={22} color="#DC2626" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#991B1B' }]}>Chamado Cancelado</Text>
              <Text style={[styles.statusBannerText, { color: '#B91C1C' }]}>
                Este chamado foi cancelado e nenhuma ação adicional é necessária.
              </Text>
            </View>
          </View>
        ) : isCompleted ? (
          <View style={[styles.statusBanner, styles.bannerSuccess]}>
            <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBannerTitle}>Serviço Concluído com Sucesso!</Text>
              <Text style={styles.statusBannerText}>
                O serviço foi finalizado e faturado. O valor acordado foi liberado na sua carteira.
              </Text>
            </View>
          </View>
        ) : isWaitingPayment ? (
          <View style={[styles.statusBanner, styles.bannerWarning]}>
            <Clock size={22} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#B45309' }]}>Aguardando Pagamento do Cliente</Text>
              <Text style={[styles.statusBannerText, { color: '#92400E' }]}>
                Você marcou o serviço como finalizado. O cliente foi notificado para liberar o pagamento.
              </Text>
            </View>
          </View>
        ) : isInProgress ? (
          <View style={[styles.statusBanner, styles.bannerPrimary]}>
            <Wrench size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#1E40AF' }]}>Serviço em Andamento no Local</Text>
              <Text style={[styles.statusBannerText, { color: '#1D4ED8' }]}>
                Você está executando as atividades acordadas. Ao finalizar os trabalhos, clique no botão abaixo para concluir o serviço.
              </Text>
            </View>
          </View>
        ) : isOnTheWay ? (
          <View style={[styles.statusBanner, styles.bannerPrimary]}>
            <Navigation size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: '#1E40AF' }]}>Você está a Caminho!</Text>
              <Text style={[styles.statusBannerText, { color: '#1D4ED8' }]}>
                O cliente já foi avisado de que você saiu. Assim que chegar ao endereço, clique abaixo para iniciar a execução do serviço.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.statusBanner}>
            <CheckCircle2 size={22} color="#16A34A" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusBannerTitle}>Proposta Aceita!</Text>
              <Text style={styles.statusBannerText}>
                O cliente confirmou a sua proposta. Quando estiver pronto para ir até o endereço, clique no botão abaixo para avisar que está a caminho.
              </Text>
            </View>
          </View>
        )}

        {/* ─── CARD DE CHECK-IN PRESENCIAL & VISTORIAS (BRANCH 5) ────────────── */}
        {isOnTheWay && (
          <View style={styles.providerSecurityAlertCard}>
            <View style={styles.providerSecurityHeaderRow}>
              <View style={styles.providerSecurityIconWrap}>
                <ShieldCheck size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerSecurityTitle}>Check-in Obrigatório no Local</Text>
                <Text style={styles.providerSecuritySubtitle}>
                  Ao chegar, solicite o código de 4 dígitos exibido no app do cliente para liberar o início.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.providerCheckInActionBtn}
              onPress={handleOpenCheckInModal}
              activeOpacity={0.85}
            >
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.providerCheckInActionText}>Digitar Código de Início</Text>
            </TouchableOpacity>
          </View>
        )}

        {isInProgress && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Camera size={18} color="#2563EB" />
                <Text style={styles.sectionTitle}>Vistorias do Atendimento</Text>
              </View>
              <View style={styles.validatedBadge}>
                <CheckCircle2 size={13} color="#16A34A" />
                <Text style={styles.validatedBadgeText}>Check-in Validado</Text>
              </View>
            </View>
            <Text style={styles.cardHelperText}>
              Registre fotos de "Antes" agora ou de "Depois" na finalização do serviço:
            </Text>

            {/* Fotos de Antes */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.checklistPhotoSectionTitle}>
                  Fotos de Início (Antes) ({service?.beforePhotos?.length || 0}/3)
                </Text>
                {(!service?.beforePhotos || service.beforePhotos.length < 3) && (
                  <TouchableOpacity
                    style={styles.addPhotoMiniBtn}
                    onPress={handlePickBeforePhoto}
                    disabled={uploadingBefore}
                    activeOpacity={0.7}
                  >
                    {uploadingBefore ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <>
                        <Plus size={14} color="#2563EB" />
                        <Text style={styles.addPhotoMiniBtnText}>Tirar Foto</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {service?.beforePhotos && service.beforePhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {service.beforePhotos.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setPreviewPhotoUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: resolveImageUrl(url) || url }} style={styles.checklistThumb} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                  Nenhuma foto de início anexada. Recomendamos registrar o estado do problema.
                </Text>
              )}
            </View>

            {/* Fotos de Depois */}
            {service?.afterPhotos && service.afterPhotos.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.checklistPhotoSectionTitle}>Fotos de Conclusão (Depois)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
                  {service.afterPhotos.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setPreviewPhotoUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: resolveImageUrl(url) || url }} style={styles.checklistThumb} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Card do Serviço & Valor */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceCategory}>{service.category || 'Serviço Técnico'}</Text>
              <Text style={styles.serviceLabel}>Detalhes do Pedido</Text>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Valor Fechado</Text>
              <Text style={styles.priceValue}>{formattedPrice}</Text>
            </View>
          </View>

          {service.description ? (
            <View style={styles.descriptionBox}>
              <FileText size={16} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={styles.descriptionText}>{service.description}</Text>
            </View>
          ) : null}

          {attachedImages.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 }}>
                {attachedImages.length === 1 ? 'Foto enviada pelo cliente:' : `Fotos enviadas pelo cliente (${attachedImages.length}):`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {attachedImages.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: resolveImageUrl(uri) || uri }}
                    style={{ width: 120, height: 120, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <View style={styles.infoIconRow}>
                <Calendar size={16} color="#64748B" />
                <Text style={styles.infoMetaLabel}>Data do Serviço</Text>
              </View>
              <Text style={styles.infoMetaValue}>{service.date || 'Hoje'}</Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.infoIconRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.infoMetaLabel}>Criado / Agendado</Text>
              </View>
              <Text style={styles.infoMetaValue}>{service.startTime || 'Conforme combinado'}</Text>
            </View>
          </View>
        </View>

        {/* Card do Cliente & Contato */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          
          <View style={styles.clientRow}>
            {service.clientPhoto ? (
              <Image
                source={{ uri: resolveImageUrl(service.clientPhoto) || service.clientPhoto }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <User size={22} color="#2563EB" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{service.clientName || 'Cliente WorkEz'}</Text>
              {service.clientPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Phone size={13} color="#64748B" />
                  <Text style={styles.clientPhone}>{service.clientPhone}</Text>
                </View>
              ) : (
                <Text style={styles.clientSub}>Contato verificado</Text>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.chatButton}
            onPress={handleOpenChat}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#2563EB" />
            <Text style={styles.chatButtonText}>Conversar no Chat com o Cliente</Text>
          </TouchableOpacity>
        </View>

        {/* Card de Localização */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local de Atendimento</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>Endereço do Chamado</Text>
              <Text style={styles.addressValue}>
                {service.address || 'Endereço cadastrado pelo cliente'}
              </Text>
            </View>
          </View>
        </View>

        {/* Linha do Tempo / Próximos Passos Dinâmicos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Etapas do Chamado</Text>
          
          {/* Etapa 1: Chamado Aceito */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.timelineDotDone]}>
              <CheckCircle2 size={16} color="#FFFFFF" />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitleDone}>1. Chamado Aceito</Text>
              <Text style={styles.timelineDesc}>Proposta fechada por {formattedPrice}.</Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isOnTheWay || isInProgress || isWaitingPayment || isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 2: Iniciar Deslocamento */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              (isInProgress || isWaitingPayment || isCompleted) 
                ? styles.timelineDotDone 
                : isOnTheWay 
                ? styles.timelineDotActive 
                : isAccepted 
                ? styles.timelineDotActive 
                : styles.timelineDotPending
            ]}>
              {(isInProgress || isWaitingPayment || isCompleted) ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : (
                <Navigation size={14} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                (isInProgress || isWaitingPayment || isCompleted)
                  ? styles.timelineTitleDone
                  : isOnTheWay
                  ? styles.timelineTitleActive
                  : isAccepted
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isOnTheWay 
                  ? '2. A Caminho do Local' 
                  : (isInProgress || isWaitingPayment || isCompleted)
                  ? '2. Deslocamento Realizado'
                  : '2. Iniciar Deslocamento (Próximo passo)'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isOnTheWay 
                  ? 'Deslocamento até o cliente em andamento.'
                  : (isInProgress || isWaitingPayment || isCompleted)
                  ? 'Chegada ao local confirmada.'
                  : 'Avise o cliente quando você sair para o local.'}
              </Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isInProgress || isWaitingPayment || isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 3: Execução do Serviço */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              (isWaitingPayment || isCompleted)
                ? styles.timelineDotDone
                : isInProgress
                ? styles.timelineDotActive
                : styles.timelineDotPending
            ]}>
              {(isWaitingPayment || isCompleted) ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : isInProgress ? (
                <Wrench size={14} color="#FFFFFF" />
              ) : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                (isWaitingPayment || isCompleted)
                  ? styles.timelineTitleDone
                  : isInProgress
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isInProgress 
                  ? '3. Execução do Serviço (Em andamento)'
                  : (isWaitingPayment || isCompleted)
                  ? '3. Execução Concluída'
                  : isOnTheWay
                  ? '3. Iniciar Execução (Próximo passo)'
                  : '3. Execução do Serviço'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isInProgress 
                  ? 'Trabalho sendo realizado no endereço do cliente.'
                  : (isWaitingPayment || isCompleted)
                  ? 'Serviço realizado e finalizado com sucesso.'
                  : 'Realização do serviço no endereço.'}
              </Text>
            </View>
          </View>

          <View style={[
            styles.timelineConnector, 
            (isCompleted) && styles.timelineConnectorDone
          ]} />

          {/* Etapa 4: Finalização e Pagamento */}
          <View style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              isCompleted
                ? styles.timelineDotDone
                : isWaitingPayment
                ? styles.timelineDotActive
                : styles.timelineDotPending
            ]}>
              {isCompleted ? (
                <CheckCircle2 size={16} color="#FFFFFF" />
              ) : isWaitingPayment ? (
                <Clock size={14} color="#FFFFFF" />
              ) : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={
                isCompleted
                  ? styles.timelineTitleDone
                  : isWaitingPayment
                  ? styles.timelineTitleActive
                  : styles.timelineTitlePending
              }>
                {isCompleted 
                  ? '4. Finalizado e Pago' 
                  : isWaitingPayment 
                  ? '4. Aguardando Pagamento' 
                  : isInProgress
                  ? '4. Finalização e Pagamento (Próximo passo)'
                  : '4. Finalização e Pagamento'}
              </Text>
              <Text style={styles.timelineDesc}>
                {isCompleted 
                  ? 'Pagamento liberado e chamado finalizado.' 
                  : isWaitingPayment 
                  ? 'Aguardando o cliente liberar o pagamento.' 
                  : 'Liberação do pagamento acordado.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Barra Inferior com Ação Primária Contextual */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : (Platform.OS === 'ios' ? 28 : 16) }]}>
        {isAccepted ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, actionLoading && styles.btnDisabled]}
            onPress={handleStartDisplacement}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Navigation size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Iniciar Deslocamento</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isOnTheWay ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, actionLoading && styles.btnDisabled]}
            onPress={handleOpenCheckInModal}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ShieldCheck size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Check-in Seguro & Iniciar Execução</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isInProgress ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#16A34A' }, actionLoading && styles.btnDisabled]}
            onPress={handleCompleteService}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Concluir Atendimento (Fotos & Valor)</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isWaitingPayment ? (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#475569' }]}
            onPress={() => router.replace('/provider/calls' as any)}
            activeOpacity={0.85}
          >
            <Clock size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Aguardando Pagamento • Ver Meus Chamados</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
            onPress={() => router.replace('/provider/calls' as any)}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Voltar para Meus Chamados</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de Check-in OTP Presencial (Branch 5) */}
      <Modal
        visible={checkInModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.checkInModalCard}>
            <View style={styles.checkInModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={22} color="#2563EB" />
                <Text style={styles.checkInModalTitle}>Check-in de Segurança</Text>
              </View>
              <TouchableOpacity onPress={() => setCheckInModalVisible(false)} style={styles.closeBtn}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.checkInModalDesc}>
              Peça ao cliente o código de 4 dígitos gerado no aplicativo dele para comprovar a presença no local:
            </Text>

            <TextInput
              style={styles.otpInputBox}
              placeholder="0 0 0 0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              maxLength={4}
              value={checkInCode}
              onChangeText={(text) => {
                setCheckInCode(text.replace(/[^0-9]/g, ''));
                setCheckInError(null);
              }}
              autoFocus
            />

            {checkInError && (
              <View style={styles.errorAlertBox}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.errorAlertText}>{checkInError}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setCheckInModalVisible(false)}
                disabled={checkInSubmitting}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmCheckInBtn, checkInSubmitting && styles.btnDisabled]}
                onPress={handleValidateCheckIn}
                disabled={checkInSubmitting}
              >
                {checkInSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" />
                    <Text style={styles.confirmCheckInBtnText}>Validar Check-in</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Zoom da Foto (Branch 5) */}
      <Modal
        visible={!!previewPhotoUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.checkInModalCard}>
            <View style={styles.checkInModalHeader}>
              <Text style={styles.checkInModalTitle}>Vistoria do Atendimento</Text>
              <TouchableOpacity onPress={() => setPreviewPhotoUrl(null)} style={styles.closeBtn}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {previewPhotoUrl && (
              <Image
                source={{ uri: resolveImageUrl(previewPhotoUrl) || previewPhotoUrl }}
                style={styles.previewFullImg}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  badgeSuccessText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12,
  },
  badgePrimary: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  badgePrimaryText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  badgeWarningText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  badgeDangerText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerPrimary: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  bannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bannerDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  statusBannerText: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceCategory: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  descriptionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoMetaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  clientPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  clientSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  timelineDotDone: {
    backgroundColor: '#16A34A',
  },
  timelineDotActive: {
    backgroundColor: '#2563EB',
  },
  timelineDotPending: {
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 12,
    marginVertical: 2,
  },
  timelineConnectorDone: {
    backgroundColor: '#16A34A',
  },
  timelineBody: {
    flex: 1,
  },
  timelineTitleDone: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  timelineTitleActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  timelineTitlePending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    width: '100%',
    maxWidth: 760,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnSecondary: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnSecondaryText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  // ─── Estilos de Segurança e Check-In (Branch 5) ──────────────────────────
  providerSecurityAlertCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  providerSecurityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  providerSecurityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerSecurityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  providerSecuritySubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 16,
  },
  providerCheckInActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
  },
  providerCheckInActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  validatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  validatedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  cardHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  checklistPhotoSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  addPhotoMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addPhotoMiniBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  checklistThumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  checkInModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  checkInModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  checkInModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  otpInputBox: {
    width: '100%',
    height: 64,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 14,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: '#1D4ED8',
    letterSpacing: 10,
    marginVertical: 8,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    width: '100%',
  },
  errorAlertText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelModalBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmCheckInBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  confirmCheckInBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  previewFullImg: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    marginTop: 10,
  },
});
