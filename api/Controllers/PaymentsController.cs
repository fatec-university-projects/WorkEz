using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages payments for appointments, integrated with AbacatePay.
/// </summary>
[ApiController]
[Route("api/[controller]")]
   public class PaymentsController(AppDbContext context, IPaymentService paymentGateway) : ControllerBase
{

    [AllowAnonymous]
    [HttpGet("by-appointment/{appointmentId}")]
    public async Task<IActionResult> GetPaymentsByAppointment(Guid appointmentId)
    {
           var list = await context.Payments.AsNoTracking().Where(p => p.AppointmentId == appointmentId).ToListAsync();
           return Ok(list);
    }
    
    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPaymentById(Guid id)
    {
           var p = await context.Payments.FindAsync(id);
           return p is null ? NotFound() : Ok(p);
    }

    [AllowAnonymous]
    [HttpPost("{appointmentId}")]
    public async Task<IActionResult> CreatePayment(Guid appointmentId, Payment payment)
    {
           if (!ModelState.IsValid) return BadRequest(ModelState);
           payment.AppointmentId = appointmentId;
           context.Payments.Add(payment);
           await context.SaveChangesAsync();

           return CreatedAtAction(nameof(GetPaymentById), new { id = payment.Id }, payment);
    }

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> HandleWebhook(Payment payment)
    {
           var existing = await context.Payments.FirstOrDefaultAsync(p => p.ExternalId == payment.ExternalId && !string.IsNullOrEmpty(payment.ExternalId));
           if (existing is null)
           {
               context.Payments.Add(payment);
           }
           else
           {
               existing.PaymentStatus = payment.PaymentStatus;
               existing.PaidAmount = payment.PaidAmount;
               existing.UpdatedAt = DateTime.UtcNow;
           }

           await context.SaveChangesAsync();
           return Ok();
    }
}
