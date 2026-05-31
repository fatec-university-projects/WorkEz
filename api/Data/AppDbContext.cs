using WorkEz.Api.Entities;
using WorkEz.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace WorkEz.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>         Users         => Set<User>();
    public DbSet<UserPassword> UserPasswords => Set<UserPassword>();
    public DbSet<UserClaim>    UserClaims    => Set<UserClaim>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

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

            entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(u => u.IsActive).HasDefaultValue(true);
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

            // Guarantees no user has two password rows
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
    }
}
