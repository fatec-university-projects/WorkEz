using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Enums;
using WorkEz.Infra.Data.Context;
using WorkEz.Infra.Data.Repositories;
using WorkEz.WebUID.Controllers;
using ServiceProviderEntity = WorkEz.Domain.Entities.ServiceProvider;

namespace WorkEz.WebUID.Tests;

public class WalletApplicationServiceTests
{
    private static AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (
        WalletApplicationService walletService,
        AppDbContext db,
        User providerUser,
        ServiceProviderEntity provider,
        User customerUser,
        Customer customer
    ) CreateTestSetup()
    {
        var db = CreateInMemoryDbContext();

        var providerUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Carlos Eletricista",
            Email = "carlos@workez.com",
            DocumentNumber = "12345678901",
            Role = UserRole.ServiceProvider
        };
        var provider = new ServiceProviderEntity
        {
            Id = Guid.NewGuid(),
            UserId = providerUser.Id,
            User = providerUser
        };

        var customerUser = new User
        {
            Id = Guid.NewGuid(),
            Name = "Ana Cliente",
            Email = "ana@workez.com",
            Role = UserRole.Customer
        };
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            UserId = customerUser.Id,
            User = customerUser
        };

        db.Users.AddRange(providerUser, customerUser);
        db.Providers.Add(provider);
        db.Customers.Add(customer);
        db.SaveChanges();

        var walletRepo = new WalletTransactionRepository(db);
        var withdrawalRepo = new WithdrawalRequestRepository(db);
        var providerRepo = new ServiceProviderRepository(db);
        var serviceRepo = new ServiceRepository(db);
        var apptRepo = new AppointmentRepository(db);
        var proposalRepo = new ProposalRepository(db);

        var walletService = new WalletApplicationService(
            walletRepo,
            withdrawalRepo,
            providerRepo,
            serviceRepo,
            apptRepo,
            proposalRepo
        );

        return (walletService, db, providerUser, provider, customerUser, customer);
    }

    [Fact]
    public async Task HoldEscrow_And_ReleaseEscrow_ShouldCalculateFairCommission_ExemptingMaterials()
    {
        // Arrange: Serviço de R$ 500, sendo R$ 200 mão de obra e R$ 300 materiais
        // Taxa da plataforma = 15% apenas sobre R$ 200 = R$ 30
        // Líquido esperado para o prestador = R$ 470
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Troca de Fiação e Disjuntores",
            ServiceStatus = ServiceStatus.Accepted
        };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 500m,
            LaborPrice = 200m,
            MaterialsPrice = 300m,
            ProposalStatus = ProposalStatus.Accepted
        };
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProposalId = proposal.Id,
            CustomerId = customer.Id,
            ProviderId = provider.Id,
            FinalPrice = 500m,
            ScheduledDate = DateTime.UtcNow,
            AppointmentStatus = AppointmentStatus.Confirmed
        };

        db.Services.Add(service);
        db.Proposals.Add(proposal);
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        // 1. Bloqueia valor em custódia (Escrow Hold)
        var holdResult = await walletService.HoldEscrowForServiceAsync(service.Id);
        Assert.True(holdResult.IsSuccess);

        var summaryAfterHold = await walletService.GetSummaryAsync(provider.Id, providerUser.Id, false);
        Assert.True(summaryAfterHold.IsSuccess);
        Assert.Equal(0m, summaryAfterHold.Value.AvailableBalance);
        Assert.Equal(470m, summaryAfterHold.Value.EscrowBalance); // 500 - 30 = 470 bloqueados

        // 2. Libera valor com a conclusão do serviço (Escrow Release)
        var releaseResult = await walletService.ReleaseEscrowForServiceAsync(service.Id, 500m);
        Assert.True(releaseResult.IsSuccess);

        var summaryAfterRelease = await walletService.GetSummaryAsync(provider.Id, providerUser.Id, false);
        Assert.True(summaryAfterRelease.IsSuccess);
        Assert.Equal(470m, summaryAfterRelease.Value.AvailableBalance); // R$ 470 liberados para saque
        Assert.Equal(0m, summaryAfterRelease.Value.EscrowBalance); // Custódia zerada
        Assert.Equal(500m, summaryAfterRelease.Value.ThisMonthGross);
        Assert.Equal(470m, summaryAfterRelease.Value.ThisMonthNet);

        // Verifica o detalhamento da comissão justa
        var lastComm = summaryAfterRelease.Value.LastCommission;
        Assert.NotNull(lastComm);
        Assert.Equal(500m, lastComm.GrossAmount);
        Assert.Equal(200m, lastComm.LaborAmount);
        Assert.Equal(300m, lastComm.MaterialsAmount);
        Assert.Equal(30m, lastComm.PlatformFeeAmount);
        Assert.Equal(470m, lastComm.NetAmount);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ValidAmount_ShouldDeductBalance_AndReturnReceipt()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        // Injeta saldo liberado diretamente na carteira (R$ 300)
        db.WalletTransactions.Add(new WalletTransaction
        {
            ProviderId = provider.Id,
            Amount = 300m,
            GrossAmount = 300m,
            TransactionType = WalletTransactionType.EscrowRelease,
            Status = WalletTransactionStatus.Completed,
            Description = "Serviço Anterior"
        });
        await db.SaveChangesAsync();

        var request = new CreateWithdrawalRequestDto(
            ProviderId: provider.Id,
            Amount: 120m,
            PixKey: "12345678901",
            PixKeyType: "CPF"
        );

        var result = await walletService.RequestWithdrawalAsync(request, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(120m, result.Value.Amount);
        Assert.Equal("12345678901", result.Value.PixKey);
        Assert.Equal(180m, result.Value.NewAvailableBalance); // 300 - 120 = 180
        Assert.StartsWith("PIX-", result.Value.ReceiptNumber);

        // Verifica extrato e saldo atualizado
        var summary = await walletService.GetSummaryAsync(provider.Id, providerUser.Id, false);
        Assert.Equal(180m, summary.Value.AvailableBalance);
        Assert.Equal(120m, summary.Value.TotalWithdrawn);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_ExceedingAvailableBalance_ShouldFail()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        db.WalletTransactions.Add(new WalletTransaction
        {
            ProviderId = provider.Id,
            Amount = 50m,
            GrossAmount = 50m,
            TransactionType = WalletTransactionType.EscrowRelease,
            Status = WalletTransactionStatus.Completed
        });
        await db.SaveChangesAsync();

        var request = new CreateWithdrawalRequestDto(
            ProviderId: provider.Id,
            Amount: 100m,
            PixKey: "carlos@pix.com",
            PixKeyType: "Email"
        );

        var result = await walletService.RequestWithdrawalAsync(request, providerUser.Id, false);

        Assert.False(result.IsSuccess);
        Assert.Equal("INSUFFICIENT_BALANCE", result.ErrorCode);
    }

    [Fact]
    public async Task RequestWithdrawalAsync_InvalidAmountOrEmptyPixKey_ShouldFail()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var zeroRequest = new CreateWithdrawalRequestDto(provider.Id, 0m, "carlos@pix.com", "Email");
        var zeroResult = await walletService.RequestWithdrawalAsync(zeroRequest, providerUser.Id, false);
        Assert.False(zeroResult.IsSuccess);
        Assert.Equal("INVALID_AMOUNT", zeroResult.ErrorCode);

        var emptyKeyRequest = new CreateWithdrawalRequestDto(provider.Id, 50m, "", "Email");
        var emptyResult = await walletService.RequestWithdrawalAsync(emptyKeyRequest, providerUser.Id, false);
        Assert.False(emptyResult.IsSuccess);
        Assert.Equal("EMPTY_PIX_KEY", emptyResult.ErrorCode);
    }

    [Fact]
    public async Task GetStatementAsync_ShouldSupportTypeFilters_AndPagination()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        db.WalletTransactions.AddRange(
            new WalletTransaction
            {
                ProviderId = provider.Id,
                Amount = 200m,
                GrossAmount = 230m,
                PlatformFeeAmount = 30m,
                TransactionType = WalletTransactionType.EscrowRelease,
                Status = WalletTransactionStatus.Completed,
                Description = "Serviço 1"
            },
            new WalletTransaction
            {
                ProviderId = provider.Id,
                Amount = -50m,
                GrossAmount = 50m,
                TransactionType = WalletTransactionType.Withdrawal,
                Status = WalletTransactionStatus.Completed,
                Description = "Saque 1"
            },
            new WalletTransaction
            {
                ProviderId = provider.Id,
                Amount = 150m,
                GrossAmount = 150m,
                TransactionType = WalletTransactionType.EscrowHold,
                Status = WalletTransactionStatus.Held,
                Description = "Em Custódia 1"
            }
        );
        await db.SaveChangesAsync();

        // 1. Filtro "all"
        var allRes = await walletService.GetStatementAsync(provider.Id, new WalletStatementFilterDto(), providerUser.Id, false);
        Assert.True(allRes.IsSuccess);
        Assert.Equal(3, allRes.Value.TotalCount);

        // 2. Filtro "withdrawal"
        var withdrawRes = await walletService.GetStatementAsync(provider.Id, new WalletStatementFilterDto(Filter: "withdrawal"), providerUser.Id, false);
        Assert.True(withdrawRes.IsSuccess);
        Assert.Single(withdrawRes.Value.Items);
        Assert.Equal("Saque PIX", withdrawRes.Value.Items.First().TransactionTypeLabel);

        // 3. Filtro "fee"
        var feeRes = await walletService.GetStatementAsync(provider.Id, new WalletStatementFilterDto(Filter: "fee"), providerUser.Id, false);
        Assert.True(feeRes.IsSuccess);
        Assert.Single(feeRes.Value.Items);
        Assert.Equal(30m, feeRes.Value.Items.First().PlatformFeeAmount);
    }

    [Fact]
    public async Task WalletController_GetSummary_Forbidden_WhenCalledByUnauthorizedUser()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var controller = new WalletController(walletService);
        var unauthorizedClaims = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim("sub", customerUser.Id.ToString()),
            new Claim("role", nameof(UserRole.Customer))
        ], "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = unauthorizedClaims }
        };

        var response = await controller.GetSummary(provider.Id);
        var objectResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status403Forbidden, objectResult.StatusCode);
    }

    [Fact]
    public async Task WalletController_GetSummary_Success_WhenCalledBySelf()
    {
        var (walletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var controller = new WalletController(walletService);
        var providerClaims = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim("sub", providerUser.Id.ToString()),
            new Claim("role", nameof(UserRole.ServiceProvider))
        ], "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = providerClaims }
        };

        var response = await controller.GetSummary(provider.Id);
        var okResult = Assert.IsType<OkObjectResult>(response);
        var summary = Assert.IsType<WalletSummaryDto>(okResult.Value);
        Assert.Equal(provider.Id, summary.ProviderId);
    }

    [Fact]
    public async Task RequestWithdrawal_WithDelFinanceClient_ExecutesDictLookupAndTransferSuccessfully()
    {
        var (baseWalletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        // Adiciona saldo disponível na carteira de R$ 500
        db.WalletTransactions.Add(new WalletTransaction
        {
            ProviderId = provider.Id,
            Amount = 500.00m,
            GrossAmount = 500.00m,
            TransactionType = WalletTransactionType.Credit,
            Status = WalletTransactionStatus.Completed,
            Description = "Saldo inicial"
        });
        await db.SaveChangesAsync();

        var mockDelFinance = new MockDelFinanceClient();
        var walletService = new WalletApplicationService(
            new WalletTransactionRepository(db),
            new WithdrawalRequestRepository(db),
            new ServiceProviderRepository(db),
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ProposalRepository(db),
            mockDelFinance,
            new CustomerRepository(db)
        );

        var request = new CreateWithdrawalRequestDto(
            ProviderId: provider.Id,
            Amount: 150.00m,
            PixKey: "30287697789",
            PixKeyType: "CPF"
        );

        var result = await walletService.RequestWithdrawalAsync(request, providerUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(150.00m, result.Value.Amount);
        Assert.Equal(350.00m, result.Value.NewAvailableBalance);
        Assert.Equal("E38224857TESTENDTOENDID", result.Value.ReceiptNumber);

        var withdrawal = await db.WithdrawalRequests.FirstOrDefaultAsync(w => w.Id == result.Value.Id);
        Assert.NotNull(withdrawal);
        Assert.Equal(WithdrawalStatus.Transferred, withdrawal.Status);
        Assert.Contains("DelFinance BaaS", withdrawal.Notes);
        Assert.Contains("HOMOLOGACAO INTEGRACAO API", withdrawal.Notes);
    }

    [Fact]
    public async Task GenerateEscrowPixCheckout_CreatesDynamicPixAndReturnsQrCode()
    {
        var (baseWalletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Instalação Ar Condicionado",
            ServiceStatus = ServiceStatus.Accepted
        };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 600m,
            LaborPrice = 400m,
            MaterialsPrice = 200m,
            ProposalStatus = ProposalStatus.Accepted
        };

        db.Services.Add(service);
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        var mockDelFinance = new MockDelFinanceClient();
        var walletService = new WalletApplicationService(
            new WalletTransactionRepository(db),
            new WithdrawalRequestRepository(db),
            new ServiceProviderRepository(db),
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ProposalRepository(db),
            mockDelFinance,
            new CustomerRepository(db)
        );

        var result = await walletService.GenerateEscrowPixCheckoutAsync(service.Id, customerUser.Id, false);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(600m, result.Value.TotalAmount);
        Assert.Equal(400m, result.Value.LaborAmount);
        Assert.Equal(200m, result.Value.MaterialsAmount);
        Assert.StartsWith("000201010212", result.Value.PixCopiaECola);
        Assert.Equal("mock_base64_qrcode", result.Value.QrCodeBase64);
        Assert.Equal("vcharge123456789", result.Value.TransactionId);
    }

    [Fact]
    public async Task ProcessDelFinanceWebhook_PixReceived_HoldsEscrowForService()
    {
        var (baseWalletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var service = new Service
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            Title = "Pintura Externa",
            ServiceStatus = ServiceStatus.Accepted
        };
        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            ServiceId = service.Id,
            ProviderId = provider.Id,
            ProposedPrice = 1000m,
            LaborPrice = 800m,
            MaterialsPrice = 200m,
            ProposalStatus = ProposalStatus.Accepted
        };

        db.Services.Add(service);
        db.Proposals.Add(proposal);
        await db.SaveChangesAsync();

        var walletService = new WalletApplicationService(
            new WalletTransactionRepository(db),
            new WithdrawalRequestRepository(db),
            new ServiceProviderRepository(db),
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ProposalRepository(db),
            new MockDelFinanceClient(),
            new CustomerRepository(db)
        );

        var webhookPayload = new DelFinanceWebhookPayload
        {
            EventType = "PIX_RECEIVED",
            CorrelationId = service.Id.ToString(),
            Amount = 1000m,
            Status = "RECEIVED"
        };

        var result = await walletService.ProcessDelFinanceWebhookAsync(webhookPayload);
        Assert.True(result.IsSuccess);

        var escrowTx = await db.WalletTransactions.FirstOrDefaultAsync(t => t.ServiceId == service.Id && t.TransactionType == WalletTransactionType.EscrowHold);
        Assert.NotNull(escrowTx);
        Assert.Equal(WalletTransactionStatus.Held, escrowTx.Status);
        // Comissão de 15% sobre R$ 800 = R$ 120. Líquido = R$ 880
        Assert.Equal(880m, escrowTx.Amount);
        Assert.Equal(120m, escrowTx.PlatformFeeAmount);
    }

    [Fact]
    public async Task ProcessDelFinanceWebhook_PixPaymentError_ReversesWithdrawal()
    {
        var (baseWalletService, db, providerUser, provider, customerUser, customer) = CreateTestSetup();

        var withdrawal = new WithdrawalRequest
        {
            Id = Guid.NewGuid(),
            ProviderId = provider.Id,
            Amount = 200m,
            PixKey = "30287697789",
            PixKeyType = PixKeyType.CPF,
            Status = WithdrawalStatus.Transferred,
            ReceiptNumber = "E38224857ERRORTRANSID",
            Notes = "Em trânsito"
        };
        var debitTx = new WalletTransaction
        {
            ProviderId = provider.Id,
            Amount = -200m,
            GrossAmount = 200m,
            TransactionType = WalletTransactionType.Withdrawal,
            Status = WalletTransactionStatus.Completed,
            Description = "Saque"
        };
        db.WithdrawalRequests.Add(withdrawal);
        db.WalletTransactions.Add(debitTx);
        await db.SaveChangesAsync();

        var walletService = new WalletApplicationService(
            new WalletTransactionRepository(db),
            new WithdrawalRequestRepository(db),
            new ServiceProviderRepository(db),
            new ServiceRepository(db),
            new AppointmentRepository(db),
            new ProposalRepository(db),
            new MockDelFinanceClient(),
            new CustomerRepository(db)
        );

        var webhookPayload = new DelFinanceWebhookPayload
        {
            EventType = "PIX_PAYMENT_ERROR",
            EndToEndId = "E38224857ERRORTRANSID",
            Error = new DelFinanceWebhookErrorDto
            {
                Code = "AC06",
                Description = "Conta transacional bloqueada"
            }
        };

        var result = await walletService.ProcessDelFinanceWebhookAsync(webhookPayload);
        Assert.True(result.IsSuccess);

        var updatedWithdrawal = await db.WithdrawalRequests.FirstOrDefaultAsync(w => w.Id == withdrawal.Id);
        Assert.NotNull(updatedWithdrawal);
        Assert.Equal(WithdrawalStatus.Rejected, updatedWithdrawal.Status);

        // Verifica transação de estorno
        var refundTx = await db.WalletTransactions.FirstOrDefaultAsync(t => t.TransactionType == WalletTransactionType.Credit && t.Amount == 200m);
        Assert.NotNull(refundTx);
        Assert.Contains("Estorno", refundTx.Description);
    }
}

