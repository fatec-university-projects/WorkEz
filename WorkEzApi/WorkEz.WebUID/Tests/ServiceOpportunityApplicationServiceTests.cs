using System.Linq.Expressions;
using Xunit;
using WorkEz.Application.Services;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ServiceOpportunityApplicationServiceTests
{
    private readonly FakeServiceRepository _serviceRepository = new();
    private readonly FakeServiceProviderRepository _providerRepository = new();
    private readonly FakeProposalRepository _proposalRepository = new();
    private readonly FakeCustomerRepository _customerRepository = new();
    private readonly FakeUserRepository _userRepository = new();

    private ServiceOpportunityApplicationService CreateService()
    {
        return new ServiceOpportunityApplicationService(
            _serviceRepository,
            _providerRepository,
            _proposalRepository,
            _customerRepository,
            _userRepository
        );
    }

    [Fact]
    public async Task GetOpportunitiesAsync_ProviderNotFound_ShouldReturnFailure()
    {
        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("PROVIDER_NOT_FOUND", result.ErrorCode);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_ProviderWithoutCategories_ShouldReturnAllOpenAndAuctionServices()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Carlos Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id, CategoryIds = [] };
        await _providerRepository.AddAsync(provider);

        var catA = Guid.NewGuid();
        var catB = Guid.NewGuid();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Ana Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var s1 = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, CategoryId = catA, Title = "Limpeza", ServiceStatus = ServiceStatus.Open, CreatedAt = DateTime.UtcNow };
        var s2 = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, CategoryId = catB, Title = "Elétrica", ServiceStatus = ServiceStatus.UnderNegotiation, CreatedAt = DateTime.UtcNow };
        await _serviceRepository.AddAsync(s1);
        await _serviceRepository.AddAsync(s2);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count());
    }

    [Fact]
    public async Task GetOpportunitiesAsync_ProviderWithCategories_ShouldFilterByHisCategoriesOnly()
    {
        var catA = Guid.NewGuid();
        var catB = Guid.NewGuid();

        var user = new User { Id = Guid.NewGuid(), Name = "Carlos Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id, CategoryIds = [catA] };
        await _providerRepository.AddAsync(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var s1 = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, CategoryId = catA, Title = "Serviço Cat A", ServiceStatus = ServiceStatus.Open, CreatedAt = DateTime.UtcNow };
        var s2 = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, CategoryId = catB, Title = "Serviço Cat B", ServiceStatus = ServiceStatus.Open, CreatedAt = DateTime.UtcNow };
        await _serviceRepository.AddAsync(s1);
        await _serviceRepository.AddAsync(s2);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Single(list);
        Assert.Equal(s1.Id, list[0].Id);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_WhenInAuctionWithOtherProviderProposal_ShouldShowInOpportunities()
    {
        // Outro prestador enviou proposta (serviço está UnderNegotiation / no leilão)
        // O prestador atual NÃO enviou proposta. Logo, o serviço DEVE APARECER em novos para ele!
        var user = new User { Id = Guid.NewGuid(), Name = "Prestador Atual" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id };
        await _providerRepository.AddAsync(provider);

        var otherProviderId = Guid.NewGuid();

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var serviceInAuction = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Serviço no Leilão",
            ServiceStatus = ServiceStatus.UnderNegotiation,
            CreatedAt = DateTime.UtcNow
        };
        await _serviceRepository.AddAsync(serviceInAuction);

        // Proposta de OUTRO prestador
        var otherProposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = serviceInAuction.Id,
            ProviderId = otherProviderId,
            ProposedPrice = 200m,
            ProposalStatus = ProposalStatus.Pending
        };
        await _proposalRepository.AddAsync(otherProposal);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();
        Assert.Single(list);
        Assert.Equal(serviceInAuction.Id, list[0].Id);
        Assert.Equal("undernegotiation", list[0].Status);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_WhenProviderAlreadyProposed_ShouldNotShowInOpportunities()
    {
        // Prestador atual JÁ enviou proposta. Não deve aparecer em 'Novos'!
        var user = new User { Id = Guid.NewGuid(), Name = "Prestador Atual" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id };
        await _providerRepository.AddAsync(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Serviço que já dei lance",
            ServiceStatus = ServiceStatus.UnderNegotiation,
            CreatedAt = DateTime.UtcNow
        };
        await _serviceRepository.AddAsync(service);

        var myProposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 300m,
            ProposalStatus = ProposalStatus.Pending
        };
        await _proposalRepository.AddAsync(myProposal);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_ServicesAcceptedOrInProgressOrCompleted_ShouldNotBeInOpportunities()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Prestador Atual" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id };
        await _providerRepository.AddAsync(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente Teste" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var sAccepted = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, ServiceStatus = ServiceStatus.Accepted, CreatedAt = DateTime.UtcNow };
        var sInProgress = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, ServiceStatus = ServiceStatus.InProgress, CreatedAt = DateTime.UtcNow };
        var sCompleted = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, ServiceStatus = ServiceStatus.Completed, CreatedAt = DateTime.UtcNow };
        var sCancelled = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, ServiceStatus = ServiceStatus.Cancelled, CreatedAt = DateTime.UtcNow };

        await _serviceRepository.AddAsync(sAccepted);
        await _serviceRepository.AddAsync(sInProgress);
        await _serviceRepository.AddAsync(sCompleted);
        await _serviceRepository.AddAsync(sCancelled);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_DateFormatting_ShouldUseSlashes()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Prestador" };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id };
        await _providerRepository.AddAsync(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        var specificUtcDate = new DateTime(2026, 10, 9, 14, 30, 0, DateTimeKind.Utc);
        var s = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Pintura Residencial",
            ServiceStatus = ServiceStatus.Open,
            CreatedAt = specificUtcDate
        };
        await _serviceRepository.AddAsync(s);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        var item = result.Value.First();
        Assert.Contains("/", item.Date);
        Assert.Matches(@"^\d{2}/\d{2}/\d{4}$", item.Date);
    }

    [Fact]
    public async Task GetOpportunitiesAsync_WithProviderLocation_ShouldFilterByRadiusAndCalculateDistance()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Prestador Paulista" };
        // Prestador na Av. Paulista (-23.5615, -46.6559) com raio de 5 km
        var provider = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Latitude = -23.5615,
            Longitude = -46.6559,
            ServiceRadiusKm = 5.0
        };
        await _userRepository.AddAsync(user);
        await _providerRepository.AddAsync(provider);

        var customerUser = new User { Id = Guid.NewGuid(), Name = "Cliente SP" };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id };
        await _userRepository.AddAsync(customerUser);
        await _customerRepository.AddAsync(customer);

        // Chamado 1: Perto (Ibirapuera, ~2.9 km) - deve ser retornado
        var sNear = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Serviço Próximo",
            ServiceStatus = ServiceStatus.Open,
            Latitude = -23.5874,
            Longitude = -46.6576,
            CreatedAt = DateTime.UtcNow
        };

        // Chamado 2: Longe (Guarulhos, ~20 km) - deve ser filtrado fora
        var sFar = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Serviço Fora do Raio",
            ServiceStatus = ServiceStatus.Open,
            Latitude = -23.4538,
            Longitude = -46.5333,
            CreatedAt = DateTime.UtcNow
        };

        await _serviceRepository.AddAsync(sNear);
        await _serviceRepository.AddAsync(sFar);

        var appService = CreateService();
        var result = await appService.GetOpportunitiesAsync(provider.UserId);

        Assert.True(result.IsSuccess);
        var list = result.Value.ToList();

        Assert.Single(list);
        Assert.Equal(sNear.Id, list[0].Id);
        Assert.NotNull(list[0].DistanceKm);
        Assert.InRange(list[0].DistanceKm!.Value, 2.5, 3.5);
        Assert.NotNull(list[0].EstimatedDurationMinutes);
    }

    // ─── Fake Repositories ───────────────────────────────────────────────────

    private class FakeServiceRepository : IServiceRepository
    {
        public List<Service> Services { get; } = [];
        public Task<Service?> GetByIdAsync(Guid id) => Task.FromResult(Services.FirstOrDefault(s => s.Id == id));
        public Task<IEnumerable<Service>> GetAllAsync() => Task.FromResult<IEnumerable<Service>>(Services);
        public Task<IEnumerable<Service>> FindAsync(Expression<Func<Service, bool>> predicate) => Task.FromResult(Services.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Service entity) { Services.Add(entity); return Task.CompletedTask; }
        public void Update(Service entity) { }
        public void Remove(Service entity) => Services.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Service?> GetByIdWithDetailsAsync(Guid id) => GetByIdAsync(id);
        public Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => Task.FromResult(Services.Where(s => s.CustomerId == customerId));
    }

    private class FakeServiceProviderRepository : IServiceProviderRepository
    {
        public List<ServiceProviderEntity> Providers { get; } = [];
        public Task<ServiceProviderEntity?> GetByIdAsync(Guid id) => Task.FromResult(Providers.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<ServiceProviderEntity>> GetAllAsync() => Task.FromResult<IEnumerable<ServiceProviderEntity>>(Providers);
        public Task<IEnumerable<ServiceProviderEntity>> FindAsync(Expression<Func<ServiceProviderEntity, bool>> predicate) => Task.FromResult(Providers.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(ServiceProviderEntity entity) { Providers.Add(entity); return Task.CompletedTask; }
        public void Update(ServiceProviderEntity entity) { }
        public void Remove(ServiceProviderEntity entity) => Providers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<ServiceProviderEntity?> GetByUserIdAsync(Guid userId) => Task.FromResult(Providers.FirstOrDefault(p => p.UserId == userId));
        public Task<ServiceProviderEntity?> GetByIdWithUserAsync(Guid id) => Task.FromResult(Providers.FirstOrDefault(p => p.Id == id));
        public Task<ServiceProviderEntity?> GetWithDetailsByUserIdAsync(Guid userId) => Task.FromResult(Providers.FirstOrDefault(p => p.UserId == userId));
        public Task<ServiceProviderEntity?> GetWithDetailsByIdAsync(Guid id) => Task.FromResult(Providers.FirstOrDefault(p => p.Id == id));
        public Task<List<string>> GetPortfolioAsync(Guid providerId) => Task.FromResult(new List<string>());
        public Task<bool> AddPortfolioImageAsync(Guid providerId, string imageUrl) => Task.FromResult(true);
        public Task<bool> RemovePortfolioImageAsync(Guid providerId, string imageUrl) => Task.FromResult(true);
        public Task<List<(Guid Id, string Name)>> GetSpecialtiesAsync(Guid providerId) => Task.FromResult(new List<(Guid Id, string Name)>());
    }

    private class FakeProposalRepository : IProposalRepository
    {
        public List<Proposal> Proposals { get; } = [];
        public Task<Proposal?> GetByIdAsync(Guid id) => Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<Proposal>> GetAllAsync() => Task.FromResult<IEnumerable<Proposal>>(Proposals);
        public Task<IEnumerable<Proposal>> FindAsync(Expression<Func<Proposal, bool>> predicate) => Task.FromResult(Proposals.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Proposal entity) { Proposals.Add(entity); return Task.CompletedTask; }
        public void Update(Proposal entity) { }
        public void Remove(Proposal entity) => Proposals.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id) => Task.FromResult(Proposals.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId) => Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId));
        public Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId) => Task.FromResult(Proposals.Where(p => p.ServiceId == serviceId && p.ProposalStatus == ProposalStatus.Pending));
        public Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId) => Task.FromResult(Proposals.FirstOrDefault(p => p.ServiceId == serviceId && p.ProviderId == providerId && p.ProposalStatus == ProposalStatus.Pending));
        public Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId) => Task.FromResult(Proposals.Where(p => p.Provider != null && p.Provider.UserId == providerUserId));
    }

    private class FakeCustomerRepository : IBaseRepository<Customer>
    {
        public List<Customer> Customers { get; } = [];
        public Task<Customer?> GetByIdAsync(Guid id) => Task.FromResult(Customers.FirstOrDefault(c => c.Id == id));
        public Task<IEnumerable<Customer>> GetAllAsync() => Task.FromResult<IEnumerable<Customer>>(Customers);
        public Task<IEnumerable<Customer>> FindAsync(Expression<Func<Customer, bool>> predicate) => Task.FromResult(Customers.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Customer entity) { Customers.Add(entity); return Task.CompletedTask; }
        public void Update(Customer entity) { }
        public void Remove(Customer entity) => Customers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }

    private class FakeUserRepository : IBaseRepository<User>
    {
        public List<User> Users { get; } = [];
        public Task<User?> GetByIdAsync(Guid id) => Task.FromResult(Users.FirstOrDefault(u => u.Id == id));
        public Task<IEnumerable<User>> GetAllAsync() => Task.FromResult<IEnumerable<User>>(Users);
        public Task<IEnumerable<User>> FindAsync(Expression<Func<User, bool>> predicate) => Task.FromResult(Users.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(User entity) { Users.Add(entity); return Task.CompletedTask; }
        public void Update(User entity) { }
        public void Remove(User entity) => Users.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
    }
}
