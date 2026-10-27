namespace WorkEz.Domain.Common;

/// <summary>
/// Utilitários para cálculos geográficos e estimativas de trajeto (Haversine Formula).
/// </summary>
public static class GeoLocationUtils
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>
    /// Calcula a distância em quilômetros entre dois pontos geográficos usando a fórmula de Haversine.
    /// </summary>
    /// <param name="lat1">Latitude do ponto de origem</param>
    /// <param name="lon1">Longitude do ponto de origem</param>
    /// <param name="lat2">Latitude do ponto de destino</param>
    /// <param name="lon2">Longitude do ponto de destino</param>
    /// <returns>Distância em quilômetros (arredondada a 1 casa decimal)</returns>
    public static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var distance = EarthRadiusKm * c;

        return Math.Round(distance, 1);
    }

    /// <summary>
    /// Estima a duração de viagem em minutos baseada na distância em km (considera trânsito urbano médio ~28 km/h).
    /// </summary>
    /// <param name="distanceKm">Distância em quilômetros</param>
    /// <param name="averageSpeedKmH">Velocidade média em km/h (padrão: 28 km/h para centros urbanos)</param>
    /// <returns>Tempo em minutos estimado</returns>
    public static int EstimateTravelMinutes(double distanceKm, double averageSpeedKmH = 28.0)
    {
        if (distanceKm <= 0.05) return 1;

        var hours = distanceKm / Math.Max(averageSpeedKmH, 5.0);
        var minutes = (int)Math.Ceiling(hours * 60.0);

        return Math.Max(minutes, 2);
    }

    /// <summary>
    /// Verifica se um ponto geográfico de destino está dentro do raio de atuação permitido.
    /// </summary>
    public static bool IsWithinRadius(double originLat, double originLon, double targetLat, double targetLon, double radiusKm)
    {
        if (radiusKm <= 0) return true;
        var dist = CalculateDistanceKm(originLat, originLon, targetLat, targetLon);
        return dist <= radiusKm;
    }

    private static double ToRadians(double degrees) => degrees * (Math.PI / 180.0);
}
