using System.Text.Json;
using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IServiceApplicationService
{
    Task<Result<IEnumerable<OpportunityCallDto>>> GetAcceptedByProviderUserAsync(Guid providerUserId, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceDetailDto>> CreateServiceAsync(Guid customerId, CreateServiceRequest request, Guid callerUserId, bool isAdmin);
    Task<Result<IEnumerable<CustomerServiceSummaryDto>>> GetByCustomerAsync(Guid customerId, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceDetailDto>> GetByIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceStatusResultDto>> UpdateStatusAsync(Guid serviceId, bool? status, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceStatusResultDto>> StartDisplacementAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceStatusResultDto>> StartServiceAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<Result<ServiceStatusResultDto>> CompleteServiceAsync(Guid serviceId, decimal? price, Guid callerUserId, bool isAdmin);
}

/// <summary>
/// Service Application Service seguindo Clean Architecture e SOLID.
/// Orquestra chamados, validações de acesso, geocodificação e notificações.
/// </summary>
public class ServiceApplicationService(
    IServiceRepository serviceRepository,
    IAppointmentRepository appointmentRepository,
    IServiceProviderRepository providerRepository,
    IBaseRepository<Customer> customerRepository,
    IBaseRepository<Address> addressRepository,
    IBaseRepository<User> userRepository,
    ITrackingNotificationService? trackingNotification = null,
    IChatNotificationService? chatNotification = null,
    IPushNotificationService? pushNotification = null,
    IWalletApplicationService? walletService = null
) : IServiceApplicationService
{
    private readonly IServiceRepository _serviceRepository = serviceRepository;
    private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
    private readonly IServiceProviderRepository _providerRepository = providerRepository;
    private readonly IBaseRepository<Customer> _customerRepository = customerRepository;
    private readonly IBaseRepository<Address> _addressRepository = addressRepository;
    private readonly IBaseRepository<User> _userRepository = userRepository;
    private readonly ITrackingNotificationService? _trackingNotification = trackingNotification;
    private readonly IChatNotificationService? _chatNotification = chatNotification;
    private readonly IPushNotificationService? _pushNotification = pushNotification;
    private readonly IWalletApplicationService? _walletService = walletService;

    public async Task<Result<IEnumerable<OpportunityCallDto>>> GetAcceptedByProviderUserAsync(Guid providerUserId, Guid callerUserId, bool isAdmin)
    {
        if (callerUserId != providerUserId && !isAdmin)
            return Result<IEnumerable<OpportunityCallDto>>.Failure("Você não possui permissão para visualizar estes chamados.", "FORBIDDEN");

        var provider = await _providerRepository.GetByUserIdAsync(providerUserId);
        if (provider == null)
            return Result<IEnumerable<OpportunityCallDto>>.Success(Enumerable.Empty<OpportunityCallDto>());

        var appointments = await _appointmentRepository.GetByProviderIdWithDetailsAsync(provider.Id);
        var list = appointments.Select(MapToOpportunityCallDto);

        return Result<IEnumerable<OpportunityCallDto>>.Success(list);
    }

    public async Task<Result<ServiceDetailDto>> CreateServiceAsync(Guid customerId, CreateServiceRequest request, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await ValidateCustomerOwnershipAsync(customerId, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ServiceDetailDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var customer = authCheck.Value!;
        var (addressId, lat, lon) = await CreateAndGeocodeAddressAsync(request.Address, customer.UserId);

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            AddressId = addressId,
            CategoryId = request.CategoryId ?? Guid.Empty,
            Title = request.Title ?? "Chamado",
            Description = request.Description ?? "",
            ImageUrl = request.ImageUrl,
            Latitude = lat,
            Longitude = lon,
            ServiceStatus = ServiceStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        await _serviceRepository.AddAsync(service);
        await _serviceRepository.SaveChangesAsync();

        return await GetByIdAsync(service.Id, callerUserId, isAdmin);
    }

    public async Task<Result<IEnumerable<CustomerServiceSummaryDto>>> GetByCustomerAsync(Guid customerId, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await ValidateCustomerOwnershipAsync(customerId, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<IEnumerable<CustomerServiceSummaryDto>>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var services = await _serviceRepository.GetServicesByCustomerAsync(customerId);
        var summaries = services.Select(s =>
        {
            var acceptedProposal = s.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
            var providerUser = s.Appointment?.Provider?.User ?? acceptedProposal?.Provider?.User;
            var finalPrice = s.Appointment?.FinalPrice ?? acceptedProposal?.ProposedPrice;

            return new CustomerServiceSummaryDto(
                Id: s.Id,
                Category: string.IsNullOrWhiteSpace(s.Title) ? "Serviço" : s.Title,
                Status: s.ServiceStatus.ToString().ToLower(),
                Date: ToBrasiliaTime(s.CreatedAt).ToString("dd'/'MM'/'yyyy"),
                Price: finalPrice,
                Professional: providerUser?.Name
            );
        });

        return Result<IEnumerable<CustomerServiceSummaryDto>>.Success(summaries);
    }

    public async Task<Result<ServiceDetailDto>> GetByIdAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId);
        if (service == null)
            return Result<ServiceDetailDto>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        var accessResult = AuthorizeServiceAccess(service, callerUserId, isAdmin);
        if (!accessResult.IsSuccess)
            return Result<ServiceDetailDto>.Failure(accessResult.Error!, accessResult.ErrorCode!);

        var (professional, price) = ResolveActiveProfessional(service);
        var (addressText, addressApproximate) = await ResolveAndFormatAddressAsync(service);
        var images = ParseServiceImages(service.ImageUrl);

        var isOwner = service.Customer?.UserId == callerUserId;
        var isAssignedProvider = service.Appointment != null && (service.Appointment.Provider?.UserId == callerUserId || service.Appointment.ProviderId == callerUserId);
        var isAssignedOrOwner = isAdmin || isOwner || isAssignedProvider;

        var dto = new ServiceDetailDto(
            Id: service.Id,
            Category: string.IsNullOrWhiteSpace(service.Title) ? "Serviço" : service.Title,
            Description: service.Description ?? "",
            Date: ToBrasiliaTime(service.CreatedAt).ToString("dd'/'MM'/'yyyy 'às' HH:mm"),
            Price: price,
            Status: service.ServiceStatus.ToString().ToLower(),
            ClientName: service.Customer?.User?.Name ?? "Cliente",
            ClientPhone: isAssignedOrOwner ? (service.Customer?.User?.Phone ?? "") : "",
            ClientPhoto: service.Customer?.User?.ProfilePicture ?? "",
            Address: addressText,
            AddressApproximate: addressApproximate,
            Latitude: service.Latitude,
            Longitude: service.Longitude,
            ImageUrl: service.ImageUrl ?? "",
            Images: images,
            Professional: professional
        );

        return Result<ServiceDetailDto>.Success(dto);
    }

    public async Task<Result<ServiceStatusResultDto>> UpdateStatusAsync(Guid serviceId, bool? status, Guid callerUserId, bool isAdmin)
    {
        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId) ?? await _serviceRepository.GetByIdAsync(serviceId);
        if (service == null)
            return Result<ServiceStatusResultDto>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        var customer = service.Customer ?? (await _customerRepository.FindAsync(c => c.Id == service.CustomerId)).FirstOrDefault();
        if ((customer == null || customer.UserId != callerUserId) && !isAdmin)
            return Result<ServiceStatusResultDto>.Failure("Você não possui permissão para alterar o status deste serviço.", "FORBIDDEN");

        if (status == false)
        {
            service.ServiceStatus = ServiceStatus.Cancelled;
            service.Touch();
            _serviceRepository.Update(service);
            await _serviceRepository.SaveChangesAsync();

            await NotifyStatusChangedAsync(serviceId, "cancelled");
        }

        return Result<ServiceStatusResultDto>.Success(new ServiceStatusResultDto(service.Id, service.ServiceStatus.ToString().ToLower()));
    }

    public async Task<Result<ServiceStatusResultDto>> StartDisplacementAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await AuthorizeAssignedProviderAsync(serviceId, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ServiceStatusResultDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var (service, appointment) = authCheck.Value;

        service.ServiceStatus = ServiceStatus.OnTheWay;
        service.Touch();
        _serviceRepository.Update(service);

        if (appointment != null)
        {
            appointment.AppointmentStatus = AppointmentStatus.InProgress;
            appointment.Touch();
            _appointmentRepository.Update(appointment);
        }

        await _serviceRepository.SaveChangesAsync();
        await NotifyStatusChangedAsync(serviceId, "on-the-way");
        DispatchDisplacementPushNotification(service);

        return Result<ServiceStatusResultDto>.Success(new ServiceStatusResultDto(service.Id, "on-the-way"));
    }

    public async Task<Result<ServiceStatusResultDto>> StartServiceAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await AuthorizeAssignedProviderAsync(serviceId, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ServiceStatusResultDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var (service, appointment) = authCheck.Value;

        service.ServiceStatus = ServiceStatus.InProgress;
        service.Touch();
        _serviceRepository.Update(service);

        if (appointment != null)
        {
            appointment.AppointmentStatus = AppointmentStatus.InProgress;
            appointment.Touch();
            _appointmentRepository.Update(appointment);
        }

        await _serviceRepository.SaveChangesAsync();
        await NotifyStatusChangedAsync(serviceId, "in-progress");

        return Result<ServiceStatusResultDto>.Success(new ServiceStatusResultDto(service.Id, "in-progress"));
    }

    public async Task<Result<ServiceStatusResultDto>> CompleteServiceAsync(Guid serviceId, decimal? price, Guid callerUserId, bool isAdmin)
    {
        var authCheck = await AuthorizeAssignedProviderAsync(serviceId, callerUserId, isAdmin);
        if (!authCheck.IsSuccess)
            return Result<ServiceStatusResultDto>.Failure(authCheck.Error!, authCheck.ErrorCode!);

        var (service, appointment) = authCheck.Value;

        service.ServiceStatus = ServiceStatus.Completed;
        service.Touch();
        _serviceRepository.Update(service);

        if (appointment != null)
        {
            if (price.HasValue) appointment.FinalPrice = price.Value;
            appointment.CompletedAt = DateTime.UtcNow;
            appointment.AppointmentStatus = AppointmentStatus.Completed;
            appointment.Touch();
            _appointmentRepository.Update(appointment);
        }

        await _serviceRepository.SaveChangesAsync();
        await NotifyStatusChangedAsync(serviceId, "completed");

        if (_walletService != null)
        {
            await _walletService.ReleaseEscrowForServiceAsync(serviceId, price);
        }

        return Result<ServiceStatusResultDto>.Success(new ServiceStatusResultDto(service.Id, "completed"));
    }

    // ─── Private Decomposition Methods ─────────────────────────────────────────

    private async Task<Result<Customer>> ValidateCustomerOwnershipAsync(Guid customerId, Guid callerUserId, bool isAdmin)
    {
        var customers = await _customerRepository.FindAsync(c => c.Id == customerId);
        var customer = customers.FirstOrDefault();
        if (customer == null)
            return Result<Customer>.Failure("Cliente não encontrado.", "CUSTOMER_NOT_FOUND");

        if (customer.UserId != callerUserId && !isAdmin)
            return Result<Customer>.Failure("Você não possui permissão para acessar dados de outro cliente.", "FORBIDDEN");

        return Result<Customer>.Success(customer);
    }

    private static Result<bool> AuthorizeServiceAccess(Service service, Guid callerUserId, bool isAdmin)
    {
        if (isAdmin) return Result<bool>.Success(true);

        var isOwner = service.Customer?.UserId == callerUserId;
        var hasProposal = service.Proposals.Any(p => p.Provider?.UserId == callerUserId || p.ProviderId == callerUserId);
        var isAssignedProvider = service.Appointment != null && (service.Appointment.Provider?.UserId == callerUserId || service.Appointment.ProviderId == callerUserId);
        var isParticipant = isOwner || hasProposal || isAssignedProvider;
        var isOpenOpportunity = service.ServiceStatus == ServiceStatus.Open || service.ServiceStatus == ServiceStatus.UnderNegotiation;

        if (!isParticipant && !isOpenOpportunity)
            return Result<bool>.Failure("Você não possui permissão para acessar este chamado.", "FORBIDDEN");

        return Result<bool>.Success(true);
    }

    private async Task<Result<(Service service, Appointment? appointment)>> AuthorizeAssignedProviderAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var service = await _serviceRepository.GetByIdWithDetailsAsync(serviceId) ?? await _serviceRepository.GetByIdAsync(serviceId);
        if (service == null)
            return Result<(Service, Appointment?)>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        var appointment = await _appointmentRepository.GetByServiceIdAsync(serviceId);
        var provider = appointment != null ? await _providerRepository.GetByIdWithUserAsync(appointment.ProviderId) : null;
        var isAssigned = provider != null && provider.UserId == callerUserId;

        if (!isAdmin && !isAssigned)
            return Result<(Service, Appointment?)>.Failure("Apenas o prestador contratado pode atualizar este serviço.", "FORBIDDEN");

        return Result<(Service, Appointment?)>.Success((service, appointment));
    }

    private static (ServiceProfessionalDto? professional, decimal? price) ResolveActiveProfessional(Service service)
    {
        var acceptedProposal = service.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);
        var activeProvider = service.Appointment?.Provider ?? acceptedProposal?.Provider;

        if (activeProvider == null && service.ServiceStatus != ServiceStatus.Open)
        {
            var latestProp = service.Proposals.OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            activeProvider = latestProp?.Provider;
        }

        var price = service.Appointment?.FinalPrice ?? acceptedProposal?.ProposedPrice;
        ServiceProfessionalDto? professional = null;

        if (activeProvider != null)
        {
            professional = new ServiceProfessionalDto(
                Id: activeProvider.Id,
                UserId: activeProvider.UserId,
                Name: activeProvider.User?.Name ?? "Profissional",
                Photo: activeProvider.User?.ProfilePicture ?? "",
                Rating: activeProvider.AverageRating
            );
        }

        return (professional, price);
    }

    private async Task<(string fullAddress, string approxAddress)> ResolveAndFormatAddressAsync(Service service)
    {
        var address = service.Address;
        if (address == null && service.Customer != null)
        {
            var addresses = await _addressRepository.FindAsync(a => a.UserId == service.Customer.UserId);
            address = addresses.FirstOrDefault();
        }

        if (address == null)
            return ("Endereço cadastrado", "Endereço cadastrado");

        var fullParts = new List<string>();
        if (!string.IsNullOrWhiteSpace(address.Street))
        {
            var street = address.Street;
            if (!string.IsNullOrWhiteSpace(address.Number)) street += $", {address.Number}";
            if (!string.IsNullOrWhiteSpace(address.Complement)) street += $" ({address.Complement})";
            fullParts.Add(street);
        }
        if (!string.IsNullOrWhiteSpace(address.Neighborhood)) fullParts.Add(address.Neighborhood);
        if (!string.IsNullOrWhiteSpace(address.City))
        {
            var city = address.City;
            if (!string.IsNullOrWhiteSpace(address.State)) city += $"/{address.State}";
            fullParts.Add(city);
        }

        var approxParts = new List<string>();
        if (!string.IsNullOrWhiteSpace(address.Neighborhood)) approxParts.Add(address.Neighborhood);
        if (!string.IsNullOrWhiteSpace(address.City))
        {
            var city = address.City;
            if (!string.IsNullOrWhiteSpace(address.State)) city += $"/{address.State}";
            approxParts.Add(city);
        }

        var full = fullParts.Count > 0 ? string.Join(" - ", fullParts) : "Endereço cadastrado";
        var approx = approxParts.Count > 0 ? string.Join(", ", approxParts) : "Endereço cadastrado";

        return (full, approx);
    }

    private static string[] ParseServiceImages(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return [];

        var trimmed = imageUrl.Trim();
        if (trimmed.StartsWith("["))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(trimmed);
                if (parsed != null && parsed.Count > 0) return parsed.ToArray();
            }
            catch { }
        }
        else if (trimmed.Contains(","))
        {
            return trimmed.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        return [trimmed];
    }

    private async Task<(Guid? addressId, double? lat, double? lon)> CreateAndGeocodeAddressAsync(CreateAddressDto? req, Guid customerUserId)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Street))
            return (null, null, null);

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = customerUserId,
            Street = req.Street ?? "",
            Number = req.Number ?? "S/N",
            Complement = req.Complement,
            Neighborhood = req.Neighborhood ?? "",
            City = req.City ?? "",
            State = req.State ?? "",
            ZipCode = req.ZipCode ?? "",
            AddressType = req.AddressType ?? "residential",
            Latitude = req.Latitude,
            Longitude = req.Longitude
        };

        if (!address.Latitude.HasValue || !address.Longitude.HasValue)
        {
            var query = BuildAddressSearchQuery(address);
            if (!string.IsNullOrWhiteSpace(query))
            {
                var (geoLat, geoLon) = await GeocodeAddressAsync(query);
                address.Latitude = geoLat;
                address.Longitude = geoLon;
            }
        }

        await _addressRepository.AddAsync(address);
        await _addressRepository.SaveChangesAsync();

        return (address.Id, address.Latitude, address.Longitude);
    }

    private static string BuildAddressSearchQuery(Address a)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(a.Street)) parts.Add(a.Street);
        if (!string.IsNullOrWhiteSpace(a.Number) && a.Number != "S/N") parts.Add(a.Number);
        if (!string.IsNullOrWhiteSpace(a.Neighborhood)) parts.Add(a.Neighborhood);
        if (!string.IsNullOrWhiteSpace(a.City)) parts.Add(a.City);
        if (!string.IsNullOrWhiteSpace(a.State)) parts.Add(a.State);
        if (!string.IsNullOrWhiteSpace(a.ZipCode)) parts.Add(a.ZipCode);
        return string.Join(", ", parts);
    }

    private async Task NotifyStatusChangedAsync(Guid serviceId, string statusKey)
    {
        if (_trackingNotification != null)
        {
            await _trackingNotification.NotifyServiceUpdateAsync(serviceId, "status_changed", new { status = statusKey });
        }
        if (_chatNotification != null)
        {
            await _chatNotification.NotifyChatUpdateAsync(Guid.Empty, serviceId, "service_status_changed", new { status = statusKey });
        }
    }

    private void DispatchDisplacementPushNotification(Service service)
    {
        if (_pushNotification == null) return;

        _ = Task.Run(async () =>
        {
            try
            {
                var customer = service.Customer ?? (await _customerRepository.FindAsync(c => c.Id == service.CustomerId)).FirstOrDefault();
                if (customer != null)
                {
                    await _pushNotification.SendToUserAsync(
                        customer.UserId,
                        "🚗 Prestador a caminho!",
                        "O profissional iniciou o deslocamento até o seu endereço.",
                        new { type = "provider_on_the_way", serviceId = service.Id }
                    );
                }
            }
            catch { }
        });
    }

    private static OpportunityCallDto MapToOpportunityCallDto(Appointment a)
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
    }

    private static async Task<(double? lat, double? lon)> GeocodeAddressAsync(string addressQuery)
    {
        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("User-Agent", "WorkEzApp/1.0");
            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(addressQuery)}&format=json&limit=1";
            var response = await client.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var items = JsonSerializer.Deserialize<List<NominatimResult>>(content);
                if (items != null && items.Count > 0)
                {
                    if (double.TryParse(items[0].lat, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedLat) &&
                        double.TryParse(items[0].lon, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedLon))
                    {
                        return (parsedLat, parsedLon);
                    }
                }
            }
        }
        catch { }
        return (null, null);
    }

    private static DateTime ToBrasiliaTime(DateTime utcDate)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
            return TimeZoneInfo.ConvertTimeFromUtc(utcDate, tz);
        }
        catch
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
                return TimeZoneInfo.ConvertTimeFromUtc(utcDate, tz);
            }
            catch
            {
                return DateTime.SpecifyKind(utcDate, DateTimeKind.Utc).AddHours(-3);
            }
        }
    }

    private class NominatimResult
    {
        public string? lat { get; set; }
        public string? lon { get; set; }
    }
}
