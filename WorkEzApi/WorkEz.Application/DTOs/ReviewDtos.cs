namespace WorkEz.Application.DTOs;

public record CreateReviewRequest(
    Guid? AppointmentId,
    Guid? ReviewedUserId,
    int Rating,
    string? Comment,
    Guid? ServiceId = null
);

public record ReviewDto(
    Guid Id,
    string ClientName,
    string? ClientPhoto,
    int Rating,
    string? Comment,
    DateTime CreatedAt
);

public record ReviewCreatedResultDto(
    string Message,
    int Rating,
    Guid Id,
    bool IsUpdate
);
