import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Award, ShieldCheck, Image as ImageIcon } from 'lucide-react-native';
import { Badge } from '../../../components/Badge';
import { RatingCard } from '../../../components/RatingCard';
import { Button } from '../../../components/Button';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { WorkEzTheme } from '../../../constants/theme';
import { useFetch } from '../../../hooks/useFetch';

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
  specialties: string[];
  description: string;
  portfolio: string[];
  reviewsCount: number;
  reviews: Review[];
}

export default function ProfessionalProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const { data: professional, loading, error, refetch } = useFetch<ProfessionalData>(id ? `/api/ServiceProviders/${id}` : null);

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
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color={WorkEzTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Perfil do profissional
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.photoWrapper}>
              <Image
                source={{ uri: professional.photo }}
                style={styles.photo}
              />
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
                  <Star size={20} color={WorkEzTheme.colors.warning} fill={WorkEzTheme.colors.warning} />
                  <Text style={styles.ratingText}>{professional.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.servicesText}>{professional.servicesCompleted} serviços</Text>
              </View>
            </View>
          </View>

          <View style={styles.specialtiesRow}>
            {professional.specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>
                  {specialty}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.descriptionText}>
            {professional.description}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ImageIcon size={20} color={WorkEzTheme.colors.text} />
            <Text style={styles.cardTitle}>Portfólio</Text>
          </View>
          <View style={styles.portfolioGrid}>
            {professional.portfolio.map((img, index) => (
              <View key={index} style={styles.portfolioImageWrapper}>
                <Image
                  source={{ uri: img }}
                  style={styles.portfolioImage}
                />
              </View>
            ))}
          </View>
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

      <View style={styles.footer}>
        <Button fullWidth onPress={() => router.push(`/client/tracking/${professional.id}`)}>Acompanhar serviço</Button>
      </View>
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
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: WorkEzTheme.spacing.sm,
    marginBottom: WorkEzTheme.spacing.md,
  },
  specialtyBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: WorkEzTheme.spacing.md,
    paddingVertical: 6,
    borderRadius: WorkEzTheme.borderRadius.full,
  },
  specialtyText: {
    ...WorkEzTheme.typography.sm,
    color: '#1D4ED8',
  },
  descriptionText: {
    ...WorkEzTheme.typography.base,
    color: WorkEzTheme.colors.textSecondary,
    lineHeight: 24,
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
    height: 96,
    borderRadius: WorkEzTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
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
