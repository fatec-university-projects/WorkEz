import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Star, Award, Image as ImageIcon, User, LogOut, Clock, Check, Briefcase, X } from 'lucide-react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { RatingCard } from '../../components/RatingCard';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProviderProfileData {
  id: string;
  name: string;
  photo: string;
  rating: number;
  servicesCompleted: number;
  experience: string | null;
  specialties: string[];
  description: string;
  verified: boolean;
  portfolio: string[];
  reviewStats: {
    average: number;
    total: number;
    positivePercentage: number;
  };
}

export default function ProviderProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleLogout = () => {
    signOut();
    router.replace('/' as any);
  };

  const { data: rawProfile, loading, error, refetch: refetchProfile } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  const { data: rawReviews, refetch: refetchReviews } = useFetch<any[]>(
    user ? `/api/Reviews/by-user/${user.id}` : null
  );

  const { data: services, refetch: refetchServices } = useFetch<any[]>(
    user ? `/api/Services/by-provider-user/${user.id}` : null
  );

  const { data: rawCategories, refetch: refetchCategories } = useFetch<any[]>(
    rawProfile?.id ? `/api/ProviderCategories/by-provider/${rawProfile.id}/categories` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetchProfile();
        refetchReviews();
        refetchServices();
        if (refetchCategories) refetchCategories();
      }
    }, [user, refetchProfile, refetchReviews, refetchServices, refetchCategories])
  );

  const profile: ProviderProfileData | null = rawProfile ? (() => {
    const totalReviews = rawReviews ? rawReviews.length : (rawProfile.reviewStats?.total ?? 0);
    const averageRating = totalReviews > 0
      ? (rawReviews
          ? Math.round((rawReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalReviews) * 10) / 10
          : (rawProfile.averageRating ?? 0))
      : 0;
    const positiveCount = rawReviews ? rawReviews.filter(r => (r.rating || 0) >= 4).length : 0;
    const positivePercentage = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 0;

    const completedServices = services
      ? services.filter(s => s.status === 'completed' || s.status === 'waiting-payment').length
      : (rawProfile.completedServicesCount ?? 0);

    const parseExperienceAndBio = (rawDesc?: string) => {
      if (!rawDesc) return { experience: null, bio: 'Descrição do profissional indisponível.' };
      const expMatch = rawDesc.match(/\[(?:Experiência|Experiencia):\s*([^\]]+)\]/i);
      let exp = expMatch ? expMatch[1].trim() : null;
      if (exp && !exp.toLowerCase().includes('ano')) {
        const num = parseInt(exp);
        exp = `${exp} ${num === 1 ? 'ano' : 'anos'}`;
      }
      const cleanBio = rawDesc.replace(/\[(?:Experiência|Experiencia):\s*[^\]]+\]/gi, '').trim();
      return {
        experience: exp,
        bio: cleanBio || 'Descrição do profissional indisponível.'
      };
    };

    const { experience, bio } = parseExperienceAndBio(rawProfile.professionalDescription);

    const rawSpecialties = (rawProfile.specialties && rawProfile.specialties.length > 0)
      ? rawProfile.specialties
      : (rawCategories || []);

    const specialtiesList: string[] = rawSpecialties
      .map((s: any) => typeof s === 'string' ? s : (s.name || s.title))
      .filter(Boolean);

    return {
      id: rawProfile.id,
      name: rawProfile.name || user?.name || 'Profissional',
      photo: rawProfile.photo || null,
      rating: averageRating,
      servicesCompleted: completedServices,
      experience: experience,
      specialties: specialtiesList,
      description: bio,
      verified: rawProfile.documentVerified ?? false,
      portfolio: rawProfile.portfolio ?? [],
      reviewStats: {
        average: averageRating,
        total: totalReviews,
        positivePercentage: positivePercentage,
      }
    };
  })() : null;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Meu perfil" />

      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 110 + (insets.bottom > 0 ? insets.bottom : 20) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={WorkEzTheme.colors.primary} />
            <Text style={styles.loadingText}>Carregando perfil...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatarWrapper}>
                  {(profile?.photo || user?.photo || user?.profilePicture) ? (
                    <Image
                      source={{ uri: (profile?.photo || user?.photo || user?.profilePicture)! }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <User size={36} color={WorkEzTheme.colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {profile?.name || user?.name || 'Profissional'}
                  </Text>
                  {profile?.verified && <Badge variant="verified" size="md" />}
                  <View style={styles.statsRow}>
                    <View style={styles.ratingRow}>
                      <Star size={18} color="#FBBF24" fill="#FBBF24" />
                      <Text style={styles.ratingText}>{profile?.rating != null ? profile.rating.toFixed(1) : '0.0'}</Text>
                    </View>
                    <Text style={styles.servicesCount}>• {profile?.servicesCompleted || 0} serviços concluídos</Text>
                  </View>

                  {profile?.experience ? (
                    <View style={styles.experiencePill}>
                      <Clock size={13} color="#0F766E" />
                      <Text style={styles.experiencePillText}>
                        {profile.experience} de experiência
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.specialtiesSection}>
                <View style={styles.sectionHeaderRow}>
                  <Briefcase size={16} color="#475569" />
                  <Text style={styles.sectionSubtitle}>Especialidades</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {profile?.specialties && profile.specialties.length > 0 ? (
                    profile.specialties.map((spec, index) => (
                      <View key={index} style={styles.tag}>
                        <Check size={12} color="#2563EB" />
                        <Text style={styles.tagText}>{spec}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.tag, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                      <Text style={[styles.tagText, { color: '#64748B' }]}>Serviços Gerais</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.bioSection}>
                <Text style={styles.sectionSubtitle}>Sobre você</Text>
                <Text style={styles.description}>
                  {profile?.description || 'Descrição do profissional indisponível.'}
                </Text>
              </View>

              <Button
                variant="secondary"
                fullWidth
                style={{ marginTop: 16 }}
                onPress={() => router.push('/provider/edit-profile')}
              >
                Editar perfil
              </Button>

              <Button
                variant="secondary"
                fullWidth
                style={{ marginTop: 10, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}
                onPress={() => router.push('/provider/work-area' as any)}
              >
                Configurar área de atuação no mapa
              </Button>
            </View>

            {/* ── Portfólio ── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <ImageIcon size={20} color={WorkEzTheme.colors.text} />
                  <Text style={styles.cardTitle}>Portfólio</Text>
                </View>
                <Button
                  variant="ghost"
                  onPress={() => router.push('/provider/portfolio')}
                  style={styles.ghostBtn}
                >
                  <Text style={styles.ghostBtnText}>Ver todos</Text>
                </Button>
              </View>

              {profile?.portfolio && profile.portfolio.length > 0 ? (
                <View style={styles.portfolioGrid}>
                  {profile.portfolio.map((img, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.portfolioImg}
                      onPress={() => setSelectedImage(img)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: img }}
                        style={styles.portfolioImgFill}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Nenhuma foto no portfólio ainda.</Text>
              )}

              <Button
                variant="secondary"
                fullWidth
                style={{ marginTop: 12 }}
                onPress={() => router.push('/provider/portfolio')}
              >
                Adicionar trabalho
              </Button>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Award size={20} color={WorkEzTheme.colors.text} />
                  <Text style={styles.cardTitle}>Avaliações</Text>
                </View>
                <Button
                  variant="ghost"
                  onPress={() => router.push('/provider/ratings')}
                  style={styles.ghostBtn}
                >
                  <Text style={styles.ghostBtnText}>Ver todas</Text>
                </Button>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{profile?.reviewStats?.average?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.statLabel}>Nota média</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{profile?.reviewStats?.total || 0}</Text>
                  <Text style={styles.statLabel}>Avaliações</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statValue}>{profile?.reviewStats?.positivePercentage || 0}%</Text>
                  <Text style={styles.statLabel}>Positivas</Text>
                </View>
              </View>

              {rawReviews && rawReviews.length > 0 && (
                <View style={styles.reviewsList}>
                  {rawReviews.slice(0, 3).map((review: any, idx: number) => {
                    let formattedDate = 'Recentemente';
                    if (review.createdAt) {
                      try {
                        const d = new Date(review.createdAt);
                        if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('pt-BR');
                      } catch {}
                    }
                    return (
                      <RatingCard
                        key={review.id || idx}
                        clientName={review.clientName || 'Cliente'}
                        clientPhoto={review.clientPhoto}
                        rating={review.rating || 5}
                        comment={review.comment || ''}
                        date={formattedDate}
                        tags={review.tags}
                      />
                    );
                  })}
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.8}
              style={styles.logoutButton}
            >
              <View style={styles.logoutIconBadge}>
                <LogOut size={20} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Modal de visualização 100% da foto */}
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
  header: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    paddingHorizontal: WorkEzTheme.spacing.lg,
    paddingVertical: WorkEzTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: WorkEzTheme.colors.border,
  },
  headerTitle: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  content: {
    padding: WorkEzTheme.spacing.lg,
    gap: WorkEzTheme.spacing.lg,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: WorkEzTheme.colors.textSecondary,
  },
  errorText: {
    color: WorkEzTheme.colors.danger,
    textAlign: 'center',
  },
  card: {
    backgroundColor: WorkEzTheme.colors.backgroundCard,
    borderRadius: WorkEzTheme.borderRadius['2xl'],
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
    gap: 16,
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
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
  servicesCount: {
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  bioSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...WorkEzTheme.typography.base,
    fontWeight: WorkEzTheme.typography.fontWeight.semibold,
    color: WorkEzTheme.colors.text,
  },
  ghostBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  ghostBtnText: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  portfolioItem: {
    width: '31%',
    height: 96,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  portfolioImg: {
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
  portfolioImgFill: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
  reviewsList: {
    marginTop: 16,
    gap: 12,
  },
  emptyText: {
    color: WorkEzTheme.colors.textSecondary,
    ...WorkEzTheme.typography.sm,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statValue: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
    color: WorkEzTheme.colors.text,
  },
  statLabel: {
    ...WorkEzTheme.typography.sm,
    color: WorkEzTheme.colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#EF4444',
  },
});
