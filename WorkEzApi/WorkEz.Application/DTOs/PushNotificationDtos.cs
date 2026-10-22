namespace WorkEz.Application.DTOs;

public record RegisterDeviceTokenRequest(
    Guid UserId,
    string ExpoPushToken,
    string? Platform = null
);

public record RemoveDeviceTokenRequest(
    string ExpoPushToken
);

public record SendPushNotificationRequest(
    Guid UserId,
    string Title,
    string Body,
    object? Data = null
);

public record ExpoPushMessage(
    string To,
    string Title,
    string Body,
    object? Data = null,
    string Sound = "default",
    string Priority = "high",
    string? ChannelId = "default"
);
