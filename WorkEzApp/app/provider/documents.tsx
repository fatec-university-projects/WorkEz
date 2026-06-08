import { useRouter } from 'expo-router';
import { ArrowLeft, Upload, FileText, Home, CreditCard, Shield } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity } from 'react-native';

export default function DocumentVerification() {
  const router = useRouter();

  const documents = [
    { icon: FileText, label: 'RG ou CNH', required: true },
    { icon: FileText, label: 'CPF', required: true },
    { icon: Home, label: 'Comprovante de residência', required: true },
    { icon: CreditCard, label: 'Dados bancários', required: true },
    { icon: Shield, label: 'Antecedentes criminais', required: false },
  ];

  return (
    <View className="min-h-screen bg-white">
      <View className="p-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#0F172A]" />
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-[#0F172A] mt-8 mb-2">
          Verificação de documentos
        </Text>
        <Text className="text-[#64748B]">
          Envie seus documentos para validação
        </Text>

        <View className="mt-8 space-y-4">
          {documents.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <View
                key={index}
                className="bg-[#F8FAFC] rounded-xl p-4 border-2 border-dashed border-[#E2E8F0] hover:border-[#2563EB] transition-all cursor-pointer"
              >
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-white rounded-lg flex-row items-center justify-center">
                    <Icon className="w-6 h-6 text-[#64748B]" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-[#0F172A]">{doc.label}</Text>
                    <Text className="text-sm text-[#64748B]">
                      {doc.required ? 'Obrigatório' : 'Opcional'}
                    </Text>
                  </View>
                  <Upload className="w-5 h-5 text-[#2563EB]" />
                </View>
              </View>
            );
          })}
        </View>

        <View className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-6">
          <Text className="text-sm text-[#1d4ed8] leading-relaxed">
            <Text>Por que verificamos?</Text> A verificação de documentos garante a segurança de todos os usuários e aumenta sua credibilidade.
          </Text>
        </View>

        <View className="mt-8">
          <Button fullWidth onPress={() => router.push('/provider/references')}>
            Continuar
          </Button>
        </View>
      </View>
    </View>
  );
}
