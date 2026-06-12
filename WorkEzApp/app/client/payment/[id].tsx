import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Clipboard,
  Image,
} from 'react-native';
import { ArrowLeft, CheckCircle, Clock, Copy, QrCode, RefreshCw, XCircle } from 'lucide-react-native';
import { paymentService, CreatePaymentResponse } from '../../../services/paymentService';
import { WorkEzTheme } from '../../../constants/theme';

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

export default function Payment() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState('pix');

  return (
    <View className="min-h-screen bg-[#F8FAFC]">
      <View className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-[#0F172A]">
            Pagamento
          </Text>
        </View>
      </View>

      <View className="p-6 space-y-6">
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Resumo do serviço
          </Text>

          <View className="space-y-3 pb-4 border-b border-[#E2E8F0]">
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Profissional</Text>
              <Text className="font-medium text-[#0F172A]">Carlos Silva</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Serviço</Text>
              <Text className="font-medium text-[#0F172A]">Encanador</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#64748B]">Duração</Text>
              <Text className="font-medium text-[#0F172A]">1h 15min</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-4">
            <Text className="text-lg font-semibold text-[#0F172A]">Total</Text>
            <Text className="text-2xl font-bold text-[#2563EB]">R$ 150,00</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
          <Text className="font-semibold text-[#0F172A] mb-4">
            Forma de pagamento
          </Text>

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() => setPaymentMethod('pix')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'pix' ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0]'}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-[#00C89F]/10 rounded-lg flex-row items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#10B981]" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-[#0F172A]">PIX</Text>
                  <Text className="text-sm text-[#64748B]">Pagamento instantâneo</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'card' ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-[#E2E8F0]'}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-[#2563EB]/10 rounded-lg flex-row items-center justify-center">
                  <CreditCard className="w-6 h-6 text-[#2563EB]" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-[#0F172A]">Cartão de crédito</Text>
                  <Text className="text-sm text-[#64748B]">Visa, Master, Elo</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

          <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
            <View className="flex-row items-start gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
              <View>
                <Text className="font-medium text-[#1d4ed8] mb-1">
                  Pagamento seguro
                </Text>
                <Text className="text-sm text-[#1e40af]">
                  Seu pagamento é protegido pelo WorkEz. O profissional só recebe após a conclusão do serviço.
                </Text>
              </View>
              {copied && (
                <Text style={styles.copiedText}>✓ Copiado para a área de transferência!</Text>
              )}
            </View>
        )}

            {/* Payment link fallback */}
            {payment?.paymentUrl && !payment.pixCode && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Alert.alert('Link de pagamento', payment.paymentUrl ?? '')}
              >
                <Text style={styles.linkBtnText}>Abrir página de pagamento</Text>
              </TouchableOpacity>
            )}

            {/* Status indicator */}
            <View style={styles.statusCard}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                Aguardando confirmação do pagamento...
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Como pagar</Text>
              {[
                '1. Abra o aplicativo do seu banco',
                '2. Selecione a opção PIX',
                '3. Escaneie o QR Code ou use o código copia e cola',
                '4. Confirme o pagamento de R$ ' + payment?.amount?.toFixed(2).replace('.', ','),
                '5. Aguarde a confirmação automática',
              ].map((step, i) => (
                <Text key={i} style={styles.instructionStep}>{step}</Text>
              ))}
            </View>
          </View>

          <View className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t border-[#E2E8F0]">
            <Button
              fullWidth
              onPress={() => router.push('/client/completed/1')}
            >
              Pagar R$ 150,00 com segurança
            </Button>
          </View>
        </View>
        );
}
