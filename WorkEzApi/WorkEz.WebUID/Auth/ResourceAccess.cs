using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;

namespace WorkEz.WebUID.Auth;

/// <summary>
/// Identidade do usuário autenticado, sempre lida do JWT (claim "sub"/"role"),
/// nunca de body, query ou rota enviados pelo cliente.
/// </summary>
public static class CurrentUserExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal? user) =>
        user != null && Guid.TryParse(user.FindFirst("sub")?.Value, out var id) ? id : null;

    public static bool IsAdmin(this ClaimsPrincipal? user) => user != null && user.IsInRole(nameof(UserRole.Admin));
}

/// <summary>
/// Verificações de posse/participação de recursos, usadas pelos controllers e pelos WebSockets
/// para impedir que um usuário acesse dados de outro (IDOR).
/// </summary>
public static class ResourceAccess
{
    public static Task<bool> OwnsCustomerAsync(this AppDbContext db, Guid customerId, Guid userId) =>
        db.Customers.AnyAsync(c => c.Id == customerId && c.UserId == userId);

    public static Task<bool> OwnsProviderAsync(this AppDbContext db, Guid providerId, Guid userId) =>
        db.Providers.AnyAsync(p => p.Id == providerId && p.UserId == userId);

    /// <summary>Usuário é o cliente dono do chamado.</summary>
    public static Task<bool> IsServiceCustomerAsync(this AppDbContext db, Guid serviceId, Guid userId) =>
        db.Services.AnyAsync(s => s.Id == serviceId && s.Customer.UserId == userId);

    /// <summary>
    /// Usuário é o prestador do chamado: tem agendamento ou ao menos uma proposta nele.
    /// </summary>
    public static async Task<bool> IsServiceProviderAsync(this AppDbContext db, Guid serviceId, Guid userId) =>
        await db.Appointments.AnyAsync(a => a.ServiceId == serviceId && a.Provider.UserId == userId)
        || await db.Proposals.AnyAsync(p => p.ServiceId == serviceId && p.Provider.UserId == userId);

    public static async Task<bool> IsServiceParticipantAsync(this AppDbContext db, Guid serviceId, Guid userId) =>
        await db.IsServiceCustomerAsync(serviceId, userId) || await db.IsServiceProviderAsync(serviceId, userId);

    /// <summary>Prestador atribuído ao chamado (agendamento criado ao aceitar proposta).</summary>
    public static Task<bool> IsAssignedProviderAsync(this AppDbContext db, Guid serviceId, Guid userId) =>
        db.Appointments.AnyAsync(a => a.ServiceId == serviceId && a.Provider.UserId == userId);

    public static Task<bool> IsProposalCustomerAsync(this AppDbContext db, Guid proposalId, Guid userId) =>
        db.Proposals.AnyAsync(p => p.Id == proposalId && p.Service.Customer.UserId == userId);

    public static Task<bool> IsProposalProviderAsync(this AppDbContext db, Guid proposalId, Guid userId) =>
        db.Proposals.AnyAsync(p => p.Id == proposalId && p.Provider.UserId == userId);

    public static async Task<bool> IsProposalParticipantAsync(this AppDbContext db, Guid proposalId, Guid userId) =>
        await db.IsProposalCustomerAsync(proposalId, userId) || await db.IsProposalProviderAsync(proposalId, userId);
}
