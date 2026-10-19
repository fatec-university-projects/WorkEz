import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Image, 
  Linking, 
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { MapPin, Navigation, ExternalLink, Copy, Check, Compass, Car } from 'lucide-react-native';
import { WorkEzTheme } from '../constants/theme';

let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (err) {
    console.warn('Native WebView indisponível em ServiceLocationMap:', err);
  }
}

interface ServiceLocationMapProps {
  address?: string | null;
  addressApproximate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  clientName?: string | null;
  title?: string;
  height?: number;
}

export function ServiceLocationMap({
  address,
  addressApproximate,
  latitude,
  longitude,
  clientName,
  title = 'Local de Atendimento',
  height = 240,
}: ServiceLocationMapProps) {
  const displayAddress = address || addressApproximate || 'Endereço não informado';

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude) && (latitude !== 0 || longitude !== 0)) {
      return { lat: latitude, lng: longitude };
    }
    return null;
  });

  const [geocoding, setGeocoding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Geocodificação automática caso latitude/longitude venham nulas mas exista endereço
  useEffect(() => {
    if (coords) return;
    if (!address || address.trim().length < 5) {
      // Coordenadas padrão (São Paulo) se não houver endereço
      setCoords({ lat: -23.55052, lng: -46.633308 });
      return;
    }

    let isCancelled = false;
    const geocodeAddress = async () => {
      setGeocoding(true);
      try {
        const query = encodeURIComponent(address.trim());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=br`, {
          headers: {
            'User-Agent': 'WorkEzApp/1.0',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data) && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (!isNaN(lat) && !isNaN(lng)) {
              setCoords({ lat, lng });
              setGeocoding(false);
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Falha no geocoding do endereço:', e);
      }
      if (!isCancelled) {
        // Fallback para centro de SP
        setCoords({ lat: -23.55052, lng: -46.633308 });
        setGeocoding(false);
      }
    };

    geocodeAddress();
    return () => {
      isCancelled = true;
    };
  }, [address]);

  const lat = coords?.lat ?? -23.55052;
  const lng = coords?.lng ?? -46.633308;

  // Geração de HTML do Leaflet para renderização web e mobile (WebView)
  const leafletHtml = useMemo(() => {
    const cleanAddress = (displayAddress || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const cleanName = (clientName || 'Cliente').replace(/'/g, "\\'");

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
      width: 28px !important;
      height: 28px !important;
      line-height: 28px !important;
      border: none !important;
      border-bottom: 1px solid #E2E8F0 !important;
    }
    .leaflet-control-attribution { 
      font-size: 8px !important; 
      background: rgba(255,255,255,0.7) !important; 
    }
    .custom-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .pin-circle {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      animation: bounce 1.8s infinite;
    }
    .pin-pulse {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: rgba(37, 99, 235, 0.25);
      animation: pulse 2s infinite ease-out;
      z-index: -1;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
      padding: 4px 6px !important;
    }
    .popup-title {
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .popup-addr {
      font-size: 11px;
      color: #475569;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 19
    }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var markerIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="pin-pulse"></div><div class="pin-circle"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    var marker = L.marker([${lat}, ${lng}], { icon: markerIcon }).addTo(map);
    marker.bindPopup('<div class="popup-title">${cleanName}</div><div class="popup-addr">${cleanAddress}</div>').openPopup();

    // Redimensionamento inteligente
    setTimeout(function() {
      map.invalidateSize();
    }, 200);
  </script>
</body>
</html>`;
  }, [lat, lng, displayAddress, clientName]);

  // Ações de Abrir no Maps
  const handleOpenGoogleMaps = () => {
    let url = '';
    const query = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(displayAddress);
    url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch((err) => {
      console.warn('Erro ao abrir Google Maps:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Google Maps.');
    });
  };

  const handleOpenRoute = () => {
    let url = '';
    const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(displayAddress);
    url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

    Linking.openURL(url).catch((err) => {
      console.warn('Erro ao abrir rota no Google Maps:', err);
      Alert.alert('Erro', 'Não foi possível iniciar a rota no Google Maps.');
    });
  };

  const handleOpenWaze = () => {
    const query = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(displayAddress);
    const url = `https://waze.com/ul?q=${query}&navigate=yes`;
    Linking.openURL(url).catch((err) => {
      console.warn('Erro ao abrir Waze:', err);
      Alert.alert('Erro', 'Não foi possível abrir o Waze.');
    });
  };

  const handleOpenAppleMaps = () => {
    const query = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(displayAddress);
    const url = `maps://?daddr=${query}`;
    Linking.openURL(url).catch((err) => {
      console.warn('Erro ao abrir Apple Maps:', err);
      handleOpenGoogleMaps();
    });
  };

  const handleCopyAddress = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('Copiado', 'Endereço copiado para a área de transferência.');
    }
  };

  return (
    <View style={styles.card}>
      {/* Header do Card */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <MapPin size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>Visualização em tempo real do destino</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.openMapsHeaderBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <ExternalLink size={14} color="#2563EB" />
          <Text style={styles.openMapsHeaderBtnText}>Opções de GPS</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa Visual */}
      <View style={[styles.mapContainer, { height }]}>
        {geocoding && !coords ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.mapLoadingText}>Localizando endereço no mapa...</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          <View style={styles.fullSize}>
            {React.createElement('iframe', {
              srcDoc: leafletHtml,
              src: `data:text/html;charset=utf-8,${encodeURIComponent(leafletHtml)}`,
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 14,
              },
              title: 'Mapa do Local de Atendimento',
            })}
          </View>
        ) : NativeWebView ? (
          <NativeWebView
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={styles.fullSize}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            bounces={false}
          />
        ) : (
          /* Fallback visual com imagem OSM estática */
          <View style={styles.fallbackContainer}>
            <Image
              source={{
                uri: `https://tile.openstreetmap.org/16/${Math.floor(((lng + 180) / 360) * Math.pow(2, 16))}/${Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, 16))}.png`,
              }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <View style={styles.fallbackPin}>
              <MapPin size={28} color="#2563EB" />
            </View>
          </View>
        )}

        {/* Badge flutuante no canto superior do mapa */}
        <View style={styles.floatingBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.floatingBadgeText}>Destino</Text>
        </View>
      </View>

      {/* Caixa de Texto do Endereço */}
      <View style={styles.addressBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.addressLabel}>Endereço do Chamado</Text>
          <Text style={styles.addressValue} numberOfLines={2}>
            {displayAddress}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.copyBtn, copied && styles.copyBtnSuccess]} 
          onPress={handleCopyAddress}
          activeOpacity={0.7}
        >
          {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} color="#64748B" />}
        </TouchableOpacity>
      </View>

      {/* Botões de Ação para Navegação */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.primaryMapsBtn}
          onPress={handleOpenGoogleMaps}
          activeOpacity={0.8}
        >
          <Compass size={18} color="#FFFFFF" />
          <Text style={styles.primaryMapsBtnText}>Ver no Google Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryRouteBtn}
          onPress={handleOpenRoute}
          activeOpacity={0.8}
        >
          <Navigation size={18} color="#2563EB" />
          <Text style={styles.secondaryRouteBtnText}>Traçar Rota</Text>
        </TouchableOpacity>
      </View>

      {/* Modal / ActionSheet com mais opções de mapas */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Abrir no Aplicativo de Mapas</Text>
            <Text style={styles.modalSubtitle}>Escolha seu aplicativo de GPS favorito para navegar até o cliente:</Text>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleOpenGoogleMaps();
              }}
            >
              <View style={[styles.modalOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Compass size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Google Maps (Localização)</Text>
                <Text style={styles.modalOptionDesc}>Visualizar local e arredores no Google Maps</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleOpenRoute();
              }}
            >
              <View style={[styles.modalOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Navigation size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Google Maps (Iniciar Rota)</Text>
                <Text style={styles.modalOptionDesc}>Iniciar navegação GPS passo a passo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setModalVisible(false);
                handleOpenWaze();
              }}
            >
              <View style={[styles.modalOptionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Car size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Waze</Text>
                <Text style={styles.modalOptionDesc}>Navegar com alertas de trânsito em tempo real</Text>
              </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setModalVisible(false);
                  handleOpenAppleMaps();
                }}
              >
                <View style={[styles.modalOptionIconWrap, { backgroundColor: '#F8FAFC' }]}>
                  <MapPin size={20} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionTitle}>Apple Maps</Text>
                  <Text style={styles.modalOptionDesc}>Abrir no Mapas do iOS</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  openMapsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  openMapsHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  mapContainer: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  floatingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 10,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  addressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryMapsBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryMapsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryRouteBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryRouteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCancelBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
