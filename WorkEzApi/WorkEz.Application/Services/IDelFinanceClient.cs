using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;

namespace WorkEz.Application.Services;

public interface IDelFinanceClient
{
    Task<Result<DelFinanceDictInitResponse>> InitializePaymentByKeyAsync(string pixKey, string? holderDocument = null, CancellationToken cancellationToken = default);
    Task<Result<DelFinanceTransferResponse>> ExecuteTransferAsync(decimal amount, string endToEndId, string description, Guid? idempotencyKey = null, CancellationToken cancellationToken = default);
    Task<Result<DelFinanceDynamicQrCodeResponse>> CreateDynamicPixChargeAsync(Guid correlationId, decimal amount, string? description = null, CancellationToken cancellationToken = default);
}
