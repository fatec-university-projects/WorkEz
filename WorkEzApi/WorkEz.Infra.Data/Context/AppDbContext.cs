using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;

namespace WorkEz.Infra.Data.Context;

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
