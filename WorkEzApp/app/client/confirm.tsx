import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, FileText, Image as ImageIcon, Wrench } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppTheme } from '../../contexts/ThemeContext';
import { resolveImageUrl } from '../../services/api';

export default function ConfirmCall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  
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
    latitude,
    longitude,
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
    latitude?: string;
    longitude?: string;
    images: string;
  }>();

  const parsedImages: string[] = (() => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    try {
      const p = JSON.parse(images);
      return Array.isArray(p) ? p : [p];
    } catch {
      return [images];
    }
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScreenHeader title="Confirmar chamado" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Resumo do serviço
          </Text>

          <View style={styles.rowsWrapper}>
            {/* Categoria */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF' }]}>
                <Wrench size={20} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </View>
              <View style={styles.textWrapper}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Categoria</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>{category || 'Encanador'}</Text>
              </View>
            </View>

            {/* Descrição */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundAlt }]}>
                <FileText size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.textWrapper}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Descrição</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {description || 'Sem descrição fornecida.'}
                </Text>
              </View>
            </View>

            {/* Endereço */}
            <View style={styles.rowItem}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundAlt }]}>
                <MapPin size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.textWrapper}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Endereço</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {street ? `${street}, nº ${number}${complement ? ` - ${complement}` : ''}\n${neighborhood} - ${city}/${state} (CEP: ${cep})` : 'Sem endereço fornecido.'}
                </Text>
              </View>
            </View>

            {/* Imagens */}
            {parsedImages.length > 0 && (
              <View style={styles.rowItem}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.backgroundAlt }]}>
                  <ImageIcon size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Fotos anexadas</Text>
                  <View style={styles.imagesGrid}>
                    {parsedImages.map((imgUrl, idx) => (
                      <View key={idx} style={[styles.imageThumbContainer, { backgroundColor: colors.backgroundAlt }]}>
                        <Image source={{ uri: resolveImageUrl(imgUrl) || imgUrl }} style={styles.imageThumb} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.16)' : '#EFF6FF',
              borderColor: isDark ? 'rgba(96, 165, 250, 0.35)' : '#BFDBFE',
            },
          ]}
        >
          <Text style={[styles.infoText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            💡 <Text style={{ fontWeight: 'bold' }}>Como funciona:</Text> Ao confirmar, buscaremos profissionais disponíveis próximos a você. O pagamento só será liberado após a conclusão do serviço.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.backgroundCard, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <View style={styles.actionsWrapper}>
          <Button
            fullWidth
            onPress={() => router.replace({
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
                latitude,
                longitude,
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
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 200,
    gap: 24,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
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
  },
  imageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
  },
  actionsWrapper: {
    gap: 12,
  },
});