public class MockDelFinanceClient : IDelFinanceClient
{
    public Task<WorkEz.Domain.Common.Result<DelFinanceDictInitResponse>> InitializePaymentByKeyAsync(string pixKey, string? holderDocument = null, CancellationToken cancellationToken = default)
    {
        var response = new DelFinanceDictInitResponse
        {
            EndToEndId = "E38224857TESTENDTOENDID",
            Key = pixKey,
            KeyBelongsHolder = true,
            Beneficiary = new DelFinanceBeneficiaryDto
            {
                Number = "29823",
                Branch = "0001",
                Type = "CURRENT",
                Holder = new DelFinanceHolderDto
                {
                    Name = "HOMOLOGACAO INTEGRACAO API",
                    Document = "30287697789",
                    Type = "NATURAL"
                },
                Participant = new DelFinanceParticipantDto
                {
                    Name = "DELFINANCE SCD S.A.",
                    Ispb = "38224857"
                }
            }
        };
        return Task.FromResult(WorkEz.Domain.Common.Result<DelFinanceDictInitResponse>.Success(response));
    }

    public Task<WorkEz.Domain.Common.Result<DelFinanceTransferResponse>> ExecuteTransferAsync(decimal amount, string endToEndId, string description, Guid? idempotencyKey = null, CancellationToken cancellationToken = default)
    {
        var response = new DelFinanceTransferResponse
        {
            Id = "del-tx-99999",
            EndToEndId = endToEndId,
            Status = "PIX_PROCESSING",
            Amount = amount,
            CreatedAt = DateTime.UtcNow,
            Description = description
        };
        return Task.FromResult(WorkEz.Domain.Common.Result<DelFinanceTransferResponse>.Success(response));
    }

    public Task<WorkEz.Domain.Common.Result<DelFinanceDynamicQrCodeResponse>> CreateDynamicPixChargeAsync(Guid correlationId, decimal amount, string? description = null, CancellationToken cancellationToken = default)
    {
        var response = new DelFinanceDynamicQrCodeResponse
        {
            TransactionId = "vcharge123456789",
            PayloadPix = "00020101021226820014br.gov.bcb.pix2560pix-h.delbank.com.br/qr/v2/testpayload",
            QrCodeImageBase64 = "mock_base64_qrcode"
        };
        return Task.FromResult(WorkEz.Domain.Common.Result<DelFinanceDynamicQrCodeResponse>.Success(response));
    }
}
