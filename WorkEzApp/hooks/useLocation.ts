import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const DEFAULT_COORDINATES: Coordinates = {
  latitude: -23.55052,
  longitude: -46.633308, // Praça da Sé / SP
};

export function useLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAndGetLocation = useCallback(async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(null);

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        return new Promise<Coordinates | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords: Coordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              setCoordinates(coords);
              setHasPermission(true);
              setLoading(false);
              resolve(coords);
            },
            (err) => {
              console.warn('[useLocation Web] Fallback para coordenadas padrão:', err.message);
              setHasPermission(false);
              setCoordinates(DEFAULT_COORDINATES);
              setLoading(false);
              resolve(DEFAULT_COORDINATES);
            },
            { timeout: 8000 }
          );
        });
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHasPermission(false);
        setError('Permissão de localização não concedida');
        setCoordinates(DEFAULT_COORDINATES);
        setLoading(false);
        return DEFAULT_COORDINATES;
      }

      setHasPermission(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: Coordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setCoordinates(coords);
      return coords;
    } catch (err: any) {
      console.warn('[useLocation] Erro ao obter localização, usando fallback padrão:', err?.message);
      setError(err?.message || 'Erro ao obter localização');
      setCoordinates(DEFAULT_COORDINATES);
      return DEFAULT_COORDINATES;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestAndGetLocation();
  }, [requestAndGetLocation]);

  return {
    coordinates,
    hasPermission,
    loading,
    error,
    refreshLocation: requestAndGetLocation,
  };
}
