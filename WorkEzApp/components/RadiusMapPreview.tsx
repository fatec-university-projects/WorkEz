import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { MapPin } from 'lucide-react-native';

let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (err) {
    console.warn('Native WebView indisponível, usando fallback de imagem:', err);
  }
}

interface RadiusMapPreviewProps {
  radiusKm: number;
  latitude?: number | null;
  longitude?: number | null;
  addressText?: string | null;
}

export function RadiusMapPreview({
  radiusKm,
  latitude = -23.55052,
  longitude = -46.633308,
  addressText,
}: RadiusMapPreviewProps) {
  const lat = latitude || -23.55052;
  const lon = longitude || -46.633308;

  // Cálculo de tiles para mobile via OpenStreetMap Humanitarian (HOT) com fallback OSM Standard
  // 100% público, gratuito e NUNCA exige API Key (eliminando o erro do CartoDB no iOS)
  const zoom = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : 10;
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const primaryTileUrl = `https://a.tile.openstreetmap.fr/hot/${zoom}/${tileX}/${tileY}.png`;
  const fallbackTileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  const [tileError, setTileError] = useState(false);
  const tileUrl = tileError ? fallbackTileUrl : primaryTileUrl;

  // Cálculo proporcional do círculo do raio para o fallback mobile nativo
  const mapHeight = 260;
  const circleRatio = Math.min(Math.max((radiusKm / 30) * 0.5 + 0.35, 0.3), 0.88);
  const circleSize = Math.round(mapHeight * circleRatio);

  // Geração do HTML interativo com Leaflet para a Web:
  // - O círculo é geograficamente ANCORADO nas coordenadas reais (L.circle).
  // - Ao arrastar o mapa para o lado, o círculo se move JUNTO com as ruas!
  // - Zoom in / Zoom out é 100% desabilitado (minZoom == maxZoom, sem controles, sem scroll zoom, sem pinch).
  // - O mapa permite arrastar livremente (pan / drag) para ver os arredores.
  const leafletHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #E2E8F0; overflow: hidden; }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
      border-radius: 8px !important;
      overflow: hidden;
      margin: 10px !important;
    }
    .leaflet-control-zoom a {
      background-color: #FFFFFF !important;
      color: #1E293B !important;
      font-weight: 700 !important;
      width: 30px !important;
      height: 30px !important;
      line-height: 30px !important;
      border: none !important;
      border-bottom: 1px solid #E2E8F0 !important;
      font-size: 15px !important;
    }
    .leaflet-control-zoom a:hover {
      background-color: #F8FAFC !important;
      color: #2563EB !important;
    }
    .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.7) !important; padding: 2px 5px !important; }
    .radius-tooltip {
      background: #2563EB !important;
      color: #FFFFFF !important;
      font-weight: 800 !important;
      font-size: 11px !important;
      border: none !important;
      border-radius: 12px !important;
      padding: 3px 8px !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25) !important;
    }
    .radius-tooltip::before {
      border-top-color: #2563EB !important;
    }
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .marker-dot {
      width: 20px;
      height: 20px;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(37,99,235,0.5);
    }
    .marker-label {
      background: rgba(15, 23, 42, 0.9);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 3px;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const lat = ${lat};
    const lon = ${lon};
    const isUnlimited = ${radiusKm <= 0};
    const radiusM = ${radiusKm > 0 ? radiusKm * 1000 : 0};
    const initialZoom = isUnlimited ? 9 : ${radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : 10};

    // Mapa com zoom livre (botões +, -, rodinha do mouse e toque)
    const map = L.map('map', {
      center: [lat, lon],
      zoom: initialZoom,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      dragging: true
    });

    // Camada de ruas OpenStreetMap (100% gratuita, sem API key)
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    if (isUnlimited) {
      // Marcador da base com destaque de atendimento sem restrição
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-dot" style="background:#10B981;"></div><div class="marker-label" style="background:#065F46;">Você está aqui (Sem limite)</div>',
        iconSize: [150, 42],
        iconAnchor: [75, 10]
      });
      L.marker([lat, lon], { icon: customIcon }).addTo(map);

      setTimeout(function() {
        map.invalidateSize();
        map.setView([lat, lon], 9);
      }, 120);
    } else {
      // Círculo com raio real em metros ancorado nas coordenadas GPS da base:
      const circle = L.circle([lat, lon], {
        radius: radiusM,
        color: '#2563EB',
        weight: 2.5,
        fillColor: '#3B82F6',
        fillOpacity: 0.22
      }).addTo(map);

      circle.bindTooltip('${radiusKm} km de raio', {
        permanent: true,
        direction: 'top',
        className: 'radius-tooltip',
        offset: [0, -10]
      });

      // Marcador estilizado da base
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-dot"></div><div class="marker-label">Você está aqui</div>',
        iconSize: [80, 42],
        iconAnchor: [40, 10]
      });
      L.marker([lat, lon], { icon: customIcon }).addTo(map);

      // Ajusta o enquadramento inicial perfeito para o raio selecionado
      setTimeout(function() {
        map.invalidateSize();
        map.fitBounds(circle.getBounds(), { padding: [25, 25] });
      }, 120);
    }
  </script>
