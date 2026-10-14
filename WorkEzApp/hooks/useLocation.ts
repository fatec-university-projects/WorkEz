import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressDetails {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export const DEFAULT_COORDINATES: Coordinates = {
  latitude: -23.55052,
  longitude: -46.633308, // Praça da Sé / SP
};

export async function reverseGeocodeCoords(latitude: number, longitude: number): Promise<AddressDetails> {
  try {
    // 1. Tenta expo-location no dispositivo nativo
    if (Platform.OS !== 'web') {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results && results.length > 0) {
          const item = results[0];
          const street = item.street || item.name || '';
          const number = item.streetNumber || '';
          const neighborhood = item.district || item.subregion || '';
          const city = item.city || item.subregion || 'São Paulo';
          const state = item.region || 'SP';
          const postalCode = item.postalCode || '';

          const parts = [
            street ? `${street}${number ? `, ${number}` : ''}` : '',
            neighborhood,
            `${city} - ${state}`,
          ].filter(Boolean);

          return {
            street: street || undefined,
            number: number || undefined,
            neighborhood: neighborhood || undefined,
            city: city || undefined,
            state: state || undefined,
            postalCode: postalCode || undefined,
            formattedAddress: parts.join(' • '),
          };
        }
      } catch (expoErr) {
        console.warn('[useLocation] Erro no reverseGeocode do Expo, usando fallback:', expoErr);
      }
    }

    // 2. Fallback universal via OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WorkEzApp/1.0 (contact@workez.com)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const street = addr.road || addr.street || addr.pedestrian || addr.avenue || addr.highway || '';
      const number = addr.house_number || '';
      const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.residential || '';
      const city = addr.city || addr.town || addr.municipality || addr.village || 'São Paulo';
      const state = addr.state_code || (addr.state === 'São Paulo' ? 'SP' : addr.state) || 'SP';
      const postalCode = addr.postcode || '';

      const parts = [
        street ? `${street}${number ? `, ${number}` : ''}` : '',
        neighborhood,
        `${city} - ${state}`,
      ].filter(Boolean);

      return {
        street: street || undefined,
        number: number || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        formattedAddress: parts.join(' • ') || data.display_name,
      };
    }
  } catch (err: any) {
    console.warn('[useLocation] Falha no reverse geocode:', err?.message);
  }

  return {
    city: 'São Paulo',
    state: 'SP',
    formattedAddress: 'São Paulo - SP',
  };
}

export async function geocodeAddress(addr: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}): Promise<Coordinates | null> {
  const streetPart = addr.street ? `${addr.street}${addr.number ? ` ${addr.number}` : ''}` : '';
  const cityState = [addr.city, addr.state].filter(Boolean).join(' - ');

  // 1. Tenta expo-location no dispositivo nativo
  if (Platform.OS !== 'web') {
    try {
      const query = [streetPart, addr.neighborhood, cityState, 'Brasil'].filter(Boolean).join(', ');
      const results = await Location.geocodeAsync(query);
      if (results && results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
    } catch (e) {
      console.warn('[useLocation] geocodeAsync nativo falhou, tentando fallback:', e);
    }
  }

  // 2. Busca no OpenStreetMap Nominatim
  const queries = [
    [streetPart, addr.city, addr.state, 'Brasil'].filter(Boolean).join(', '),
    [addr.street, addr.city, addr.state, 'Brasil'].filter(Boolean).join(', '),
    [addr.city, addr.state, 'Brasil'].filter(Boolean).join(', '),
    addr.postalCode ? `${addr.postalCode}, Brasil` : '',
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WorkEzApp/1.0 (contact@workez.com)',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
        }
      }
    } catch (err: any) {
      console.warn('[useLocation] Falha ao geocodificar:', q, err?.message);
    }
  }

  return null;
}

export function useLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState<AddressDetails | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAndGetLocation = useCallback(async (): Promise<{ coords: Coordinates; address: AddressDetails } | null> => {
    setLoading(true);
    setError(null);

    let resolvedCoords: Coordinates = DEFAULT_COORDINATES;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        resolvedCoords = await new Promise<Coordinates>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setHasPermission(true);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            },
            (err) => {
              console.warn('[useLocation Web] Fallback para coordenadas padrão:', err.message);
              setHasPermission(false);
              resolve(DEFAULT_COORDINATES);
            },
            { timeout: 8000 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasPermission(false);
          setError('Permissão de localização não concedida');
          resolvedCoords = DEFAULT_COORDINATES;
        } else {
          setHasPermission(true);
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          resolvedCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        }
      }

      setCoordinates(resolvedCoords);

      // Busca dados de endereço completos (Rua, Bairro, Cidade, Estado)
      const addrDetails = await reverseGeocodeCoords(resolvedCoords.latitude, resolvedCoords.longitude);
      setAddress(addrDetails);

      return { coords: resolvedCoords, address: addrDetails };
    } catch (err: any) {
      console.warn('[useLocation] Erro ao obter localização, usando fallback padrão:', err?.message);
      setError(err?.message || 'Erro ao obter localização');
      setCoordinates(DEFAULT_COORDINATES);
      const addrDetails = await reverseGeocodeCoords(DEFAULT_COORDINATES.latitude, DEFAULT_COORDINATES.longitude);
      setAddress(addrDetails);
      return { coords: DEFAULT_COORDINATES, address: addrDetails };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestAndGetLocation();
  }, [requestAndGetLocation]);

  return {
    coordinates,
    address,
    hasPermission,
    loading,
    error,
    refreshLocation: requestAndGetLocation,
  };
}
