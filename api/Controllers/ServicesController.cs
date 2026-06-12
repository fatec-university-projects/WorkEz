using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Api.Data;
using Microsoft.EntityFrameworkCore;
using WorkEz.Api.Entities;
using WorkEz.Api.Services;

namespace WorkEz.Api.Controllers;

/// <summary>
/// Manages service requests created by customers.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServicesController(AppDbContext context, IServiceService serviceService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllServices()
    {
        var list = await serviceService.GetAllAsync();
        return Ok(list);
    }

    [Authorize]
    [HttpGet("by-customer/{customerId}")]
    public async Task<IActionResult> GetServicesByCustomer(Guid customerId)
    {
        var list = await context.Services
            .Include(s => s.Category)
            .Include(s => s.Address)
            .Include(s => s.Proposals)
                .ThenInclude(p => p.Provider)
                    .ThenInclude(pr => pr.User)
            .Include(s => s.Appointment)
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var result = list.Select(s => {
            var acceptedProposal = s.Proposals.FirstOrDefault(p => p.ProposalStatus == Enums.ProposalStatus.Accepted);
            var providerName = acceptedProposal?.Provider?.User?.Name;
            
            string statusStr = s.ServiceStatus.ToString().ToLower();
            if (statusStr == "inprogress") statusStr = "in-progress";
            if (statusStr == "undernegotiation") statusStr = "accepted";
            if (statusStr == "ontheway") statusStr = "on-the-way";
            if (statusStr == "waitingpayment") statusStr = "waiting-payment";

            return new
            {
                id = s.Id,
                category = s.Category?.Name ?? "Geral",
                description = s.Description ?? "",
                date = s.CreatedAt.ToString("dd/MM/yyyy"),
                status = statusStr,
                price = s.Appointment?.FinalPrice ?? 0,
                professional = providerName
            };
        });

        return Ok(result);
    }

    [Authorize]
    [HttpGet("by-provider/{providerId}")]
    public async Task<IActionResult> GetServicesByProvider(Guid providerId)
    {
        var list = await context.Services
            .Include(s => s.Category)
            .Include(s => s.Address)
            .Include(s => s.Customer)
                .ThenInclude(c => c.User)
            .Include(s => s.Appointment)
            .Where(s => s.Proposals.Any(p => p.ProviderId == providerId && p.ProposalStatus == Enums.ProposalStatus.Accepted))
            .OrderByDescending(s => s.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var result = list.Select(s => {
            string statusStr = s.ServiceStatus.ToString().ToLower();
            if (statusStr == "inprogress") statusStr = "in-progress";
            if (statusStr == "undernegotiation") statusStr = "accepted";
            if (statusStr == "ontheway") statusStr = "on-the-way";
            if (statusStr == "waitingpayment") statusStr = "waiting-payment";

            return new
            {
                id = s.Id,
                category = s.Category?.Name ?? "Geral",
                description = s.Description ?? "",
                date = s.CreatedAt.ToString("dd/MM/yyyy"),
                status = statusStr,
                price = s.Appointment?.FinalPrice ?? 0,
                clientName = s.Customer?.User?.Name ?? "Cliente"
            };
        });

        return Ok(result);
    }

    [Authorize]
    [HttpGet("by-provider-user/{userId}")]
    public async Task<IActionResult> GetServicesByProviderUser(Guid userId)
    {
        var provider = await context.Providers.FirstOrDefaultAsync(p => p.UserId == userId);
        if (provider is null) return NotFound(new { message = "Prestador não encontrado." });

        return await GetServicesByProvider(provider.Id);
    }

    [Authorize]
    [HttpGet("opportunities-by-user/{userId}")]
    public async Task<IActionResult> GetOpportunitiesByUser(Guid userId)
    {
        var provider = await context.Providers
            .Include(p => p.ProviderCategories)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (provider is null) return NotFound(new { message = "Prestador não encontrado." });

        var categoryIds = provider.ProviderCategories.Select(pc => pc.CategoryId).ToList();

        var list = await context.Services
            .Include(s => s.Category)
            .Include(s => s.Customer)
                .ThenInclude(c => c.User)
            .Include(s => s.Address)
            .Where(s => s.ServiceStatus == Enums.ServiceStatus.Open && categoryIds.Contains(s.CategoryId))
            .AsNoTracking()
            .ToListAsync();

        var result = list.Select(s => new
        {
            id = s.Id,
            category = s.Category?.Name ?? "Geral",
            description = s.Description ?? "",
            status = s.ServiceStatus.ToString().ToLower(),
            date = s.CreatedAt.ToString("dd/MM/yyyy"),
            clientName = s.Customer?.User?.Name ?? "Cliente"
        });

        return Ok(result);
    }

    [Authorize(Roles = "ServiceProvider")]
    [HttpGet("nearby-services/{customerId}")]
    public async Task<IActionResult> GetNearbyServices(Guid customerId)
    {
        // Placeholder: use geo lookup in real implementation
        var list = await serviceService.GetAllAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetServiceById(Guid id)
    {
        var s = await context.Services
            .Include(x => x.Category)
            .Include(x => x.Address)
            .Include(x => x.Proposals)
                .ThenInclude(p => p.Provider)
                    .ThenInclude(pr => pr.User)
            .Include(x => x.Customer)
                .ThenInclude(c => c.User)
            .Include(x => x.Appointment)
            .FirstOrDefaultAsync(x => x.Id == id);
            
        if (s is null) return NotFound();

        var acceptedProposal = s.Proposals.FirstOrDefault(p => p.ProposalStatus == Enums.ProposalStatus.Accepted);
        var provider = acceptedProposal?.Provider;

        var addressStr = s.Address != null 
            ? $"{s.Address.Street}, {s.Address.Number} - {s.Address.Complement ?? ""}, {s.Address.City}"
            : "Endereço não informado";

        string statusStr = s.ServiceStatus.ToString().ToLower(); // "open", "accepted", "inprogress", "completed", "cancelled", "ontheway", "waitingpayment"
        if (statusStr == "inprogress") statusStr = "in-progress";
        if (statusStr == "undernegotiation") statusStr = "accepted";
        if (statusStr == "ontheway") statusStr = "on-the-way";
        if (statusStr == "waitingpayment") statusStr = "waiting-payment";

        return Ok(new
        {
            id = s.Id,
            category = s.Category?.Name ?? "Geral",
            address = addressStr,
            appointmentId = s.Appointment?.Id,
            providerUserId = provider?.UserId,
            addressDetails = s.Address != null ? new
            {
                zipCode = s.Address.ZipCode,
                street = s.Address.Street,
                number = s.Address.Number,
                complement = s.Address.Complement,
                neighborhood = s.Address.Neighborhood,
                city = s.Address.City,
                state = s.Address.State
            } : null,
            startTime = s.DesiredDate.HasValue ? s.DesiredDate.Value.ToString("dd/MM/yyyy HH:mm") : s.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
            status = statusStr,
            description = s.Description ?? "",
            imageUrl = s.ImageUrl,
            price = s.Appointment?.FinalPrice ?? 0,
            clientName = s.Customer?.User?.Name ?? "Cliente",
            clientPhoto = s.Customer?.User?.ProfilePicture,
            professional = provider != null ? new
            {
                id = provider.Id.ToString(),
                name = provider.User?.Name ?? "Profissional",
                photo = provider.User?.ProfilePicture,
                rating = provider.AverageRating
            } : null
        });
    }

    [Authorize]
    [HttpPost("{id}/accept")]
    public async Task<IActionResult> AcceptService(Guid id)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId)) return Unauthorized();

        var provider = await context.Providers.FirstOrDefaultAsync(p => p.UserId == userId);
        if (provider is null) return NotFound(new { message = "Prestador não encontrado." });

        var service = await context.Services
            .Include(s => s.Proposals)
            .FirstOrDefaultAsync(s => s.Id == id);
            
        if (service is null) return NotFound(new { message = "Serviço não encontrado." });
        if (service.ServiceStatus != Enums.ServiceStatus.Open)
        {
            return BadRequest(new { message = "Este serviço já foi aceito ou cancelado." });
        }

        service.ServiceStatus = Enums.ServiceStatus.Accepted;
        service.UpdatedAt = DateTime.UtcNow;

        var proposal = new Proposal
        {
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 150.00m,
            Description = "Aceito diretamente pelo prestador",
            ProposalStatus = Enums.ProposalStatus.Accepted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Proposals.Add(proposal);

        var appointment = new Appointment
        {
            ServiceId = service.Id,
            ProposalId = proposal.Id,
            CustomerId = service.CustomerId,
            ProviderId = provider.Id,
            AppointmentStatus = Enums.AppointmentStatus.Confirmed,
            FinalPrice = 150.00m,
            ScheduledDate = DateTime.UtcNow.AddDays(1),
            ConfirmationCode = new Random().Next(1000, 9999).ToString(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Appointments.Add(appointment);

        await context.SaveChangesAsync();

        return Ok(new { message = "Serviço aceito com sucesso!", appointmentId = appointment.Id });
    }

    [Authorize(Roles = "Customer")]
    [HttpPost("by-customer/{customerId}")]
    public async Task<IActionResult> CreateService(Guid customerId, [FromBody] Service service)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        service.CustomerId = customerId;

        // Find the Customer associated with this customerId
        var customer = await context.Customers.FirstOrDefaultAsync(c => c.Id == customerId);
        if (customer is null) return NotFound(new { message = "Customer not found." });

        if (service.Address is not null)
        {
            var addressId = service.Address.Id == Guid.Empty ? Guid.NewGuid() : service.Address.Id;
            var newAddress = new Address
            {
                Id = addressId,
                UserId = customer.UserId,
                ZipCode = service.Address.ZipCode,
                Street = service.Address.Street,
                Number = service.Address.Number,
                Complement = service.Address.Complement,
                Neighborhood = service.Address.Neighborhood,
                City = service.Address.City,
                State = service.Address.State,
                Latitude = service.Address.Latitude,
                Longitude = service.Address.Longitude,
                AddressType = service.Address.AddressType
            };
            service.Address = newAddress;
            service.AddressId = addressId;
        }

        await serviceService.CreateAsync(service);
        return CreatedAtAction(nameof(GetServiceById), new { id = service.Id }, service);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateService(Guid id, [FromBody] Service service)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (id != service.Id) return BadRequest(new { message = "Id mismatch." });
        var existing = await serviceService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceService.UpdateAsync(service);
        return NoContent();
    }
    
    [Authorize]
    [HttpPatch("{id}/start-displacement")]
    public async Task<IActionResult> StartDisplacement(Guid id)
    {
        var service = await context.Services.FirstOrDefaultAsync(s => s.Id == id);
        if (service is null) return NotFound();
        
        service.ServiceStatus = Enums.ServiceStatus.OnTheWay;
        service.UpdatedAt = DateTime.UtcNow;
        
        await context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPatch("{id}/start")]
    public async Task<IActionResult> StartService(Guid id)
    {
        var service = await context.Services
            .Include(s => s.Appointment)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (service is null) return NotFound();

        service.ServiceStatus = Enums.ServiceStatus.InProgress;
        service.UpdatedAt = DateTime.UtcNow;

        if (service.Appointment != null)
        {
            service.Appointment.AppointmentStatus = Enums.AppointmentStatus.InProgress;
            service.Appointment.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPatch("{id}/complete")]
    public async Task<IActionResult> CompleteService(Guid id, [FromQuery] decimal price)
    {
        var service = await context.Services
            .Include(s => s.Appointment)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (service is null) return NotFound();

        service.ServiceStatus = Enums.ServiceStatus.WaitingPayment;
        service.UpdatedAt = DateTime.UtcNow;

        if (service.Appointment != null)
        {
            service.Appointment.FinalPrice = price;
            service.Appointment.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPatch("{id}/pay")]
    public async Task<IActionResult> PayService(Guid id)
    {
        var service = await context.Services
            .Include(s => s.Appointment)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (service is null) return NotFound();

        service.ServiceStatus = Enums.ServiceStatus.Completed;
        service.UpdatedAt = DateTime.UtcNow;

        if (service.Appointment != null)
        {
            service.Appointment.AppointmentStatus = Enums.AppointmentStatus.Completed;
            service.Appointment.CompletedAt = DateTime.UtcNow;
            service.Appointment.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateServiceStatus(Guid id, bool status)
    {
        var s = await serviceService.GetByIdAsync(id);
        if (s is null) return NotFound();
        s.ServiceStatus = status ? Enums.ServiceStatus.Open : Enums.ServiceStatus.Cancelled;
        await serviceService.UpdateAsync(s);
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        var existing = await serviceService.GetByIdAsync(id);
        if (existing is null) return NotFound();
        await serviceService.DeleteAsync(id);
        return NoContent();
    }
}
