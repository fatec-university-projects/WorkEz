import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Navigation, Home, Clock } from 'lucide-react-native';

interface LiveTrackingMapProps {
  providerName: string;
  status: string;
  clientAddress?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
}

export function LiveTrackingMap({
  providerName,
  status,
  clientAddress,
  distanceKm = 3.2,
  estimatedMinutes = 12,
}: LiveTrackingMapProps) {
  // Simulação suave de avanço do prestador no trajeto (movimento incremental na barra de rota)
  const [progress, setProgress] = useState(0.35);

  useEffect(() => {
    const isMoving = status === 'on-the-way' || status === 'ontheway';
    if (!isMoving) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.85) return 0.25; // reinicia o ciclo
        return prev + 0.05;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  const isOnTheWay = status === 'on-the-way' || status === 'ontheway';
  const isInProgress = status === 'in-progress' || status === 'inprogress';

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        {/* Fundo do Mapa: Malha viária estilizada */}
        <View style={styles.mapGridBackground}>
          <View style={styles.streetHorizontal1} />
          <View style={styles.streetHorizontal2} />
          <View style={styles.streetVertical1} />
          <View style={styles.streetDiagonal1} />
        </View>

        {/* Linha de Trajeto (Polyline) */}
        <View style={styles.routeContainer}>
          <View style={styles.routeBaseLine} />
          <View style={[styles.routeActiveLine, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {/* Marcador do Destino (Casa do Cliente) */}
        <View style={styles.clientMarker}>
          <View style={styles.clientMarkerBadge}>
            <Home size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.clientMarkerLabel}>Seu endereço</Text>
        </View>

        {/* Marcador em Movimento do Prestador */}
        <View
          style={[
            styles.providerMarker,
            {
              left: `${Math.round(progress * 70) + 12}%`,
            },
          ]}
        >
          <View style={styles.providerPulse}>
            <View style={styles.providerMarkerBadge}>
              <Navigation size={14} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
          </View>
          <Text style={styles.providerMarkerLabel} numberOfLines={1}>
            {providerName}
          </Text>
        </View>

        {/* Status Flutuante Superior */}
        <View style={styles.topStatusBadge}>
          <View style={[styles.liveDot, { backgroundColor: isOnTheWay ? '#22C55E' : '#3B82F6' }]} />
          <Text style={styles.topStatusText}>
            {isOnTheWay
              ? 'PRESTADOR EM DESLOCAMENTO'
              : isInProgress
              ? 'ATENDIMENTO EM ANDAMENTO'
              : 'LOCALIZAÇÃO EM TEMPO REAL'}
          </Text>
        </View>

        {/* Card Flutuante com Estimativa de Chegada */}
        <View style={styles.etaCard}>
          <View style={styles.etaHeader}>
            <Clock size={14} color="#2563EB" />
            <Text style={styles.etaTitle}>Chegada prevista em ~{estimatedMinutes} min</Text>
          </View>
          <Text style={styles.etaSubtitle}>
            Aproximadamente {distanceKm.toFixed(1)} km de distância
          </Text>
          {clientAddress ? (
            <View style={styles.addressRow}>
              <MapPin size={12} color="#64748B" />
              <Text style={styles.addressText} numberOfLines={1}>
                {clientAddress}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  mapCanvas: {
    width: '100%',
    height: 230,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  mapGridBackground: {
    ...StyleSheet.absoluteFill,
  },
  streetHorizontal1: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  streetHorizontal2: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  streetVertical1: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#FFFFFF',
    opacity: 0.7,
  },
  streetDiagonal1: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 220,
    height: 8,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '25deg' }],
    opacity: 0.7,
  },
  routeContainer: {
    position: 'absolute',
    top: 110,
    left: 40,
    right: 40,
    height: 6,
    justifyContent: 'center',
  },
  routeBaseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    opacity: 0.5,
  },
  routeActiveLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  clientMarker: {
    position: 'absolute',
    right: 30,
    top: 86,
    alignItems: 'center',
    zIndex: 10,
  },
  clientMarkerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  clientMarkerLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerMarker: {
    position: 'absolute',
    top: 76,
    alignItems: 'center',
    zIndex: 15,
  },
  providerPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerMarkerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  providerMarkerLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topStatusBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  etaCard: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  etaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  etaSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
});
