import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, DollarSign, QrCode, Copy, Check, Clock, RefreshCw, Camera, CheckCircle2, X as XIcon, Mail } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, StyleSheet, Modal, Platform } from 'react-native';
import { useFetch } from '../../../hooks/useFetch';
import { generateEscrowPixCheckout, EscrowCheckoutPixResponse, apiRequest, resolveImageUrl, resendPixEmail } from '../../../services/api';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function Payment() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
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

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      scrollContent: {
        flexGrow: 1,
      },
      centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 24,
      },
      errorText: {
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 16,
      },
      content: {
        padding: 24,
        gap: 20,
      },
      card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 2,
        elevation: 2,
      },
      cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
      },
      row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
      },
      label: {
        color: colors.textSecondary,
        fontSize: 14,
      },
      value: {
        color: colors.text,
        fontWeight: '500',
        fontSize: 14,
      },
      divider: {
        height: 1,
        backgroundColor: colors.border,
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
        color: colors.text,
      },
      totalValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary,
      },
      noticeBox: {
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        alignItems: 'flex-start',
      },
      noticeTitle: {
        color: isDark ? '#6EE7B7' : '#064E3B',
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'left',
      },
      noticeText: {
        color: isDark ? '#A7F3D0' : '#065F46',
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
        color: colors.textSecondary,
        fontSize: 13,
      },
      pixContainer: {
        gap: 16,
        alignItems: 'center',
      },
      qrContainer: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
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
        backgroundColor: colors.card,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
      },
      qrPlaceholderText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
      },
      qrSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
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
        color: colors.text,
      },
      copyBox: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
      },
      pixCodeText: {
        fontSize: 12,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      },
      copyButton: {
        backgroundColor: colors.primary,
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
        backgroundColor: colors.secondary,
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
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
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
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
      },
      emailNoticeTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: isDark ? '#93C5FD' : '#1E40AF',
      },
      emailNoticeText: {
        fontSize: 11,
        color: isDark ? '#BFDBFE' : '#3B82F6',
        marginTop: 2,
        lineHeight: 15,
      },
      resendEmailBtn: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
      },
      resendEmailBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
      },
      pollingText: {
        fontSize: 12,
        color: colors.textSecondary,
      },
      generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
      },
      generateBtnText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
      },
      shieldNotice: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
      },
      shieldTitle: {
        color: isDark ? '#93C5FD' : '#1D4ED8',
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'left',
      },
      shieldText: {
        color: isDark ? '#BFDBFE' : '#1E40AF',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
        textAlign: 'left',
      },
      footer: {
        backgroundColor: colors.card,
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      vistoriaSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
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
        borderColor: colors.border,
        backgroundColor: colors.surface,
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
        backgroundColor: colors.card,
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
        color: colors.text,
      },
      modalFullImg: {
        width: '100%',
        height: 380,
        borderRadius: 12,
        backgroundColor: colors.surface,
      },
    });
  }, [colors, isDark]);

  if (loading) {
    return (
      <View style={dynamicStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={dynamicStyles.centerContainer}>
        <Text style={dynamicStyles.errorText}>
          {error || 'Não foi possível carregar o serviço.'}
        </Text>
        <Button onPress={() => router.back()}>Voltar</Button>
      </View>
    );
  }

  const priceVal = checkoutData?.totalAmount ?? (service.price || 150.00);

  return (
    <View style={dynamicStyles.container}>
      <ScreenHeader title="Pagamento via PIX" showBack />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={dynamicStyles.scrollContent}>
        <View style={dynamicStyles.content}>
          {/* Service summary */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>Resumo do serviço</Text>
            <View style={dynamicStyles.row}>
              <Text style={dynamicStyles.label}>Profissional</Text>
              <Text style={dynamicStyles.value}>{service.professional?.name || 'Profissional'}</Text>
            </View>
            <View style={dynamicStyles.row}>
              <Text style={dynamicStyles.label}>Serviço</Text>
              <Text style={dynamicStyles.value}>{service.title || service.category}</Text>
            </View>

            {checkoutData && (
              <>
                <View style={dynamicStyles.row}>
                  <Text style={dynamicStyles.label}>Mão de Obra</Text>
                  <Text style={dynamicStyles.value}>R$ {checkoutData.laborAmount.toFixed(2).replace('.', ',')}</Text>
                </View>
                {checkoutData.materialsAmount > 0 && (
                  <View style={dynamicStyles.row}>
                    <Text style={dynamicStyles.label}>Peças e Materiais</Text>
                    <Text style={dynamicStyles.value}>R$ {checkoutData.materialsAmount.toFixed(2).replace('.', ',')}</Text>
                  </View>
                )}
              </>
            )}

            <View style={dynamicStyles.divider} />
            <View style={dynamicStyles.totalRow}>
              <Text style={dynamicStyles.totalLabel}>Total</Text>
              <Text style={dynamicStyles.totalValue}>R$ {priceVal.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>

          {/* Card de Vistoria Fotográfica do Serviço Finalizado (Branch 5) */}
          {((service.afterPhotos && service.afterPhotos.length > 0) || (service.beforePhotos && service.beforePhotos.length > 0)) && (
            <View style={dynamicStyles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Camera size={18} color={colors.primary} />
                <Text style={dynamicStyles.cardTitle}>Vistoria do Serviço Finalizado</Text>
              </View>
              <Text style={dynamicStyles.vistoriaSubtitle}>
                Confira as fotos anexadas pelo profissional como comprovação da conclusão antes de pagar:
              </Text>

              {service.afterPhotos && service.afterPhotos.length > 0 ? (
                <View style={dynamicStyles.vistoriaGrid}>
                  {service.afterPhotos.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewModalUrl(url)}
                      activeOpacity={0.85}
                      style={dynamicStyles.vistoriaThumbWrapper}
                    >
                      <Image
                        source={{ uri: resolveImageUrl(url) || url }}
                        style={dynamicStyles.vistoriaThumbImg}
                        resizeMode="cover"
                      />
                      <View style={dynamicStyles.vistoriaBadge}>
                        <CheckCircle2 size={11} color="#FFFFFF" />
                        <Text style={dynamicStyles.vistoriaBadgeText}>Depois #{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : service.beforePhotos && service.beforePhotos.length > 0 ? (
                <View style={dynamicStyles.vistoriaGrid}>
                  {service.beforePhotos.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewModalUrl(url)}
                      activeOpacity={0.85}
                      style={dynamicStyles.vistoriaThumbWrapper}
                    >
                      <Image
                        source={{ uri: resolveImageUrl(url) || url }}
                        style={dynamicStyles.vistoriaThumbImg}
                        resizeMode="cover"
                      />
                      <View style={dynamicStyles.vistoriaBadge}>
                        <Text style={dynamicStyles.vistoriaBadgeText}>Antes #{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )}

          {/* DelFinance PIX Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>Forma de pagamento</Text>

            {/* DelFinance notice */}
            <View style={dynamicStyles.noticeBox}>
              <DollarSign size={20} color={colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.noticeTitle}>Processado por DelFinance BaaS</Text>
                <Text style={dynamicStyles.noticeText}>
                  Seu pagamento é mantido em custódia segura (Escrow) e repassado ao prestador somente após a conclusão do serviço.
                </Text>
              </View>
            </View>

            {generating ? (
              <View style={dynamicStyles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={dynamicStyles.loadingText}>Gerando cobrança PIX oficial no DelFinance...</Text>
              </View>
            ) : checkoutData ? (
              <View style={dynamicStyles.pixContainer}>
                {/* QR Code Container */}
                <View style={dynamicStyles.qrContainer}>
                  {checkoutData.qrCodeBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${checkoutData.qrCodeBase64}` }}
                      style={dynamicStyles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={dynamicStyles.qrPlaceholder}>
                      <QrCode size={120} color={colors.text} />
                      <Text style={dynamicStyles.qrPlaceholderText}>QR Code Dinâmico DelFinance</Text>
                    </View>
                  )}
                  <Text style={dynamicStyles.qrSubtitle}>Escaneie com o app do seu banco</Text>
                </View>

                {/* Copia e Cola */}
                <View style={dynamicStyles.copyContainer}>
                  <Text style={dynamicStyles.copyLabel}>PIX Copia e Cola</Text>
                  <View style={dynamicStyles.copyBox}>
                    <Text style={dynamicStyles.pixCodeText} numberOfLines={2} ellipsizeMode="middle">
                      {checkoutData.pixCopiaECola}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[dynamicStyles.copyButton, copied && dynamicStyles.copyButtonActive]}
                    onPress={handleCopyPix}
                    activeOpacity={0.8}
                  >
                    {copied ? (
                      <>
                        <Check size={18} color="#FFFFFF" />
                        <Text style={dynamicStyles.copyButtonText}>Código Copiado!</Text>
                      </>
                    ) : (
                      <>
                        <Copy size={18} color="#FFFFFF" />
                        <Text style={dynamicStyles.copyButtonText}>Copiar Código PIX</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Aviso de Envio por E-mail */}
                <View style={dynamicStyles.emailNoticeBox}>
                  <View style={dynamicStyles.emailIconWrapper}>
                    <Mail size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={dynamicStyles.emailNoticeTitle}>Enviamos para o seu e-mail</Text>
                    <Text style={dynamicStyles.emailNoticeText}>
                      A fatura completa e a chave PIX Copia e Cola foram enviadas para o seu e-mail cadastrado.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={dynamicStyles.resendEmailBtn}
                    onPress={handleResendEmail}
                    disabled={sendingEmail}
                    activeOpacity={0.7}
                  >
                    {sendingEmail ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={dynamicStyles.resendEmailBtnText}>Reenviar</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Polling Indicator */}
                <View style={dynamicStyles.pollingNotice}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={dynamicStyles.pollingText}>Aguardando confirmação bancária do DelFinance...</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={dynamicStyles.generateBtn} onPress={loadCheckout}>
                <RefreshCw size={20} color={colors.primary} />
                <Text style={dynamicStyles.generateBtnText}>Gerar Cobrança PIX DelFinance</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Guarantee Info */}
          <View style={dynamicStyles.shieldNotice}>
            <ShieldCheck size={22} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={dynamicStyles.shieldTitle}>Garantia e Custódia WorkEz</Text>
              <Text style={dynamicStyles.shieldText}>
                Seus recursos ficam protegidos no DelFinance BaaS e você conta com a garantia de 30 dias após a conclusão do chamado.
              </Text>
            </View>
          </View>
        </View>

        <View style={dynamicStyles.footer}>
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
        <View style={dynamicStyles.modalBackdrop}>
          <View style={dynamicStyles.modalCard}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalHeaderTitle}>Foto de Comprovação</Text>
              <TouchableOpacity onPress={() => setPreviewModalUrl(null)}>
                <XIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {previewModalUrl && (
              <Image
                source={{ uri: resolveImageUrl(previewModalUrl) || previewModalUrl }}
                style={dynamicStyles.modalFullImg}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