</body>
</html>`;
  }, [lat, lon, radiusKm]);

  return (
    <View style={styles.container}>
      {/* Área do Mapa: 100% interativa com arrasto, zoom e círculo geográfico */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webMapWrapper}>
            {React.createElement('iframe', {
              srcDoc: leafletHtml,
              src: `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`,
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 18,
              },
              title: 'Mapa de Ruas e Raio de Atendimento',
            })}

            {/* Badge Flutuante no Topo do Mapa */}
            <View style={styles.floatingPinBadge}>
              <View style={styles.pinDot} />
              <Text style={styles.floatingPinText}>Você está aqui</Text>
            </View>

            {/* Badge Flutuante Inferior com o Raio e Área */}
            <View style={styles.radiusBadge}>
              <Text style={styles.radiusBadgeText}>
                {radiusKm <= 0 ? 'Raio: Sem limite' : `Raio: ${radiusKm} km`}
              </Text>
              <Text style={styles.coverageText}>
                {radiusKm <= 0
                  ? 'Área: Todo o Brasil (Sem restrição)'
                  : `Área: ~${Math.round(Math.PI * radiusKm * radiusKm)} km²`}
              </Text>
            </View>
          </View>
        ) : NativeWebView ? (
          /* No iPhone/Android: Leaflet interativo nativo 100% idêntico à Web via WKWebView */
          <View style={styles.webMapWrapper}>
            <NativeWebView
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              style={styles.webView}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              bounces={false}
            />

            {/* Badge Flutuante no Topo do Mapa */}
            <View style={styles.floatingPinBadge}>
              <View style={styles.pinDot} />
              <Text style={styles.floatingPinText}>Você está aqui</Text>
            </View>

            {/* Badge Flutuante Inferior com o Raio e Área */}
            <View style={styles.radiusBadge}>
              <Text style={styles.radiusBadgeText}>
                {radiusKm <= 0 ? 'Raio: Sem limite' : `Raio: ${radiusKm} km`}
              </Text>
              <Text style={styles.coverageText}>
                {radiusKm <= 0
                  ? 'Área: Todo o Brasil (Sem restrição)'
                  : `Área: ~${Math.round(Math.PI * radiusKm * radiusKm)} km²`}
              </Text>
            </View>
          </View>
        ) : (
          /* Fallback Mobile Estático caso WebView não esteja disponível */
          <View style={styles.nativeMapWrapper}>
            <Image
              source={{ uri: tileUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => {
                console.warn('Falha no tile OSM HOT, alternando para OSM Standard...');
                setTileError(true);
              }}
            />

            {/* Marcador Central no iPhone */}
            <View style={styles.centerMarkerContainer}>
              <View style={styles.centerPulse}>
                <View style={styles.markerBadge}>
                  <MapPin size={16} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.markerText}>Você está aqui</Text>
            </View>

            {/* Círculo do Raio em KM no Mobile */}
            {radiusKm > 0 && (
              <View
                pointerEvents="none"
                style={[
                  styles.coverageCircleOverlay,
                  {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                    transform: [
                      { translateX: -circleSize / 2 },
                      { translateY: -circleSize / 2 },
                    ],
                  },
                ]}
              >
                <View style={styles.circleInnerFill} />
                
                {/* Badge indicadora do raio anexada ao anel */}
                <View style={styles.circleKmTag}>
                  <Text style={styles.circleKmTagText}>{radiusKm} km de raio</Text>
                </View>
              </View>
            )}

            {/* Badge Flutuante no Topo do Mapa */}
            <View style={styles.floatingPinBadge}>
              <View style={styles.pinDot} />
              <Text style={styles.floatingPinText}>Você está aqui</Text>
            </View>

            {/* Badge Flutuante Inferior com o Raio e Área */}
            <View style={styles.radiusBadge}>
              <Text style={styles.radiusBadgeText}>
                {radiusKm <= 0 ? 'Raio: Sem limite' : `Raio: ${radiusKm} km`}
              </Text>
              <Text style={styles.coverageText}>
                {radiusKm <= 0
                  ? 'Área: Todo o Brasil (Sem restrição)'
                  : `Área: ~${Math.round(Math.PI * radiusKm * radiusKm)} km²`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Legenda de Rodapé com endereço / coordenadas */}
      <View style={styles.footerRow}>
        <MapPin size={13} color="#64748B" />
        <Text style={styles.coordsText} numberOfLines={1}>
          {addressText || `Coordenadas base: ${lat.toFixed(4)}, ${lon.toFixed(4)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  mapContainer: {
    width: '100%',
    height: 270,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  webMapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    overflow: 'hidden',
  },
  nativeMapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Círculo de Cobertura para renderização nativa */
  coverageCircleOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: 2.5,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  circleInnerFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  circleKmTag: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  circleKmTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  floatingPinBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 20,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  floatingPinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  centerMarkerContainer: {
    alignItems: 'center',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  markerText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  radiusBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 20,
  },
  radiusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  coverageText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  coordsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
});
