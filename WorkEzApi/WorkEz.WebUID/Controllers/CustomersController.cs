using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Domain.Entities;
using WorkEz.Infra.Data.Context;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController(AppDbContext db) : ControllerBase
{
    public record CustomerProfileDto(
        Guid Id,
        Guid UserId,
        string Name,
        string Email,
        string? Phone,
        string? Photo,
        string? Notes
    );

    /// <summary>
    /// Retorna perfil do cliente associado ao UserId.
    /// Cria automaticamente se não existir.
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "Usuário não encontrado." });

        var customer = await db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (customer == null)
        {
            customer = new Customer
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                User = user
            };
            db.Customers.Add(customer);
            await db.SaveChangesAsync();
        }

        return Ok(new CustomerProfileDto(
            customer.Id,
            customer.UserId,
            customer.User?.Name ?? user.Name,
            customer.User?.Email ?? user.Email,
            customer.User?.Phone ?? user.Phone,
            customer.User?.ProfilePicture ?? user.ProfilePicture,
            customer.Notes
        ));
    }

    /// <summary>
    /// Retorna dados do cliente pelo CustomerId.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var customer = await db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            return NotFound(new { message = "Cliente não encontrado." });

        return Ok(new CustomerProfileDto(
            customer.Id,
            customer.UserId,
            customer.User?.Name ?? "Cliente",
            customer.User?.Email ?? "",
            customer.User?.Phone,
            customer.User?.ProfilePicture,
            customer.Notes
        ));
    }
}
