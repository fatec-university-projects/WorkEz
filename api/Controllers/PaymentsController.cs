using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages payments for appointments, integrated with AbacatePay.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PaymentsController(AppDbContext context) : ControllerBase
{

    [HttpGet("by-appointment/{appointmentId}")]
    public async Task<IActionResult> GetPaymentsByAppointment(Guid appointmentId)
    {
        throw notimplementedException;
    }
    
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPaymentById(Guid id)
    {
        throw notimplementedException;
    }

    [HttpPost("{appointmentId}")]
    public async Task<IActionResult> CreatePayment(Guid appointmentId, Payment payment)
    {
        throw notimplementedException;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> HandleWebhook(Payment payment)
    {
        throw notimplementedException;
    }
}
