using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.WebSockets;

namespace WorkEz.WebUID.Controllers;

public class CreateAddressDto
{
    public string? ZipCode { get; set; }
    public string? Street { get; set; }
    public string? Number { get; set; }
    public string? Complement { get; set; }
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? AddressType { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class CreateServiceRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Guid? CategoryId { get; set; }
    public string? ImageUrl { get; set; }
    public CreateAddressDto? Address { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class ServicesController(
    IServiceOpportunityApplicationService opportunityService,
    AppDbContext db,
    ITrackingNotificationService? trackingNotification = null,
    IChatNotificationService? chatNotification = null) : ControllerBase
{
    /// <summary>
    /// Retorna chamados em aberto para o prestador.
    /// Se ele tiver categorias definidas, filtra por elas.
    /// Se NÃO tiver nenhuma área, retorna TODOS os chamados em aberto.
    /// </summary>
    [HttpGet("opportunities-by-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<OpportunityCallDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOpportunities(Guid userId)
    {
        var result = await opportunityService.GetOpportunitiesAsync(userId);
        return result.IsSuccess 
            ? Ok(result.Value) 
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Retorna os chamados aceitos/agendados do prestador.
    /// </summary>
    [HttpGet("by-provider-user/{userId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<OpportunityCallDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAcceptedByProviderUser(Guid userId)
    {
        var provider = await db.Providers.FirstOrDefaultAsync(p => p.UserId == userId);
        if (provider == null)
            return Ok(Enumerable.Empty<OpportunityCallDto>());

        var appointments = await db.Appointments
            .Include(a => a.Service)
            .Include(a => a.Customer)
                .ThenInclude(c => c.User)
            .Where(a => a.ProviderId == provider.Id)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var list = appointments.Select(a =>
        {
            var statusStr = a.Service?.ServiceStatus switch
            {
                ServiceStatus.OnTheWay => "on-the-way",
                ServiceStatus.InProgress => "in-progress",
                ServiceStatus.WaitingPayment => "waiting-payment",
                ServiceStatus.Completed => "completed",
                ServiceStatus.Cancelled => "cancelled",
                _ => "accepted"
            };

            return new OpportunityCallDto(
                Id: a.ServiceId,
                Category: string.IsNullOrWhiteSpace(a.Service?.Title) ? "Serviço" : a.Service.Title,
                Description: a.Service?.Description ?? string.Empty,
                Status: statusStr,
                Date: ToBrasiliaTime(a.ScheduledDate).ToString("dd'/'MM'/'yyyy"),
                ClientName: a.Customer?.User?.Name ?? "Cliente",
                SuggestedPrice: a.FinalPrice
            );
        });

        return Ok(list);
    }

    /// <summary>
    /// Cria um novo chamado associado a um cliente.
    /// </summary>
    [HttpPost("by-customer/{customerId:guid}")]
    public async Task<IActionResult> CreateService(Guid customerId, [FromBody] CreateServiceRequest request)
    {
        var customer = await db.Customers.Include(c => c.User).FirstOrDefaultAsync(c => c.Id == customerId);
        if (customer == null)
            return NotFound(new { message = "Cliente não encontrado." });

        Guid? createdAddressId = null;
        double? lat = null;
        double? lon = null;

        if (request.Address != null && !string.IsNullOrWhiteSpace(request.Address.Street))
        {
            var address = new Address
            {
                Id = Guid.NewGuid(),
                UserId = customer.UserId,
                Street = request.Address.Street ?? "",
                Number = request.Address.Number ?? "S/N",
                Complement = request.Address.Complement,
                Neighborhood = request.Address.Neighborhood ?? "",
                City = request.Address.City ?? "",
                State = request.Address.State ?? "",
                ZipCode = request.Address.ZipCode ?? "",
                AddressType = request.Address.AddressType ?? "Home",
                Latitude = request.Address.Latitude,
                Longitude = request.Address.Longitude
            };
            db.Addresses.Add(address);
            await db.SaveChangesAsync();

            createdAddressId = address.Id;
            lat = address.Latitude;
            lon = address.Longitude;
        }

        if (!lat.HasValue || !lon.HasValue)
        {
            var customerAddress = await db.Addresses
                .Where(a => a.UserId == customer.UserId && a.Latitude.HasValue && a.Longitude.HasValue)
                .FirstOrDefaultAsync();

            if (customerAddress != null)
            {
                lat ??= customerAddress.Latitude;
                lon ??= customerAddress.Longitude;
                createdAddressId ??= customerAddress.Id;
            }
        }

        var categoryId = request.CategoryId;
        if (!categoryId.HasValue || categoryId.Value == Guid.Empty)
        {
            categoryId = await db.Categories.Select(c => (Guid?)c.Id).FirstOrDefaultAsync();
        }

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            CategoryId = categoryId ?? Guid.Empty,
            AddressId = createdAddressId,
            Latitude = lat,
            Longitude = lon,
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Chamado de Serviço" : request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            ServiceStatus = ServiceStatus.Open,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Services.Add(service);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = service.Id }, new { id = service.Id });
    }

    /// <summary>
    /// Retorna os chamados criados por um cliente.
    /// </summary>
    [HttpGet("by-customer/{customerId:guid}")]
    public async Task<IActionResult> GetByCustomer(Guid customerId)
    {
        var services = await db.Services
            .Include(s => s.Proposals)
                .ThenInclude(p => p.Provider)
                    .ThenInclude(pr => pr.User)
            .Include(s => s.Appointment)
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        var list = services.Select(s =>
        {
            var acceptedProposal = s.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
            var providerName = acceptedProposal?.Provider?.User?.Name;
            var price = s.Appointment?.FinalPrice ?? acceptedProposal?.ProposedPrice;
            var brDate = ToBrasiliaTime(s.CreatedAt);

            return new
            {
                id = s.Id,
                category = string.IsNullOrWhiteSpace(s.Title) ? "Serviço" : s.Title,
                status = s.ServiceStatus.ToString().ToLower(),
                date = brDate.ToString("dd'/'MM'/'yyyy"),
                price,
                professional = providerName
            };
        });

        return Ok(list);
    }

    /// <summary>
    /// Retorna os detalhes de um chamado pelo Id.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var service = await db.Services
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

        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        var acceptedProposal = service.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        var activeProvider = service.Appointment?.Provider ?? acceptedProposal?.Provider;
        if (activeProvider == null && service.Appointment != null && service.Appointment.ProviderId != Guid.Empty)
        {
            activeProvider = await db.Providers.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == service.Appointment.ProviderId);
        }
        if (activeProvider == null && acceptedProposal != null && acceptedProposal.ProviderId != Guid.Empty)
        {
            activeProvider = await db.Providers.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == acceptedProposal.ProviderId);
        }
        if (activeProvider == null && service.ServiceStatus != ServiceStatus.Open)
        {
            var latestProp = service.Proposals.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            if (latestProp != null)
            {
                activeProvider = latestProp.Provider ?? await db.Providers.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == latestProp.ProviderId);
            }
        }

        var price = service.Appointment?.FinalPrice ?? acceptedProposal?.ProposedPrice;
        var clientPhone = service.Customer?.User?.Phone ?? "";
        var clientPhoto = service.Customer?.User?.ProfilePicture ?? "";

        object? professional = null;
        if (activeProvider != null)
        {
            var user = activeProvider.User;
            if (user == null && activeProvider.UserId != Guid.Empty)
            {
                user = await db.Users.FindAsync(activeProvider.UserId);
            }

            professional = new
            {
                id = activeProvider.Id,
                userId = activeProvider.UserId,
                name = user?.Name ?? "Profissional",
                photo = user?.ProfilePicture ?? "",
                rating = activeProvider.AverageRating
            };
        }

        var brStartTime = ToBrasiliaTime(service.CreatedAt);

        var address = service.Address;
        if (address == null && service.Customer != null)
        {
            address = await db.Addresses
                .Where(a => a.UserId == service.Customer.UserId)
                .FirstOrDefaultAsync();
        }

        string addressText = "Endereço cadastrado";
        string addressApproximate = "Endereço cadastrado";
        if (address != null)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(address.Street))
            {
                var streetPart = address.Street;
                if (!string.IsNullOrWhiteSpace(address.Number))
                    streetPart += $", {address.Number}";
                if (!string.IsNullOrWhiteSpace(address.Complement))
                    streetPart += $" ({address.Complement})";
                parts.Add(streetPart);
            }
            if (!string.IsNullOrWhiteSpace(address.Neighborhood))
                parts.Add(address.Neighborhood);
            if (!string.IsNullOrWhiteSpace(address.City))
                parts.Add(!string.IsNullOrWhiteSpace(address.State) ? $"{address.City}/{address.State}" : address.City);

            if (parts.Count > 0)
                addressText = string.Join(" - ", parts);

            if (!string.IsNullOrWhiteSpace(address.Neighborhood) && !string.IsNullOrWhiteSpace(address.City))
                addressApproximate = !string.IsNullOrWhiteSpace(address.State)
                    ? $"{address.Neighborhood}, {address.City}/{address.State}"
                    : $"{address.Neighborhood}, {address.City}";
            else
                addressApproximate = addressText;
        }

        string[] images = Array.Empty<string>();
        if (!string.IsNullOrWhiteSpace(service.ImageUrl))
        {
            var trimmed = service.ImageUrl.Trim();
            if (trimmed.StartsWith("["))
            {
                try
                {
                    images = JsonSerializer.Deserialize<string[]>(trimmed) ?? Array.Empty<string>();
                }
                catch
                {
                    images = new[] { service.ImageUrl };
                }
            }
            else
            {
                images = new[] { service.ImageUrl };
            }
        }

        return Ok(new
        {
            id = service.Id,
            appointmentId = service.Appointment?.Id,
            providerUserId = activeProvider?.UserId,
            category = string.IsNullOrWhiteSpace(service.Title) ? "Serviço" : service.Title,
            description = service.Description,
            address = addressText,
            addressApproximate,
            startTime = brStartTime.ToString("dd'/'MM'/'yyyy 'às' HH:mm"),
            createdAt = service.CreatedAt.ToString("o"),
            status = service.ServiceStatus.ToString().ToLower(),
            clientName = service.Customer?.User?.Name ?? "Cliente",
            clientPhone,
            clientPhoto,
            imageUrl = images.FirstOrDefault() ?? service.ImageUrl,
            images,
            price,
            date = brStartTime.ToString("dd'/'MM'/'yyyy"),
            professional
        });
    }

    private static DateTime ToBrasiliaTime(DateTime utcDate)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDate, DateTimeKind.Utc), tz);
        }
        catch
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDate, DateTimeKind.Utc), tz);
            }
            catch
            {
                return DateTime.SpecifyKind(utcDate, DateTimeKind.Utc).AddHours(-3);
            }
        }
    }

    /// <summary>
    /// Atualiza status de um chamado (ex: cancelamento).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] bool? status)
    {
        var service = await db.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Serviço não encontrado." });

        if (status == false)
        {
            service.ServiceStatus = ServiceStatus.Cancelled;
            service.Touch();
            await db.SaveChangesAsync();

            if (trackingNotification != null)
            {
                await trackingNotification.NotifyServiceUpdateAsync(id, "status_changed", new { status = "cancelled" });
            }
            if (chatNotification != null)
            {
                await chatNotification.NotifyChatUpdateAsync(Guid.Empty, id, "service_status_changed", new { status = "cancelled" });
            }
        }

        return Ok(new { id = service.Id, status = service.ServiceStatus.ToString().ToLower() });
    }

    /// <summary>
    /// Prestador inicia deslocamento até o cliente.
    /// </summary>
    [HttpPost("{id:guid}/start-displacement")]
    [HttpPatch("{id:guid}/start-displacement")]
    public async Task<IActionResult> StartDisplacement(Guid id)
    {
        var service = await db.Services.FindAsync(id);
        if (service == null) return NotFound();
        service.ServiceStatus = ServiceStatus.OnTheWay;
        service.Touch();

        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.ServiceId == id);
        if (appointment != null)
        {
            appointment.AppointmentStatus = AppointmentStatus.InProgress;
            appointment.Touch();
        }

        await db.SaveChangesAsync();

        if (trackingNotification != null)
        {
            await trackingNotification.NotifyServiceUpdateAsync(id, "status_changed", new { status = "on-the-way" });
        }
        if (chatNotification != null)
        {
            await chatNotification.NotifyChatUpdateAsync(Guid.Empty, id, "service_status_changed", new { status = "on-the-way" });
        }

        return Ok(new { id = service.Id, status = "on-the-way" });
    }

    /// <summary>
    /// Prestador inicia o serviço no local.
    /// </summary>
    [HttpPost("{id:guid}/start")]
    [HttpPatch("{id:guid}/start")]
    public async Task<IActionResult> StartService(Guid id)
    {
        var service = await db.Services.FindAsync(id);
        if (service == null) return NotFound();
        service.ServiceStatus = ServiceStatus.InProgress;
        service.Touch();

        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.ServiceId == id);
        if (appointment != null)
        {
            appointment.AppointmentStatus = AppointmentStatus.InProgress;
            appointment.Touch();
        }

        await db.SaveChangesAsync();

        if (trackingNotification != null)
        {
            await trackingNotification.NotifyServiceUpdateAsync(id, "status_changed", new { status = "in-progress" });
        }
        if (chatNotification != null)
        {
            await chatNotification.NotifyChatUpdateAsync(Guid.Empty, id, "service_status_changed", new { status = "in-progress" });
        }

        return Ok(new { id = service.Id, status = "in-progress" });
    }

    /// <summary>
    /// Prestador conclui o serviço e informa valor final.
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    [HttpPatch("{id:guid}/complete")]
    public async Task<IActionResult> CompleteService(Guid id, [FromQuery] decimal? price)
    {
        var service = await db.Services.FindAsync(id);
        if (service == null) return NotFound();
        service.ServiceStatus = ServiceStatus.Completed;
        service.Touch();

        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.ServiceId == id);
        if (appointment != null)
        {
            if (price.HasValue)
            {
                appointment.FinalPrice = price.Value;
            }
            appointment.CompletedAt = DateTime.UtcNow;
            appointment.AppointmentStatus = AppointmentStatus.Completed;
            appointment.Touch();
        }

        await db.SaveChangesAsync();

        if (trackingNotification != null)
        {
            await trackingNotification.NotifyServiceUpdateAsync(id, "status_changed", new { status = "completed" });
        }
        if (chatNotification != null)
        {
            await chatNotification.NotifyChatUpdateAsync(Guid.Empty, id, "service_status_changed", new { status = "completed" });
        }

        return Ok(new { id = service.Id, status = "completed" });
    }
}
