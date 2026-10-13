using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Services;

namespace WorkEz.Application.Services;

public interface IPaymentApplicationService
{
    Task<Result<PaymentResponseDto>> ProcessPaymentAsync(ProcessPaymentRequest request);
}

public class PaymentApplicationService(IPaymentDomainService paymentDomainService) : IPaymentApplicationService
{
    private readonly IPaymentDomainService _paymentDomainService = paymentDomainService;

    public async Task<Result<PaymentResponseDto>> ProcessPaymentAsync(ProcessPaymentRequest request)
    {
        var result = await _paymentDomainService.ProcessPaymentCompletedAsync(
            request.ServiceId,
            request.Amount,
            request.PaymentMethod,
            request.TransactionId
        );

        if (result.IsFailure)
        {
            return Result<PaymentResponseDto>.Failure(result.Error, result.ErrorCode);
        }

        var response = new PaymentResponseDto(
            Success: true,
            Message: "Pagamento processado e comprovantes enviados por e-mail com sucesso.",
            ServiceId: request.ServiceId,
            Amount: request.Amount,
            TransactionId: request.TransactionId
        );

        return Result<PaymentResponseDto>.Success(response);
    }
}
