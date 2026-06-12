import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Star, Award, Image as ImageIcon, User } from 'lucide-react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';

interface ProviderProfileData {
  id: string;
  name: string;
  photo: string;
  rating: number;
  servicesCompleted: number;
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
  const { user } = useAuth();

  const { data: rawProfile, loading, error, refetch } = useFetch<any>(
    user ? `/api/ServiceProviders/by-user/${user.id}` : null
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refetch();
      }
    }, [user, refetch])
  );

  const profile: ProviderProfileData | null = rawProfile ? {
    id: rawProfile.id,
    name: rawProfile.name || user?.name || 'Profissional',
    photo: rawProfile.photo || null,
    rating: rawProfile.averageRating ?? 0,
    servicesCompleted: rawProfile.completedServicesCount ?? 0,
    specialties: rawProfile.specialties ?? [],
    description: rawProfile.professionalDescription ?? 'Descrição do profissional indisponível.',
    verified: rawProfile.documentVerified ?? false,
    portfolio: rawProfile.portfolio ?? [],
    reviewStats: rawProfile.reviewStats ?? {
      average: rawProfile.averageRating ?? 0,
      total: rawProfile.completedServicesCount ?? 0,
      positivePercentage: 100
    }
  } : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meu perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
                  {profile?.photo ? (
                    <Image
                      source={{ uri: profile.photo }}
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
                      <Star size={20} color="#FBBF24" fill="#FBBF24" />
                      <Text style={styles.ratingText}>{profile?.rating?.toFixed(1) || 'N/A'}</Text>
                    </View>
                    <Text style={styles.servicesCount}>{profile?.servicesCompleted || 0} serviços</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tagsContainer}>
                {profile?.specialties?.map((spec, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{spec}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.description}>
                {profile?.description || 'Descrição do profissional indisponível.'}
              </Text>

              <Button
                variant="secondary"
                fullWidth
                style={{ marginTop: 16 }}
                onPress={() => router.push('/provider/settings')}
              >
                Editar perfil
              </Button>
            </View>

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

              <View style={styles.portfolioGrid}>
                {profile?.portfolio?.slice(0, 3).map((img, index) => (
                  <View key={index} style={styles.portfolioItem}>
                    <Image source={{ uri: img }} style={styles.portfolioImg} />
                  </View>
                ))}
                {(!profile?.portfolio || profile.portfolio.length === 0) && (
                  <Text style={styles.emptyText}>Nenhuma imagem no portfólio.</Text>
                )}
              </View>

              <Button
                variant="secondary"
                fullWidth
                style={{ marginTop: 16 }}
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
            </View>
          </>
        )}
      </ScrollView>
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: WorkEzTheme.borderRadius.full,
  },
  tagText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
  },
  description: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    lineHeight: 24,
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
    color: WorkEzTheme.colors.primary,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioItem: {
    width: '31%',
    height: 96,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  portfolioImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
});
