using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Infra.Data.Context
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<User> Users => Set<User>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<ServiceProvider> Providers => Set<ServiceProvider>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<Proposal> Proposals => Set<Proposal>();
        public DbSet<Appointment> Appointments => Set<Appointment>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<User>(e => { e.HasKey(u => u.Id); e.Property(u => u.Name).IsRequired().HasMaxLength(200); e.Property(u => u.Email).IsRequired().HasMaxLength(320); e.HasIndex(u => u.Email).IsUnique(); });
            modelBuilder.Entity<Customer>(e => { e.HasKey(c => c.Id); e.HasOne(c => c.User).WithOne(u => u.Customer).HasForeignKey<Customer>(c => c.UserId); });
            modelBuilder.Entity<ServiceProvider>(e => { e.HasKey(sp => sp.Id); e.HasOne(sp => sp.User).WithOne(u => u.ServiceProvider).HasForeignKey<ServiceProvider>(sp => sp.UserId); });
            modelBuilder.Entity<Service>(e => { e.HasKey(s => s.Id); e.Property(s => s.Title).IsRequired().HasMaxLength(300); e.HasOne(s => s.Customer).WithMany(c => c.Services).HasForeignKey(s => s.CustomerId).OnDelete(DeleteBehavior.Restrict); });
            modelBuilder.Entity<Proposal>(e => { e.HasKey(p => p.Id); e.Property(p => p.ProposedPrice).HasPrecision(10, 2).IsRequired(); e.HasOne(p => p.Service).WithMany(s => s.Proposals).HasForeignKey(p => p.ServiceId).OnDelete(DeleteBehavior.Cascade); e.HasOne(p => p.Provider).WithMany(sp => sp.Proposals).HasForeignKey(p => p.ProviderId).OnDelete(DeleteBehavior.Restrict); });
            modelBuilder.Entity<Appointment>(e => { e.HasKey(a => a.Id); e.Property(a => a.FinalPrice).HasPrecision(10, 2).IsRequired(); e.HasOne(a => a.Service).WithOne(s => s.Appointment).HasForeignKey<Appointment>(a => a.ServiceId).OnDelete(DeleteBehavior.Restrict); e.HasOne(a => a.Proposal).WithOne(p => p.Appointment).HasForeignKey<Appointment>(a => a.ProposalId).OnDelete(DeleteBehavior.Restrict); });
        }
    }
}

namespace WorkEz.Infra.Data.Repositories
{
    using WorkEz.Infra.Data.Context;

    public class BaseRepository<TEntity>(AppDbContext context) : IBaseRepository<TEntity> where TEntity : BaseEntity
    {
        protected readonly AppDbContext Context = context;
        protected readonly DbSet<TEntity> DbSet = context.Set<TEntity>();

        public virtual async Task<TEntity?> GetByIdAsync(Guid id) => await DbSet.FindAsync(id);
        public virtual async Task<IEnumerable<TEntity>> GetAllAsync() => await DbSet.AsNoTracking().ToListAsync();
        public virtual async Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate) => await DbSet.Where(predicate).AsNoTracking().ToListAsync();
        public virtual async Task AddAsync(TEntity entity) => await DbSet.AddAsync(entity);
        public virtual void Update(TEntity entity) { entity.Touch(); DbSet.Update(entity); }
        public virtual void Remove(TEntity entity) => DbSet.Remove(entity);
        public virtual async Task<int> SaveChangesAsync() => await Context.SaveChangesAsync();
    }

    public class ProposalRepository(AppDbContext context) : BaseRepository<Proposal>(context), IProposalRepository
    {
        public async Task<Proposal?> GetByIdWithServiceAndProviderAsync(Guid id) => await DbSet.Include(p => p.Service).ThenInclude(s => s.Customer).Include(p => p.Provider).ThenInclude(pr => pr.User).FirstOrDefaultAsync(p => p.Id == id);
        public async Task<IEnumerable<Proposal>> GetProposalsByServiceIdAsync(Guid serviceId) => await DbSet.Include(p => p.Provider).ThenInclude(pr => pr.User).Where(p => p.ServiceId == serviceId).OrderByDescending(p => p.CreatedAt).AsNoTracking().ToListAsync();
        public async Task<IEnumerable<Proposal>> GetPendingProposalsByServiceIdAsync(Guid serviceId) => await DbSet.Where(p => p.ServiceId == serviceId && p.ProposalStatus == ProposalStatus.Pending).ToListAsync();
        public async Task<Proposal?> GetExistingProposalAsync(Guid serviceId, Guid providerId) => await DbSet.FirstOrDefaultAsync(p => p.ServiceId == serviceId && p.ProviderId == providerId && p.ProposalStatus == ProposalStatus.Pending);
    }

    public class ServiceRepository(AppDbContext context) : BaseRepository<Service>(context), IServiceRepository
    {
        public async Task<Service?> GetByIdWithDetailsAsync(Guid id) => await DbSet.Include(s => s.Customer).ThenInclude(c => c.User).Include(s => s.Proposals).ThenInclude(p => p.Provider).ThenInclude(pr => pr.User).Include(s => s.Appointment).FirstOrDefaultAsync(s => s.Id == id);
        public async Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => await DbSet.Include(s => s.Proposals).Include(s => s.Appointment).Where(s => s.CustomerId == customerId).OrderByDescending(s => s.CreatedAt).AsNoTracking().ToListAsync();
    }

    public class AppointmentRepository(AppDbContext context) : BaseRepository<Appointment>(context), IAppointmentRepository
    {
        public async Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => await DbSet.FirstOrDefaultAsync(a => a.ServiceId == serviceId);
    }
}

namespace WorkEz.Infra.Data.MessageBroker
{
    public class BaseMessageBroker : IBaseMessageBroker
    {
        public virtual Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : class, IDomainEvent
        {
            Console.WriteLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] [MessageBroker] Dispatched Event '{typeof(TEvent).Name}' (EventId: {domainEvent.EventId})");
            return Task.CompletedTask;
        }
    }
}
