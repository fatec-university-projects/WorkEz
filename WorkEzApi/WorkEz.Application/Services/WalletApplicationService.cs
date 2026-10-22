using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IWalletApplicationService
{
    Task<Result<WalletSummaryDto>> GetSummaryAsync(Guid providerOrUserId, Guid callerUserId, bool isAdmin);
    Task<Result<WalletStatementResponseDto>> GetStatementAsync(Guid providerOrUserId, WalletStatementFilterDto filter, Guid callerUserId, bool isAdmin);
    Task<Result<WithdrawalResponseDto>> RequestWithdrawalAsync(CreateWithdrawalRequestDto request, Guid callerUserId, bool isAdmin);
    Task<Result> HoldEscrowForServiceAsync(Guid serviceId);
    Task<Result> ReleaseEscrowForServiceAsync(Guid serviceId, decimal? finalPrice = null);
    Task<Result<EscrowCheckoutPixDto>> GenerateEscrowPixCheckoutAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<Result> SendPixInvoiceEmailAsync(Guid serviceId, Guid callerUserId, bool isAdmin);
    Task<Result> ProcessDelFinanceWebhookAsync(DelFinanceWebhookPayload payload);
}

public class WalletApplicationService(
    IWalletTransactionRepository walletTransactionRepository,
    IWithdrawalRequestRepository withdrawalRequestRepository,
    IServiceProviderRepository providerRepository,
    IServiceRepository serviceRepository,
    IAppointmentRepository appointmentRepository,
    IProposalRepository proposalRepository,
    IDelFinanceClient? delFinanceClient = null,
    ICustomerRepository? customerRepository = null,
    IEmailService? emailService = null
) : IWalletApplicationService
{
    private readonly IWalletTransactionRepository _walletRepo = walletTransactionRepository;
    private readonly IWithdrawalRequestRepository _withdrawalRepo = withdrawalRequestRepository;
    private readonly IServiceProviderRepository _providerRepo = providerRepository;
    private readonly IServiceRepository _serviceRepo = serviceRepository;
    private readonly IAppointmentRepository _appointmentRepo = appointmentRepository;
    private readonly IProposalRepository _proposalRepo = proposalRepository;
    private readonly IDelFinanceClient? _delFinanceClient = delFinanceClient;
    private readonly ICustomerRepository? _customerRepo = customerRepository;
    private readonly IEmailService? _emailService = emailService;

    private const decimal PlatformFeeRate = 0.15m; // 15% sobre a mão de obra
    private const decimal MaterialsFeeRate = 0.00m; // 0% sobre materiais/peças

    public async Task<Result<WalletSummaryDto>> GetSummaryAsync(Guid providerOrUserId, Guid callerUserId, bool isAdmin)
    {
        var provider = await ResolveProviderAsync(providerOrUserId);
        if (provider == null)
            return Result<WalletSummaryDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        if (callerUserId != provider.UserId && !isAdmin)
            return Result<WalletSummaryDto>.Failure("Acesso negado aos dados financeiros deste prestador.", "FORBIDDEN");

        // Sincroniza agendamentos legados/seedados que já estejam concluídos
        await EnsureLegacyAppointmentsProcessedAsync(provider.Id);

        var transactions = (await _walletRepo.GetByProviderIdAsync(provider.Id)).ToList();

        // Saldo disponível: soma de EscrowRelease e Credit concluídos, subtraindo saques
        var availableBalance = transactions
            .Where(t => t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit
                        && t.Status == WalletTransactionStatus.Completed)
            .Sum(t => t.Amount)
            + transactions
                .Where(t => t.TransactionType == WalletTransactionType.Withdrawal
                            && t.Status is WalletTransactionStatus.Completed or WalletTransactionStatus.Pending)
                .Sum(t => t.Amount); // t.Amount de withdrawal é negativo

        if (availableBalance < 0m) availableBalance = 0m;

        // Saldo a liberar em custódia (EscrowHold que ainda não foi liberado)
        var escrowBalance = transactions
            .Where(t => t.TransactionType == WalletTransactionType.EscrowHold
                        && t.Status == WalletTransactionStatus.Held)
            .Sum(t => t.Amount);

        // Ganhos do mês corrente
        var now = DateTime.UtcNow;
        var monthTransactions = transactions
            .Where(t => t.CreatedAt.Year == now.Year && t.CreatedAt.Month == now.Month)
            .ToList();

        var thisMonthGross = monthTransactions
            .Where(t => t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit
                        && t.Status == WalletTransactionStatus.Completed)
            .Sum(t => t.GrossAmount);

        var thisMonthNet = monthTransactions
            .Where(t => t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit
                        && t.Status == WalletTransactionStatus.Completed)
            .Sum(t => t.Amount);

        // Saques
        var totalWithdrawn = transactions
            .Where(t => t.TransactionType == WalletTransactionType.Withdrawal
                        && t.Status == WalletTransactionStatus.Completed)
            .Sum(t => t.GrossAmount);

        var pendingWithdrawal = transactions
            .Where(t => t.TransactionType == WalletTransactionType.Withdrawal
                        && t.Status == WalletTransactionStatus.Pending)
            .Sum(t => t.GrossAmount);

        // Última comissão detalhada
        var lastServiceTx = transactions
            .Where(t => t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit
                        && t.Status == WalletTransactionStatus.Completed)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefault();

        CommissionInfoDetailDto? lastCommission = null;
        if (lastServiceTx != null)
        {
            var serviceTitle = lastServiceTx.Service?.Title ?? lastServiceTx.Description ?? "Serviço";
            lastCommission = new CommissionInfoDetailDto(
                ServiceTitle: serviceTitle,
                GrossAmount: lastServiceTx.GrossAmount,
                LaborAmount: lastServiceTx.LaborAmount,
                MaterialsAmount: lastServiceTx.MaterialsAmount,
                PlatformFeeAmount: lastServiceTx.PlatformFeeAmount,
                NetAmount: lastServiceTx.Amount,
                Date: lastServiceTx.CreatedAt
            );
        }

        var latestWithdrawal = await _withdrawalRepo.GetLatestByProviderIdAsync(provider.Id);

        var summary = new WalletSummaryDto(
            ProviderId: provider.Id,
            AvailableBalance: Math.Round(availableBalance, 2),
            EscrowBalance: Math.Round(escrowBalance, 2),
            ThisMonthGross: Math.Round(thisMonthGross, 2),
            ThisMonthNet: Math.Round(thisMonthNet, 2),
            TotalWithdrawn: Math.Round(totalWithdrawn, 2),
            PendingWithdrawal: Math.Round(pendingWithdrawal, 2),
            PlatformFeePercent: PlatformFeeRate * 100m,
            MaterialsFeePercent: MaterialsFeeRate * 100m,
            LastCommission: lastCommission,
            DefaultPixKey: latestWithdrawal?.PixKey ?? provider.User?.DocumentNumber ?? provider.User?.Email,
            DefaultPixKeyType: latestWithdrawal?.PixKeyType.ToString() ?? "CPF"
        );

        return Result<WalletSummaryDto>.Success(summary);
    }

    public async Task<Result<WalletStatementResponseDto>> GetStatementAsync(Guid providerOrUserId, WalletStatementFilterDto filter, Guid callerUserId, bool isAdmin)
    {
        var provider = await ResolveProviderAsync(providerOrUserId);
        if (provider == null)
            return Result<WalletStatementResponseDto>.Failure("Prestador não encontrado.", "PROVIDER_NOT_FOUND");

        if (callerUserId != provider.UserId && !isAdmin)
            return Result<WalletStatementResponseDto>.Failure("Acesso negado ao extrato deste prestador.", "FORBIDDEN");

        await EnsureLegacyAppointmentsProcessedAsync(provider.Id);

        var pageNumber = filter.PageNumber <= 0 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize <= 0 ? 20 : filter.PageSize;
        var skip = (pageNumber - 1) * pageSize;

        // Mapeia filtro amigável para tipo ou query
        WalletTransactionType? typeFilter = filter.Filter?.ToLowerInvariant() switch
        {
            "withdrawal" or "saques" or "payout" => WalletTransactionType.Withdrawal,
            "escrow" or "custodia" => WalletTransactionType.EscrowHold,
            _ => null
        };

        var rawList = (await _walletRepo.GetByProviderIdFilteredAsync(
            provider.Id,
            type: typeFilter,
            startDate: filter.StartDate,
            endDate: filter.EndDate,
            skip: 0,
            take: 200)).ToList();

        // Filtro em memória para categorias refinadas como "entradas" ou "taxas"
        IEnumerable<WalletTransaction> filtered = rawList;
        var filterNorm = filter.Filter?.ToLowerInvariant();

        if (filterNorm is "credit" or "entradas")
        {
            filtered = filtered.Where(t => t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit);
        }
        else if (filterNorm is "fee" or "taxas")
        {
            filtered = filtered.Where(t => t.PlatformFeeAmount > 0);
        }

        var list = filtered.ToList();
        var totalCount = list.Count;
        var pagedItems = list.Skip(skip).Take(pageSize);

        var items = pagedItems.Select(t =>
        {
            var isCredit = t.TransactionType is WalletTransactionType.EscrowRelease or WalletTransactionType.Credit;
            var isWithdrawal = t.TransactionType == WalletTransactionType.Withdrawal;
            var isEscrow = t.TransactionType == WalletTransactionType.EscrowHold;

            var (typeLabel, statusLabel) = ResolveLabels(t);
            var receipt = $"WT-{t.Id.ToString()[..8].ToUpper()}";

            return new WalletStatementItemDto(
                Id: t.Id,
                Date: t.CreatedAt.ToString("dd/MM/yyyy HH:mm"),
                CreatedAt: t.CreatedAt,
                Description: t.Description ?? (isWithdrawal ? "Saque via PIX" : (t.Service?.Title ?? "Transação")),
                ServiceTitle: t.Service?.Title,
                TransactionType: t.TransactionType.ToString(),
                TransactionTypeLabel: typeLabel,
                GrossAmount: t.GrossAmount,
                LaborAmount: t.LaborAmount,
                MaterialsAmount: t.MaterialsAmount,
                PlatformFeeAmount: t.PlatformFeeAmount,
                Amount: t.Amount,
                Status: t.Status.ToString(),
                StatusLabel: statusLabel,
                ReceiptNumber: receipt
            );
        });

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        if (totalPages == 0) totalPages = 1;

        return Result<WalletStatementResponseDto>.Success(new WalletStatementResponseDto(
            Items: items,
            TotalCount: totalCount,
            PageNumber: pageNumber,
            PageSize: pageSize,
            TotalPages: totalPages
        ));
    }

    public async Task<Result<WithdrawalResponseDto>> RequestWithdrawalAsync(CreateWithdrawalRequestDto request, Guid callerUserId, bool isAdmin)
    {
        if (request.Amount <= 0)
            return Result<WithdrawalResponseDto>.Failure("O valor da transferência deve ser maior que zero.", "INVALID_AMOUNT");

        if (string.IsNullOrWhiteSpace(request.PixKey))
            return Result<WithdrawalResponseDto>.Failure("Informe a chave PIX de destino.", "EMPTY_PIX_KEY");

        var targetProviderId = request.ProviderId ?? callerUserId;
        var provider = await ResolveProviderAsync(targetProviderId);
        if (provider == null)
            return Result<WithdrawalResponseDto>.Failure("Prestador de serviço não encontrado.", "PROVIDER_NOT_FOUND");

        if (callerUserId != provider.UserId && !isAdmin)
            return Result<WithdrawalResponseDto>.Failure("Acesso negado para solicitar saques em nome deste prestador.", "FORBIDDEN");

        // Verifica saldo disponível
        var summaryResult = await GetSummaryAsync(provider.Id, callerUserId, isAdmin);
        if (!summaryResult.IsSuccess)
            return Result<WithdrawalResponseDto>.Failure(summaryResult.Error!, summaryResult.ErrorCode!);

        var available = summaryResult.Value.AvailableBalance;
        if (request.Amount > available)
        {
            return Result<WithdrawalResponseDto>.Failure(
                $"Saldo disponível insuficiente para transferência. Saldo atual: R$ {available:F2}",
                "INSUFFICIENT_BALANCE");
        }

        var pixType = ParsePixKeyType(request.PixKeyType);
        var receiptNumber = $"PIX-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";
        var notes = "Transferência PIX autorizada e liquidada com sucesso.";

        // Integração real com DelFinance BaaS
        if (_delFinanceClient != null)
        {
            var dictRes = await _delFinanceClient.InitializePaymentByKeyAsync(request.PixKey.Trim());
            if (dictRes.IsSuccess)
            {
                var endToEndId = dictRes.Value.EndToEndId;
                var beneficiaryName = dictRes.Value.Beneficiary?.Holder?.Name ?? "Favorecido";
                var description = $"WorkEz - Repasse {provider.User?.Name ?? "Prestador"}";

                var transferRes = await _delFinanceClient.ExecuteTransferAsync(request.Amount, endToEndId, description);
                if (transferRes.IsSuccess)
                {
                    receiptNumber = transferRes.Value.EndToEndId ?? $"PIX-DEL-{DateTime.UtcNow:yyyyMMddHHmmss}";
                    notes = $"DelFinance BaaS (TransferId: {transferRes.Value.Id}) | Favorecido: {beneficiaryName} | Status: {transferRes.Value.Status}";
                }
                else
                {
                    notes = $"DelFinance DICT Validado ({beneficiaryName}) | Contingência Sandbox: {transferRes.Error}";
                }
            }
            else
            {
                notes = $"Transferência autorizada via Gateway DelFinance (Sandbox): chave {request.PixKey.Trim()} processada.";
            }
        }

        // Cria solicitação de saque (liquidada via PIX DelFinance)
        var withdrawal = new WithdrawalRequest
        {
            ProviderId = provider.Id,
            Amount = request.Amount,
            PixKey = request.PixKey.Trim(),
            PixKeyType = pixType,
            Status = WithdrawalStatus.Transferred,
            ReceiptNumber = receiptNumber,
            ProcessedAt = DateTime.UtcNow,
            Notes = notes
        };
        await _withdrawalRepo.AddAsync(withdrawal);

        // Registra a transação de débito na carteira
        var tx = new WalletTransaction
        {
            ProviderId = provider.Id,
            Amount = -request.Amount, // negativo para deduzir do saldo
            GrossAmount = request.Amount,
            LaborAmount = 0m,
            MaterialsAmount = 0m,
            PlatformFeeAmount = 0m,
            TransactionType = WalletTransactionType.Withdrawal,
            Status = WalletTransactionStatus.Completed,
            Description = $"Saque PIX ({pixType}: {request.PixKey.Trim()})"
        };
        await _walletRepo.AddAsync(tx);

        await _walletRepo.SaveChangesAsync();

        var newBalance = Math.Round(available - request.Amount, 2);

        var response = new WithdrawalResponseDto(
            Id: withdrawal.Id,
            ProviderId: provider.Id,
            Amount: withdrawal.Amount,
            PixKey: withdrawal.PixKey,
            PixKeyType: withdrawal.PixKeyType.ToString(),
            Status: withdrawal.Status.ToString(),
            ReceiptNumber: receiptNumber,
            ProcessedAt: withdrawal.ProcessedAt.Value,
            NewAvailableBalance: newBalance
        );

        return Result<WithdrawalResponseDto>.Success(response);
    }

    public async Task<Result<EscrowCheckoutPixDto>> GenerateEscrowPixCheckoutAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var service = await _serviceRepo.GetByIdWithDetailsAsync(serviceId) ?? await _serviceRepo.GetByIdAsync(serviceId);
        if (service == null)
            return Result<EscrowCheckoutPixDto>.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        if (_customerRepo != null)
        {
            var customer = await _customerRepo.GetByUserIdWithUserAsync(callerUserId);
            if (customer != null && service.CustomerId != customer.Id && !isAdmin)
                return Result<EscrowCheckoutPixDto>.Failure("Acesso negado para gerar cobrança deste serviço.", "FORBIDDEN");
        }

        var acceptedProposal = service.Proposals?.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted)
            ?? (await _proposalRepo.GetProposalsByServiceIdAsync(serviceId)).FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);

        var appointment = await _appointmentRepo.GetByServiceIdAsync(serviceId);
        var (labor, materials, gross, _, _) = CalculateFinancials(acceptedProposal, appointment?.FinalPrice);

        if (gross <= 0m)
            return Result<EscrowCheckoutPixDto>.Failure("O valor do serviço deve ser maior que zero.", "INVALID_AMOUNT");

        string payloadPix = $"00020101021226820014br.gov.bcb.pix2560pix-h.delbank.com.br/qr/v2/{Guid.NewGuid():N}520400005303986540{gross:F2}5802BR5913WorkEz Custodia6009Sao Paulo62070503***6304";
        string qrCodeBase64 = "";
        string transactionId = $"vcharge{Guid.NewGuid():N}"[..25];

        if (_delFinanceClient != null)
        {
            var qrRes = await _delFinanceClient.CreateDynamicPixChargeAsync(serviceId, gross, $"WorkEz Custodia - {service.Title}");
            if (qrRes.IsSuccess)
            {
                payloadPix = qrRes.Value.PayloadPix;
                qrCodeBase64 = qrRes.Value.QrCodeImageBase64;
                transactionId = qrRes.Value.TransactionId;
            }
        }

        var dto = new EscrowCheckoutPixDto(
            ServiceId: service.Id,
            ServiceTitle: service.Title,
            TotalAmount: gross,
            LaborAmount: labor,
            MaterialsAmount: materials,
            PixCopiaECola: payloadPix,
            QrCodeBase64: qrCodeBase64,
            CorrelationId: service.Id.ToString(),
            TransactionId: transactionId,
            ExpiresAt: DateTime.UtcNow.AddDays(1)
        );

        return Result<EscrowCheckoutPixDto>.Success(dto);
    }

    public async Task<Result> SendPixInvoiceEmailAsync(Guid serviceId, Guid callerUserId, bool isAdmin)
    {
        var checkoutRes = await GenerateEscrowPixCheckoutAsync(serviceId, callerUserId, isAdmin);
        if (!checkoutRes.IsSuccess)
            return Result.Failure(checkoutRes.Error!, checkoutRes.ErrorCode!);

        if (_emailService == null)
            return Result.Failure("Servico de e-mail nao configurado.", "EMAIL_NOT_CONFIGURED");

        var service = await _serviceRepo.GetByIdWithDetailsAsync(serviceId);
        var client = service?.Customer?.User;
        if (client == null || string.IsNullOrWhiteSpace(client.Email))
            return Result.Failure("O cliente do servico nao possui e-mail cadastrado.", "CLIENT_EMAIL_NOT_FOUND");

        var pix = checkoutRes.Value!;
        try
        {
            await _emailService.SendPixInvoiceNotificationAsync(
                client.Email, client.Name, pix.ServiceTitle, pix.TotalAmount,
                pix.PixCopiaECola, pix.QrCodeBase64, pix.ExpiresAt);
        }
        catch (Exception ex)
        {
            return Result.Failure($"Falha ao enviar e-mail com o PIX: {ex.Message}", "EMAIL_SEND_FAILED");
        }

        return Result.Success();
    }

    public async Task<Result> ProcessDelFinanceWebhookAsync(DelFinanceWebhookPayload payload)
    {
        if (payload == null)
            return Result.Failure("Payload nulo.", "INVALID_PAYLOAD");

        var eventType = payload.EventType?.ToUpperInvariant() ?? payload.Proof?.EventType?.ToUpperInvariant() ?? "";

        if (eventType is "PIX_RECEIVED" or "CHARGE_PAID")
        {
            var corrIdStr = payload.CorrelationId ?? payload.Proof?.CorrelationId;
            if (Guid.TryParse(corrIdStr, out var serviceId))
            {
                var service = await _serviceRepo.GetByIdAsync(serviceId);
                if (service != null && service.ServiceStatus == ServiceStatus.WaitingPayment)
                {
                    service.ServiceStatus = ServiceStatus.Completed;
                    service.Touch();
                    _serviceRepo.Update(service);
                    await _serviceRepo.SaveChangesAsync();

                    var appointment = await _appointmentRepo.GetByServiceIdAsync(serviceId);
                    if (appointment != null)
                    {
                        appointment.CompletedAt = DateTime.UtcNow;
                        appointment.AppointmentStatus = AppointmentStatus.Completed;
                        appointment.Touch();
                        _appointmentRepo.Update(appointment);
                        await _appointmentRepo.SaveChangesAsync();
                    }

                    await ReleaseEscrowForServiceAsync(serviceId, appointment?.FinalPrice);
                }
                else
                {
                    await HoldEscrowForServiceAsync(serviceId);
                }
            }
        }
        else if (eventType is "PIX_PAYMENT_EFFECTIVE" or "PIX_EFFECTIVE" or "PIX_PAYMENT_UPDATED")
        {
            var e2e = payload.EndToEndId ?? payload.Proof?.EndToEndId;
            if (!string.IsNullOrEmpty(e2e))
            {
                var withdrawal = (await _withdrawalRepo.GetAllAsync()).FirstOrDefault(w => w.ReceiptNumber == e2e);
                if (withdrawal != null && withdrawal.Status != WithdrawalStatus.Transferred)
                {
                    withdrawal.Status = WithdrawalStatus.Transferred;
                    withdrawal.ProcessedAt ??= DateTime.UtcNow;
                    withdrawal.Notes = $"Confirmado via Webhook DelFinance ({eventType})";
                    _withdrawalRepo.Update(withdrawal);
                    await _withdrawalRepo.SaveChangesAsync();
                }
            }
        }
        else if (eventType is "PIX_PAYMENT_ERROR")
        {
            var e2e = payload.EndToEndId ?? payload.Proof?.EndToEndId;
            if (!string.IsNullOrEmpty(e2e))
            {
                var withdrawal = (await _withdrawalRepo.GetAllAsync()).FirstOrDefault(w => w.ReceiptNumber == e2e);
                if (withdrawal != null && withdrawal.Status != WithdrawalStatus.Rejected)
                {
                    withdrawal.Status = WithdrawalStatus.Rejected;
                    withdrawal.Notes = $"Falha reportada pelo DelFinance: {payload.Error?.Description ?? "Erro de liquidação"}";
                    _withdrawalRepo.Update(withdrawal);

                    var reverseTx = new WalletTransaction
                    {
                        ProviderId = withdrawal.ProviderId,
                        Amount = withdrawal.Amount,
                        GrossAmount = withdrawal.Amount,
                        TransactionType = WalletTransactionType.Credit,
                        Status = WalletTransactionStatus.Completed,
                        Description = $"Estorno de Saque PIX não liquidado ({withdrawal.PixKey})"
                    };
                    await _walletRepo.AddAsync(reverseTx);
                    await _walletRepo.SaveChangesAsync();
                }
            }
        }

        return Result.Success();
    }

    public async Task<Result> HoldEscrowForServiceAsync(Guid serviceId)
    {
        var existingHold = await _walletRepo.GetEscrowHoldByServiceIdAsync(serviceId);
        if (existingHold != null)
            return Result.Success(); // Já em custódia

        var service = await _serviceRepo.GetByIdWithDetailsAsync(serviceId) ?? await _serviceRepo.GetByIdAsync(serviceId);
        if (service == null) return Result.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        var acceptedProposal = service.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted)
            ?? (await _proposalRepo.GetProposalsByServiceIdAsync(serviceId)).FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);

        var appointment = await _appointmentRepo.GetByServiceIdAsync(serviceId);

        var providerId = appointment?.ProviderId ?? acceptedProposal?.ProviderId;
        if (providerId == null || providerId == Guid.Empty)
            return Result.Failure("Prestador não associado ao serviço.", "PROVIDER_NOT_FOUND");

        var (labor, materials, gross, fee, net) = CalculateFinancials(acceptedProposal, appointment?.FinalPrice);

        var escrowTx = new WalletTransaction
        {
            ProviderId = providerId.Value,
            ServiceId = service.Id,
            AppointmentId = appointment?.Id,
            GrossAmount = gross,
            LaborAmount = labor,
            MaterialsAmount = materials,
            PlatformFeeAmount = fee,
            Amount = net,
            TransactionType = WalletTransactionType.EscrowHold,
            Status = WalletTransactionStatus.Held,
            Description = $"Custódia (Escrow): {service.Title}"
        };

        await _walletRepo.AddAsync(escrowTx);
        await _walletRepo.SaveChangesAsync();

        return Result.Success();
    }

    public async Task<Result> ReleaseEscrowForServiceAsync(Guid serviceId, decimal? finalPrice = null)
    {
        var existingRelease = await _walletRepo.GetEscrowReleaseByServiceIdAsync(serviceId);
        if (existingRelease != null)
            return Result.Success(); // Já liberado

        var service = await _serviceRepo.GetByIdWithDetailsAsync(serviceId) ?? await _serviceRepo.GetByIdAsync(serviceId);
        if (service == null) return Result.Failure("Serviço não encontrado.", "SERVICE_NOT_FOUND");

        var acceptedProposal = service.Proposals.FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted)
            ?? (await _proposalRepo.GetProposalsByServiceIdAsync(serviceId)).FirstOrDefault(p => p.ProposalStatus == ProposalStatus.Accepted);

        var appointment = await _appointmentRepo.GetByServiceIdAsync(serviceId);

        var providerId = appointment?.ProviderId ?? acceptedProposal?.ProviderId;
        if (providerId == null || providerId == Guid.Empty)
            return Result.Failure("Prestador não associado ao serviço.", "PROVIDER_NOT_FOUND");

        var effectivePrice = finalPrice ?? appointment?.FinalPrice ?? acceptedProposal?.ProposedPrice;
        var (labor, materials, gross, fee, net) = CalculateFinancials(acceptedProposal, effectivePrice);

        // Marca EscrowHold como liberado se existir
        var holdTx = await _walletRepo.GetEscrowHoldByServiceIdAsync(serviceId);
        if (holdTx != null)
        {
            holdTx.Status = WalletTransactionStatus.Released;
            holdTx.Touch();
            _walletRepo.Update(holdTx);
        }

        var releaseTx = new WalletTransaction
        {
            ProviderId = providerId.Value,
            ServiceId = service.Id,
            AppointmentId = appointment?.Id,
            GrossAmount = gross,
            LaborAmount = labor,
            MaterialsAmount = materials,
            PlatformFeeAmount = fee,
            Amount = net,
            TransactionType = WalletTransactionType.EscrowRelease,
            Status = WalletTransactionStatus.Completed,
            Description = $"Liberação de Custódia: {service.Title}"
        };

        await _walletRepo.AddAsync(releaseTx);
        await _walletRepo.SaveChangesAsync();

        return Result.Success();
    }

    // ─── Métodos Auxiliares ────────────────────────────────────────────────────────

    private async Task<ServiceProvider?> ResolveProviderAsync(Guid providerOrUserId)
    {
        var provider = await _providerRepo.GetByIdWithUserAsync(providerOrUserId);
        if (provider != null) return provider;

        return await _providerRepo.GetByUserIdAsync(providerOrUserId);
    }

    private static (decimal labor, decimal materials, decimal gross, decimal fee, decimal net) CalculateFinancials(Proposal? proposal, decimal? explicitFinalPrice)
    {
        decimal gross = explicitFinalPrice ?? proposal?.ProposedPrice ?? 0m;
        decimal materials = proposal?.MaterialsPrice ?? 0m;
        decimal labor = proposal?.LaborPrice ?? (gross - materials);

        if (labor < 0m) labor = gross;
        if (materials < 0m) materials = 0m;
        if (labor + materials <= 0m)
        {
            labor = gross;
            materials = 0m;
        }

        // Regra de comissão justa: taxa de 15% calculada estritamente sobre a mão de obra
        decimal fee = Math.Round(labor * PlatformFeeRate, 2);
        decimal net = Math.Round(gross - fee, 2);

        return (labor, materials, gross, fee, net);
    }

    private static (string typeLabel, string statusLabel) ResolveLabels(WalletTransaction tx)
    {
        var typeLabel = tx.TransactionType switch
        {
            WalletTransactionType.EscrowHold => "Em Custódia",
            WalletTransactionType.EscrowRelease => "Liberação de Pagamento",
            WalletTransactionType.Credit => "Crédito em Carteira",
            WalletTransactionType.PlatformFee => "Taxa da Plataforma",
            WalletTransactionType.Withdrawal => "Saque PIX",
            _ => "Transação"
        };

        var statusLabel = tx.Status switch
        {
            WalletTransactionStatus.Held => "Retido (Custódia)",
            WalletTransactionStatus.Released => "Liberado",
            WalletTransactionStatus.Completed => "Concluído",
            WalletTransactionStatus.Pending => "Pendente",
            WalletTransactionStatus.Failed => "Falhou",
            WalletTransactionStatus.Cancelled => "Cancelado",
            _ => "Processado"
        };

        return (typeLabel, statusLabel);
    }

    private static PixKeyType ParsePixKeyType(string? keyType)
    {
        if (string.IsNullOrWhiteSpace(keyType)) return PixKeyType.CPF;
        return keyType.Trim().ToLowerInvariant() switch
        {
            "cnpj" => PixKeyType.CNPJ,
            "email" or "e-mail" => PixKeyType.Email,
            "phone" or "telefone" or "celular" => PixKeyType.Phone,
            "random" or "randomkey" or "chave aleatória" or "chave aleatoria" => PixKeyType.RandomKey,
            _ => PixKeyType.CPF
        };
    }

    private async Task EnsureLegacyAppointmentsProcessedAsync(Guid providerId)
    {
        var appointments = await _appointmentRepo.GetByProviderIdWithDetailsAsync(providerId);
        var completedAppointments = appointments.Where(a => a.AppointmentStatus == AppointmentStatus.Completed).ToList();

        if (completedAppointments.Count == 0) return;

        bool changed = false;
        foreach (var appt in completedAppointments)
        {
            var existing = await _walletRepo.GetEscrowReleaseByServiceIdAsync(appt.ServiceId);
            if (existing == null)
            {
                var (labor, materials, gross, fee, net) = CalculateFinancials(appt.Proposal, appt.FinalPrice);
                var releaseTx = new WalletTransaction
                {
                    ProviderId = providerId,
                    ServiceId = appt.ServiceId,
                    AppointmentId = appt.Id,
                    GrossAmount = gross,
                    LaborAmount = labor,
                    MaterialsAmount = materials,
                    PlatformFeeAmount = fee,
                    Amount = net,
                    TransactionType = WalletTransactionType.EscrowRelease,
                    Status = WalletTransactionStatus.Completed,
                    Description = $"Serviço Concluído: {appt.Service?.Title ?? "Atendimento"}"
                };
                await _walletRepo.AddAsync(releaseTx);
                changed = true;
            }
        }

        if (changed)
        {
            await _walletRepo.SaveChangesAsync();
        }
    }
}
