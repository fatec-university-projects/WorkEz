import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { apiRequest } from '../../../services/api';

export default function InformValue() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirmValue = async () => {
    if (!id) return;
    const priceNum = parseFloat(value.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Valor inválido', 'Por favor, insira um valor válido maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<any>(`/api/Services/${id}/complete?price=${priceNum}`, {
        method: 'PATCH'
      });
      if (res.error) {
        Alert.alert('Erro', res.error);
      } else {
        router.push(`/provider/waiting-payment/${id}` as any);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível se conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informar Valor</Text>
        </View>
      </View>

      <View className="p-6">
        <View className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
          <Text className="text-[#64748B] mb-4">
            Insira o valor final acordado com o cliente para a realização do serviço.
          </Text>
          <Input
            label="Valor do serviço (R$)"
            keyboardType="numeric"
            placeholder="150.00"
            value={value}
            onChangeText={setValue}
          />
          <Button
            fullWidth
            className="mt-6"
            onPress={handleConfirmValue}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : 'Confirmar valor'}
          </Button>
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
  },
});
