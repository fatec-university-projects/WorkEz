import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, DollarSign, QrCode, Copy, Check, Clock, RefreshCw, Camera, CheckCircle2, X as XIcon, Mail } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, StyleSheet, Modal, Platform } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { generateEscrowPixCheckout, EscrowCheckoutPixResponse, apiRequest, resolveImageUrl, resendPixEmail } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function Payment() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // service id
  const [generating, setGenerating] = useState(false);
  const [checkoutData, setCheckoutData] = useState<EscrowCheckoutPixResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const showFeedback = (title: string, message?: string) => {
    const fullMsg = message ? `${title}: ${message}` : title;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(fullMsg);
    } else {
      Alert.alert(title, message);
    }
  };

  // Fetch service details
  const { data: service, loading, error } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  const loadCheckout = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const res = await generateEscrowPixCheckout(id as string);
      if (res.data) {
        setCheckoutData(res.data);
      } else if (res.error) {
        console.warn('Aviso na geração de cobrança DelFinance:', res.error);
      }
    } catch (err) {
      console.error('Falha ao gerar cobrança PIX DelFinance:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate checkout once service details are loaded
  useEffect(() => {
    if (service && !checkoutData && !generating) {
      loadCheckout();
    }
  }, [service]);

  // Polling service status to detect completion
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiRequest<any>(`/api/Services/${id}`);
        if (res.data) {
          const st = (res.data.status || res.data.serviceStatus || '').toLowerCase();
          if (st === 'completed') {
            clearInterval(interval);
            router.replace(`/client/completed/${id}` as any);
          }
        }
      } catch {
        // Ignora erros de polling momentâneos
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [id]);

  const handleCopyPix = async () => {
    if (!checkoutData?.pixCopiaECola) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(checkoutData.pixCopiaECola);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showFeedback('Copiado!', 'Código PIX Copia e Cola copiado para a área de transferência.');
    } catch {
      showFeedback('Código PIX', checkoutData.pixCopiaECola);
    }
  };

  const handleResendEmail = async () => {
    if (!id) return;
    setSendingEmail(true);
    try {
      const res = await resendPixEmail(id as string);
      if (res.error) {
        showFeedback('Aviso', res.error);
      } else {
        showFeedback('E-mail Enviado!', 'Os dados do PIX e chave Copia e Cola foram enviados para o e-mail cadastrado na sua conta.');
      }
    } catch {
      showFeedback('Erro', 'Não foi possível reenviar o e-mail no momento. Tente novamente.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleManualCheck = async () => {
    if (!id) return;
    setCheckingStatus(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}`);
      if (res.data) {
        const st = (res.data.status || res.data.serviceStatus || '').toLowerCase();
        if (st === 'completed') {
          router.replace(`/client/completed/${id}` as any);
          return;
        }
      }
      showFeedback(
        'Aguardando Liquidação Bancária',
        'O DelFinance ainda não identificou a confirmação deste PIX. Se você já realizou a transferência pelo seu banco, aguarde alguns instantes até a rede bancária processar.'
      );
    } catch {
      showFeedback('Aviso', 'Não foi possível consultar a rede bancária no momento. Tente novamente em instantes.');
    } finally {
      setCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  const priceVal = checkoutData?.totalAmount ?? (service.price || 150.00);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pagamento via PIX" showBack />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Service summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumo do serviço</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Profissional</Text>
              <Text style={styles.value}>{service.professional?.name || 'Profissional'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Serviço</Text>
              <Text style={styles.value}>{service.title || service.category}</Text>
            </View>

            {checkoutData && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Mão de Obra</Text>
                  <Text style={styles.value}>R$ {checkoutData.laborAmount.toFixed(2).replace('.', ',')}</Text>
                </View>
                {checkoutData.materialsAmount > 0 && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Peças e Materiais</Text>
                    <Text style={styles.value}>R$ {checkoutData.materialsAmount.toFixed(2).replace('.', ',')}</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>R$ {priceVal.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>

          {/* Card de Vistoria Fotográfica do Serviço Finalizado (Branch 5) */}
          {((service.afterPhotos && service.afterPhotos.length > 0) || (service.beforePhotos && service.beforePhotos.length > 0)) && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Camera size={18} color="#2563EB" />
                <Text style={styles.cardTitle}>Vistoria do Serviço Finalizado</Text>
              </View>
              <Text style={styles.vistoriaSubtitle}>
                Confira as fotos anexadas pelo profissional como comprovação da conclusão antes de pagar:
              </Text>

              {service.afterPhotos && service.afterPhotos.length > 0 ? (
                <View style={styles.vistoriaGrid}>
                  {service.afterPhotos.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewModalUrl(url)}
                      activeOpacity={0.85}
                      style={styles.vistoriaThumbWrapper}
                    >
                      <Image
                        source={{ uri: resolveImageUrl(url) || url }}
                        style={styles.vistoriaThumbImg}
                        resizeMode="cover"
                      />
                      <View style={styles.vistoriaBadge}>
                        <CheckCircle2 size={11} color="#FFFFFF" />
                        <Text style={styles.vistoriaBadgeText}>Depois #{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : service.beforePhotos && service.beforePhotos.length > 0 ? (
                <View style={styles.vistoriaGrid}>
                  {service.beforePhotos.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewModalUrl(url)}
                      activeOpacity={0.85}
                      style={styles.vistoriaThumbWrapper}
                    >
                      <Image
                        source={{ uri: resolveImageUrl(url) || url }}
                        style={styles.vistoriaThumbImg}
                        resizeMode="cover"
                      />
                      <View style={styles.vistoriaBadge}>
                        <Text style={styles.vistoriaBadgeText}>Antes #{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {/* DelFinance PIX Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forma de pagamento</Text>

            {/* DelFinance notice */}
            <View style={styles.noticeBox}>
              <DollarSign size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>Processado por DelFinance BaaS</Text>
                <Text style={styles.noticeText}>
                  Seu pagamento é mantido em custódia segura (Escrow) e repassado ao prestador somente após a conclusão do serviço.
                </Text>
              </View>
            </View>

            {generating ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Gerando cobrança PIX oficial no DelFinance...</Text>
              </View>
            ) : checkoutData ? (
              <View style={styles.pixContainer}>
                {/* QR Code Container */}
                <View style={styles.qrContainer}>
                  {checkoutData.qrCodeBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${checkoutData.qrCodeBase64}` }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <QrCode size={120} color="#1E293B" />
                      <Text style={styles.qrPlaceholderText}>QR Code Dinâmico DelFinance</Text>
                    </View>
                  )}
                  <Text style={styles.qrSubtitle}>Escaneie com o app do seu banco</Text>
                </View>

                {/* Copia e Cola */}
                <View style={styles.copyContainer}>
                  <Text style={styles.copyLabel}>PIX Copia e Cola</Text>
                  <View style={styles.copyBox}>
                    <Text style={styles.pixCodeText} numberOfLines={2} ellipsizeMode="middle">
                      {checkoutData.pixCopiaECola}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyButton, copied && styles.copyButtonActive]}
                    onPress={handleCopyPix}
                    activeOpacity={0.8}
                  >
                    {copied ? (
                      <>
                        <Check size={18} color="#FFFFFF" />
                        <Text style={styles.copyButtonText}>Código Copiado!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={18} color="#FFFFFF" />
                        <Text style={styles.copyButtonText}>Copiar Código PIX</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Aviso de Envio por E-mail */}
                <View style={styles.emailNoticeBox}>
                  <View style={styles.emailIconWrapper}>
                    <Mail size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emailNoticeTitle}>Enviamos para o seu e-mail</Text>
                    <Text style={styles.emailNoticeText}>
                      A fatura completa e a chave PIX Copia e Cola foram enviadas para o seu e-mail cadastrado.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.resendEmailBtn}
                    onPress={handleResendEmail}
                    disabled={sendingEmail}
                    activeOpacity={0.7}
                  >
                    {sendingEmail ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text style={styles.resendEmailBtnText}>Reenviar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Polling Indicator */}
                <View style={styles.pollingNotice}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.pollingText}>Aguardando confirmação bancária do DelFinance...</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.generateBtn} onPress={loadCheckout}>
                <RefreshCw size={20} color="#2563EB" />
                <Text style={styles.generateBtnText}>Gerar Cobrança PIX DelFinance</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Guarantee Info */}
          <View style={styles.shieldNotice}>
            <ShieldCheck size={22} color="#2563EB" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.shieldTitle}>Garantia e Custódia WorkEz</Text>
              <Text style={styles.shieldText}>
                Seus recursos ficam protegidos no DelFinance BaaS e você conta com a garantia de 30 dias após a conclusão do chamado.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            fullWidth
            onPress={checkoutData ? handleManualCheck : loadCheckout}
            disabled={generating || checkingStatus}
          >
            {generating || checkingStatus ? (
              <ActivityIndicator color="#FFF" />
            ) : checkoutData ? (
              'Verificar Pagamento no DelFinance'
            ) : (
              `Gerar Cobrança PIX DelFinance (R$ ${priceVal.toFixed(2).replace('.', ',')})`
            )}
          </Button>
        </View>
      </ScrollView>

      {/* Modal de Zoom da Foto (Branch 5) */}
      <Modal
        visible={!!previewModalUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Foto de Comprovação</Text>
              <TouchableOpacity onPress={() => setPreviewModalUrl(null)}>
                <XIcon size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {previewModalUrl && (
              <Image
                source={{ uri: resolveImageUrl(previewModalUrl) || previewModalUrl }}
                style={styles.modalFullImg}
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
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 14,
  },
  value: {
    color: '#0F172A',
    fontWeight: '500',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },
  noticeBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    color: '#064E3B',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'left',
  },
  noticeText: {
    color: '#065F46',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'left',
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  pixContainer: {
    gap: 16,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  qrPlaceholderText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  qrSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  copyContainer: {
    width: '100%',
    gap: 8,
  },
  copyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  copyBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pixCodeText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  copyButtonActive: {
    backgroundColor: '#10B981',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  pollingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emailNoticeBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  emailIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailNoticeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  emailNoticeText: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  resendEmailBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendEmailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  pollingText: {
    fontSize: 12,
    color: '#64748B',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  generateBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  shieldNotice: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  shieldTitle: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'left',
  },
  shieldText: {
    color: '#1E40AF',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'left',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  // ─── Estilos de Vistoria do Serviço (Branch 5) ──────────────────────────
  vistoriaSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  vistoriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vistoriaThumbWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
  },
  vistoriaThumbImg: {
    width: '100%',
    height: '100%',
  },
  vistoriaBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vistoriaBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 480,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalFullImg: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  checkManualBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkManualBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
