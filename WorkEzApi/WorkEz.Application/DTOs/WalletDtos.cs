namespace WorkEz.Application.DTOs;

public record CommissionInfoDetailDto(
    string ServiceTitle,
    decimal GrossAmount,
    decimal LaborAmount,
    decimal MaterialsAmount,
    decimal PlatformFeeAmount,
    decimal NetAmount,
    DateTime Date
);

public record WalletSummaryDto(
    Guid ProviderId,
    decimal AvailableBalance,
    decimal EscrowBalance,
    decimal ThisMonthGross,
    decimal ThisMonthNet,
    decimal TotalWithdrawn,
    decimal PendingWithdrawal,
    decimal PlatformFeePercent,
    decimal MaterialsFeePercent,
    CommissionInfoDetailDto? LastCommission,
    string? DefaultPixKey = null,
    string? DefaultPixKeyType = null
);

public record WalletStatementFilterDto(
    string? Filter = "all", // "all", "credit", "fee", "withdrawal", "escrow"
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int PageNumber = 1,
    int PageSize = 20
);

public record WalletStatementItemDto(
    Guid Id,
    string Date,
    DateTime CreatedAt,
    string Description,
    string? ServiceTitle,
    string TransactionType,
    string TransactionTypeLabel,
    decimal GrossAmount,
    decimal LaborAmount,
    decimal MaterialsAmount,
    decimal PlatformFeeAmount,
    decimal Amount,
    string Status,
    string StatusLabel,
    string? ReceiptNumber = null
);

public record WalletStatementResponseDto(
    IEnumerable<WalletStatementItemDto> Items,
    int TotalCount,
    int PageNumber,
    int PageSize,
    int TotalPages
);

public record CreateWithdrawalRequestDto(
    Guid? ProviderId,
    decimal Amount,
    string PixKey,
    string PixKeyType // "CPF", "CNPJ", "Email", "Phone", "RandomKey"
);

public record WithdrawalResponseDto(
    Guid Id,
    Guid ProviderId,
    decimal Amount,
    string PixKey,
    string PixKeyType,
    string Status,
    string ReceiptNumber,
    DateTime ProcessedAt,
    decimal NewAvailableBalance
);
