import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, DollarSign, Clock, FileText, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { WorkEzTheme } from '../../../constants/theme';
import { apiRequest } from '../../../services/api';

export default function InformValue() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [proposedPrice, setProposedPrice] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Financial calculations (15% platform fee)
  const numericPrice = parseFloat(proposedPrice.replace(',', '.')) || 0;
  const platformFee = Math.round(numericPrice * 0.15 * 100) / 100;
  const netEarnings = Math.max(0, numericPrice - platformFee);

  const handleSubmitProposal = async () => {
    if (!id) return;
    if (numericPrice <= 0) {
      Alert.alert('Valor inválido', 'Por favor, informe um valor de orçamento maior que R$ 0,00.');
      return;
    }

    setSubmitting(true);
    try {
      // POST call to WorkEz Clean Architecture API (/api/Proposals/propose)
      const res = await apiRequest<any>('/api/Proposals/propose', {
        method: 'POST',
        body: JSON.stringify({
          providerUserId: '00000000-0000-0000-0000-000000000000', // Mock/Session Provider ID
          serviceId: id,
          proposedPrice: numericPrice,
          description: description || 'Orçamento para realização do serviço.',
          estimatedTime: estimatedTime || '1 a 2 horas'
        })
      });

      if (res.error) {
        Alert.alert('Não foi possível enviar proposta', res.error);
      } else {
        Alert.alert(
          'Proposta Enviada! 🚀',
          'Sua proposta de orçamento foi enviada ao cliente com sucesso. O cliente receberá uma notificação para analisar e aceitar.',
          [{ text: 'OK', onPress: () => router.push('/provider/calls' as any) }]
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro de Conexão', 'Não foi possível se conectar ao servidor da plataforma WorkEz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Propor Orçamento</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HERO TITLE & INTRO */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Informe o Valor do Serviço</Text>
          <Text style={styles.heroSubtitle}>
            Defina o preço proposto e o tempo estimado para a realização. O cliente poderá aceitar ou negociar.
          </Text>
        </View>

        {/* INPUT FORM CARD */}
        <View style={styles.card}>
          <Input
            label="Valor Total Proposto (R$)"
            keyboardType="numeric"
            placeholder="ex: 180.00"
            value={proposedPrice}
            onChangeText={setProposedPrice}
          />

          <View style={styles.spacer} />

          <Input
            label="Tempo Estimado de Execução"
            placeholder="ex: 2 horas"
            value={estimatedTime}
            onChangeText={setEstimatedTime}
          />

          <View style={styles.spacer} />

          <Input
            label="Detalhes da Proposta (Opcional)"
            placeholder="Descreva o que está incluso no valor..."
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* FINANCIAL SUMMARY CARD (15% FEE BREAKDOWN) */}
        {numericPrice > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <ShieldCheck size={20} color="#2563EB" />
              <Text style={styles.summaryTitle}>Resumo Financeiro da Proposta</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Valor Proposto Bruto:</Text>
              <Text style={styles.summaryValue}>R$ {numericPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxa WorkEz (15%):</Text>
              <Text style={styles.feeValue}>- R$ {platformFee.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.netLabel}>Seu Ganho Líquido Estimado:</Text>
              <Text style={styles.netValue}>R$ {netEarnings.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* SUBMIT BUTTON */}
        <Button
          fullWidth
          onPress={handleSubmitProposal}
          disabled={submitting}
          style={styles.submitBtn}
        >
          {submitting ? <ActivityIndicator color="#FFF" /> : 'Enviar Orçamento para o Cliente'}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  spacer: {
    height: 14,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#93C5FD',
    marginVertical: 10,
  },
  netLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  netValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
  },
});
