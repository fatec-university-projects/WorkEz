import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Award, ShieldCheck, Image as ImageIcon, User, Clock, Check, Briefcase, X } from 'lucide-react-native';
import { Badge } from '../../../components/Badge';
import { RatingCard } from '../../../components/RatingCard';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { useFetch } from '../../../hooks/useFetch';
import { apiRequest, resolveImageUrl } from '../../../services/api';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { formatDate } from '../../../utils/date';

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
  const { colors, isDark } = useAppTheme();
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
      date: r.createdAt ? formatDate(r.createdAt) : 'Recentemente',
      tags: r.tags || [],
    })),
  } : null;

  const dynamicStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: WorkEzTheme.spacing.lg,
      },
      loadingText: {
        marginTop: WorkEzTheme.spacing.md,
        ...WorkEzTheme.typography.base,
        color: colors.textSecondary,
      },
      errorText: {
        ...WorkEzTheme.typography.lg,
        color: colors.danger,
        textAlign: 'center',
        marginBottom: WorkEzTheme.spacing.lg,
      },
      backButton: {
        marginTop: WorkEzTheme.spacing.md,
      },
      scrollContent: {
        padding: WorkEzTheme.spacing.lg,
        gap: WorkEzTheme.spacing.lg,
      },
      card: {
        backgroundColor: colors.card,
        borderRadius: WorkEzTheme.borderRadius.xl,
        padding: WorkEzTheme.spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.05,
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
      photoPlaceholder: {
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      },
      profileInfo: {
        flex: 1,
      },
      nameText: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: WorkEzTheme.typography.fontWeight.bold,
        color: colors.text,
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
        color: colors.text,
      },
      servicesText: {
        ...WorkEzTheme.typography.base,
        color: colors.textSecondary,
      },
      experiencePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : '#F0FDFA',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(20, 184, 166, 0.3)' : '#99F6E4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
      },
      experiencePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: isDark ? '#5EEAD4' : '#0F766E',
      },
      specialtiesSection: {
        marginTop: 8,
        marginBottom: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
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
        color: colors.text,
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
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
      },
      specialtyText: {
        fontSize: 13,
        fontWeight: '600',
        color: isDark ? '#93C5FD' : '#1D4ED8',
      },
      bioSection: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
      descriptionText: {
        fontSize: 14,
        color: colors.textSecondary,
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
        color: colors.text,
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
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
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
        color: colors.textSecondary,
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
        color: colors.textSecondary,
      },
      reviewsList: {
        gap: WorkEzTheme.spacing.md,
      },
      guaranteeCard: {
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE047',
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
        color: isDark ? '#FCD34D' : '#854D0E',
        marginBottom: 4,
      },
      guaranteeDescription: {
        ...WorkEzTheme.typography.sm,
        color: isDark ? '#FDE68A' : '#92400E',
      },
    });
  }, [colors, isDark]);

  if (loading) {
    return (
      <View style={dynamicStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={dynamicStyles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (error || !professional) {
    return (
      <View style={dynamicStyles.centerContainer}>
        <Text style={dynamicStyles.errorText}>{error || 'Profissional não encontrado.'}</Text>
        <Button onPress={() => router.back()} style={dynamicStyles.backButton}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <ScreenHeader title="Perfil do profissional" showBack />

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.profileRow}>
            <View style={dynamicStyles.photoWrapper}>
              {professional.photo ? (
                <Image
                  source={{ uri: resolveImageUrl(professional.photo) || professional.photo }}
                  style={dynamicStyles.photo}
                />
              ) : (
                <View style={[dynamicStyles.photo, dynamicStyles.photoPlaceholder]}>
                  <User size={36} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <View style={dynamicStyles.profileInfo}>
              <Text style={dynamicStyles.nameText}>
                {professional.name}
              </Text>
              {professional.verified ? (
                <Badge variant="verified" size="md" />
              ) : null}
              <View style={dynamicStyles.statsRow}>
                <View style={dynamicStyles.ratingRow}>
                  <Star size={18} color={colors.warning} fill={colors.warning} />
                  <Text style={dynamicStyles.ratingText}>{professional.rating.toFixed(1)}</Text>
                </View>
                <Text style={dynamicStyles.servicesText}>• {professional.servicesCompleted} serviços concluídos</Text>
              </View>

              {professional.experience ? (
                <View style={dynamicStyles.experiencePill}>
                  <Clock size={13} color={isDark ? '#5EEAD4' : '#0F766E'} />
                  <Text style={dynamicStyles.experiencePillText}>
                    {professional.experience} de experiência
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Categorias e Especialidades */}
          <View style={dynamicStyles.specialtiesSection}>
            <View style={dynamicStyles.sectionHeaderRow}>
              <Briefcase size={16} color={colors.textSecondary} />
              <Text style={dynamicStyles.sectionSubtitle}>Especialidades</Text>
            </View>
            <View style={dynamicStyles.specialtiesRow}>
              {professional.specialties.length > 0 ? (
                professional.specialties.map((specialty, index) => (
                  <View key={index} style={dynamicStyles.specialtyBadge}>
                    <Check size={12} color={colors.primary} />
                    <Text style={dynamicStyles.specialtyText}>
                      {specialty}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={[dynamicStyles.specialtyBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[dynamicStyles.specialtyText, { color: colors.textSecondary }]}>
                    Serviços Gerais
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Biografia / Sobre */}
          <View style={dynamicStyles.bioSection}>
            <Text style={dynamicStyles.sectionSubtitle}>Sobre o profissional</Text>
            <Text style={dynamicStyles.descriptionText}>
              {professional.description}
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeader}>
            <ImageIcon size={20} color={colors.text} />
            <Text style={dynamicStyles.cardTitle}>Portfólio</Text>
          </View>
          {professional.portfolio && professional.portfolio.length > 0 ? (
            <View style={dynamicStyles.portfolioGrid}>
              {professional.portfolio.map((img, index) => (
                <TouchableOpacity
                  key={index}
                  style={dynamicStyles.portfolioImageWrapper}
                  onPress={() => setSelectedImage(img)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: img }}
                    style={dynamicStyles.portfolioImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={dynamicStyles.emptyPortfolioText}>Nenhuma foto no portfólio ainda.</Text>
          )}
        </View>

        <View style={dynamicStyles.card}>
          <View style={dynamicStyles.cardHeaderBetween}>
            <View style={dynamicStyles.cardHeader}>
              <Award size={20} color={colors.text} />
              <Text style={dynamicStyles.cardTitle}>Avaliações</Text>
            </View>
            <Text style={dynamicStyles.reviewsCountText}>{professional.reviewsCount} avaliações</Text>
          </View>

          <View style={dynamicStyles.reviewsList}>
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

        <View style={dynamicStyles.guaranteeCard}>
          <View style={dynamicStyles.guaranteeRow}>
            <ShieldCheck size={20} color={isDark ? '#FCD34D' : '#854D0E'} style={dynamicStyles.guaranteeIcon} />
            <View style={dynamicStyles.guaranteeTextContent}>
              <Text style={dynamicStyles.guaranteeTitle}>
                Garantia da plataforma
              </Text>
              <Text style={dynamicStyles.guaranteeDescription}>
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
        <View style={dynamicStyles.modalOverlay}>
          <TouchableOpacity
            style={dynamicStyles.modalClose}
            onPress={() => setSelectedImage(null)}
            accessibilityLabel="Fechar foto"
          >
            <X size={24} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={dynamicStyles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </View>
  );
}
