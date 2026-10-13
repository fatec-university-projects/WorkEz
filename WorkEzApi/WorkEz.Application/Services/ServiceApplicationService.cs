using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public interface IServiceApplicationService
{
    Task<Result<ServiceResponseDto>> CreateServiceAsync(CreateServiceRequest request);
    Task<Result<ServiceResponseDto>> UpdateStatusAsync(Guid serviceId, UpdateServiceStatusRequest request);
    Task<Result<ServiceResponseDto>> ProviderAcceptAsync(Guid serviceId, ProviderAcceptRequest request);
    Task<ServiceResponseDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<ServiceResponseDto>> GetByCustomerAsync(Guid customerId);
}

public class ServiceApplicationService(IServiceDomainService serviceDomainService) : IServiceApplicationService
{
    private readonly IServiceDomainService _serviceDomainService = serviceDomainService;

    public async Task<Result<ServiceResponseDto>> CreateServiceAsync(CreateServiceRequest request)
    {
        var service = new Service
        {
            CustomerId = request.CustomerId,
            CategoryId = request.CategoryId,
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            DesiredDate = request.DesiredDate,
            ServiceStatus = ServiceStatus.Open
        };

        var result = await _serviceDomainService.CreateAsync(service);
        if (result.IsFailure)
        {
            return Result<ServiceResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        return Result<ServiceResponseDto>.Success(MapToDto(result.Value));
    }

    public async Task<Result<ServiceResponseDto>> UpdateStatusAsync(Guid serviceId, UpdateServiceStatusRequest request)
    {
        var result = await _serviceDomainService.UpdateServiceStatusAsync(serviceId, request.NewStatus, request.Observations);
        if (result.IsFailure)
        {
            return Result<ServiceResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        return Result<ServiceResponseDto>.Success(MapToDto(result.Value));
    }

    public async Task<Result<ServiceResponseDto>> ProviderAcceptAsync(Guid serviceId, ProviderAcceptRequest request)
    {
        var result = await _serviceDomainService.ProviderAcceptServiceAsync(
            request.ProviderUserId,
            serviceId,
            request.AgreedPrice,
            request.ScheduledDate
        );

        if (result.IsFailure)
        {
            return Result<ServiceResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        return Result<ServiceResponseDto>.Success(MapToDto(result.Value));
    }

    public async Task<ServiceResponseDto?> GetByIdAsync(Guid id)
    {
        var service = await _serviceDomainService.GetByIdWithDetailsAsync(id);
        return service is null ? null : MapToDto(service);
    }

    public async Task<IEnumerable<ServiceResponseDto>> GetByCustomerAsync(Guid customerId)
    {
        var services = await _serviceDomainService.GetServicesByCustomerAsync(customerId);
        return services.Select(MapToDto);
    }

    private static ServiceResponseDto MapToDto(Service service) => new(
        Id: service.Id,
        CustomerId: service.CustomerId,
        CategoryId: service.CategoryId,
        Title: service.Title,
        Description: service.Description,
        ImageUrl: service.ImageUrl,
        DesiredDate: service.DesiredDate,
        Status: service.ServiceStatus.ToString(),
        CreatedAt: service.CreatedAt,
        UpdatedAt: service.UpdatedAt
    );
}
