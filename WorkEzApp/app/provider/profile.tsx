import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Star, Award, Image as ImageIcon, User, LogOut, Clock, Check, Briefcase, X, Sun, Moon, Smartphone } from 'lucide-react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { RatingCard } from '../../components/RatingCard';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useFetch } from '../../hooks/useFetch';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../../utils/date';

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
  const { mode, isDark, colors, setMode } = useAppTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const themeOptions: { key: ThemeMode; label: string; icon: any }[] = [
    { key: 'light', label: 'Claro', icon: Sun },
    { key: 'dark', label: 'Escuro', icon: Moon },
    { key: 'system', label: 'Sistema', icon: Smartphone },
  ];

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
    <View style={[styles.container, { backgroundColor: colors.backgroundAlt }]}>
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando perfil...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.profileRow}>
                <View style={styles.avatarWrapper}>
                  {(profile?.photo || user?.photo || user?.profilePicture) ? (
                    <Image
                      source={{ uri: (profile?.photo || user?.photo || user?.profilePicture)! }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
                      <User size={36} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.text }]}>
                    {profile?.name || user?.name || 'Profissional'}
                  </Text>
                  {profile?.verified && <Badge variant="verified" size="md" />}
                  <View style={styles.statsRow}>
                    <View style={styles.ratingRow}>
                      <Star size={18} color="#FBBF24" fill="#FBBF24" />
                      <Text style={[styles.ratingText, { color: colors.text }]}>
                        {profile?.rating != null ? profile.rating.toFixed(1) : '0.0'}
                      </Text>
                    </View>
                    <Text style={[styles.servicesCount, { color: colors.textSecondary }]}>
                      • {profile?.servicesCompleted || 0} serviços concluídos
                    </Text>
                  </View>

                  {profile?.experience ? (
                    <View style={[styles.experiencePill, isDark && { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: 'rgba(45, 212, 191, 0.35)' }]}>
                      <Clock size={13} color={isDark ? '#2DD4BF' : '#0F766E'} />
                      <Text style={[styles.experiencePillText, isDark && { color: '#2DD4BF' }]}>
                        {profile.experience} de experiência
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={[styles.specialtiesSection, { borderTopColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Briefcase size={16} color={colors.textSecondary} />
                  <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Especialidades</Text>
                </View>
                <View style={styles.tagsContainer}>
                  {profile?.specialties && profile.specialties.length > 0 ? (
                    profile.specialties.map((spec, index) => (
                      <View
                        key={index}
                        style={[
                          styles.tag,
                          isDark && { backgroundColor: 'rgba(37, 99, 235, 0.16)', borderColor: 'rgba(96, 165, 250, 0.35)' },
                        ]}
                      >
                        <Check size={12} color={isDark ? '#60A5FA' : '#2563EB'} />
                        <Text style={[styles.tagText, isDark && { color: '#93C5FD' }]}>{spec}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.tag, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>Serviços Gerais</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.bioSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Sobre você</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
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
                style={{
                  marginTop: 10,
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.14)' : '#F0FDF4',
                  borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : '#BBF7D0',
                }}
                onPress={() => router.push('/provider/work-area' as any)}
              >
                Configurar área de atuação no mapa
              </Button>
            </View>

            {/* ── Seletor de Tema (Claro / Escuro / Sistema) ── */}
            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Aparência do aplicativo</Text>
              <Text style={[styles.themeSubtitle, { color: colors.textSecondary }]}>
                Escolha entre o modo claro, escuro ou automático do celular
              </Text>
              <View style={[styles.themeSegmentedRow, { backgroundColor: colors.backgroundAlt }]}>
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = mode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      activeOpacity={0.8}
                      onPress={() => setMode(opt.key)}
                      style={[
                        styles.themeOptionBtn,
                        active && {
                          backgroundColor: isDark ? '#2563EB' : '#FFFFFF',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        },
                      ]}
                    >
                      <Icon
                        size={16}
                        color={active ? (isDark ? '#FFFFFF' : '#2563EB') : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.themeOptionText,
                          {
                            color: active ? (isDark ? '#FFFFFF' : '#0F172A') : colors.textSecondary,
                            fontWeight: active ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Portfólio ── */}
            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <ImageIcon size={20} color={colors.text} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Portfólio</Text>
                </View>
                <Button
                  variant="ghost"
                  onPress={() => router.push('/provider/portfolio')}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>Ver todos</Text>
                </Button>
              </View>

              {profile?.portfolio && profile.portfolio.length > 0 ? (
                <View style={styles.portfolioGrid}>
                  {profile.portfolio.map((img, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.portfolioImg, { backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
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
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma foto no portfólio ainda.</Text>
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

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleRow}>
                  <Award size={20} color={colors.text} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Avaliações</Text>
                </View>
                <Button
                  variant="ghost"
                  onPress={() => router.push('/provider/ratings')}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>Ver todas</Text>
                </Button>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {profile?.reviewStats?.average?.toFixed(1) || '0.0'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nota média</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{profile?.reviewStats?.total || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avaliações</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{profile?.reviewStats?.positivePercentage || 0}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Positivas</Text>
                </View>
              </View>

              {rawReviews && rawReviews.length > 0 && (
                <View style={styles.reviewsList}>
                  {rawReviews.slice(0, 3).map((review: any, idx: number) => {
                    const formattedDate = review.createdAt ? formatDate(review.createdAt) : 'Recentemente';
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
              style={[styles.logoutButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            >
              <View style={styles.logoutIconBadge}>
                <LogOut size={20} color={colors.danger} />
              </View>
              <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da conta</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

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
  },
  errorText: {
    textAlign: 'center',
  },
  card: {
    borderRadius: WorkEzTheme.borderRadius['2xl'],
    padding: WorkEzTheme.spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  themeSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  themeSegmentedRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  themeOptionText: {
    fontSize: 13,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...WorkEzTheme.typography['2xl'],
    fontWeight: WorkEzTheme.typography.fontWeight.bold,
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
  },
  servicesCount: {
    ...WorkEzTheme.typography.base,
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
  },
  description: {
    fontSize: 14,
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
  },
  ghostBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  ghostBtnText: {
    ...WorkEzTheme.typography.sm,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  portfolioImg: {
    width: '31%',
    height: 110,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
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
  },
  statLabel: {
    ...WorkEzTheme.typography.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
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
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
