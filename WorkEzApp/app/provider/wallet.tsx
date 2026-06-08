import { DollarSign, TrendingUp, Calendar, ArrowDownToLine } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AntigravityTheme } from '../../constants/theme';

export default function Wallet() {
  const transactions = [
    { date: '25 Abr', service: 'Encanamento - Rua das Flores', value: 150, status: 'received' },
    { date: '24 Abr', service: 'Instalação - Av. Principal', value: 200, status: 'received' },
    { date: '23 Abr', service: 'Reparo - Centro', value: 120, status: 'pending' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Carteira</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponível</Text>
          <Text style={styles.balanceValue}>R$ 850,00</Text>
          <Button
            variant="secondary"
            style={styles.withdrawButton}
          >
            <ArrowDownToLine size={20} color={AntigravityTheme.colors.primary} style={styles.withdrawIcon} />
            <Text style={styles.withdrawText}>Solicitar saque</Text>
          </Button>
        </View>

        <View style={styles.rowCards}>
          <View style={styles.smallCard}>
            <View style={styles.smallCardHeader}>
              <DollarSign size={20} color="#2563EB" />
              <Text style={styles.smallCardLabel}>A receber</Text>
            </View>
            <Text style={styles.smallCardValue}>R$ 320</Text>
          </View>

          <View style={styles.smallCard}>
            <View style={styles.smallCardHeader}>
              <TrendingUp size={20} color={AntigravityTheme.colors.primary} />
              <Text style={styles.smallCardLabel}>Este mês</Text>
            </View>
            <Text style={styles.smallCardValue}>R$ 3.450</Text>
          </View>
        </View>

        <View style={styles.commissionCard}>
          <Text style={styles.commissionTitle}>Comissão da plataforma</Text>
          <Text style={styles.commissionDescription}>
            15% sobre cada serviço concluído
          </Text>
          <View style={styles.commissionBox}>
            <View style={styles.commissionRow}>
              <Text style={styles.commissionBoxText}>Último serviço (R$ 150)</Text>
              <Text style={styles.commissionBoxValue}>- R$ 22,50</Text>
            </View>
          </View>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Calendar size={20} color={AntigravityTheme.colors.text} />
            <Text style={styles.historyTitle}>Histórico de repasses</Text>
          </View>

          <View style={styles.historyList}>
            {transactions.map((transaction, index) => {
              const isReceived = transaction.status === 'received';
              const isLast = index === transactions.length - 1;

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
                      + R$ {transaction.value}
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
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AntigravityTheme.colors.border,
  },
  headerTitle: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.bold,
    color: AntigravityTheme.colors.text,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  balanceCard: {
    backgroundColor: AntigravityTheme.colors.primary,
    borderRadius: 16,
    padding: 24,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    ...AntigravityTheme.typography.sm,
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
    color: AntigravityTheme.colors.primary,
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
  },
  rowCards: {
    flexDirection: 'row',
    gap: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallCardLabel: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  smallCardValue: {
    ...AntigravityTheme.typography.xl,
    fontWeight: AntigravityTheme.typography.fontWeight.bold,
    color: AntigravityTheme.colors.text,
  },
  commissionCard: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  commissionTitle: {
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.text,
    marginBottom: 4,
  },
  commissionDescription: {
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
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
    ...AntigravityTheme.typography.sm,
    color: AntigravityTheme.colors.textSecondary,
  },
  commissionBoxValue: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: AntigravityTheme.colors.text,
  },
  historyCard: {
    backgroundColor: AntigravityTheme.colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: AntigravityTheme.colors.border,
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
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.text,
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
    borderBottomColor: AntigravityTheme.colors.border,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemService: {
    ...AntigravityTheme.typography.sm,
    fontWeight: AntigravityTheme.typography.fontWeight.medium,
    color: AntigravityTheme.colors.text,
  },
  historyItemDate: {
    ...AntigravityTheme.typography.xs,
    color: AntigravityTheme.colors.textSecondary,
    marginTop: 4,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemValue: {
    fontWeight: AntigravityTheme.typography.fontWeight.semibold,
    color: AntigravityTheme.colors.primary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AntigravityTheme.borderRadius.full,
  },
  statusReceivedBg: {
    backgroundColor: 'rgba(38, 255, 245, 0.1)',
  },
  statusPendingBg: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  statusBadgeText: {
    ...AntigravityTheme.typography.xs,
  },
  statusReceivedText: {
    color: AntigravityTheme.colors.primary,
  },
  statusPendingText: {
    color: AntigravityTheme.colors.warning,
  },
});
