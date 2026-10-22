using System.Linq.Expressions;
using Xunit;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class PortfolioApplicationServiceTests
{
    private readonly FakeServiceProviderRepository _providerRepository = new();

    // ── Helpers ──────────────────────────────────────────────────────────────

    private PortfolioApplicationService CreateService() =>
        new(_providerRepository);

    private async Task<ServiceProviderEntity> SeedProviderAsync(string name = "Ana Pintora", List<string>? portfolio = null)
    {
        var user = new User { Id = Guid.NewGuid(), Name = name, Email = $"{name.ToLower().Replace(" ", "")}@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            ProfessionalDescription = "Profissional experiente.",
            Portfolio = portfolio ?? []
        };
        await _providerRepository.AddAsync(provider);
        return provider;
    }

    // ── GetPortfolioByUserIdAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetPortfolioByUserIdAsync_ExistingProvider_ReturnsImages()
    {
        var images = new List<string> { "https://img.com/foto1.jpg", "https://img.com/foto2.jpg" };
        var provider = await SeedProviderAsync(portfolio: images);

        var service = CreateService();
        var result = await service.GetPortfolioByUserIdAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Images.Count);
        Assert.Contains("https://img.com/foto1.jpg", result.Value.Images);
    }

    [Fact]
    public async Task GetPortfolioByUserIdAsync_ProviderNotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.GetPortfolioByUserIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task GetPortfolioByUserIdAsync_EmptyPortfolio_ReturnsEmptyList()
    {
        var provider = await SeedProviderAsync();

        var service = CreateService();
        var result = await service.GetPortfolioByUserIdAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Images);
    }

    // ── AddImageAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task AddImageAsync_ValidUrl_AddsImageToPortfolio()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, "https://img.com/novo.jpg"));

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!.Images);
        Assert.Equal("https://img.com/novo.jpg", result.Value.Images[0]);
    }

    [Fact]
    public async Task AddImageAsync_MultipleImages_AllAreStored()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, "https://img.com/foto1.jpg"));
        await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, "https://img.com/foto2.jpg"));
        var result = await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, "https://img.com/foto3.jpg"));

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.Images.Count);
    }

    [Fact]
    public async Task AddImageAsync_ProviderNotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.AddImageAsync(new AddPortfolioImageRequest(Guid.NewGuid(), "https://img.com/foto.jpg"));

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task AddImageAsync_EmptyUrl_ReturnsFailure()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, "   "));

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_IMAGE_URL", result.ErrorCode);
    }

    [Fact]
    public async Task AddImageAsync_DuplicateUrl_DoesNotDuplicate()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();
        var url = "https://img.com/duplicada.jpg";

        await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, url));
        var result = await service.AddImageAsync(new AddPortfolioImageRequest(provider.UserId, url));

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!.Images); // não duplica
    }

    // ── RemoveImageAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RemoveImageAsync_ExistingImage_RemovesFromPortfolio()
    {
        var url = "https://img.com/remover.jpg";
        var provider = await SeedProviderAsync(portfolio: [url, "https://img.com/manter.jpg"]);
        var service = CreateService();

        var result = await service.RemoveImageAsync(new RemovePortfolioImageRequest(provider.UserId, url));

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!.Images);
        Assert.DoesNotContain(url, result.Value.Images);
        Assert.Contains("https://img.com/manter.jpg", result.Value.Images);
    }

    [Fact]
    public async Task RemoveImageAsync_ImageNotInPortfolio_ReturnsFailure()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.RemoveImageAsync(new RemovePortfolioImageRequest(provider.UserId, "https://img.com/inexistente.jpg"));

        Assert.True(result.IsFailure);
        Assert.Equal("IMAGE_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task RemoveImageAsync_ProviderNotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.RemoveImageAsync(new RemovePortfolioImageRequest(Guid.NewGuid(), "https://img.com/foto.jpg"));

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task RemoveImageAsync_LastImage_LeavesPortfolioEmpty()
    {
        var url = "https://img.com/unica.jpg";
        var provider = await SeedProviderAsync(portfolio: [url]);
        var service = CreateService();

        var result = await service.RemoveImageAsync(new RemovePortfolioImageRequest(provider.UserId, url));

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value!.Images);
    }

    // ── GetProviderByUserIdAsync ──────────────────────────────────────────────

    [Fact]
    public async Task GetProviderByUserIdAsync_ExistingProvider_ReturnsProfile()
    {
        var provider = await SeedProviderAsync("Carlos Marceneiro");
        var service = CreateService();

        var result = await service.GetProviderByUserIdAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Carlos Marceneiro", result.Value!.Name);
        Assert.Equal(provider.UserId, result.Value.UserId);
    }

    [Fact]
    public async Task GetProviderByUserIdAsync_NotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.GetProviderByUserIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    // ── UpdateProviderAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProviderAsync_ValidDescription_UpdatesSuccessfully()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.UpdateProviderAsync(provider.Id, "Nova descrição atualizada.");

        Assert.True(result.IsSuccess);
        Assert.Equal("Nova descrição atualizada.", result.Value!.ProfessionalDescription);
    }

    [Fact]
    public async Task UpdateProviderAsync_ProviderNotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.UpdateProviderAsync(Guid.NewGuid(), "Qualquer descrição");

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task UpdateProviderAsync_NullDescription_SetsToNull()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.UpdateProviderAsync(provider.Id, null);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value!.ProfessionalDescription);
    }

    // ── GetWeeklySummaryByUserIdAsync ─────────────────────────────────────────

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_ProviderNotFound_ReturnsFailure()
    {
        var service = CreateService();
        var result = await service.GetWeeklySummaryByUserIdAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_NewProviderNoAppointments_ReturnsInitialSummary()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.GetWeeklySummaryByUserIdAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Value!.CompletedServices);
        Assert.Equal(0.0, result.Value.AcceptanceRate);
        Assert.Equal(0.0m, result.Value.AverageRating);
        Assert.Equal(0.0, result.Value.GrowthRate);
        Assert.Equal("neutral", result.Value.TrendType);
        Assert.Equal("Sem atividades recentes", result.Value.PerformanceTitle);
        Assert.Equal("Aceite novos chamados para começar a crescer", result.Value.PerformanceSubtitle);
    }

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_WithCompletedServicesThisWeek_CalculatesGrowthAndAcceptanceRate()
    {
        var provider = await SeedProviderAsync();
        var now = new DateTime(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

        provider.AverageRating = 4.8m;
        provider.Appointments = new List<Appointment>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ProviderId = provider.Id,
                AppointmentStatus = AppointmentStatus.Completed,
                CompletedAt = now.AddDays(-2),
                FinalPrice = 150m
            },
            new()
            {
                Id = Guid.NewGuid(),
                ProviderId = provider.Id,
                AppointmentStatus = AppointmentStatus.Completed,
                CompletedAt = now.AddDays(-4),
                FinalPrice = 200m
            }
        };

        provider.Proposals = new List<Proposal>
        {
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, ProposalStatus = ProposalStatus.Accepted },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, ProposalStatus = ProposalStatus.Accepted },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, ProposalStatus = ProposalStatus.Rejected },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, ProposalStatus = ProposalStatus.Pending }
        };

        var service = CreateService();
        var result = await service.GetWeeklySummaryByUserIdAsync(provider.UserId, now);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.CompletedServices);
        Assert.Equal(100.0, result.Value.GrowthRate); // 0 na semana anterior -> 100% de crescimento
        Assert.Equal("positive", result.Value.TrendType);
        Assert.Equal("Ótimo desempenho!", result.Value.PerformanceTitle);
        Assert.Equal("Você cresceu 100% esta semana", result.Value.PerformanceSubtitle);
        Assert.Equal(50.0, result.Value.AcceptanceRate); // 2 aceitas de 4 propostas
        Assert.Equal(4.8m, result.Value.AverageRating);
    }

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_WithLastWeekAndThisWeek_CalculatesGrowthPercentage()
    {
        var provider = await SeedProviderAsync();
        var now = new DateTime(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

        provider.Appointments = new List<Appointment>
        {
            // Semana anterior (8 a 13 dias atrás): 2 serviços
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-9), FinalPrice = 100m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-11), FinalPrice = 120m },
            // Esta semana (últimos 7 dias): 3 serviços
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-1), FinalPrice = 150m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-3), FinalPrice = 180m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-5), FinalPrice = 200m }
        };

        var service = CreateService();
        var result = await service.GetWeeklySummaryByUserIdAsync(provider.UserId, now);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.CompletedServices);
        // (3 - 2) / 2 * 100 = 50%
        Assert.Equal(50.0, result.Value.GrowthRate);
        Assert.Equal("positive", result.Value.TrendType);
        Assert.Equal("Ótimo desempenho!", result.Value.PerformanceTitle);
        Assert.Equal("Você cresceu 50% esta semana", result.Value.PerformanceSubtitle);
    }

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_NegativeGrowth_ReturnsNegativeTrendAndMessage()
    {
        var provider = await SeedProviderAsync();
        var now = new DateTime(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

        provider.Appointments = new List<Appointment>
        {
            // Semana anterior: 4 serviços
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-9), FinalPrice = 100m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-10), FinalPrice = 100m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-11), FinalPrice = 100m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-12), FinalPrice = 100m },
            // Esta semana: 1 serviço
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-2), FinalPrice = 150m }
        };

        var service = CreateService();
        var result = await service.GetWeeklySummaryByUserIdAsync(provider.UserId, now);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.CompletedServices);
        Assert.Equal(-75.0, result.Value.GrowthRate);
        Assert.Equal("negative", result.Value.TrendType);
        Assert.Equal("Desempenho em queda", result.Value.PerformanceTitle);
        Assert.Equal("Você caiu 75% em relação à semana passada", result.Value.PerformanceSubtitle);
    }

    [Fact]
    public async Task GetWeeklySummaryByUserIdAsync_StableGrowth_ReturnsStableTrend()
    {
        var provider = await SeedProviderAsync();
        var now = new DateTime(2026, 10, 3, 12, 0, 0, DateTimeKind.Utc);

        provider.Appointments = new List<Appointment>
        {
            // Semana anterior: 2 serviços
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-9), FinalPrice = 100m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-10), FinalPrice = 100m },
            // Esta semana: 2 serviços
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-2), FinalPrice = 150m },
            new() { Id = Guid.NewGuid(), ProviderId = provider.Id, AppointmentStatus = AppointmentStatus.Completed, CompletedAt = now.AddDays(-3), FinalPrice = 150m }
        };

        var service = CreateService();
        var result = await service.GetWeeklySummaryByUserIdAsync(provider.UserId, now);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.CompletedServices);
        Assert.Equal(0.0, result.Value.GrowthRate);
        Assert.Equal("stable", result.Value.TrendType);
        Assert.Equal("Desempenho constante!", result.Value.PerformanceTitle);
    }

    [Fact]
    public async Task GetWeeklySummaryByProviderIdAsync_ExistingProvider_ReturnsSuccess()
    {
        var provider = await SeedProviderAsync();
        var service = CreateService();

        var result = await service.GetWeeklySummaryByProviderIdAsync(provider.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Value!.CompletedServices);
        Assert.Equal("neutral", result.Value.TrendType);
    }

    // ─── Fake Repository ─────────────────────────────────────────────────────

    private class FakeServiceProviderRepository : IServiceProviderRepository
    {
        private readonly List<ServiceProviderEntity> _providers = [];

        public Task<ServiceProviderEntity?> GetByIdAsync(Guid id) =>
            Task.FromResult(_providers.FirstOrDefault(p => p.Id == id));

        public Task<IEnumerable<ServiceProviderEntity>> GetAllAsync() =>
            Task.FromResult<IEnumerable<ServiceProviderEntity>>(_providers);

        public Task<IEnumerable<ServiceProviderEntity>> FindAsync(Expression<Func<ServiceProviderEntity, bool>> predicate) =>
            Task.FromResult(_providers.AsQueryable().Where(predicate).AsEnumerable());

        public Task AddAsync(ServiceProviderEntity entity) { _providers.Add(entity); return Task.CompletedTask; }
        public void Update(ServiceProviderEntity entity) { /* in-memory já atualiza por referência */ }
        public void Remove(ServiceProviderEntity entity) => _providers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);

        public Task<ServiceProviderEntity?> GetByUserIdAsync(Guid userId) =>
            Task.FromResult(_providers.FirstOrDefault(p => p.UserId == userId));

        public Task<ServiceProviderEntity?> GetByIdWithUserAsync(Guid id) =>
            Task.FromResult(_providers.FirstOrDefault(p => p.Id == id));

        public Task<ServiceProviderEntity?> GetWithDetailsByUserIdAsync(Guid userId) =>
            Task.FromResult(_providers.FirstOrDefault(p => p.UserId == userId));

        public Task<ServiceProviderEntity?> GetWithDetailsByIdAsync(Guid id) =>
            Task.FromResult(_providers.FirstOrDefault(p => p.Id == id));

        public Task<List<string>> GetPortfolioAsync(Guid providerId)
        {
            var provider = _providers.FirstOrDefault(p => p.Id == providerId);
            return Task.FromResult(provider?.Portfolio ?? []);
        }

        public Task<bool> AddPortfolioImageAsync(Guid providerId, string imageUrl)
        {
            var provider = _providers.FirstOrDefault(p => p.Id == providerId);
            if (provider is null) return Task.FromResult(false);
            if (!provider.Portfolio.Contains(imageUrl)) provider.Portfolio.Add(imageUrl);
            return Task.FromResult(true);
        }

        public Task<bool> RemovePortfolioImageAsync(Guid providerId, string imageUrl)
        {
            var provider = _providers.FirstOrDefault(p => p.Id == providerId);
            if (provider is null) return Task.FromResult(false);
            var removed = provider.Portfolio.Remove(imageUrl);
            return Task.FromResult(removed);
        }

        public Task<List<(Guid Id, string Name)>> GetSpecialtiesAsync(Guid providerId) =>
            Task.FromResult(new List<(Guid Id, string Name)>());
    }
}
