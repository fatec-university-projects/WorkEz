using WorkEz.Api.Entities;
using WorkEz.Api.Enums;
using Microsoft.EntityFrameworkCore;
using WorkezServiceProvider = WorkEz.Api.Entities.ServiceProvider;

namespace WorkEz.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // ── Auth ───────────────────────────────────────────────────────────────────
    public DbSet<User>         Users         => Set<User>();
    public DbSet<UserPassword> UserPasswords => Set<UserPassword>();
    public DbSet<UserClaim>    UserClaims    => Set<UserClaim>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // ── Profiles ───────────────────────────────────────────────────────────────
    public DbSet<Customer>         Customers      => Set<Customer>();
    public DbSet<WorkezServiceProvider>  Providers      => Set<WorkezServiceProvider>();
    public DbSet<Administrator>    Administrators => Set<Administrator>();

    // ── Catalogue ─────────────────────────────────────────────────────────────
    public DbSet<Category>         Categories        => Set<Category>();
    public DbSet<ProviderCategory> ProviderCategories => Set<ProviderCategory>();
    public DbSet<Address>          Addresses         => Set<Address>();
    public DbSet<ServiceArea>      ServiceAreas      => Set<ServiceArea>();

    // ── Core workflow ─────────────────────────────────────────────────────────
    public DbSet<Service>     Services     => Set<Service>();
    public DbSet<Proposal>    Proposals    => Set<Proposal>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Payment>     Payments     => Set<Payment>();

    // ── Communication & social ────────────────────────────────────────────────
    public DbSet<Conversation>  Conversations  => Set<Conversation>();
    public DbSet<Message>       Messages       => Set<Message>();
    public DbSet<Review>        Reviews        => Set<Review>();
    public DbSet<Report>        Reports        => Set<Report>();
    public DbSet<Notification>  Notifications  => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── USER ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).ValueGeneratedNever();
            entity.Property(u => u.Name).IsRequired().HasMaxLength(200);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(320);
            entity.HasIndex(u => u.Email).IsUnique().HasDatabaseName("UX_User_Email");
            entity.Property(u => u.Phone).HasMaxLength(30);
            entity.Property(u => u.DocumentNumber).HasMaxLength(20);
            entity.Property(u => u.ProfilePicture).HasMaxLength(500);
            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(u => u.AccountStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(u => u.UpdatedAt).IsRequired();
        });

        // ── USER PASSWORD (one-to-one) ─────────────────────────────────────────
        modelBuilder.Entity<UserPassword>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever();
            entity.Property(p => p.PasswordHash).IsRequired().HasMaxLength(100);
            entity.HasOne(p => p.User)
                .WithOne(u => u.Password)
                .HasForeignKey<UserPassword>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(p => p.UserId).IsUnique().HasDatabaseName("UX_UserPassword_UserId");
        });

        // ── USER CLAIMS (one-to-many) ──────────────────────────────────────────
        modelBuilder.Entity<UserClaim>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever();
            entity.Property(c => c.ClaimValue).IsRequired().HasMaxLength(200);
            entity.HasOne(c => c.User)
                .WithMany(u => u.Claims)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── REFRESH TOKENS (one-to-many) ───────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).ValueGeneratedNever();
            entity.Property(r => r.Token).IsRequired().HasMaxLength(200);
            entity.HasIndex(r => r.Token).IsUnique().HasDatabaseName("UX_RefreshToken_Token");
            entity.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── CUSTOMER (one-to-one with User) ───────────────────────────────────
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever();
            entity.Property(c => c.Notes).HasMaxLength(1000);
            entity.HasOne(c => c.User)
                .WithOne(u => u.Customer)
                .HasForeignKey<Customer>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(c => c.UserId).IsUnique().HasDatabaseName("UX_Customer_UserId");
        });

        // ── SERVICE PROVIDER (one-to-one with User) ───────────────────────────
        modelBuilder.Entity<WorkezServiceProvider>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever();
            entity.Property(p => p.ProfessionalDescription).HasMaxLength(2000);
            entity.Property(p => p.AverageRating).HasPrecision(3, 2);
            entity.Property(p => p.AvailabilityStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(p => p.User)
                .WithOne(u => u.ServiceProvider)
                .HasForeignKey<WorkezServiceProvider>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(p => p.UserId).IsUnique().HasDatabaseName("UX_ServiceProvider_UserId");
        });

        // ── ADMINISTRATOR (one-to-one with User) ──────────────────────────────
        modelBuilder.Entity<Administrator>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedNever();
            entity.Property(a => a.Role).HasMaxLength(100);
            entity.Property(a => a.AccessLevel).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(a => a.User)
                .WithOne(u => u.Administrator)
                .HasForeignKey<Administrator>(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(a => a.UserId).IsUnique().HasDatabaseName("UX_Administrator_UserId");
        });

        // ── CATEGORY ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever();
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(c => c.Name).IsUnique().HasDatabaseName("UX_Category_Name");
            entity.Property(c => c.Description).HasMaxLength(500);
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
        });

        // ── PROVIDER CATEGORY ─────────────────────────────────────────────────
        modelBuilder.Entity<ProviderCategory>(entity =>
        {
            entity.HasKey(pc => pc.Id);
            entity.Property(pc => pc.Id).ValueGeneratedNever();
            entity.Property(pc => pc.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasIndex(pc => new { pc.ProviderId, pc.CategoryId })
                  .IsUnique().HasDatabaseName("UX_ProviderCategory_Provider_Category");
            entity.HasOne(pc => pc.Provider)
                .WithMany(p => p.ProviderCategories)
                .HasForeignKey(pc => pc.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(pc => pc.Category)
                .WithMany(c => c.ProviderCategories)
                .HasForeignKey(pc => pc.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ADDRESS ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedNever();
            entity.Property(a => a.ZipCode).IsRequired().HasMaxLength(10);
            entity.Property(a => a.Street).IsRequired().HasMaxLength(300);
            entity.Property(a => a.Number).IsRequired().HasMaxLength(20);
            entity.Property(a => a.Complement).HasMaxLength(200);
            entity.Property(a => a.Neighborhood).IsRequired().HasMaxLength(200);
            entity.Property(a => a.City).IsRequired().HasMaxLength(200);
            entity.Property(a => a.State).IsRequired().HasMaxLength(2);
            entity.Property(a => a.AddressType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(a => a.User)
                .WithMany(u => u.Addresses)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SERVICE AREA ──────────────────────────────────────────────────────
        modelBuilder.Entity<ServiceArea>(entity =>
        {
            entity.HasKey(sa => sa.Id);
            entity.Property(sa => sa.Id).ValueGeneratedNever();
            entity.Property(sa => sa.City).IsRequired().HasMaxLength(200);
            entity.Property(sa => sa.State).IsRequired().HasMaxLength(2);
            entity.Property(sa => sa.Neighborhood).HasMaxLength(200);
            entity.Property(sa => sa.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(sa => sa.Provider)
                .WithMany(p => p.ServiceAreas)
                .HasForeignKey(sa => sa.ProviderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SERVICE ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).ValueGeneratedNever();
            entity.Property(s => s.Title).IsRequired().HasMaxLength(300);
            entity.Property(s => s.Description).HasMaxLength(3000);
            entity.Property(s => s.UrgencyLevel).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(s => s.ServiceStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(s => s.UpdatedAt).IsRequired();
            entity.HasOne(s => s.Customer)
                .WithMany(c => c.Services)
                .HasForeignKey(s => s.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.Category)
                .WithMany(c => c.Services)
                .HasForeignKey(s => s.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.Address)
                .WithMany(a => a.Services)
                .HasForeignKey(s => s.AddressId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PROPOSAL ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Proposal>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever();
            entity.Property(p => p.ProposedPrice).HasPrecision(10, 2).IsRequired();
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.EstimatedTime).HasMaxLength(100);
            entity.Property(p => p.ProposalStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(p => p.UpdatedAt).IsRequired();
            entity.HasOne(p => p.Service)
                .WithMany(s => s.Proposals)
                .HasForeignKey(p => p.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.Provider)
                .WithMany(sp => sp.Proposals)
                .HasForeignKey(p => p.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── APPOINTMENT ───────────────────────────────────────────────────────
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).ValueGeneratedNever();
            entity.Property(a => a.FinalPrice).HasPrecision(10, 2).IsRequired();
            entity.Property(a => a.ConfirmationCode).HasMaxLength(20);
            entity.Property(a => a.AppointmentStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(a => a.UpdatedAt).IsRequired();
            entity.HasIndex(a => a.ServiceId).IsUnique().HasDatabaseName("UX_Appointment_ServiceId");
            entity.HasIndex(a => a.ProposalId).IsUnique().HasDatabaseName("UX_Appointment_ProposalId");
            entity.HasOne(a => a.Service)
                .WithOne(s => s.Appointment)
                .HasForeignKey<Appointment>(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(a => a.Proposal)
                .WithOne(p => p.Appointment)
                .HasForeignKey<Appointment>(a => a.ProposalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(a => a.Customer)
                .WithMany(c => c.Appointments)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(a => a.Provider)
                .WithMany(sp => sp.Appointments)
                .HasForeignKey(a => a.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PAYMENT ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever();
            entity.Property(p => p.AbacatePayPaymentId).HasMaxLength(200);
            entity.Property(p => p.ExternalId).HasMaxLength(200);
            entity.Property(p => p.PaymentUrl).HasMaxLength(1000);
            entity.Property(p => p.ReceiptUrl).HasMaxLength(1000);
            entity.Property(p => p.Amount).HasPrecision(10, 2).IsRequired();
            entity.Property(p => p.PaidAmount).HasPrecision(10, 2);
            entity.Property(p => p.WebhookEventType).HasMaxLength(100);
            entity.Property(p => p.PaymentMethod).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(p => p.PaymentStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(p => p.UpdatedAt).IsRequired();
            entity.HasIndex(p => p.AppointmentId).IsUnique().HasDatabaseName("UX_Payment_AppointmentId");
            entity.HasOne(p => p.Appointment)
                .WithOne(a => a.Payment)
                .HasForeignKey<Payment>(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── CONVERSATION ──────────────────────────────────────────────────────
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).ValueGeneratedNever();
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(c => c.UpdatedAt).IsRequired();
            entity.HasIndex(c => c.ServiceId).IsUnique().HasDatabaseName("UX_Conversation_ServiceId");
            entity.HasOne(c => c.Service)
                .WithOne(s => s.Conversation)
                .HasForeignKey<Conversation>(c => c.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(c => c.Customer)
                .WithMany(cu => cu.Conversations)
                .HasForeignKey(c => c.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(c => c.Provider)
                .WithMany(sp => sp.Conversations)
                .HasForeignKey(c => c.ProviderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── MESSAGE ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).ValueGeneratedNever();
            entity.Property(m => m.Content).IsRequired().HasMaxLength(4000);
            entity.Property(m => m.MessageType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.SenderUser)
                .WithMany()
                .HasForeignKey(m => m.SenderUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── REVIEW (one-to-many with Appointment) ─────────────────────────────
        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).ValueGeneratedNever();
            entity.Property(r => r.Rating).IsRequired();
            entity.Property(r => r.Comment).HasMaxLength(2000);
            entity.HasOne(r => r.Appointment)
                .WithMany(a => a.Reviews)
                .HasForeignKey(r => r.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(r => r.ReviewerUser)
                .WithMany()
                .HasForeignKey(r => r.ReviewerUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(r => r.ReviewedUser)
                .WithMany()
                .HasForeignKey(r => r.ReviewedUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── REPORT (one-to-many with Appointment) ─────────────────────────────
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).ValueGeneratedNever();
            entity.Property(r => r.Reason).IsRequired().HasMaxLength(200);
            entity.Property(r => r.Description).HasMaxLength(2000);
            entity.Property(r => r.ReportStatus).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(r => r.Appointment)
                .WithMany(a => a.Reports)
                .HasForeignKey(r => r.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(r => r.ReporterUser)
                .WithMany()
                .HasForeignKey(r => r.ReporterUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(r => r.ReportedUser)
                .WithMany()
                .HasForeignKey(r => r.ReportedUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });


        // ── NOTIFICATION ──────────────────────────────────────────────────────
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).ValueGeneratedNever();
            entity.Property(n => n.Title).IsRequired().HasMaxLength(200);
            entity.Property(n => n.Message).IsRequired().HasMaxLength(1000);
            entity.Property(n => n.NotificationType).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
