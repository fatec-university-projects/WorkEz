import { useState } from 'react';
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
import { useAuth } from '../../../contexts/AuthContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { ImageViewerModal } from '../../../components/ImageViewerModal';

export default function NewCall() {
  const router = useRouter();
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes do chamado...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={[styles.centerContainer, { padding: 24 }]}>
        <Text style={styles.errorText}>
          {error || 'Não foi possível carregar o chamado.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Novo chamado"
        rightElement={
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <X size={22} color="#0F172A" />
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* Card Detalhes do Chamado */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.categoryIconWrap}>
                <Wrench size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryTitle}>
                  {service.category}
                </Text>
                <View style={styles.metaRow}>
                  <MapPin size={14} color="#64748B" />
                  <Text style={styles.metaText}>Visualização prévia</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <FileText size={18} color="#64748B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Descrição</Text>
                  <Text style={styles.detailValue}>{service.description}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MapPin size={18} color="#64748B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Endereço aproximado</Text>
                  <Text style={styles.detailValue}>
                    {service.addressApproximate || service.address || 'Endereço cadastrado'}
                  </Text>
                </View>
              </View>

              {attachedImages.length > 0 && (
                <View style={styles.detailItem}>
                  <ImageIcon size={18} color="#64748B" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>
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
                              style={styles.serviceImage}
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
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.clientRow}>
              {service.clientPhoto ? (
                <Image
                  source={{ uri: resolveImageUrl(service.clientPhoto) || service.clientPhoto }}
                  style={styles.clientAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.clientAvatarFallback}>
                  <User size={22} color="#64748B" />
                </View>
              )}
              <View>
                <Text style={styles.clientName}>{service.clientName}</Text>
                <Text style={styles.clientSubtitle}>Solicitante</Text>
              </View>
            </View>
          </View>

          {/* Card do Leilão / Formulário de Proposta */}
          <View style={styles.card}>
            <View style={styles.auctionHeaderRow}>
              <Gavel size={20} color="#2563EB" />
              <Text style={styles.auctionTitle}>Enviar Lance (Leilão)</Text>
            </View>
            <Text style={styles.auctionSubtitle}>
              Defina o valor que está disposto a receber. O cliente receberá as propostas e poderá aceitar, negociar ou fazer uma contra-proposta.
            </Text>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.inputLabel}>
                  Mão de Obra (R$) *
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 200,00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={laborPrice}
                  onChangeText={setLaborPrice}
                />
                <Text style={styles.inputHelpText}>
                  Taxa de 15% da plataforma incide apenas sobre este valor.
                </Text>
              </View>

              <View>
                <Text style={styles.inputLabel}>
                  Peças / Materiais necessários (R$, opcional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 50,00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={materialsPrice}
                  onChangeText={setMaterialsPrice}
                />
                <Text style={[styles.inputHelpText, { color: '#16A34A', fontWeight: '500' }]}>
                  ✓ Isento de taxa: você recebe 100% do valor de materiais.
                </Text>
              </View>

              {/* Simulação Financeira Dinâmica */}
              {laborNum > 0 && (
                <View style={styles.simulationCard}>
                  <View style={styles.simRow}>
                    <Text style={styles.simLabel}>Mão de obra:</Text>
                    <Text style={styles.simValue}>R$ {laborNum.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  {materialsNum > 0 && (
                    <View style={styles.simRow}>
                      <Text style={styles.simLabel}>Peças / Materiais:</Text>
                      <Text style={styles.simValue}>R$ {materialsNum.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  )}
                  <View style={[styles.simRow, styles.simDivider]}>
                    <Text style={[styles.simLabel, { fontWeight: '600', color: '#0F172A' }]}>Total da proposta:</Text>
                    <Text style={[styles.simValue, { color: '#2563EB', fontSize: 14 }]}>R$ {totalProposed.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={styles.simRow}>
                    <Text style={[styles.simLabel, { color: '#DC2626' }]}>Taxa da plataforma (15% s/ mão de obra):</Text>
                    <Text style={[styles.simValue, { color: '#DC2626' }]}>- R$ {platformFee.toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <View style={[styles.simRow, styles.simDivider]}>
                    <Text style={[styles.simLabel, { fontWeight: '700', color: '#16A34A' }]}>Você receberá líquido:</Text>
                    <Text style={[styles.simValue, { color: '#16A34A', fontSize: 15, fontWeight: '800' }]}>R$ {netEarnings.toFixed(2).replace('.', ',')}</Text>
                  </View>
                </View>
              )}

              <View>
                <Text style={styles.inputLabel}>
                  Estimativa de tempo (opcional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: 2 horas, 1 dia, 3 dias"
                  placeholderTextColor="#94A3B8"
                  value={estimatedTime}
                  onChangeText={setEstimatedTime}
                />
                <View style={styles.presetRow}>
                  {['1 hora', '2 a 3 horas', '4 a 6 horas', '1 dia', '2 a 3 dias'].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => setEstimatedTime(preset)}
                      style={[
                        styles.presetChip,
                        estimatedTime === preset && styles.presetChipActive
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.presetChipText,
                        estimatedTime === preset && styles.presetChipTextActive
                      ]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>
                  Observações / Descrição da proposta (opcional)
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ex: Inclui material básico e deslocamento."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          </View>

          {/* Dica Competitiva */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeaderRow}>
              <Timer size={16} color="#2563EB" />
              <Text style={styles.tipTitle}>Dica competitiva:</Text>
            </View>
            <Text style={styles.tipText}>
              Valores justos e boas descrições aumentam suas chances de ter a proposta aceita pelo cliente.
            </Text>
          </View>

          {/* Ações Inferiores */}
          <View style={styles.actionContainer}>
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
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 15,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
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
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  detailsList: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
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
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  clientSubtitle: {
    color: '#64748B',
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
    color: '#0F172A',
  },
  auctionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  textArea: {
    height: 72,
    fontWeight: '400',
    textAlignVertical: 'top',
  },
  inputHelpText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  simulationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  simRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  simValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  simDivider: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  presetChipText: {
    fontSize: 11,
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    color: '#1D4ED8',
  },
  tipText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});
