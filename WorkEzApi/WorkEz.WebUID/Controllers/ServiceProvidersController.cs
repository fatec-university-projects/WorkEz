using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.Services;
using WorkEz.Infra.Data.Context;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

/// <summary>
/// ServiceProvidersController — Clean Architecture.
/// Gerencia perfil do prestador e portfólio de imagens.
/// Leitura do perfil público: qualquer usuário autenticado. Escrita e dados privados: só o próprio prestador (ou Admin).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ServiceProvidersController(IPortfolioApplicationService portfolioService, AppDbContext db) : ControllerBase
{
    private readonly IPortfolioApplicationService _portfolioService = portfolioService;

    private bool IsSelfOrAdmin(Guid userId) => User.GetUserId() == userId || User.IsAdmin();

    private async Task<bool> OwnsProviderOrAdminAsync(Guid providerId)
    {
        if (User.IsAdmin()) return true;
        var userId = User.GetUserId();
        return userId is not null && await db.OwnsProviderAsync(providerId, userId.Value);
    }

    /// <summary>
    /// Busca perfil do prestador pelo UserId.
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(ServiceProviderProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var result = await _portfolioService.GetProviderByUserIdAsync(userId);
        return result.IsSuccess
            ? Ok(result.Value)
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Busca perfil do prestador pelo Id do ServiceProvider.
    /// </summary>
    [HttpGet("{providerId:guid}")]
    [ProducesResponseType(typeof(ServiceProviderProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid providerId)
    {
        var result = await _portfolioService.GetProviderByIdAsync(providerId);
        return result.IsSuccess
            ? Ok(result.Value)
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Atualiza dados do prestador (descrição profissional).
    /// </summary>
    [HttpPut("{providerId:guid}")]
    [ProducesResponseType(typeof(ServiceProviderProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProvider(Guid providerId, [FromBody] UpdateProviderRequest request)
    {
        if (!await OwnsProviderOrAdminAsync(providerId))
            return Forbid();

        var result = await _portfolioService.UpdateProviderAsync(providerId, request.ProfessionalDescription);
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Retorna o resumo semanal de desempenho do prestador pelo UserId.
    /// </summary>
    [HttpGet("by-user/{userId:guid}/weekly-summary")]
    [ProducesResponseType(typeof(ProviderWeeklySummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWeeklySummaryByUserId(Guid userId)
    {
        if (!IsSelfOrAdmin(userId))
            return Forbid();

        var result = await _portfolioService.GetWeeklySummaryByUserIdAsync(userId);
        return result.IsSuccess
            ? Ok(result.Value)
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Retorna o resumo semanal de desempenho do prestador pelo Id do ServiceProvider.
    /// </summary>
    [HttpGet("{providerId:guid}/weekly-summary")]
    [ProducesResponseType(typeof(ProviderWeeklySummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetWeeklySummaryById(Guid providerId)
    {
        if (!await OwnsProviderOrAdminAsync(providerId))
            return Forbid();

        var result = await _portfolioService.GetWeeklySummaryByProviderIdAsync(providerId);
        return result.IsSuccess
            ? Ok(result.Value)
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    // ─── Portfolio Endpoints ─────────────────────────────────────────────────

    /// <summary>
    /// Retorna todas as imagens do portfólio de um prestador (pelo UserId).
    /// </summary>
    [HttpGet("{userId:guid}/portfolio")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPortfolio(Guid userId)
    {
        var result = await _portfolioService.GetPortfolioByUserIdAsync(userId);
        return result.IsSuccess
            ? Ok(result.Value!.Images)
            : NotFound(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Adiciona uma imagem ao portfólio do prestador.
    /// </summary>
    [HttpPost("{userId:guid}/portfolio")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddPortfolioImage(Guid userId, [FromBody] AddPortfolioImageBodyRequest body)
    {
        if (!IsSelfOrAdmin(userId))
            return Forbid();

        var result = await _portfolioService.AddImageAsync(new AddPortfolioImageRequest(userId, body.ImageUrl));
        return result.IsSuccess
            ? Ok(result.Value!.Images)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Remove uma imagem do portfólio do prestador.
    /// </summary>
    [HttpDelete("{userId:guid}/portfolio")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemovePortfolioImage(Guid userId, [FromBody] RemovePortfolioImageBodyRequest body)
    {
        if (!IsSelfOrAdmin(userId))
            return Forbid();

        var result = await _portfolioService.RemoveImageAsync(new RemovePortfolioImageRequest(userId, body.ImageUrl));
        return result.IsSuccess
            ? Ok(result.Value!.Images)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    // ─── GeoLocalization Endpoints ───────────────────────────────────────────

    /// <summary>
    /// Atualiza as coordenadas geográficas (Latitude e Longitude) e raio de atendimento (em km) do prestador.
    /// </summary>
    [HttpPut("{providerId:guid}/location")]
    [ProducesResponseType(typeof(ServiceProviderProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateLocation(Guid providerId, [FromBody] WorkEz.Application.DTOs.UpdateProviderLocationRequest request)
    {
        if (!await OwnsProviderOrAdminAsync(providerId))
            return Forbid();

        var result = await _portfolioService.UpdateLocationAsync(providerId, request.Latitude, request.Longitude, request.ServiceRadiusKm);
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Busca prestadores de serviços próximos a um ponto geográfico com cálculo de distância (Haversine).
    /// </summary>
    [HttpGet("nearby")]
    [ProducesResponseType(typeof(IEnumerable<WorkEz.Application.DTOs.NearbyProviderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNearby([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double? radiusKm = null)
    {
        var result = await _portfolioService.GetNearbyProvidersAsync(lat, lng, radiusKm);
        return result.IsSuccess
            ? Ok(result.Value)
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }
}

// ─── Request Models ───────────────────────────────────────────────────────────

public record UpdateProviderRequest(string? ProfessionalDescription);
public record AddPortfolioImageBodyRequest(string ImageUrl);
public record RemovePortfolioImageBodyRequest(string ImageUrl);
