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
    IBaseRepository<User> userRepository) : IServiceOpportunityApplicationService
{
    public async Task<Result<IEnumerable<OpportunityCallDto>>> GetOpportunitiesAsync(Guid providerUserId)
    {
        var provider = await providerRepository.GetByUserIdAsync(providerUserId);
        if (provider is null)
        {
            return Result<IEnumerable<OpportunityCallDto>>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");
        }

        // Propostas que este prestador já enviou (busca direta por ProviderId e por Provider.UserId)
        var proposalsByProviderId = await proposalRepository.FindAsync(p => p.ProviderId == provider.Id);
        var proposalsByUserId = await proposalRepository.GetProposalsByProviderUserIdAsync(providerUserId);
        var alreadyProposed = proposalsByProviderId
            .Concat(proposalsByUserId)
            .Select(p => p.ServiceId)
            .ToHashSet();

        // Buscar serviços que ainda estão abertos ou em leilão (exclui Accepted, InProgress, Completed, Cancelled)
        var allOpenServices = await serviceRepository.FindAsync(s =>
            s.ServiceStatus == ServiceStatus.Open || s.ServiceStatus == ServiceStatus.UnderNegotiation);

        // Se o prestador NÃO tiver nenhuma área selecionada (CategoryIds vazio), puxa TODOS!
        // Se tiver áreas, filtra apenas pelas dele.
        var hasCategories = provider.CategoryIds != null && provider.CategoryIds.Count > 0;

        var filtered = allOpenServices
            .Where(s => !alreadyProposed.Contains(s.Id))
            .Where(s => !hasCategories || provider.CategoryIds!.Contains(s.CategoryId))
            .OrderByDescending(s => s.CreatedAt);

        var filteredList = filtered.ToList();
        var customerIds = filteredList.Select(s => s.CustomerId).Distinct().ToList();

        var customers = (await customerRepository.FindAsync(c => customerIds.Contains(c.Id))).ToList();
        var userIds = customers.Select(c => c.UserId).Distinct().ToList();
        var users = (await userRepository.FindAsync(u => userIds.Contains(u.Id))).ToDictionary(u => u.Id);
        var customerToUserMap = customers.ToDictionary(
            c => c.Id,
            c => users.TryGetValue(c.UserId, out var u) ? u.Name : "Cliente"
        );

        var resultList = filteredList.Select(s =>
        {
            var targetDate = s.DesiredDate ?? s.CreatedAt;
            var brDate = ToBrasiliaTime(targetDate);

            return new OpportunityCallDto(
                Id: s.Id,
                Category: string.IsNullOrWhiteSpace(s.Title) ? "Serviço" : s.Title,
                Description: s.Description ?? string.Empty,
                Status: s.ServiceStatus.ToString().ToLower(),
                Date: brDate.ToString("dd'/'MM'/'yyyy", CultureInfo.InvariantCulture),
                ClientName: customerToUserMap.TryGetValue(s.CustomerId, out var name) ? name : "Cliente"
            );
        }).ToList();

        return Result<IEnumerable<OpportunityCallDto>>.Success(resultList);
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
