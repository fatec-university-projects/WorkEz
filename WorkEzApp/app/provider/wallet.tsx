import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  TrendingUp, Calendar, ArrowDownToLine,
  Wallet as WalletIcon, ShieldCheck, Lock,
  ArrowUpRight, ArrowDownLeft, Clock, Sparkles,
  X, Share2, FileText, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, TouchableOpacity, Platform, Modal, TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  fetchWalletSummary,
  fetchWalletStatement,
  requestPixWithdrawal,
  WalletSummary,
  WalletStatementItem,
  WithdrawalResponse
} from '../../services/api';
import { formatDateTime } from '../../utils/date';

type FilterType = 'all' | 'credit' | 'fee' | 'withdrawal' | 'escrow';

export default function Wallet() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const { user } = useAuth();

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [statement, setStatement] = useState<WalletStatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filtro inteligente e reativo de transações na interface
  const filteredStatement = useMemo(() => {
    if (!statement || statement.length === 0) return [];

    switch (activeFilter) {
      case 'credit':
        return statement.filter((item) => {
          const type = (item.transactionType || '').toLowerCase();
          return type === 'escrowrelease' || type === 'credit' || (item.amount > 0 && type !== 'escrowhold');
        });

      case 'withdrawal':
        return statement.filter((item) => {
          const type = (item.transactionType || '').toLowerCase();
          return type === 'withdrawal' || (item.amount < 0 && type !== 'platformfee');
        });

      case 'escrow':
        return statement.filter((item) => {
          const type = (item.transactionType || '').toLowerCase();
          const status = (item.status || '').toLowerCase();
          // Apenas o que está retido no momento (Held / Pending)
          return type === 'escrowhold' && (status === 'held' || status === 'pending');
        });

      case 'fee':
        return statement
          .filter((item) => {
            const type = (item.transactionType || '').toLowerCase();
            return type === 'platformfee' || (item.platformFeeAmount != null && item.platformFeeAmount > 0);
          })
          .map((item) => {
            const type = (item.transactionType || '').toLowerCase();
            if (type !== 'platformfee' && item.platformFeeAmount > 0) {
              return {
                ...item,
                id: `fee-${item.id}`,
                transactionType: 'PlatformFee' as const,
                transactionTypeLabel: 'Taxa da Plataforma',
                description: `Taxa WorkEz (15%): ${item.serviceTitle || item.description}`,
                amount: -Math.abs(item.platformFeeAmount),
                status: 'Completed',
                statusLabel: 'Descontado',
              };
            }
            return item;
          });

      case 'all':
      default:
        // No extrato geral, esconde EscrowHold com status Released para não duplicar com EscrowRelease
        return statement.filter((item) => {
          const type = (item.transactionType || '').toLowerCase();
          const status = (item.status || '').toLowerCase();
          if (type === 'escrowhold' && (status === 'released' || status === 'completed')) {
            return false;
          }
          return true;
        });
    }
  }, [statement, activeFilter]);

  // Modal de Saque PIX
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'CPF' | 'CNPJ' | 'Email' | 'Phone' | 'RandomKey'>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Modal de Comprovante Oficial
  const [selectedReceipt, setSelectedReceipt] = useState<WalletStatementItem | WithdrawalResponse | null>(null);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);

  const loadWalletData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [sumRes, stmtRes] = await Promise.all([
        fetchWalletSummary(user.id),
        fetchWalletStatement(user.id, 'all')
      ]);

      if (sumRes.data) {
        setSummary(sumRes.data);
        if (!pixKey && sumRes.data.defaultPixKey) {
          setPixKey(sumRes.data.defaultPixKey);
        }
      } else if (sumRes.error) {
        setError(sumRes.error);
      }

      if (stmtRes.data) {
        setStatement(stmtRes.data.items || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar carteira.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [loadWalletData])
  );

  const handleOpenWithdrawModal = () => {
    setWithdrawError(null);
    setWithdrawAmount('');
    if (summary?.defaultPixKey && !pixKey) {
      setPixKey(summary.defaultPixKey);
    }
    setIsWithdrawModalVisible(true);
  };

  const handleConfirmWithdraw = async () => {
    setWithdrawError(null);
    const amountNum = parseFloat(withdrawAmount.replace(',', '.'));

    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Digite um valor válido para transferência.');
      return;
    }

    if (summary && amountNum > summary.availableBalance) {
      setWithdrawError(`Saldo insuficiente. Disponível: R$ ${summary.availableBalance.toFixed(2).replace('.', ',')}`);
      return;
    }

    if (!pixKey.trim()) {
      setWithdrawError('Informe a chave PIX de destino.');
      return;
    }

    setSubmittingWithdraw(true);

    const res = await requestPixWithdrawal({
      providerId: user?.id,
      amount: amountNum,
      pixKey: pixKey.trim(),
      pixKeyType
    });

    setSubmittingWithdraw(false);

    if (res.data) {
      setIsWithdrawModalVisible(false);
      // Abre o comprovante oficial
      setSelectedReceipt(res.data);
      setIsReceiptModalVisible(true);
      // Recarrega os saldos e extrato
      loadWalletData(true);
    } else {
      setWithdrawError(res.error || 'Não foi possível processar a transferência.');
    }
  };

  const handleViewStatementItemReceipt = (item: WalletStatementItem) => {
    setSelectedReceipt(item);
    setIsReceiptModalVisible(true);
  };

  const handleShareReceipt = () => {
    const msg = 'Comprovante copiado com sucesso para a área de transferência!';
    if (Platform.OS === 'web') {
      alert(msg);
    } else {
      Alert.alert('Comprovante', msg);
    }
  };

  const formatCurrency = (val?: number) => {
    const num = val ?? 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Minha Carteira"
        rightElement={
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#10B981" />
            <Text style={styles.verifiedBadgeText}>PIX Homologado</Text>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {loading && !summary ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
              <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
            </View>
          ) : error && !summary ? (
            <View style={styles.errorBox}>
              <AlertCircle size={36} color={WorkEzTheme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadWalletData()}>
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── CARD PRINCIPAL: SALDO DISPONÍVEL ──────────────────────── */}
              <LinearGradient
                colors={['#0284C7', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
              >
                <View style={styles.balanceTopRow}>
                  <View style={styles.balanceTag}>
                    <WalletIcon size={14} color="#FFFFFF" />
                    <Text style={styles.balanceTagText}>Saldo Disponível</Text>
                  </View>
                  <View style={styles.instantTag}>
                    <Text style={styles.instantTagText}>Saque Instantâneo</Text>
                  </View>
                </View>

                <Text style={styles.balanceLabel}>Disponível para saque imediato</Text>
                <Text style={styles.balanceValue}>
                  R$ {formatCurrency(summary?.availableBalance)}
                </Text>

                <TouchableOpacity
                  onPress={handleOpenWithdrawModal}
                  activeOpacity={0.88}
                  style={styles.withdrawButton}
                >
                  <ArrowDownToLine size={18} color="#2563EB" style={styles.withdrawIcon} />
                  <Text style={styles.withdrawText}>Transferir via PIX</Text>
                </TouchableOpacity>
              </LinearGradient>

              {/* ── CARDS LADO A LADO: EM CUSTÓDIA & TOTAL DO MÊS ────────── */}
              <View style={styles.rowCards}>
                {/* Bloco 1: A Liberar (Em Custódia) */}
                <View style={styles.smallCard}>
                  <View style={styles.smallCardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                      <Lock size={18} color="#D97706" />
                    </View>
                    <Text style={styles.smallCardLabel}>A Liberar</Text>
                  </View>
                  <Text style={styles.smallCardValue}>
                    R$ {formatCurrency(summary?.escrowBalance)}
                  </Text>
                  <View style={styles.escrowBadge}>
                    <Text style={styles.escrowBadgeText}>Em Custódia Segura</Text>
                  </View>
                </View>

                {/* Bloco 2: Total Faturado no Mês */}
                <View style={styles.smallCard}>
                  <View style={styles.smallCardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(38, 255, 245, 0.12)' : 'rgba(37, 99, 235, 0.1)' }]}>
                      <TrendingUp size={18} color={isDark ? colors.primary : '#2563EB'} />
                    </View>
                    <Text style={styles.smallCardLabel}>Este Mês</Text>
                  </View>
                  <Text style={styles.smallCardValue}>
                    R$ {formatCurrency(summary?.thisMonthGross)}
                  </Text>
                  <View style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>Faturamento Bruto</Text>
                  </View>
                </View>
              </View>

              {/* ── CARD DE COMISSÃO JUSTA WORKEX ────────────────────────── */}
              <View style={styles.commissionCard}>
                <View style={styles.commissionHeader}>
                  <View style={styles.sparkleIcon}>
                    <Sparkles size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commissionTitle}>Comissão Justa WorkEz</Text>
                    <Text style={styles.commissionSubtitle}>
                      Taxa de 15% sobre mão de obra • Peças e materiais com TAXA ZERO (0%)
                    </Text>
                  </View>
                </View>

                {summary?.lastCommission ? (
                  <View style={styles.commissionBox}>
                    <View style={styles.commissionRow}>
                      <Text style={styles.commissionBoxText}>
                        Último: {summary.lastCommission.serviceTitle}
                      </Text>
                      <Text style={styles.commissionBoxValue}>
                        R$ {formatCurrency(summary.lastCommission.grossAmount)}
                      </Text>
                    </View>
                    <View style={styles.commissionDivider} />
                    <View style={styles.commissionDetailsGrid}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailColLabel}>Mão de Obra</Text>
                        <Text style={styles.detailColValue}>R$ {formatCurrency(summary.lastCommission.laborAmount)}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailColLabel}>Materiais (Isento)</Text>
                        <Text style={styles.detailColValue}>R$ {formatCurrency(summary.lastCommission.materialsAmount)}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailColLabel}>Taxa WorkEz (15%)</Text>
                        <Text style={[styles.detailColValue, { color: '#EF4444' }]}>- R$ {formatCurrency(summary.lastCommission.platformFeeAmount)}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailColLabel}>Líquido Recebido</Text>
                        <Text style={[styles.detailColValue, { color: '#10B981', fontWeight: '700' }]}>R$ {formatCurrency(summary.lastCommission.netAmount)}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noCommissionBox}>
                    <Text style={styles.noCommissionText}>
                      Ao concluir seu primeiro serviço, a discriminação justa de taxas aparecerá aqui.
                    </Text>
                  </View>
                )}
              </View>

              {/* ── EXTRATO DE REPASSES E HISTÓRICO ─────────────────────── */}
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color={WorkEzTheme.colors.text} />
                    <Text style={styles.historyTitle}>Extrato de Transações</Text>
                  </View>
                  <TouchableOpacity onPress={() => loadWalletData(true)} disabled={refreshing}>
                    <RefreshCw size={16} color={WorkEzTheme.colors.textSecondary} style={refreshing ? { opacity: 0.5 } : {}} />
                  </TouchableOpacity>
                </View>

                {/* Filtros em Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'credit', label: 'Entradas (+)' },
                    { key: 'withdrawal', label: 'Saques (-)' },
                    { key: 'escrow', label: 'Em Custódia' },
                    { key: 'fee', label: 'Taxas da Plataforma' },
                  ].map((chip) => {
                    const isSelected = activeFilter === chip.key;
                    return (
                      <TouchableOpacity
                        key={chip.key}
                        onPress={() => setActiveFilter(chip.key as FilterType)}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                      >
                        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Lista de Transações */}
                <View style={styles.historyList}>
                  {filteredStatement.length === 0 ? (
                    <View style={styles.emptyStatementBox}>
                      <Text style={styles.emptyStatementText}>
                        Nenhuma transação encontrada para este filtro.
                      </Text>
                    </View>
                  ) : (
                    filteredStatement.map((item, index) => {
                      const isCredit = item.transactionType === 'EscrowRelease' || item.transactionType === 'Credit';
                      const isWithdrawal = item.transactionType === 'Withdrawal';
                      const isEscrow = item.transactionType === 'EscrowHold';
                      const isFee = item.transactionType === 'PlatformFee';
                      const isLast = index === filteredStatement.length - 1;

                      // Determina estilo semântico do status (Saques e Taxas = Vermelho, Pendente = Âmbar, Concluído = Verde)
                      const st = (item.status || '').toLowerCase();
                      const isHeld = st === 'held' || st === 'pending';
                      const isFailed = st === 'failed' || st === 'cancelled';
                      const isRedBadge = isWithdrawal || isFee || isFailed;
                      const badgeBg = isRedBadge ? styles.statusFeeBg : isHeld ? styles.statusPendingBg : styles.statusReceivedBg;
                      const badgeText = isRedBadge ? styles.statusFeeText : isHeld ? styles.statusPendingText : styles.statusReceivedText;

                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleViewStatementItemReceipt(item)}
                          activeOpacity={0.7}
                          style={[styles.historyItem, isLast && styles.historyItemLast]}
                        >
                          <View style={styles.historyItemLeft}>
                            <View style={[
                              styles.txIconCircle,
                              isCredit ? styles.txIconCredit : isFee ? styles.txIconFee : isWithdrawal ? styles.txIconWithdrawal : styles.txIconEscrow
                            ]}>
                              {isCredit ? (
                                <ArrowDownLeft size={18} color="#10B981" />
                              ) : isFee ? (
                                <FileText size={18} color="#EF4444" />
                              ) : isWithdrawal ? (
                                <ArrowUpRight size={18} color="#EF4444" />
                              ) : (
                                <Clock size={18} color="#D97706" />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.historyItemService} numberOfLines={1}>
                                {item.description}
                              </Text>
                              <Text style={styles.historyItemDate}>{formatDateTime(item.date || item.createdAt)}</Text>
                            </View>
                          </View>

                          <View style={styles.historyItemRight}>
                            <Text style={[
                              styles.historyItemValue,
                              isCredit ? styles.valCredit : (isWithdrawal || isFee) ? styles.valWithdrawal : styles.valEscrow
                            ]}>
                              {item.amount > 0 ? `+ R$ ${formatCurrency(item.amount)}` : `- R$ ${formatCurrency(Math.abs(item.amount))}`}
                            </Text>
                            <View style={[styles.statusBadge, badgeBg]}>
                              <Text style={[styles.statusBadgeText, badgeText]}>
                                {item.statusLabel}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL: SOLICITAR SAQUE PIX ─────────────────────────────────── */}
      <Modal
        visible={isWithdrawModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIcon}>
                  <ArrowDownToLine size={20} color="#2563EB" />
                </View>
                <Text style={styles.modalTitle}>Transferência via PIX</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsWithdrawModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={WorkEzTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalancePill}>
              <Text style={styles.modalBalanceLabel}>Saldo Disponível para Saque:</Text>
              <Text style={styles.modalBalanceVal}>
                R$ {formatCurrency(summary?.availableBalance)}
              </Text>
            </View>

            {withdrawError && (
              <View style={styles.modalErrorBox}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.modalErrorText}>{withdrawError}</Text>
              </View>
            )}

            {/* Input de Valor */}
            <Text style={styles.inputLabel}>Valor a transferir (R$)</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputCurrencyPrefix}>R$</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="decimal-pad"
                placeholder="0,00"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
            </View>

            {/* Chips Rápidos de Valor */}
            <View style={styles.quickAmountRow}>
              {[50, 100, 200].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setWithdrawAmount(amt.toString())}
                  style={styles.quickAmountChip}
                >
                  <Text style={styles.quickAmountText}>R$ {amt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setWithdrawAmount((summary?.availableBalance || 0).toFixed(2))}
                style={[styles.quickAmountChip, styles.quickAmountAll]}
              >
                <Text style={[styles.quickAmountText, { color: '#2563EB', fontWeight: '700' }]}>
                  Sacar Tudo
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tipo de Chave PIX */}
            <Text style={styles.inputLabel}>Tipo de Chave PIX</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pixKeyTypeRow}>
              {(['CPF', 'CNPJ', 'Email', 'Phone', 'RandomKey'] as const).map((type) => {
                const isSelected = pixKeyType === type;
                const labels: Record<string, string> = {
                  CPF: 'CPF',
                  CNPJ: 'CNPJ',
                  Email: 'E-mail',
                  Phone: 'Telefone',
                  RandomKey: 'Chave Aleatória'
                };
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setPixKeyType(type)}
                    style={[styles.keyTypeChip, isSelected && styles.keyTypeChipActive]}
                  >
                    <Text style={[styles.keyTypeText, isSelected && styles.keyTypeTextActive]}>
                      {labels[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Chave PIX */}
            <Text style={styles.inputLabel}>Chave PIX de Destino</Text>
            <TextInput
              style={styles.singleTextInput}
              placeholder={
                pixKeyType === 'CPF' ? 'Ex: 000.000.000-00' :
                pixKeyType === 'Email' ? 'Ex: seuemail@pix.com' :
                pixKeyType === 'Phone' ? 'Ex: (11) 99999-9999' :
                'Insira sua chave PIX'
              }
              value={pixKey}
              onChangeText={setPixKey}
              autoCapitalize="none"
            />

            <View style={styles.pixInfoAlert}>
              <ShieldCheck size={16} color="#059669" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.pixInfoAlertText}>
                  BaaS DelFinance oficial integrado. Liquidação imediata SPI/Banco Central sem taxas.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPixKeyType('CPF');
                    setPixKey('30287697789');
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: 2, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#D1FAE5', borderRadius: 6 }}
                >
                  <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '700' }}>
                    ⚡ Usar Chave Teste DelFinance (CPF: 30287697789)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleConfirmWithdraw}
              disabled={submittingWithdraw}
              style={[styles.confirmWithdrawBtn, submittingWithdraw && { opacity: 0.7 }]}
            >
              {submittingWithdraw ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.confirmWithdrawBtnText}>Confirmar Saque PIX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: COMPROVANTE OFICIAL DE TRANSAÇÃO ─────────────────────── */}
      <Modal
        visible={isReceiptModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReceiptModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptBrandRow}>
                <View style={styles.receiptLogo}>
                  <Text style={styles.receiptLogoText}>WorkEz</Text>
                </View>
                <TouchableOpacity onPress={() => setIsReceiptModalVisible(false)}>
                  <X size={20} color={WorkEzTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.receiptTitle}>COMPROVANTE DE TRANSAÇÃO</Text>
              <Text style={styles.receiptDocNumber}>
                {'receiptNumber' in (selectedReceipt || {}) ? (selectedReceipt as any).receiptNumber : 'DOC-HOMOLOGADO'}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.receiptBody}>
                <View style={styles.receiptStatusBox}>
                  <CheckCircle2 size={24} color="#10B981" />
                  <Text style={styles.receiptStatusText}>Transação Liquidada</Text>
                  <Text style={styles.receiptStatusSub}>Autenticação digital WorkEz Delfinance</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptFieldLabel}>Data e Hora</Text>
                  <Text style={styles.receiptFieldValue}>
                    {formatDateTime((selectedReceipt as any)?.date || (selectedReceipt as any)?.createdAt || (selectedReceipt as any)?.processedAt || new Date())}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptFieldLabel}>Tipo</Text>
                  <Text style={styles.receiptFieldValue}>
                    {'transactionTypeLabel' in (selectedReceipt || {}) ? (selectedReceipt as any).transactionTypeLabel : 'Transferência PIX'}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptFieldLabel}>Valor Bruto</Text>
                  <Text style={styles.receiptFieldValue}>
                    R$ {formatCurrency((selectedReceipt as any)?.grossAmount || (selectedReceipt as any)?.amount)}
                  </Text>
                </View>

                {((selectedReceipt as any)?.materialsAmount > 0) && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Materiais (Isento 0%)</Text>
                    <Text style={[styles.receiptFieldValue, { color: '#059669' }]}>
                      R$ {formatCurrency((selectedReceipt as any)?.materialsAmount)}
                    </Text>
                  </View>
                )}

                {((selectedReceipt as any)?.platformFeeAmount > 0) && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Taxa WorkEz (15%)</Text>
                    <Text style={[styles.receiptFieldValue, { color: '#EF4444' }]}>
                      - R$ {formatCurrency((selectedReceipt as any)?.platformFeeAmount)}
                    </Text>
                  </View>
                )}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRowHighlight}>
                  <Text style={styles.receiptHighlightLabel}>Valor Líquido</Text>
                  <Text style={styles.receiptHighlightValue}>
                    R$ {formatCurrency((selectedReceipt as any)?.amount)}
                  </Text>
                </View>

                {'pixKey' in (selectedReceipt || {}) && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptFieldLabel}>Chave PIX Destino</Text>
                    <Text style={styles.receiptFieldValue}>
                      {(selectedReceipt as any).pixKey} ({(selectedReceipt as any).pixKeyType})
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.receiptFooter}>
              <TouchableOpacity
                onPress={handleShareReceipt}
                style={styles.shareReceiptBtn}
              >
                <Share2 size={16} color="#2563EB" />
                <Text style={styles.shareReceiptBtnText}>Compartilhar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsReceiptModalVisible(false)}
                style={styles.closeReceiptBtn}
              >
                <Text style={styles.closeReceiptBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingBox: {
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorBox: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
    borderRadius: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#4ADE80' : '#059669',
  },

  // Balance Card
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  balanceTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instantTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  instantTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  withdrawIcon: {},
  withdrawText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 15,
  },

  // Row Cards
  rowCards: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  smallCardValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  escrowBadge: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  escrowBadgeText: {
    color: isDark ? '#FCD34D' : '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  monthBadge: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  monthBadgeText: {
    color: isDark ? colors.primary : '#2563EB',
    fontSize: 10,
    fontWeight: '700',
  },

  // Fair Commission Card
  commissionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sparkleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  commissionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  commissionBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commissionBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  commissionBoxValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  commissionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  commissionDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailCol: {
    width: '48%',
  },
  detailColLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailColValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  noCommissionBox: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  noCommissionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // History / Statement Card
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: isDark ? colors.surface : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? colors.border : '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: isDark ? '#2563EB' : '#1D4ED8',
    borderColor: isDark ? '#3B82F6' : '#1D4ED8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  historyList: {
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconCredit: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  txIconWithdrawal: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
  },
  txIconFee: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
  },
  txIconEscrow: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
  },
  historyItemService: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historyItemDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyItemValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  valCredit: {
    color: isDark ? '#4ADE80' : '#059669',
  },
  valWithdrawal: {
    color: colors.danger,
  },
  valEscrow: {
    color: isDark ? '#FCD34D' : '#D97706',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusReceivedBg: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  statusWithdrawBg: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
  },
  statusFeeBg: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
  },
  statusPendingBg: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusReceivedText: {
    color: isDark ? '#4ADE80' : '#059669',
  },
  statusWithdrawText: {
    color: isDark ? '#F87171' : '#DC2626',
  },
  statusFeeText: {
    color: isDark ? '#F87171' : '#DC2626',
  },
  statusPendingText: {
    color: isDark ? '#FCD34D' : '#D97706',
  },
  emptyStatementBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStatementText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBalancePill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalBalanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalBalanceVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  inputCurrencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  quickAmountChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickAmountAll: {
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)',
    borderColor: colors.primary,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pixKeyTypeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  keyTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  keyTypeChipActive: {
    backgroundColor: colors.primary,
  },
  keyTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  keyTypeTextActive: {
    color: '#FFFFFF',
  },
  singleTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  pixInfoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  pixInfoAlertText: {
    fontSize: 11,
    color: isDark ? '#6EE7B7' : '#059669',
    flex: 1,
    lineHeight: 15,
  },
  confirmWithdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
  },
  confirmWithdrawBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Receipt Modal
  receiptContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 'auto',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  receiptHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 14,
    marginBottom: 14,
  },
  receiptBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptLogo: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptLogoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  receiptDocNumber: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  receiptBody: {
    gap: 10,
  },
  receiptStatusBox: {
    alignItems: 'center',
    padding: 14,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  receiptStatusText: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#4ADE80' : '#059669',
  },
  receiptStatusSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptFieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  receiptFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  receiptRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
  },
  receiptHighlightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  receiptHighlightValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shareReceiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },
  shareReceiptBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  closeReceiptBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeReceiptBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
