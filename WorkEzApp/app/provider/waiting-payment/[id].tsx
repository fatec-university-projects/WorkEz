import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { paymentService } from '../../../services/paymentService';
import { WorkEzTheme } from '../../../constants/theme';

const POLL_INTERVAL_MS = 6000;

export default function WaitingPayment() {
  const router = useRouter();

  return (
    <View className="min-h-screen bg-[#F8FAFC] flex-row items-center justify-center p-6">
      <View className="text-center">
        <View className="w-20 h-20 bg-[#FBBF24]/10 rounded-full flex-row items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-[#FBBF24]" />
        </View>
        <Text className="text-2xl font-bold mb-2">Aguardando pagamento</Text>
        <Text className="text-[#64748B] mb-6">O cliente está finalizando o pagamento</Text>
        <Button onPress={() => router.push('/provider')}>Voltar ao início</Button>
      </View>

      <Text style={styles.pollingNote}>Verificando a cada 6 segundos...</Text>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => router.push('/provider')}
      >
        <Text style={styles.btnTextSecondary}>Voltar ao início</Text>
      </TouchableOpacity>
    </View>
  );
}
