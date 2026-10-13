import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, DollarSign, User, Wrench, AlertCircle } from 'lucide-react-native';
import { 
  View, 
  Text, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView 
} from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { ScreenHeader } from '../../../components/ScreenHeader';

export default function InformValue() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Busca dados do serviço para pré-preencher o valor acordado
  const { data: service, loading } = useFetch<any>(
    id ? `/api/Services/${id}` : null
  );

  useEffect(() => {
    if (service && service.price && !value) {
      setValue(Number(service.price).toFixed(2));
    }
  }, [service]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/provider/in-progress/${id}` as any);
    }
  };

  const handleConfirmValue = async () => {
    if (!id) return;
    const cleanVal = value.replace(/\s/g, '').replace(',', '.');
    const priceNum = parseFloat(cleanVal);
    
    if (isNaN(priceNum) || priceNum <= 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Por favor, insira um valor válido maior que zero.');
      } else {
        Alert.alert('Valor inválido', 'Por favor, insira um valor válido maior que zero.');
      }
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/complete?price=${priceNum}`, {
        method: 'POST'
      });

      if (res.error) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Erro ao concluir: ${res.error}`);
        } else {
          Alert.alert('Erro', res.error);
        }
      } else {
        router.push(`/provider/waiting-payment/${id}` as any);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Não foi possível se conectar ao servidor.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Erro: ${msg}`);
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <ScreenHeader
        title="Informar Valor Final"
        subtitle="Conclusão do atendimento"
        showBack
        onBack={handleBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card do Chamado */}
        {service && (
          <View style={styles.serviceCard}>
            <View style={styles.serviceHeaderRow}>
              <View style={styles.iconCircle}>
                <Wrench size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceCategory}>{service.category || 'Serviço Prestado'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <User size={13} color="#64748B" />
                  <Text style={styles.serviceClient}>{service.clientName || 'Cliente'}</Text>
                </View>
              </View>
            </View>

            {service.price ? (
              <View style={styles.priceEstimateRow}>
                <Text style={styles.priceEstimateLabel}>Valor acordado na proposta:</Text>
                <Text style={styles.priceEstimateValue}>
                  R$ {Number(service.price).toFixed(2).replace('.', ',')}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Card do Input de Valor */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Valor Final do Serviço</Text>
          <Text style={styles.cardSubtitle}>
            Confirme ou ajuste o valor a ser cobrado do cliente para liberar o pagamento.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor="#94A3B8"
              value={value}
              onChangeText={setValue}
            />
          </View>

          <View style={styles.hintBox}>
            <AlertCircle size={16} color="#64748B" style={{ marginTop: 2 }} />
            <Text style={styles.hintText}>
              Este valor será cobrado diretamente do cliente na tela de pagamento.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btnConfirm, saving && styles.btnDisabled]}
            onPress={handleConfirmValue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <CheckCircle2 size={20} color="#FFFFFF" />
                <Text style={styles.btnConfirmText}>Confirmar Valor e Finalizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  serviceCard: {
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
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  serviceCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceClient: {
    fontSize: 13,
    color: '#64748B',
  },
  priceEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceEstimateLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  priceEstimateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 14,
  },
  hintBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  btnConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.65,
  },
});
