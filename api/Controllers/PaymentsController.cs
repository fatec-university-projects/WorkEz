using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Data;
using WorkEz.Api.DTOs;
using WorkEz.Api.Entities;
using WorkEz.Api.Enums;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages payments for appointments, integrated with AbacatePay.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PaymentsController(
    AppDbContext     context,
    IPaymentService  paymentGateway,
    IConfiguration   configuration) : ControllerBase
{
    // ── GET /api/payments/by-appointment/{appointmentId} ───────────────────────

    [Authorize]
    [HttpGet("by-appointment/{appointmentId}")]
    public async Task<IActionResult> GetPaymentsByAppointment(Guid appointmentId)
    {
        var payment = await context.Payments
            .AsNoTracking()
            .Where(p => p.AppointmentId == appointmentId)
            .Select(p => new PaymentStatusResponseDto
            {
                PaymentId  = p.Id,
                Status     = p.PaymentStatus.ToString(),
                Amount     = p.Amount,
                PaidAmount = p.PaidAmount,
                PaidAt     = p.PaidAt,
                PaymentUrl = p.PaymentUrl,
            })
            .FirstOrDefaultAsync();

        return payment is null ? NotFound() : Ok(payment);
    }

    // ── GET /api/payments/{id} ─────────────────────────────────────────────────

    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPaymentById(Guid id)
    {
        var p = await context.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        return Ok(new PaymentStatusResponseDto
        {
            PaymentId  = p.Id,
            Status     = p.PaymentStatus.ToString(),
            Amount     = p.Amount,
            PaidAmount = p.PaidAmount,
            PaidAt     = p.PaidAt,
            PaymentUrl = p.PaymentUrl,
        });
    }

    // ── GET /api/payments/{id}/status (polling endpoint) ──────────────────────

    [Authorize]
    [HttpGet("{id}/status")]
    public async Task<IActionResult> GetPaymentStatus(Guid id)
    {
        var payment = await context.Payments.FindAsync(id);
        if (payment is null) return NotFound();

        // If already in a terminal state, return from DB
        if (payment.PaymentStatus is PaymentStatus.Paid
            or PaymentStatus.Expired
            or PaymentStatus.Cancelled
            or PaymentStatus.Refunded)
        {
            return Ok(new PaymentStatusResponseDto
            {
                PaymentId  = payment.Id,
                Status     = payment.PaymentStatus.ToString(),
                Amount     = payment.Amount,
                PaidAmount = payment.PaidAmount,
                PaidAt     = payment.PaidAt,
                PaymentUrl = payment.PaymentUrl,
            });
        }

        // Poll AbacatePay for live status
        if (!string.IsNullOrEmpty(payment.AbacatePayPaymentId))
        {
            var billing = await paymentGateway.GetBillingStatusAsync(payment.AbacatePayPaymentId);
            if (billing is not null)
            {
                var newStatus = MapBillingStatus(billing.Status);
                if (newStatus != payment.PaymentStatus)
                {
                    payment.PaymentStatus = newStatus;
                    payment.UpdatedAt     = DateTime.UtcNow;

                    if (newStatus == PaymentStatus.Paid)
                    {
                        payment.PaidAmount = billing.Amount / 100m;
                        payment.PaidAt     = DateTime.UtcNow;
                    }

                    await context.SaveChangesAsync();
                }
            }
        }

        return Ok(new PaymentStatusResponseDto
        {
            PaymentId  = payment.Id,
            Status     = payment.PaymentStatus.ToString(),
            Amount     = payment.Amount,
            PaidAmount = payment.PaidAmount,
            PaidAt     = payment.PaidAt,
            PaymentUrl = payment.PaymentUrl,
        });
    }

    // ── POST /api/payments/{appointmentId} ─────────────────────────────────────

    [Authorize(Roles = "Customer")]
    [HttpPost("{appointmentId}")]
    public async Task<IActionResult> CreatePayment(Guid appointmentId)
    {
        // Load appointment + customer user
        var appointment = await context.Appointments
            .Include(a => a.Customer).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment is null)
            return NotFound("Agendamento não encontrado.");

        // Prevent duplicate payments
        var existing = await context.Payments
            .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);

        if (existing is not null && existing.PaymentStatus == PaymentStatus.Paid)
            return Conflict("Este agendamento já foi pago.");

        // If there's a pending payment, return it instead of creating a new one
        if (existing is not null && existing.PaymentStatus == PaymentStatus.Pending)
        {
            return Ok(new CreatePaymentResponseDto
            {
                PaymentId  = existing.Id,
                PaymentUrl = existing.PaymentUrl,
                Status     = existing.PaymentStatus.ToString(),
                ExpiresAt  = existing.ExpiresAt,
                Amount     = existing.Amount,
            });
        }

        var payment = new Payment
        {
            AppointmentId = appointmentId,
            Amount        = appointment.FinalPrice,
            PaymentMethod = PaymentMethod.Pix,
            PaymentStatus = PaymentStatus.Pending,
        };

        context.Payments.Add(payment);
        await context.SaveChangesAsync(); // Save first to get payment.Id

        try
        {
            var customer = appointment.Customer.User;
            var result   = await paymentGateway.CreateBillingAsync(
                paymentId:          payment.Id,
                amount:             payment.Amount,
                customerName:       customer.Name,
                customerEmail:      customer.Email,
                customerTaxId:      customer.DocumentNumber,
                customerCellphone:  customer.Phone);

            // Persist gateway data
            payment.AbacatePayPaymentId = result.PaymentUrl; // billing id is within the URL
            payment.ExternalId          = payment.Id.ToString();
            payment.PaymentUrl          = result.PaymentUrl;
            payment.ExpiresAt           = result.ExpiresAt;

            await context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPaymentById), new { id = payment.Id }, result);
        }
        catch (Exception ex)
        {
            // Rollback the payment record on gateway failure
            context.Payments.Remove(payment);
            await context.SaveChangesAsync();

            return StatusCode(502, new { error = ex.Message });
        }
    }

    // ── POST /api/payments/webhook ─────────────────────────────────────────────

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> HandleWebhook()
    {
        // ── Validate HMAC signature ──────────────────────────────────────────
        var secret = configuration["AbacatePay:WebhookSecret"];

        if (!string.IsNullOrEmpty(secret))
        {
            if (!Request.Headers.TryGetValue("x-abacatepay-signature", out var signatureHeader))
                return Unauthorized("Webhook signature header missing.");

            using var ms     = new MemoryStream();
            await Request.Body.CopyToAsync(ms);
            var rawBody      = ms.ToArray();

            var key          = Encoding.UTF8.GetBytes(secret);
            var computed     = Convert.ToHexString(
                HMACSHA256.HashData(key, rawBody)).ToLowerInvariant();
            var received     = signatureHeader.ToString().ToLowerInvariant()
                .Replace("sha256=", "");

            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(computed),
                    Encoding.UTF8.GetBytes(received)))
            {
                return Unauthorized("Invalid webhook signature.");
            }

            Request.Body = new MemoryStream(rawBody);
        }

        // ── Parse payload ────────────────────────────────────────────────────
        AbacatePayWebhookDto? webhook;
        try
        {
            webhook = await JsonSerializer.DeserializeAsync<AbacatePayWebhookDto>(
                Request.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch
        {
            return BadRequest("Invalid JSON payload.");
        }

        if (webhook?.Data?.Billing is null)
            return Ok(); // Unknown event shape – acknowledge safely

        var billing   = webhook.Data.Billing;
        var externalId = billing.ExternalId;

        if (string.IsNullOrEmpty(externalId) || !Guid.TryParse(externalId, out var paymentId))
            return Ok();

        var payment = await context.Payments.FindAsync(paymentId);
        if (payment is null) return Ok();

        // ── Update payment status ────────────────────────────────────────────
        payment.PaymentStatus    = MapBillingStatus(billing.Status);
        payment.WebhookEventType = webhook.Event;
        payment.WebhookPayload   = JsonSerializer.Serialize(webhook);
        payment.UpdatedAt        = DateTime.UtcNow;

        if (payment.PaymentStatus == PaymentStatus.Paid)
        {
            payment.PaidAmount = billing.Amount / 100m;
            payment.PaidAt     = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        return Ok();
    }

    // ── Providers wallet ───────────────────────────────────────────────────────

    [Authorize(Roles = "ServiceProvider")]
    [HttpGet("/api/Providers/{providerId}/wallet")]
    public async Task<IActionResult> GetProviderWallet(Guid providerId)
    {
        // Fetch all paid payments for appointments where this provider is involved
        var paidPayments = await context.Payments
            .AsNoTracking()
            .Include(p => p.Appointment)
                .ThenInclude(a => a.Service)
            .Where(p => p.Appointment.ProviderId == providerId
                     && p.PaymentStatus          == PaymentStatus.Paid)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        const decimal commissionRate = 0.15m; // 15% platform fee

        var totalGross   = paidPayments.Sum(p => p.PaidAmount ?? p.Amount);
        var totalNet     = totalGross * (1 - commissionRate);
        var thisMonth    = paidPayments
            .Where(p => p.PaidAt?.Month == DateTime.UtcNow.Month
                     && p.PaidAt?.Year  == DateTime.UtcNow.Year)
            .Sum(p => (p.PaidAmount ?? p.Amount) * (1 - commissionRate));

        var lastPayment  = paidPayments.FirstOrDefault();
        var lastGross    = lastPayment is not null ? (lastPayment.PaidAmount ?? lastPayment.Amount) : 0;

        var transactions = paidPayments.Select(p => new
        {
            date    = p.PaidAt?.ToString("dd/MM/yyyy") ?? p.CreatedAt.ToString("dd/MM/yyyy"),
            service = p.Appointment.Service.Title,
            value   = Math.Round((p.PaidAmount ?? p.Amount) * (1 - commissionRate), 2),
            status  = "received",
        }).ToList();

        // Also add pending payments
        var pendingPayments = await context.Payments
            .AsNoTracking()
            .Include(p => p.Appointment).ThenInclude(a => a.Service)
            .Where(p => p.Appointment.ProviderId == providerId
                     && p.PaymentStatus          == PaymentStatus.Pending)
            .ToListAsync();

        var receivable = pendingPayments.Sum(p => p.Amount * (1 - commissionRate));

        transactions.AddRange(pendingPayments.Select(p => new
        {
            date    = p.CreatedAt.ToString("dd/MM/yyyy"),
            service = p.Appointment.Service.Title,
            value   = Math.Round(p.Amount * (1 - commissionRate), 2),
            status  = "pending",
        }));

        return Ok(new
        {
            availableBalance = Math.Round(totalNet, 2),
            receivable       = Math.Round(receivable, 2),
            thisMonth        = Math.Round(thisMonth, 2),
            commission = new
            {
                lastService = lastGross.ToString("F2"),
                value       = Math.Round(lastGross * commissionRate, 2),
            },
            transactions = transactions.OrderByDescending(t => t.date),
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static PaymentStatus MapBillingStatus(string billingStatus) =>
        billingStatus.ToUpperInvariant() switch
        {
            // AbacatePay v1 billing STATUS field values
            "PAID"                              => PaymentStatus.Paid,
            "EXPIRED"                           => PaymentStatus.Expired,
            "CANCELLED"                         => PaymentStatus.Cancelled,
            // AbacatePay v1 webhook EVENT name values (billing.paid, billing.disputed)
            "BILLING.PAID"                      => PaymentStatus.Paid,
            "BILLING.DISPUTED"                  => PaymentStatus.Failed,
            // Legacy / fallback
            "BILLING_PAID"                      => PaymentStatus.Paid,
            "BILLING_EXPIRED"                   => PaymentStatus.Expired,
            _                                   => PaymentStatus.Pending,
        };
}
