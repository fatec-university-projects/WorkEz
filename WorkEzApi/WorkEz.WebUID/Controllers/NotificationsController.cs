using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class NotificationsController(IPushNotificationService pushNotificationService) : ControllerBase
{
    private readonly IPushNotificationService _pushNotificationService = pushNotificationService;

    /// <summary>
    /// Id do usuário autenticado, extraído do claim "sub" do JWT (nunca do body/URL).
    /// </summary>
    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirst("sub")?.Value, out var id) ? id : null;

    /// <summary>
    /// Registra ou atualiza o Expo Push Token do dispositivo do usuário autenticado.
    /// O UserId enviado no body é ignorado: o dono do token é sempre o usuário do JWT.
    /// </summary>
    [HttpPost("register-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceTokenRequest request)
    {
        if (CurrentUserId is not { } userId)
            return Unauthorized();

        var result = await _pushNotificationService.RegisterDeviceTokenAsync(request with { UserId = userId });
        if (result.IsSuccess)
        {
            return Ok(new
            {
                message = "Dispositivo registrado com sucesso para notificações push.",
                platform = result.Value.Platform
            });
        }

        return BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Remove o token do dispositivo ao efetuar logout. Só remove tokens do próprio usuário.
    /// </summary>
    [HttpPost("remove-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RemoveDevice([FromBody] RemoveDeviceTokenRequest request)
    {
        if (CurrentUserId is not { } userId)
            return Unauthorized();

        var owned = (await _pushNotificationService.GetTokensByUserAsync(userId))
            .Any(t => t.ExpoPushToken == request.ExpoPushToken);
        if (!owned)
            return Ok(new { message = "Token de notificação removido com sucesso." });

        var result = await _pushNotificationService.RemoveDeviceTokenAsync(request.ExpoPushToken);
        return result.IsSuccess
            ? Ok(new { message = "Token de notificação removido com sucesso." })
            : BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Lista os dispositivos do próprio usuário. Admin pode consultar qualquer usuário.
    /// Os tokens completos não são expostos: apenas plataforma e data.
    /// </summary>
    [HttpGet("tokens/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUserTokens(Guid userId)
    {
        if (CurrentUserId is not { } currentId)
            return Unauthorized();
        if (userId != currentId && !User.IsInRole("Admin"))
            return Forbid();

        var tokens = await _pushNotificationService.GetTokensByUserAsync(userId);
        return Ok(tokens.Select(t => new { t.Id, t.UserId, t.Platform, t.UpdatedAt }));
    }

    /// <summary>
    /// Envia uma notificação de teste. Usuário comum só dispara para si mesmo; Admin pode escolher o destino.
    /// </summary>
    [HttpPost("test-push")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> TestPush([FromBody] SendPushNotificationRequest request)
    {
        if (CurrentUserId is not { } currentId)
            return Unauthorized();

        var target = User.IsInRole("Admin") && request.UserId != Guid.Empty ? request.UserId : currentId;

        var sent = await _pushNotificationService.SendToUserAsync(
            target,
            request.Title ?? "WorkEz — Notificação de Teste",
            request.Body ?? "Esta é uma notificação push de teste do ecossistema WorkEz.",
            request.Data ?? new { type = "test" }
        );

        return Ok(new
        {
            success = sent,
            message = sent
                ? "Notificação disparada com sucesso."
                : "Nenhum token ativo encontrado para o usuário ou erro no disparo."
        });
    }
}
