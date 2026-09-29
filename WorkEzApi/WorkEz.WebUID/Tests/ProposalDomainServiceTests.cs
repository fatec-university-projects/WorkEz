using System.Linq.Expressions;
using Xunit;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;
using WorkEz.Domain.Services;
using WorkEz.Infra.Data.MessageBroker;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class ProposalDomainServiceTests
{
    private readonly FakeProposalRepository _proposalRepository = new();
    private readonly FakeServiceRepository _serviceRepository = new();
    private readonly FakeAppointmentRepository _appointmentRepository = new();
    private readonly FakeProviderRepository _providerRepository = new();
    private readonly FakeCustomerRepository _customerRepository = new();
    private readonly BaseMessageBroker _messageBroker = new();

    [Fact]
    public async Task ProposePriceAsync_Success_ShouldCreateProposalAndMoveServiceToUnderNegotiation()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Pedro Prestador", Email = "pedro@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id, User = user };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Title = "Reparo Vazamento", ServiceStatus = ServiceStatus.Open };

        await _providerRepository.AddAsync(provider);
        await _serviceRepository.AddAsync(service);

        var serviceDomain = new ProposalDomainService(_proposalRepository, _serviceRepository, _appointmentRepository, _providerRepository, _customerRepository, _messageBroker);

        var result = await serviceDomain.ProposePriceAsync(provider.UserId, service.Id, 200.00m, "Troca de torneira", "2 horas");

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(200.00m, result.Value.ProposedPrice);
        Assert.Equal(ServiceStatus.UnderNegotiation, service.ServiceStatus);
        Assert.Single(_proposalRepository.Proposals);
    }

    [Fact]
    public async Task ProposePriceAsync_ServiceCompleted_ShouldReturnFailureResult()
    {
        var user = new User { Id = Guid.NewGuid(), Name = "Pedro Prestador", Email = "pedro@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = user.Id, User = user };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Title = "Reparo Concluído", ServiceStatus = ServiceStatus.Completed };

        await _providerRepository.AddAsync(provider);
        await _serviceRepository.AddAsync(service);

        var serviceDomain = new ProposalDomainService(_proposalRepository, _serviceRepository, _appointmentRepository, _providerRepository, _customerRepository, _messageBroker);

        var result = await serviceDomain.ProposePriceAsync(provider.UserId, service.Id, 150.00m, "Tentativa em serviço concluído", "1h");

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_SERVICE_STATUS", result.ErrorCode);
        Assert.Empty(_proposalRepository.Proposals);
    }

    [Fact]
    public async Task AcceptProposalAsync_Success_ShouldAcceptProposalServiceAndCreateAppointment()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Maria Cliente", Email = "maria@test.com", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var providerUser = new User { Id = Guid.NewGuid(), Name = "João Encanador", Email = "joao@test.com", Role = UserRole.ServiceProvider };
        var provider = new ServiceProviderEntity { Id = Guid.NewGuid(), UserId = providerUser.Id, User = providerUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, Customer = customer, ServiceStatus = ServiceStatus.UnderNegotiation };
        var proposal = new Proposal { Id = Guid.NewGuid(), ServiceId = service.Id, ProviderId = provider.Id, ProposedPrice = 250.00m, ProposalStatus = ProposalStatus.Pending, Service = service, Provider = provider };

        await _customerRepository.AddAsync(customer);
        await _proposalRepository.AddAsync(proposal);
        await _serviceRepository.AddAsync(service);

        var serviceDomain = new ProposalDomainService(_proposalRepository, _serviceRepository, _appointmentRepository, _providerRepository, _customerRepository, _messageBroker);

        var result = await serviceDomain.AcceptProposalAsync(customerUser.Id, proposal.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(ServiceStatus.Accepted, service.ServiceStatus);
        Assert.Equal(ProposalStatus.Accepted, proposal.ProposalStatus);
        Assert.Single(_appointmentRepository.Appointments);
        Assert.Equal(250.00m, _appointmentRepository.Appointments.First().FinalPrice);
    }

    [Fact]
    public async Task RejectProposalAsync_Success_ShouldRejectProposalAndRevertServiceToOpenIfNoPendingProposals()
    {
        var customerUser = new User { Id = Guid.NewGuid(), Name = "Maria Cliente", Email = "maria@test.com", Role = UserRole.Customer };
        var customer = new Customer { Id = Guid.NewGuid(), UserId = customerUser.Id, User = customerUser };
        var service = new Service { Id = Guid.NewGuid(), CustomerId = customer.Id, ServiceStatus = ServiceStatus.UnderNegotiation };
        var proposal = new Proposal { Id = Guid.NewGuid(), ServiceId = service.Id, ProviderId = Guid.NewGuid(), ProposedPrice = 300.00m, ProposalStatus = ProposalStatus.Pending, Service = service };

        await _customerRepository.AddAsync(customer);
        await _proposalRepository.AddAsync(proposal);
        await _serviceRepository.AddAsync(service);

        var serviceDomain = new ProposalDomainService(_proposalRepository, _serviceRepository, _appointmentRepository, _providerRepository, _customerRepository, _messageBroker);

        var result = await serviceDomain.RejectProposalAsync(customerUser.Id, proposal.Id, "Preço elevado");

        Assert.True(result.IsSuccess);
        Assert.Equal(ProposalStatus.Rejected, proposal.ProposalStatus);
        Assert.Equal(ServiceStatus.Open, service.ServiceStatus);
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
    }

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

    private class FakeAppointmentRepository : IAppointmentRepository
    {
        public List<Appointment> Appointments { get; } = [];
        public Task<Appointment?> GetByIdAsync(Guid id) => Task.FromResult(Appointments.FirstOrDefault(a => a.Id == id));
        public Task<IEnumerable<Appointment>> GetAllAsync() => Task.FromResult<IEnumerable<Appointment>>(Appointments);
        public Task<IEnumerable<Appointment>> FindAsync(Expression<Func<Appointment, bool>> predicate) => Task.FromResult(Appointments.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(Appointment entity) { Appointments.Add(entity); return Task.CompletedTask; }
        public void Update(Appointment entity) { }
        public void Remove(Appointment entity) => Appointments.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
        public Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => Task.FromResult(Appointments.FirstOrDefault(a => a.ServiceId == serviceId));
    }

    private class FakeProviderRepository : IBaseRepository<ServiceProviderEntity>
    {
        public List<ServiceProviderEntity> Providers { get; } = [];
        public Task<ServiceProviderEntity?> GetByIdAsync(Guid id) => Task.FromResult(Providers.FirstOrDefault(p => p.Id == id));
        public Task<IEnumerable<ServiceProviderEntity>> GetAllAsync() => Task.FromResult<IEnumerable<ServiceProviderEntity>>(Providers);
        public Task<IEnumerable<ServiceProviderEntity>> FindAsync(Expression<Func<ServiceProviderEntity, bool>> predicate) => Task.FromResult(Providers.AsQueryable().Where(predicate).AsEnumerable());
        public Task AddAsync(ServiceProviderEntity entity) { Providers.Add(entity); return Task.CompletedTask; }
        public void Update(ServiceProviderEntity entity) { }
        public void Remove(ServiceProviderEntity entity) => Providers.Remove(entity);
        public Task<int> SaveChangesAsync() => Task.FromResult(1);
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
}
