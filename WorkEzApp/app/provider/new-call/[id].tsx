import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, FileText, Image as ImageIcon, X, Wrench, Timer, User, Gavel } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  TextInput, 
  Platform,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, resolveImageUrl } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ImageViewerModal } from '../../../components/ImageViewerModal';

export default function NewCall() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [laborPrice, setLaborPrice] = useState('');
  const [materialsPrice, setMaterialsPrice] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Cálculos dinâmicos em tempo real
  const laborNum = parseFloat(laborPrice.replace(',', '.')) || 0;
  const materialsNum = parseFloat(materialsPrice.replace(',', '.')) || 0;
  const totalProposed = laborNum + materialsNum;
  const platformFee = Math.round(laborNum * 0.15 * 100) / 100;
  const netEarnings = Math.max(0, totalProposed - platformFee);

  const { data: service, loading, error } = useFetch<any>(
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

  const handleSubmitProposal = async () => {
    if (!id || !user) return;
    if (laborNum <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe o valor da sua mão de obra.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/api/Proposals/propose', {
        method: 'POST',
        body: JSON.stringify({
          providerUserId: user.id,
          serviceId: id,
          proposedPrice: totalProposed,
          laborPrice: laborNum,
          materialsPrice: materialsNum > 0 ? materialsNum : undefined,
          description: description.trim() || undefined,
          estimatedTime: estimatedTime.trim() || undefined
        })
      });

      if (res.error) {
        Alert.alert('Aviso', res.error);
        if (res.error.includes('já possui uma proposta')) {
          router.replace('/provider/calls' as any);
        }
      } else {
        if (Platform.OS === 'web') {
          alert('Proposta enviada com sucesso! Seu lance está ativo no leilão.');
          router.replace('/provider/calls' as any);
        } else {
          Alert.alert(
            'Proposta Enviada!',
            'Seu lance no leilão foi enviado com sucesso.',
            [
              { text: 'Acompanhar', onPress: () => router.replace('/provider/calls' as any) }
            ]
          );
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      },
      loadingText: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 14,
      },
      errorText: {
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 16,
        fontSize: 15,
      },
      closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      },
      scrollContent: {
        flexGrow: 1,
      },
      contentWrap: {
        padding: 16,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
      },
      card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
      cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      },
      categoryIconWrap: {
        width: 44,
        height: 44,
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#DBEAFE',
      },
      categoryTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
      },
      metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
      },
      metaText: {
        fontSize: 13,
        color: colors.textSecondary,
      },
      detailsList: {
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 14,
      },
      detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
      },
      detailLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 2,
      },
      detailValue: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
      },
      serviceImage: {
        width: 150,
        height: 150,
        borderRadius: 12,
        marginTop: 6,
      },
      sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
      },
      clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      clientAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
      },
      clientAvatarFallback: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      },
      clientName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
      },
      clientSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 2,
      },
      auctionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      },
      auctionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
      },
      auctionSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 14,
      },
      inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 5,
      },
      textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
      },
      textArea: {
        height: 72,
        fontWeight: '400',
        textAlignVertical: 'top',
      },
      inputHelpText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 3,
      },
      simulationCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
      },
      simRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      simLabel: {
        fontSize: 13,
        color: colors.textSecondary,
      },
      simValue: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
      },
      simDivider: {
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      presetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
      },
      presetChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
      },
      presetChipActive: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
        borderColor: colors.primary,
      },
      presetChipText: {
        fontSize: 11,
        color: colors.textSecondary,
      },
      presetChipTextActive: {
        color: colors.primary,
        fontWeight: '600',
      },
      tipCard: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
      },
      tipHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
      },
      tipTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: isDark ? '#93C5FD' : '#1D4ED8',
      },
      tipText: {
        fontSize: 13,
        color: isDark ? '#BFDBFE' : '#1E40AF',
        lineHeight: 18,
      },
      actionContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
    });
  }, [colors, isDark]);

  if (loading) {
    return (
      <View style={dynamicStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Carregando detalhes do chamado...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={[dynamicStyles.centerContainer, { padding: 24 }]}>
        <Text style={dynamicStyles.errorText}>
          {error || 'Não foi possível carregar o chamado.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <ScreenHeader
        title="Novo chamado"
        rightElement={
          <TouchableOpacity
            onPress={() => router.back()}
            style={dynamicStyles.closeBtn}
            activeOpacity={0.7}
          >
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={[
          dynamicStyles.scrollContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={dynamicStyles.contentWrap}>
          {/* Card Detalhes do Chamado */}
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.cardHeaderRow}>
              <View style={dynamicStyles.categoryIconWrap}>
                <Wrench size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.categoryTitle}>
                  {service.category}
                </Text>
                <View style={dynamicStyles.metaRow}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text style={dynamicStyles.metaText}>Visualização prévia</Text>
                </View>
              </View>
            </View>

            <View style={dynamicStyles.detailsList}>
              <View style={dynamicStyles.detailItem}>
                <FileText size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={dynamicStyles.detailLabel}>Descrição</Text>
                  <Text style={dynamicStyles.detailValue}>{service.description}</Text>
                </View>
              </View>

              <View style={dynamicStyles.detailItem}>
                <MapPin size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={dynamicStyles.detailLabel}>Endereço aproximado</Text>
                  <Text style={dynamicStyles.detailValue}>
                    {service.addressApproximate || service.address || 'Endereço cadastrado'}
                  </Text>
                </View>
              </View>

              {attachedImages.length > 0 && (
                <View style={dynamicStyles.detailItem}>
                  <ImageIcon size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.detailLabel}>
                      {attachedImages.length === 1 ? 'Foto enviada pelo cliente' : `Fotos enviadas pelo cliente (${attachedImages.length})`}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingTop: 8 }}
                    >
                      {attachedImages.map((imgUri, idx) => {
                        const resolved = resolveImageUrl(imgUri) || imgUri;
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => {
                              setViewerIndex(idx);
                              setViewerVisible(true);
                            }}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: resolved }}
                              style={dynamicStyles.serviceImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Card do Cliente (Sem avaliação/estrelas para clientes) */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.sectionTitle}>Cliente</Text>
            <View style={dynamicStyles.clientRow}>
              {service.clientPhoto ? (
                <Image
                  source={{ uri: resolveImageUrl(service.clientPhoto) || service.clientPhoto }}
                  style={dynamicStyles.clientAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={dynamicStyles.clientAvatarFallback}>
                  <User size={22} color={colors.textSecondary} />
                </View>
              )}
              <View>
                <Text style={dynamicStyles.clientName}>{service.clientName}</Text>
                <Text style={dynamicStyles.clientSubtitle}>Solicitante</Text>
              </View>
            </View>
          </View>

          {/* Card do Leilão / Formulário de Proposta */}
          <View style={dynamicStyles.card}>
            <View style={dynamicStyles.auctionHeaderRow}>
              <Gavel size={20} color={colors.primary} />
              <Text style={dynamicStyles.auctionTitle}>Enviar Lance (Leilão)</Text>
            </View>
            <Text style={dynamicStyles.auctionSubtitle}>
              Defina o valor que está disposto a receber. O cliente receberá as propostas e poderá aceitar, negociar ou fazer uma contra-proposta.
            </Text>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={dynamicStyles.inputLabel}>
                  Mão de Obra (R$) *
                </Text>
                <TextInput
                  style={dynamicStyles.textInput}
                  placeholder="Ex: 200,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={laborPrice}
                  onChangeText={setLaborPrice}
                />
                <Text style={dynamicStyles.inputHelpText}>
                  Taxa de 15% da plataforma incide apenas sobre este valor.
                </Text>
              </View>

              <View>
                <Text style={dynamicStyles.inputLabel}>
                  Peças / Materiais necessários (R$, opcional)
                </Text>
                <TextInput
                  style={dynamicStyles.textInput}
                  placeholder="Ex: 50,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={materialsPrice}
                  onChangeText={setMaterialsPrice}
                />
                <Text style={[dynamicStyles.inputHelpText, { color: colors.secondary, fontWeight: '500' }]}>
                  ✓ Isento de taxa: você recebe 100% do valor de materiais.
                </Text>
              </View>

              {/* Simulação Financeira Dinâmica */}
              {laborNum > 0 && (
                <View style={dynamicStyles.simulationCard}>
                  <View style={dynamicStyles.simRow}>
                    <Text style={dynamicStyles.simLabel}>Mão de obra:</Text>
                    <Text style={dynamicStyles.simValue}>R$ {laborNum.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  {materialsNum > 0 && (
                    <View style={dynamicStyles.simRow}>
                      <Text style={dynamicStyles.simLabel}>Peças / Materiais:</Text>
                      <Text style={dynamicStyles.simValue}>R$ {materialsNum.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  )}
                  <View style={[dynamicStyles.simRow, dynamicStyles.simDivider]}>
                    <Text style={[dynamicStyles.simLabel, { fontWeight: '600', color: colors.text }]}>Total da proposta:</Text>
                    <Text style={[dynamicStyles.simValue, { color: colors.primary, fontSize: 14 }]}>R$ {totalProposed.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={dynamicStyles.simRow}>
                    <Text style={[dynamicStyles.simLabel, { color: colors.danger }]}>Taxa da plataforma (15% s/ mão de obra):</Text>
                    <Text style={[dynamicStyles.simValue, { color: colors.danger }]}>- R$ {platformFee.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={[dynamicStyles.simRow, dynamicStyles.simDivider]}>
                    <Text style={[dynamicStyles.simLabel, { fontWeight: '700', color: colors.secondary }]}>Você receberá líquido:</Text>
                    <Text style={[dynamicStyles.simValue, { color: colors.secondary, fontSize: 15, fontWeight: '800' }]}>R$ {netEarnings.toFixed(2).replace('.', ',')}</Text>
                  </View>
                </View>
              )}

              <View>
                <Text style={dynamicStyles.inputLabel}>
                  Estimativa de tempo (opcional)
                </Text>
                <TextInput
                  style={dynamicStyles.textInput}
                  placeholder="Ex: 2 horas, 1 dia, 3 dias"
                  placeholderTextColor={colors.textSecondary}
                  value={estimatedTime}
                  onChangeText={setEstimatedTime}
                />
                <View style={dynamicStyles.presetRow}>
                  {['1 hora', '2 a 3 horas', '4 a 6 horas', '1 dia', '2 a 3 dias'].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => setEstimatedTime(preset)}
                      style={[
                        dynamicStyles.presetChip,
                        estimatedTime === preset && dynamicStyles.presetChipActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        dynamicStyles.presetChipText,
                        estimatedTime === preset && dynamicStyles.presetChipTextActive
                      ]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={dynamicStyles.inputLabel}>
                  Observações / Descrição da proposta (opcional)
                </Text>
                <TextInput
                  style={[dynamicStyles.textInput, dynamicStyles.textArea]}
                  placeholder="Ex: Inclui material básico e deslocamento."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          </View>

          {/* Dica Competitiva */}
          <View style={dynamicStyles.tipCard}>
            <View style={dynamicStyles.tipHeaderRow}>
              <Timer size={16} color={colors.primary} />
              <Text style={dynamicStyles.tipTitle}>Dica competitiva:</Text>
            </View>
            <Text style={dynamicStyles.tipText}>
              Valores justos e boas descrições aumentam suas chances de ter a proposta aceita pelo cliente.
            </Text>
          </View>

          {/* Ações Inferiores */}
          <View style={dynamicStyles.actionContainer}>
            <Button
              fullWidth
              onPress={handleSubmitProposal}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#FFF" /> : 'Enviar Proposta'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onPress={() => router.back()}
              disabled={submitting}
              style={{ marginTop: 10 }}
            >
              Voltar
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Visualizador de Fotos em Tela Cheia */}
      <ImageViewerModal
        visible={viewerVisible}
        images={attachedImages}
        initialIndex={viewerIndex}
        title="Fotos Enviadas pelo Cliente"
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}
