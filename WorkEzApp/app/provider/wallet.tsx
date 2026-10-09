import { useMemo, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  DollarSign, TrendingUp, Calendar, ArrowDownToLine,
  ArrowLeft, Wallet as WalletIcon, ShieldCheck
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/Button';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface Transaction {
  date: string;
  service: string;
  value: number;
  status: 'received' | 'pending';
}

interface WalletData {
  availableBalance: number;
  receivable: number;
  thisMonth: number;
  commission: {
    lastService: string;
    value: number;
  };
  transactions: Transaction[];
}

export default function Wallet() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: services, loading, error, refetch } = useFetch<any[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetch();
      }
    }, [user, refetch])
  );

  const walletData = useMemo<WalletData>(() => {
    if (!services) {
      return {
        availableBalance: 0,
        receivable: 0,
        thisMonth: 0,
        commission: {
          lastService: '-',
          value: 0
        },
        transactions: []
      };
    }

    const completed = services.filter(s => s.status === 'completed');
    const waitingPayment = services.filter(s => s.status === 'waiting-payment');

    const availableBalance = completed.reduce((sum, s) => sum + (s.price || 0), 0);

    // Filter completed and waiting-payment services for the current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const thisMonthServices = services.filter(s => {
      if (s.status !== 'completed' && s.status !== 'waiting-payment') return false;
      if (!s.date) return false;
      const parts = s.date.split('/');
      if (parts.length < 3) return false;
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      return m === currentMonth && y === currentYear;
    });
    const thisMonth = thisMonthServices.reduce((sum, s) => sum + (s.price || 0), 0);

    // A receber: faturamento bruto do mês menos 15% de taxa
    const receivable = thisMonth * 0.85;

    const lastCompleted = completed[0]; // sorted descending by backend
    const commission = {
      lastService: lastCompleted ? lastCompleted.category : '-',
      value: lastCompleted ? (lastCompleted.price || 0) * 0.15 : 0
    };

    const transactions: Transaction[] = services
      .filter(s => s.status === 'completed' || s.status === 'waiting-payment')
      .map(s => ({
        date: s.date,
        service: s.category || 'Serviço',
        value: s.price || 0,
        status: s.status === 'completed' ? 'received' : 'pending'
      }));

    return {
      availableBalance,
      receivable,
      thisMonth,
      commission,
      transactions
    };
  }, [services]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.push('/provider'))}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={WorkEzTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Carteira</Text>
        <View style={styles.verifiedBadge}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.verifiedBadgeText}>PIX Ativo</Text>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={{ marginTop: 16, color: WorkEzTheme.colors.textSecondary }}>Carregando carteira...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: WorkEzTheme.colors.danger }}>{error}</Text>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={['#06B6D4', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceTopRow}>
                <View style={styles.balanceTag}>
                  <WalletIcon size={14} color="#FFFFFF" />
                  <Text style={styles.balanceTagText}>Saldo Principal</Text>
                </View>
                <View style={styles.pixTag}>
                  <Text style={styles.pixTagText}>Conta Verificada</Text>
                </View>
              </View>

              <Text style={styles.balanceLabel}>Saldo disponível para saque</Text>
              <Text style={styles.balanceValue}>
                R$ {walletData?.availableBalance?.toFixed(2).replace('.', ',') || '0,00'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  console.log('Solicitar saque clicked!');
                  const valStr = (walletData?.receivable || 0).toFixed(2).replace('.', ',');
                  const message = `Seu saque no valor de R$ ${valStr} (A receber) está sendo processado.`;
                  if (Platform.OS === 'web') {
                    alert(message);
                  } else {
                    Alert.alert(
                      'Solicitação de Saque',
                      message,
                      [{ text: 'OK' }],
                      { cancelable: true }
                    );
                  }
                }}
                activeOpacity={0.88}
                style={styles.withdrawButton}
              >
                <ArrowDownToLine size={18} color="#2563EB" style={styles.withdrawIcon} />
                <Text style={styles.withdrawText}>Solicitar saque via PIX</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.rowCards}>
              <View style={styles.smallCard}>
                <View style={styles.smallCardHeader}>
                  <DollarSign size={20} color="#2563EB" />
                  <Text style={styles.smallCardLabel}>A receber</Text>
                </View>
                <Text style={styles.smallCardValue}>R$ {walletData?.receivable?.toFixed(2).replace('.', ',') || '0,00'}</Text>
              </View>

              <View style={styles.smallCard}>
                <View style={styles.smallCardHeader}>
                  <TrendingUp size={20} color={WorkEzTheme.colors.primary} />
                  <Text style={styles.smallCardLabel}>Este mês</Text>
                </View>
                <Text style={styles.smallCardValue}>R$ {walletData?.thisMonth?.toFixed(2).replace('.', ',') || '0,00'}</Text>
              </View>
            </View>

            <View style={styles.commissionCard}>
              <Text style={styles.commissionTitle}>Comissão da plataforma</Text>
              <Text style={styles.commissionDescription}>
                15% sobre cada serviço concluído
              </Text>
              <View style={styles.commissionBox}>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionBoxText}>Último serviço ({walletData?.commission?.lastService || 'Nenhum'})</Text>
                  <Text style={styles.commissionBoxValue}>- R$ {walletData?.commission?.value?.toFixed(2).replace('.', ',') || '0,00'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Calendar size={20} color={WorkEzTheme.colors.text} />
                <Text style={styles.historyTitle}>Histórico de repasses</Text>
              </View>

              <View style={styles.historyList}>
                {walletData?.transactions?.map((transaction, index) => {
                  const isReceived = transaction.status === 'received';
                  const isLast = index === (walletData?.transactions?.length || 0) - 1;

                  return (
                    <View
                      key={index}
                      style={[styles.historyItem, isLast && styles.historyItemLast]}
                    >
                      <View style={styles.historyItemInfo}>
                        <Text style={styles.historyItemService}>
                          {transaction.service}
                        </Text>
                        <Text style={styles.historyItemDate}>{transaction.date}</Text>
                      </View>
                      <View style={styles.historyItemRight}>
                        <Text style={styles.historyItemValue}>
                          + R$ {transaction.value.toFixed(2).replace('.', ',')}
                        </Text>
                        <View style={[styles.statusBadge, isReceived ? styles.statusReceivedBg : styles.statusPendingBg]}>
                          <Text style={[styles.statusBadgeText, isReceived ? styles.statusReceivedText : styles.statusPendingText]}>
                            {isReceived ? 'Recebido' : 'Pendente'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  balanceCard: {
    borderRadius: 22,
    padding: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pixTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pixTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  withdrawIcon: {
    marginRight: 8,
  },
  withdrawText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 14,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallCardLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  smallCardValue: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  commissionCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  commissionTitle: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
    marginBottom: 4,
  },
  commissionDescription: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    marginBottom: 12,
  },
  commissionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionBoxText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  commissionBoxValue: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  historyCard: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  historyTitle: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemService: {
    ...WorkEzTheme.typography.sm,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
  },
  historyItemDate: {
    ...WorkEzTheme.typography.xs,
    color: WorkEzTheme.colors.textSecondary,
    marginTop: 4,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemValue: {
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F766E',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: WorkEzTheme.borderRadius.full,
  },
  statusReceivedBg: {
    backgroundColor: 'rgba(38, 255, 245, 0.1)',
  },
  statusPendingBg: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  statusBadgeText: {
    ...WorkEzTheme.typography.xs,
  },
  statusReceivedText: {
    color: '#0F766E',
    fontWeight: '600',
  },
  statusPendingText: {
    color: WorkEzTheme.colors.warning,
  },
});
