import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Phone, User } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface Reference {
  name: string;
  phone: string;
}

export default function References() {
  const router = useRouter();
  const { user } = useAuth();
  const [references, setReferences] = useState<Reference[]>([{ name: '', phone: '' }]);

  const { data: existingRefs, loading, error } = useFetch<Reference[]>(
    user ? `/api/Providers/${user.id}/references` : null
  );

  useEffect(() => {
    if (existingRefs && existingRefs.length > 0) {
      setReferences(existingRefs);
    }
  }, [existingRefs]);

  const addReference = () => {
    setReferences([...references, { name: '', phone: '' }]);
  };

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    const newRefs = [...references];
    newRefs[index][field] = value;
    setReferences(newRefs);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>
          Referências profissionais
        </Text>
        <Text style={styles.subtitle}>
          Adicione contatos que possam comprovar sua experiência
        </Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando referências...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.formArea}>
            {references.map((ref, index) => (
              <View key={index} style={styles.refCard}>
                <Text style={styles.refLabel}>
                  Referência {index + 1}
                </Text>
                <View style={styles.inputsWrapper}>
                  <View style={styles.inputContainer}>
                    <User size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
                    <Input
                      placeholder="Nome completo"
                      value={ref.name}
                      onChangeText={(text) => updateReference(index, 'name', text)}
                      style={{ paddingLeft: 48 }}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Phone size={20} color={WorkEzTheme.colors.textSecondary} style={styles.inputIcon} />
                    <Input
                      keyboardType="phone-pad"
                      placeholder="Telefone"
                      value={ref.phone}
                      onChangeText={(text) => updateReference(index, 'phone', text)}
                      style={{ paddingLeft: 48 }}
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={addReference}
              style={styles.addBtn}
              activeOpacity={0.8}
            >
              <Plus size={20} color={WorkEzTheme.colors.primary} />
              <Text style={styles.addBtnText}>Adicionar outra referência</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            💡 Recomendamos adicionar pelo menos 2 referências de clientes ou empregadores anteriores.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button fullWidth onPress={() => router.push('/provider/interview')}>
            Continuar
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
    flexGrow: 1,
  },
  backButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
    alignSelf: 'flex-start',
  },
  title: {
    ...WorkEzTheme.typography['3xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginTop: 32,
    marginBottom: 8,
  },
  subtitle: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
  },
  formArea: {
    marginTop: 32,
    gap: 24,
  },
  refCard: {
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
  },
  refLabel: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: WorkEzTheme.colors.text,
    marginBottom: 12,
  },
  inputsWrapper: {
    gap: 12,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  addBtn: {
    width: '100%',
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: WorkEzTheme.colors.border,
    borderRadius: WorkEzTheme.borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.primary,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
    marginTop: 24,
  },
  infoText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
    marginBottom: 24,
  },
});
