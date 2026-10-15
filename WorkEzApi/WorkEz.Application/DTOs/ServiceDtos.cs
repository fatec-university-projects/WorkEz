namespace WorkEz.Application.DTOs;

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

public record CustomerServiceSummaryDto(
    Guid Id,
    string Category,
    string Status,
    string Date,
    decimal? Price,
    string? Professional
);

public record ServiceProfessionalDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Photo,
    decimal? Rating
);

public record ServiceDetailDto(
    Guid Id,
    string Category,
    string Description,
    string Date,
    decimal? Price,
    string Status,
    string ClientName,
    string ClientPhone,
    string ClientPhoto,
    string Address,
    string AddressApproximate,
    double? Latitude,
    double? Longitude,
    string ImageUrl,
    string[] Images,
    ServiceProfessionalDto? Professional
);

public record ServiceStatusResultDto(
    Guid Id,
    string Status
);
