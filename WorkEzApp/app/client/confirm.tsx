import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, FileText, Image as ImageIcon, Wrench } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WorkEzTheme } from '../../constants/theme';

export default function ConfirmCall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const {
    category,
    categoryId,
    description,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
    images
  } = useLocalSearchParams<{
    category: string;
    categoryId: string;
    description: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    images: string;
  }>();

  const parsedImages: string[] = images ? JSON.parse(images) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Confirmar chamado
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>
            Resumo do serviço
          </Text>

          <View style={styles.rowsWrapper}>
            {/* Categoria */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#EFF6FF' }]}>
                <Wrench size={20} color="#3B82F6" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.rowLabel}>Categoria</Text>
                <Text style={styles.rowValue}>{category || 'Encanador'}</Text>
              </View>
            </View>

            {/* Descrição */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
                <FileText size={20} color="#64748B" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.rowLabel}>Descrição</Text>
                <Text style={styles.rowValue}>
                  {description || 'Sem descrição fornecida.'}
                </Text>
              </View>
            </View>

            {/* Endereço */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
                <MapPin size={20} color="#64748B" />
              </View>
              <View style={styles.textWrapper}>
                <Text style={styles.rowLabel}>Endereço</Text>
                <Text style={styles.rowValue}>
                  {street ? `${street}, nº ${number}${complement ? ` - ${complement}` : ''}\n${neighborhood} - ${city}/${state} (CEP: ${cep})` : 'Sem endereço fornecido.'}
                </Text>
              </View>
            </View>

            {/* Imagens */}
            {parsedImages.length > 0 && (
              <View style={styles.rowItem}>
                <View style={[styles.iconWrapper, { backgroundColor: '#F1F5F9' }]}>
                  <ImageIcon size={20} color="#64748B" />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.rowLabel}>Fotos anexadas</Text>
                  <View style={styles.imagesGrid}>
                    {parsedImages.map((imgUrl, idx) => (
                      <View key={idx} style={styles.imageThumbContainer}>
                        <Image source={{ uri: imgUrl }} style={styles.imageThumb} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoTextBold}>Como funciona:</Text> Ao confirmar, buscaremos profissionais disponíveis próximos a você. O pagamento só será liberado após a conclusão do serviço.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={styles.actionsWrapper}>
          <Button
            fullWidth
            onPress={() => router.push({
              pathname: '/client/searching',
              params: {
                category,
                categoryId,
                description,
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                images
              }
            } as any)}
          >
            Confirmar chamado
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.back()}
          >
            Editar informações
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
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 200,
    gap: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: '#0F172A',
    marginBottom: 20,
  },
  rowsWrapper: {
    gap: 20,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  rowLabel: {
    ...WorkEzTheme.typography.xs,
    color: '#64748B',
    marginBottom: 2,
  },
  rowValue: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#0F172A',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageThumbContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionsWrapper: {
    gap: 12,
  },
});
