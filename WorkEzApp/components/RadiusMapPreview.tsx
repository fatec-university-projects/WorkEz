import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Compass } from 'lucide-react-native';

interface RadiusMapPreviewProps {
  radiusKm: number;
  latitude?: number | null;
  longitude?: number | null;
}

export function RadiusMapPreview({ radiusKm, latitude, longitude }: RadiusMapPreviewProps) {
  // Escala visual calculada dinamicamente: 5km -> menor círculo, 30km -> preenche o radar
  const maxKm = 30;
  const ratio = Math.min(Math.max(radiusKm / maxKm, 0.25), 1.0);
  const outerSize = 220;
  const circleSize = Math.round(outerSize * 0.85 * ratio);

  return (
    <View style={styles.container}>
      <View style={styles.radarCard}>
        {/* Fundo do Mapa Estilizado / Grid Cartográfico */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridLineHorizontal} />
          <View style={styles.gridLineVertical} />
        </View>

        {/* Anéis de Referência */}
        <View style={[styles.referenceRing, { width: outerSize * 0.9, height: outerSize * 0.9 }]} />
        <View style={[styles.referenceRing, { width: outerSize * 0.6, height: outerSize * 0.6 }]} />
        <View style={[styles.referenceRing, { width: outerSize * 0.3, height: outerSize * 0.3 }]} />

        {/* Círculo do Raio de Cobertura Ativo */}
        <View
          style={[
            styles.coverageCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
        >
          <View style={styles.pulseInner} />
        </View>

        {/* Marcador Central (Base do Prestador) */}
        <View style={styles.centerMarkerContainer}>
          <View style={styles.centerPulse}>
            <View style={styles.markerBadge}>
              <MapPin size={16} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.markerText}>Você está aqui</Text>
        </View>

        {/* Bússola e Indicador no Topo */}
        <View style={styles.compassContainer}>
          <Compass size={14} color="#64748B" />
          <Text style={styles.compassText}>NORTE</Text>
        </View>

        {/* Badge Flutuante de Raio */}
        <View style={styles.radiusBadge}>
          <Text style={styles.radiusBadgeText}>Raio: {radiusKm} km</Text>
          <Text style={styles.coverageText}>Área: ~{Math.round(Math.PI * radiusKm * radiusKm)} km²</Text>
        </View>
      </View>

      {latitude && longitude ? (
        <Text style={styles.coordsText}>
          Coordenadas base: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      ) : (
        <Text style={styles.coordsText}>
          Usando localização padrão de São Paulo, SP
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  radarCard: {
    width: '100%',
    height: 240,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    backgroundColor: '#CBD5E1',
    opacity: 0.7,
    position: 'absolute',
  },
  referenceRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  coverageCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    borderWidth: 2,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: '60%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  centerMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compassContainer: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compassText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  radiusBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  radiusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  coverageText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  coordsText: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
