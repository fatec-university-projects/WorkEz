using System.Globalization;
using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IServiceOpportunityApplicationService
{
    Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId);
}

public class ServiceOpportunityApplicationService(
    IServiceRepository serviceRepository,
    IServiceProviderRepository providerRepository,
    IProposalRepository proposalRepository,
    IBaseRepository<Customer> customerRepository,
    IBaseRepository<User> userRepository,
    IBaseRepository<Address>? addressRepository = null) : IServiceOpportunityApplicationService
{
    public async Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId)
    {
        var provider = await providerRepository.GetByUserIdAsync(providerUserId);
        if (provider is null)
        {
            return Result<IEnumerable<OpportunityCallDto>>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");
        }

        var alreadyProposed = await GetExcludedServiceIdsAsync(provider.Id, providerUserId);
        var openServices = await GetFilteredOpenServicesAsync(provider, alreadyProposed);

        var (customerToUserMap, customerUserToCustomerMap, userIds) = await LoadCustomerUserMapsAsync(openServices);
        var userAddressMap = await LoadUserAddressMapAsync(userIds);

        var items = ProcessOpportunities(openServices, provider, customerUserToCustomerMap, customerToUserMap, userAddressMap);

        var resultList = items
            .OrderBy(x => x.Distance ?? double.MaxValue)
            .Select(x => x.Dto)
            .ToList();

        return Result<IEnumerable<OpportunityCallDto>>.Success(resultList);
    }

    private async Task<HashSet<Guid>> GetExcludedServiceIdsAsync(Guid providerId, Guid providerUserId)
    {
        var proposalsByProviderId = await proposalRepository.FindAsync(p => p.ProviderId == providerId);
        var proposalsByUserId = await proposalRepository.GetProposalsByProviderUserIdAsync(providerUserId);

        return proposalsByProviderId
            .Concat(proposalsByUserId)
            .Select(p => p.ServiceId)
            .ToHashSet();
    }

    private async Task<List<Service>> GetFilteredOpenServicesAsync(Domain.Entities.ServiceProvider provider, HashSet<Guid> alreadyProposed)
    {
        var allOpenServices = await serviceRepository.FindAsync(s =>
            s.ServiceStatus == ServiceStatus.Open || s.ServiceStatus == ServiceStatus.UnderNegotiation);

        var hasCategories = provider.CategoryIds != null && provider.CategoryIds.Count > 0;

        return allOpenServices
            .Where(s => !alreadyProposed.Contains(s.Id))
            .Where(s => !hasCategories || provider.CategoryIds!.Contains(s.CategoryId))
            .ToList();
    }

    private async Task<(Dictionary<Guid, string> CustomerToUser, Dictionary<Guid, Guid> CustomerToUserId, List<Guid> UserIds)> LoadCustomerUserMapsAsync(List<Service> services)
    {
        var customerIds = services.Select(s => s.CustomerId).Distinct().ToList();
        var customers = (await customerRepository.FindAsync(c => customerIds.Contains(c.Id))).ToList();
        var userIds = customers.Select(c => c.UserId).Distinct().ToList();
        var users = (await userRepository.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);

        var customerToUserMap = customers.ToDictionary(
            c => c.Id,
            c => users.TryGetValue(c.UserId, out var u) ? u.Name : "Cliente"
        );
        var customerUserToCustomerMap = customers.ToDictionary(c => c.Id, c => c.UserId);

        return (customerToUserMap, customerUserToCustomerMap, userIds);
    }

    private async Task<Dictionary<Guid, Address>> LoadUserAddressMapAsync(List<Guid> userIds)
    {
        if (addressRepository == null || userIds.Count == 0)
            return [];

        var addresses = await addressRepository.FindAsync(a => userIds.Contains(a.UserId));
        return addresses
            .GroupBy(a => a.UserId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());
    }

    private static (double? Latitude, double? Longitude) ResolveServiceCoordinates(
        Service s,
        Dictionary<Guid, Guid> customerUserToCustomerMap,
        Dictionary<Guid, Address> userAddressMap)
    {
        if (s.Latitude.HasValue && s.Longitude.HasValue)
            return (s.Latitude, s.Longitude);

        if (customerUserToCustomerMap.TryGetValue(s.CustomerId, out var cUserId) &&
            userAddressMap.TryGetValue(cUserId, out var addr) &&
            addr.Latitude.HasValue && addr.Longitude.HasValue)
        {
            return (addr.Latitude, addr.Longitude);
        }

        return (null, null);
    }

    private static (bool IsEligible, double? DistanceKm, int? TravelMinutes) EvaluateProximity(
        Domain.Entities.ServiceProvider provider,
        double? sLat,
        double? sLon)
    {
        var providerHasLocation = provider.Latitude.HasValue && provider.Longitude.HasValue;
        var isUnlimited = provider.ServiceRadiusKm <= 0 || provider.ServiceRadiusKm >= 9999;
        var providerRadius = isUnlimited ? double.MaxValue : provider.ServiceRadiusKm;

        if (providerHasLocation && sLat.HasValue && sLon.HasValue)
        {
            var distanceKm = GeoLocationUtils.CalculateDistanceKm(
                provider.Latitude!.Value,
                provider.Longitude!.Value,
                sLat.Value,
                sLon.Value
            );

            if (!isUnlimited && distanceKm > providerRadius)
                return (false, null, null);

            var travelMin = GeoLocationUtils.EstimateTravelMinutes(distanceKm);
            return (true, distanceKm, travelMin);
        }

        if (providerHasLocation && !isUnlimited && (!sLat.HasValue || !sLon.HasValue))
            return (false, null, null);

        return (true, null, null);
    }

    private static List<(OpportunityCallDto Dto, double? Distance)> ProcessOpportunities(
        List<Service> services,
        Domain.Entities.ServiceProvider provider,
        Dictionary<Guid, Guid> customerUserToCustomerMap,
        Dictionary<Guid, string> customerToUserMap,
        Dictionary<Guid, Address> userAddressMap)
    {
        var items = new List<(OpportunityCallDto Dto, double? Distance)>();

        foreach (var s in services)
        {
            var (sLat, sLon) = ResolveServiceCoordinates(s, customerUserToCustomerMap, userAddressMap);
            var (isEligible, distanceKm, travelMin) = EvaluateProximity(provider, sLat, sLon);
            if (!isEligible)
                continue;

            var clientName = customerToUserMap.TryGetValue(s.CustomerId, out var name) ? name : "Cliente";
            var dto = MapToOpportunityCallDto(s, clientName, sLat, sLon, distanceKm, travelMin);
            items.Add((dto, distanceKm));
        }

        return items;
    }

    private static OpportunityCallDto MapToOpportunityCallDto(
        Service s,
        string clientName,
        double? sLat,
        double? sLon,
        double? distanceKm,
        int? travelMin)
    {
        var targetDate = s.DesiredDate ?? s.CreatedAt;
        var brDate = ToBrasiliaTime(targetDate);

        return new OpportunityCallDto(
            Id: s.Id,
            Category: string.IsNullOrWhiteSpace(s.Title) ? "Serviço" : s.Title,
            Description: s.Description ?? string.Empty,
            Status: s.ServiceStatus.ToString().ToLower(),
            Date: brDate.ToString("dd'/'MM'/'yyyy", CultureInfo.InvariantCulture),
            ClientName: clientName,
            DistanceKm: distanceKm,
            EstimatedDurationMinutes: travelMin,
            Latitude: sLat,
            Longitude: sLon
        );
    }

    private static DateTime ToBrasiliaTime(DateTime utcDate)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDate, DateTimeKind.Utc), tz);
        }
        catch
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDate, DateTimeKind.Utc), tz);
            }
            catch
            {
                return DateTime.SpecifyKind(utcDate, DateTimeKind.Utc).AddHours(-3);
            }
        }
    }
}
