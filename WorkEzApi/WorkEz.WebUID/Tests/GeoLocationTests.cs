using Xunit;
using WorkEz.Domain.Common;

namespace WorkEz.WebUID.Tests;

public class GeoLocationTests
{
    [Fact]
    public void CalculateDistanceKm_ShouldReturnAccurateDistance()
    {
        // Ponto A: Av. Paulista (São Paulo)
        double lat1 = -23.5615;
        double lon1 = -46.6559;

        // Ponto B: Parque Ibirapuera (São Paulo)
        double lat2 = -23.5874;
        double lon2 = -46.6576;

        var distance = GeoLocationUtils.CalculateDistanceKm(lat1, lon1, lat2, lon2);

        // Distância real em linha reta é aprox. 2.9 km
        Assert.InRange(distance, 2.7, 3.2);
    }

    [Fact]
    public void CalculateDistanceKm_SameCoordinates_ShouldReturnZero()
    {
        double lat = -23.5505;
        double lon = -46.6333;

        var distance = GeoLocationUtils.CalculateDistanceKm(lat, lon, lat, lon);

        Assert.Equal(0.0, distance);
    }

    [Fact]
    public void EstimateTravelMinutes_ShouldCalculateExpectedTime()
    {
        // 14 km a ~28 km/h média urbana deve dar cerca de 30 minutos
        var minutes = GeoLocationUtils.EstimateTravelMinutes(14.0);

        Assert.InRange(minutes, 25, 35);
    }

    [Fact]
    public void IsWithinRadius_ShouldCorrectlyValidateBounds()
    {
        double originLat = -23.5615;
        double originLon = -46.6559;

        // Ponto a ~2.9 km
        double targetLat = -23.5874;
        double targetLon = -46.6576;

        Assert.True(GeoLocationUtils.IsWithinRadius(originLat, originLon, targetLat, targetLon, 5.0));
        Assert.False(GeoLocationUtils.IsWithinRadius(originLat, originLon, targetLat, targetLon, 2.0));
    }
}
