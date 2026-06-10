import { DollarSign, TrendingUp, Calendar, ArrowDownToLine } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
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
  const { user } = useAuth();

  const { data: walletData, loading, error } = useFetch<WalletData>(
    user ? `/api/Providers/${user.id}/wallet` : null
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carteira</Text>
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
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Saldo disponível</Text>
              <Text style={styles.balanceValue}>R$ {walletData?.availableBalance?.toFixed(2).replace('.', ',') || '0,00'}</Text>
              <Button
                variant="secondary"
                style={styles.withdrawButton}
              >
                <ArrowDownToLine size={20} color={WorkEzTheme.colors.primary} style={styles.withdrawIcon} />
                <Text style={styles.withdrawText}>Solicitar saque</Text>
              </Button>
            </View>

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
                  <Text style={styles.commissionBoxText}>Último serviço (R$ {walletData?.commission?.lastService || '0,00'})</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  balanceCard: {
    backgroundColor: WorkEzTheme.colors.primary,
    borderRadius: 16,
    padding: 24,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    ...WorkEzTheme.typography.sm,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    flexDirection: 'row',
  },
  withdrawIcon: {
    marginRight: 8,
  },
  withdrawText: {
    color: WorkEzTheme.colors.primary,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
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
    color: WorkEzTheme.colors.primary,
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
    color: WorkEzTheme.colors.primary,
  },
  statusPendingText: {
    color: WorkEzTheme.colors.warning,
  },
});
