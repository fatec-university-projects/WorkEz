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
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<ProviderCategory> ProviderCategories => Set<ProviderCategory>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<ServiceProvider> Providers => Set<ServiceProvider>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<Proposal> Proposals => Set<Proposal>();
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<Address> Addresses => Set<Address>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<UserDeviceToken> UserDeviceTokens => Set<UserDeviceToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Address>(e => { e.HasKey(a => a.Id); e.Ignore(a => a.CreatedAt); e.Ignore(a => a.UpdatedAt); });
            modelBuilder.Entity<User>(e => { e.HasKey(u => u.Id); e.Property(u => u.Name).IsRequired().HasMaxLength(200); e.Property(u => u.Email).IsRequired().HasMaxLength(320); e.Property(u => u.Role).HasConversion<string>(); e.HasIndex(u => u.Email).IsUnique(); });
            modelBuilder.Entity<Category>(e => { e.HasKey(c => c.Id); e.Ignore(c => c.CreatedAt); e.Ignore(c => c.UpdatedAt); });
            modelBuilder.Entity<ProviderCategory>(e => { e.HasKey(pc => pc.Id); e.Ignore(pc => pc.CreatedAt); e.Ignore(pc => pc.UpdatedAt); e.HasOne(pc => pc.Category).WithMany().HasForeignKey(pc => pc.CategoryId); });
            modelBuilder.Entity<Customer>(e => { e.HasKey(c => c.Id); e.Ignore(c => c.CreatedAt); e.Ignore(c => c.UpdatedAt); e.HasOne(c => c.User).WithOne(u => u.Customer).HasForeignKey<Customer>(c => c.UserId); });
            modelBuilder.Entity<ServiceProvider>(e => { e.HasKey(sp => sp.Id); e.Ignore(sp => sp.CreatedAt); e.Ignore(sp => sp.UpdatedAt); e.Ignore(sp => sp.CategoryIds); e.HasOne(sp => sp.User).WithOne(u => u.ServiceProvider).HasForeignKey<ServiceProvider>(sp => sp.UserId); });
            modelBuilder.Entity<Service>(e => { e.HasKey(s => s.Id); e.Property(s => s.Title).IsRequired().HasMaxLength(300); e.Property(s => s.ServiceStatus).HasConversion<string>(); e.HasOne(s => s.Customer).WithMany(c => c.Services).HasForeignKey(s => s.CustomerId).OnDelete(DeleteBehavior.Restrict); });
            modelBuilder.Entity<Proposal>(e => { e.HasKey(p => p.Id); e.Property(p => p.ProposedPrice).HasPrecision(10, 2).IsRequired(); e.Property(p => p.LaborPrice).HasPrecision(10, 2); e.Property(p => p.MaterialsPrice).HasPrecision(10, 2); e.Property(p => p.CounterPrice).HasPrecision(10, 2); e.Property(p => p.ProposalStatus).HasConversion<string>(); e.HasOne(p => p.Service).WithMany(s => s.Proposals).HasForeignKey(p => p.ServiceId).OnDelete(DeleteBehavior.Cascade); e.HasOne(p => p.Provider).WithMany(sp => sp.Proposals).HasForeignKey(p => p.ProviderId).OnDelete(DeleteBehavior.Restrict); });
            modelBuilder.Entity<Appointment>(e => { e.HasKey(a => a.Id); e.Property(a => a.FinalPrice).HasPrecision(10, 2).IsRequired(); e.Property(a => a.AppointmentStatus).HasConversion<string>(); e.HasOne(a => a.Service).WithOne(s => s.Appointment).HasForeignKey<Appointment>(a => a.ServiceId).OnDelete(DeleteBehavior.Restrict); e.HasOne(a => a.Proposal).WithOne(p => p.Appointment).HasForeignKey<Appointment>(a => a.ProposalId).OnDelete(DeleteBehavior.Restrict); e.HasOne(a => a.Provider).WithMany(sp => sp.Appointments).HasForeignKey(a => a.ProviderId).OnDelete(DeleteBehavior.Restrict); });
            modelBuilder.Entity<RefreshToken>(e => { e.HasKey(t => t.Id); e.Ignore(t => t.UpdatedAt); e.Property(t => t.Token).IsRequired().HasMaxLength(500); e.HasIndex(t => t.Token).IsUnique(); e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade); });
            modelBuilder.Entity<ChatMessage>(e => { e.HasKey(m => m.Id); e.Property(m => m.Content).IsRequired().HasMaxLength(2000); e.HasIndex(m => m.ProposalId); e.HasIndex(m => m.ServiceId); });
            modelBuilder.Entity<Review>(e => { e.HasKey(r => r.Id); e.Property(r => r.Rating).IsRequired(); e.Property(r => r.Comment).HasMaxLength(1000); e.HasOne(r => r.ReviewerUser).WithMany().HasForeignKey(r => r.ReviewerUserId).OnDelete(DeleteBehavior.Restrict); e.HasOne(r => r.ReviewedUser).WithMany().HasForeignKey(r => r.ReviewedUserId).OnDelete(DeleteBehavior.Restrict); e.HasOne(r => r.Appointment).WithMany().HasForeignKey(r => r.AppointmentId).OnDelete(DeleteBehavior.SetNull); e.HasOne(r => r.Service).WithMany().HasForeignKey(r => r.ServiceId).OnDelete(DeleteBehavior.SetNull); });
            modelBuilder.Entity<UserDeviceToken>(e => { e.HasKey(t => t.Id); e.Property(t => t.ExpoPushToken).IsRequired().HasMaxLength(255); e.Property(t => t.Platform).HasMaxLength(50); e.HasIndex(t => t.ExpoPushToken); e.HasIndex(t => t.UserId); e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade); });
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
        public async Task<IEnumerable<Proposal>> GetProposalsByProviderUserIdAsync(Guid providerUserId) => await DbSet.Include(p => p.Service).Include(p => p.Provider).ThenInclude(pr => pr.User).Where(p => p.Provider.UserId == providerUserId).OrderByDescending(p => p.CreatedAt).AsNoTracking().ToListAsync();
    }

    public class ServiceRepository(AppDbContext context) : BaseRepository<Service>(context), IServiceRepository
    {
        public async Task<Service?> GetByIdWithDetailsAsync(Guid id) => 
            await DbSet
                .Include(s => s.Address)
                .Include(s => s.Customer)
                    .ThenInclude(c => c.User)
                .Include(s => s.Proposals)
                    .ThenInclude(p => p.Provider)
                        .ThenInclude(pr => pr.User)
                .Include(s => s.Appointment)
                    .ThenInclude(a => a.Provider)
                        .ThenInclude(pr => pr.User)
                .FirstOrDefaultAsync(s => s.Id == id);

        public async Task<IEnumerable<Service>> GetServicesByCustomerAsync(Guid customerId) => 
            await DbSet
                .Include(s => s.Proposals)
                    .ThenInclude(p => p.Provider)
                        .ThenInclude(pr => pr.User)
                .Include(s => s.Appointment)
                .Where(s => s.CustomerId == customerId)
                .OrderByDescending(s => s.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
    }

    public class AppointmentRepository(AppDbContext context) : BaseRepository<Appointment>(context), IAppointmentRepository
    {
        public async Task<Appointment?> GetByServiceIdAsync(Guid serviceId) => await DbSet.FirstOrDefaultAsync(a => a.ServiceId == serviceId);

        public async Task<IEnumerable<Appointment>> GetByProviderIdWithDetailsAsync(Guid providerId) =>
            await DbSet
                .Include(a => a.Service)
                .Include(a => a.Customer)
                    .ThenInclude(c => c.User)
                .Where(a => a.ProviderId == providerId)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
    }

    public class ServiceProviderRepository(AppDbContext context) : BaseRepository<ServiceProvider>(context), IServiceProviderRepository
    {
        public async Task<ServiceProvider?> GetByUserIdAsync(Guid userId)
        {
            var provider = await DbSet.Include(sp => sp.User).FirstOrDefaultAsync(sp => sp.UserId == userId);
            if (provider != null)
            {
                provider.CategoryIds = await Context.ProviderCategories
                    .Where(pc => pc.ProviderId == provider.Id && pc.Status == "Active")
                    .Select(pc => pc.CategoryId)
                    .ToListAsync();
            }
            return provider;
        }

        public async Task<ServiceProvider?> GetByIdWithUserAsync(Guid id) =>
            await DbSet.Include(sp => sp.User).FirstOrDefaultAsync(sp => sp.Id == id);

        public async Task<ServiceProvider?> GetWithDetailsByUserIdAsync(Guid userId) =>
            await DbSet
                .Include(sp => sp.User)
                .Include(sp => sp.Appointments)
                .Include(sp => sp.Proposals)
                .FirstOrDefaultAsync(sp => sp.UserId == userId);

        public async Task<ServiceProvider?> GetWithDetailsByIdAsync(Guid id) =>
            await DbSet
                .Include(sp => sp.User)
                .Include(sp => sp.Appointments)
                .Include(sp => sp.Proposals)
                .FirstOrDefaultAsync(sp => sp.Id == id);

        public async Task<List<string>> GetPortfolioAsync(Guid providerId)
        {
            var provider = await DbSet.AsNoTracking().FirstOrDefaultAsync(sp => sp.Id == providerId);
            return provider?.Portfolio ?? [];
        }

        public async Task<bool> AddPortfolioImageAsync(Guid providerId, string imageUrl)
        {
            var provider = await DbSet.FirstOrDefaultAsync(sp => sp.Id == providerId);
            if (provider is null) return false;
            if (provider.Portfolio.Contains(imageUrl)) return true;
            provider.Portfolio.Add(imageUrl);
            provider.Touch();
            DbSet.Update(provider);
            await Context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemovePortfolioImageAsync(Guid providerId, string imageUrl)
        {
            var provider = await DbSet.FirstOrDefaultAsync(sp => sp.Id == providerId);
            if (provider is null) return false;
            var removed = provider.Portfolio.Remove(imageUrl);
            if (!removed) return false;
            provider.Touch();
            DbSet.Update(provider);
            await Context.SaveChangesAsync();
            return true;
        }

        public async Task<List<(Guid Id, string Name)>> GetSpecialtiesAsync(Guid providerId)
        {
            var list = await Context.ProviderCategories
                .AsNoTracking()
                .Where(pc => pc.ProviderId == providerId && pc.Status == "Active")
                .Include(pc => pc.Category)
                .Select(pc => new { pc.Category.Id, pc.Category.Name })
                .ToListAsync();

            return list.Select(x => (x.Id, x.Name)).ToList();
        }
    }

    public class ChatMessageRepository(AppDbContext context) : BaseRepository<ChatMessage>(context), IChatMessageRepository
    {
        public async Task<IEnumerable<ChatMessage>> GetByProposalIdAsync(Guid proposalId) =>
            await DbSet
                .Where(m => m.ProposalId == proposalId)
                .OrderBy(m => m.SentAt)
                .AsNoTracking()
                .ToListAsync();

        public async Task<IEnumerable<ChatMessage>> GetByServiceIdAsync(Guid serviceId) =>
            await DbSet
                .Where(m => m.ServiceId == serviceId)
                .OrderBy(m => m.SentAt)
                .AsNoTracking()
                .ToListAsync();

        public async Task<ChatMessage> SendMessageAsync(Guid? proposalId, Guid? serviceId, Guid senderId, string content, bool isFromProvider)
        {
            var message = new ChatMessage
            {
                ProposalId = proposalId,
                ServiceId = serviceId,
                SenderId = senderId,
                Content = content,
                IsFromProvider = isFromProvider,
                SentAt = DateTime.UtcNow
            };
            await DbSet.AddAsync(message);
            await Context.SaveChangesAsync();
            return message;
        }

        public Task<ChatMessage> SendMessageAsync(Guid proposalId, Guid senderId, string content, bool isFromProvider) =>
            SendMessageAsync(proposalId, null, senderId, content, isFromProvider);
    }

    public class UserDeviceTokenRepository(AppDbContext context) : BaseRepository<UserDeviceToken>(context), IUserDeviceTokenRepository
    {
        public async Task<UserDeviceToken?> GetByTokenAsync(string token) =>
            await DbSet.FirstOrDefaultAsync(t => t.ExpoPushToken == token);

        public async Task<IEnumerable<UserDeviceToken>> GetByUserIdAsync(Guid userId) =>
            await DbSet.Where(t => t.UserId == userId).AsNoTracking().ToListAsync();

        public async Task<IEnumerable<UserDeviceToken>> GetByUserIdsAsync(IEnumerable<Guid> userIds) =>
            await DbSet.Where(t => userIds.Contains(t.UserId)).AsNoTracking().ToListAsync();

        public async Task<UserDeviceToken> RegisterOrUpdateAsync(Guid userId, string token, string? platform)
        {
            var existing = await DbSet.FirstOrDefaultAsync(t => t.ExpoPushToken == token);
            if (existing != null)
            {
                existing.UserId = userId;
                existing.Platform = platform ?? existing.Platform;
                existing.Touch();
                DbSet.Update(existing);
                await Context.SaveChangesAsync();
                return existing;
            }

            var deviceToken = new UserDeviceToken
            {
                UserId = userId,
                ExpoPushToken = token,
                Platform = platform
            };
            await DbSet.AddAsync(deviceToken);
            await Context.SaveChangesAsync();
            return deviceToken;
        }

        public async Task RemoveByTokenAsync(string token)
        {
            var tokens = await DbSet.Where(t => t.ExpoPushToken == token).ToListAsync();
            if (tokens.Count != 0)
            {
                DbSet.RemoveRange(tokens);
                await Context.SaveChangesAsync();
            }
        }
    }

    public class CategoryRepository(AppDbContext context) : BaseRepository<Category>(context), ICategoryRepository
    {
        public async Task<IEnumerable<Category>> GetAllOrderedByNameAsync() =>
            await DbSet.AsNoTracking().OrderBy(c => c.Name).ToListAsync();

        public async Task<IEnumerable<Category>> GetByProviderIdAsync(Guid providerId) =>
            await Context.ProviderCategories
                .AsNoTracking()
                .Where(pc => pc.ProviderId == providerId && pc.Status == "Active")
                .Include(pc => pc.Category)
                .Select(pc => pc.Category)
                .ToListAsync();

        public async Task UpdateProviderCategoriesAsync(Guid providerId, IEnumerable<Guid> categoryIds)
        {
            var existing = await Context.ProviderCategories
                .Where(pc => pc.ProviderId == providerId)
                .ToListAsync();

            Context.ProviderCategories.RemoveRange(existing);

            var distinctIds = categoryIds?.Distinct().ToList();
            if (distinctIds is { Count: > 0 })
            {
                foreach (var catId in distinctIds)
                {
                    Context.ProviderCategories.Add(new ProviderCategory
                    {
                        ProviderId = providerId,
                        CategoryId = catId,
                        Status = "Active"
                    });
                }
            }

            await Context.SaveChangesAsync();
        }
    }

    public class CustomerRepository(AppDbContext context) : BaseRepository<Customer>(context), ICustomerRepository
    {
        public async Task<Customer?> GetByUserIdWithUserAsync(Guid userId) =>
            await DbSet.Include(c => c.User).FirstOrDefaultAsync(c => c.UserId == userId);

        public async Task<Customer?> GetByIdWithUserAsync(Guid id) =>
            await DbSet.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == id);
    }

    public class ReviewRepository(AppDbContext context) : BaseRepository<Review>(context), IReviewRepository
    {
        public async Task<Review?> GetByServiceOrAppointmentAsync(Guid serviceId, Guid? appointmentId, Guid reviewerUserId) =>
            await DbSet.FirstOrDefaultAsync(r =>
                (r.ServiceId == serviceId || (appointmentId.HasValue && r.AppointmentId == appointmentId.Value))
                && r.ReviewerUserId == reviewerUserId);

        public async Task<Review?> GetByAppointmentAndReviewerAsync(Guid appointmentId, Guid reviewerUserId) =>
            await DbSet.FirstOrDefaultAsync(r => r.AppointmentId == appointmentId && r.ReviewerUserId == reviewerUserId);

        public async Task<Review?> GetReviewByServiceAsync(Guid serviceId)
        {
            var appt = await Context.Appointments.FirstOrDefaultAsync(a => a.ServiceId == serviceId);
            Guid? appointmentId = appt?.Id;

            return await DbSet
                .Include(r => r.ReviewerUser)
                .FirstOrDefaultAsync(r => r.ServiceId == serviceId || (appointmentId.HasValue && r.AppointmentId == appointmentId.Value));
        }

        public async Task<Review?> GetReviewByAppointmentAsync(Guid appointmentId) =>
            await DbSet
                .Include(r => r.ReviewerUser)
                .FirstOrDefaultAsync(r => r.AppointmentId == appointmentId);

        public async Task<IEnumerable<Review>> GetReviewsByReviewedUserIdAsync(Guid userId) =>
            await DbSet
                .Include(r => r.ReviewerUser)
                .Where(r => r.ReviewedUserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

        public async Task<List<int>> GetRatingsForUserAsync(Guid userId) =>
            await DbSet
                .Where(r => r.ReviewedUserId == userId)
                .Select(r => r.Rating)
                .ToListAsync();
    }

    public class UserRepository(AppDbContext context) : BaseRepository<User>(context), IUserRepository
    {
        public async Task<User?> GetByEmailAsync(string email) =>
            await DbSet.FirstOrDefaultAsync(u => u.Email == email);

        public async Task<bool> IsEmailInUseAsync(string email, Guid excludeUserId) =>
            await DbSet.AnyAsync(u => u.Email == email && u.Id != excludeUserId);
    }

    public class RefreshTokenRepository(AppDbContext context) : BaseRepository<RefreshToken>(context), IRefreshTokenRepository
    {
        public async Task<RefreshToken?> GetByTokenWithUserAsync(string token) =>
            await DbSet.Include(t => t.User).FirstOrDefaultAsync(t => t.Token == token);

        public async Task<RefreshToken?> GetByTokenAsync(string token) =>
            await DbSet.FirstOrDefaultAsync(t => t.Token == token);
    }

    public class PasswordHasher : IPasswordHasher
    {
        public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password);

        public bool VerifyPassword(string password, string passwordHash)
        {
            try
            {
                return BCrypt.Net.BCrypt.Verify(password, passwordHash);
            }
            catch
            {
                return false;
            }
        }
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
