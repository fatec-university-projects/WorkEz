import { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Award, ShieldCheck, Image as ImageIcon, User, Clock, Check, Briefcase, X } from 'lucide-react-native';
import { Badge } from '../../../components/Badge';
import { RatingCard } from '../../../components/RatingCard';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest } from '../../../services/api';
import { ScreenHeader } from '../../../components/ScreenHeader';

interface Review {
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  date: string;
  tags: string[];
}

interface ProfessionalData {
  id: string;
  name: string;
  photo: string;
  verified: boolean;
  rating: number;
  servicesCompleted: number;
  experience: string | null;
  specialties: string[];
  description: string;
  portfolio: string[];
  reviewsCount: number;
  reviews: Review[];
}

export default function ProfessionalProfile() {
  const router = useRouter();
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId?: string }>();

  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Tenta buscar direto por providerId (ServiceProvider.Id)
      let res = await apiRequest<any>(`/api/ServiceProviders/${id}`);

      // 2. Se não encontrar (ex: 404), tenta por userId
      if (res.error || !res.data) {
        const fallbackRes = await apiRequest<any>(`/api/ServiceProviders/by-user/${id}`);
        if (fallbackRes.data) {
          res = fallbackRes;
        }
      }

      if (res.data) {
        setRawData(res.data);
        setError(null);
      } else {
        setError(res.error || 'Profissional não encontrado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar perfil do profissional.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const { data: rawReviews } = useFetch<any[]>(
    rawData?.userId ? `/api/Reviews/by-user/${rawData.userId}` : null
  );

  const { data: rawCategories } = useFetch<any[]>(
    rawData?.id ? `/api/ProviderCategories/by-provider/${rawData.id}/categories` : null
  );

  const parseExperienceAndBio = (rawDesc?: string) => {
    if (!rawDesc) return { experience: null, bio: 'Descrição não informada.' };
    const expMatch = rawDesc.match(/\[(?:Experiência|Experiencia):\s*([^\]]+)\]/i);
    let exp = expMatch ? expMatch[1].trim() : null;
    if (exp && !exp.toLowerCase().includes('ano')) {
      const num = parseInt(exp);
      exp = `${exp} ${num === 1 ? 'ano' : 'anos'}`;
    }
    const cleanBio = rawDesc.replace(/\[(?:Experiência|Experiencia):\s*[^\]]+\]/gi, '').trim();
    return {
      experience: exp,
      bio: cleanBio || 'Descrição não informada.'
    };
  };

  const { experience, bio } = parseExperienceAndBio(rawData?.professionalDescription ?? rawData?.description);

  const rawSpecialties = (rawData?.specialties && rawData.specialties.length > 0)
    ? rawData.specialties
    : (rawCategories || []);

  const specialtiesList: string[] = rawSpecialties
    .map((s: any) => typeof s === 'string' ? s : (s.name || s.title))
    .filter(Boolean);

  const professional: ProfessionalData | null = rawData ? {
    id: rawData.id,
    name: rawData.name || 'Profissional',
    photo: rawData.photo || null,
    verified: rawData.documentVerified ?? rawData.verified ?? false,
    rating: rawData.averageRating ?? rawData.rating ?? 0,
    servicesCompleted: rawData.completedServicesCount ?? rawData.servicesCompleted ?? 0,
    experience: experience,
    specialties: specialtiesList,
    description: bio,
    portfolio: rawData.portfolio ?? [],
    reviewsCount: rawReviews ? rawReviews.length : (rawData.reviewsCount ?? 0),
    reviews: (rawReviews || []).map((r: any) => ({
      clientName: r.clientName || 'Cliente',
      clientPhoto: r.clientPhoto || null,
      rating: r.rating || 0,
      comment: r.comment || '',
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : 'Recentemente',
      tags: r.tags || [],
    })),
  } : null;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (error || !professional) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Profissional não encontrado.'}</Text>
        <Button onPress={() => router.back()} style={styles.backButton}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Perfil do profissional" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.photoWrapper}>
              {professional.photo ? (
                <Image
                  source={{ uri: professional.photo }}
                  style={styles.photo}
                />
              ) : (
                <View style={[styles.photo, { backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }]}>
                  <User size={36} color={WorkEzTheme.colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>
                {professional.name}
              </Text>
              {professional.verified ? (
                <Badge variant="verified" size="md" />
              ) : null}
              <View style={styles.statsRow}>
                <View style={styles.ratingRow}>
                  <Star size={18} color={WorkEzTheme.colors.warning} fill={WorkEzTheme.colors.warning} />
                  <Text style={styles.ratingText}>{professional.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.servicesText}>• {professional.servicesCompleted} serviços concluídos</Text>
              </View>

              {professional.experience ? (
                <View style={styles.experiencePill}>
                  <Clock size={13} color="#0F766E" />
                  <Text style={styles.experiencePillText}>
                    {professional.experience} de experiência
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Categorias e Especialidades */}
          <View style={styles.specialtiesSection}>
            <View style={styles.sectionHeaderRow}>
              <Briefcase size={16} color="#475569" />
              <Text style={styles.sectionSubtitle}>Especialidades</Text>
            </View>
            <View style={styles.specialtiesRow}>
              {professional.specialties.length > 0 ? (
                professional.specialties.map((specialty, index) => (
                  <View key={index} style={styles.specialtyBadge}>
                    <Check size={12} color="#2563EB" />
                    <Text style={styles.specialtyText}>
                      {specialty}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[styles.specialtyBadge, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                  <Text style={[styles.specialtyText, { color: '#64748B' }]}>
                    Serviços Gerais
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Biografia / Sobre */}
          <View style={styles.bioSection}>
            <Text style={styles.sectionSubtitle}>Sobre o profissional</Text>
            <Text style={styles.descriptionText}>
              {professional.description}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ImageIcon size={20} color={WorkEzTheme.colors.text} />
            <Text style={styles.cardTitle}>Portfólio</Text>
          </View>
          {professional.portfolio && professional.portfolio.length > 0 ? (
            <View style={styles.portfolioGrid}>
              {professional.portfolio.map((img, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.portfolioImageWrapper}
                  onPress={() => setSelectedImage(img)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.portfolioImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPortfolioText}>Nenhuma foto no portfólio ainda.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeader}>
              <Award size={20} color={WorkEzTheme.colors.text} />
              <Text style={styles.cardTitle}>Avaliações</Text>
            </View>
            <Text style={styles.reviewsCountText}>{professional.reviewsCount} avaliações</Text>
          </View>

          <View style={styles.reviewsList}>
            {professional.reviews.map((review, index) => (
              <RatingCard
                key={index}
                clientName={review.clientName}
                clientPhoto={review.clientPhoto}
                rating={review.rating}
                comment={review.comment}
                date={review.date}
                tags={review.tags}
              />
            ))}
          </View>
        </View>

        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeRow}>
            <ShieldCheck size={20} color="#854D0E" style={styles.guaranteeIcon} />
            <View style={styles.guaranteeTextContent}>
              <Text style={styles.guaranteeTitle}>
                Garantia da plataforma
              </Text>
              <Text style={styles.guaranteeDescription}>
                Este serviço está protegido pela garantia WorkEz. Você pode solicitar mediação em caso de problemas.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal de visualização 100% da imagem */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
            accessibilityLabel="Fechar foto"
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    padding: WorkEzTheme.spacing.lg,
  },
  loadingText: {
    marginTop: WorkEzTheme.spacing.md,
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    ...WorkEzTheme.typography.lg,
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
    marginBottom: WorkEzTheme.spacing.lg,
  },
  backButton: {
    marginTop: WorkEzTheme.spacing.md,
  },
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingVertical: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WorkEzTheme.spacing.sm,
  },
  iconButton: {
    padding: WorkEzTheme.spacing.sm,
    backgroundColor: WorkEzTheme.colors.backgroundAlt,
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  headerTitle: {
    ...WorkEzTheme.typography.xl,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  scrollContent: {
    padding: WorkEzTheme.spacing.lg,
    gap: WorkEzTheme.spacing.lg,
  },
  card: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.lg,
    borderWidth: 1,
    borderColor: WorkEzTheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: WorkEzTheme.spacing.md,
    marginBottom: WorkEzTheme.spacing.md,
  },
  photoWrapper: {
    width: 80,
    height: 80,
    borderRadius: WorkEzTheme.borderRadius.full,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WorkEzTheme.spacing.sm,
    marginTop: WorkEzTheme.spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...WorkEzTheme.typography.lg,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  servicesText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
  },
  experiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  experiencePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  specialtiesSection: {
    marginTop: 8,
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  bioSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: WorkEzTheme.spacing.sm,
    marginBottom: WorkEzTheme.spacing.md,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: WorkEzTheme.spacing.md,
  },
  cardTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioImageWrapper: {
    width: '31%',
    height: 110,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emptyPortfolioText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
    borderRadius: WorkEzTheme.borderRadius.lg,
  },
  reviewsCountText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  reviewsList: {
    gap: WorkEzTheme.spacing.md,
  },
  guaranteeCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: WorkEzTheme.borderRadius.xl,
    padding: WorkEzTheme.spacing.md,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: WorkEzTheme.spacing.sm,
  },
  guaranteeIcon: {
    marginTop: 2,
  },
  guaranteeTextContent: {
    flex: 1,
  },
  guaranteeTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.medium,
    color: '#854D0E',
    marginBottom: 4,
  },
  guaranteeDescription: {
    ...WorkEzTheme.typography.sm,
    color: '#92400E',
  },
  footer: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    padding: WorkEzTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: WorkEzTheme.colors.border,
  },
});
