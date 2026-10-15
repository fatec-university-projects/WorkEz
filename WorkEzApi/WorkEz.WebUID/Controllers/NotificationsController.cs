using Microsoft.AspNetCore.Mvc;
using WorkEz.Application.DTOs;
using WorkEz.Application.Services;

namespace WorkEz.WebUID.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController(IPushNotificationService pushNotificationService) : ControllerBase
{
    private readonly IPushNotificationService _pushNotificationService = pushNotificationService;

    /// <summary>
    /// Registra ou atualiza o Expo Push Token de um dispositivo de usuário.
    /// Chamado logo após o login e permissão de notificação no mobile.
    /// </summary>
    [HttpPost("register-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RegisterDevice([FromBody] RegisterDeviceTokenRequest request)
    {
        var result = await _pushNotificationService.RegisterDeviceTokenAsync(request);
        if (result.IsSuccess)
        {
            return Ok(new
            {
                message = "Dispositivo registrado com sucesso para notificações push.",
                token = result.Value.ExpoPushToken,
                platform = result.Value.Platform
            });
        }

        return BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Remove o token do dispositivo ao efetuar logout.
    /// </summary>
    [HttpPost("remove-device")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveDevice([FromBody] RemoveDeviceTokenRequest request)
    {
        var result = await _pushNotificationService.RemoveDeviceTokenAsync(request.ExpoPushToken);
        if (result.IsSuccess)
        {
            return Ok(new { message = "Token de notificação removido com sucesso." });
        }

        return BadRequest(new { message = result.Error, code = result.ErrorCode });
    }

    /// <summary>
    /// Retorna os tokens registrados para um usuário específico (diagnóstico/administração).
    /// </summary>
    [HttpGet("tokens/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserTokens(Guid userId)
    {
        var tokens = await _pushNotificationService.GetTokensByUserAsync(userId);
        return Ok(tokens.Select(t => new
        {
            t.Id,
            t.UserId,
            t.ExpoPushToken,
            t.Platform,
            t.UpdatedAt
        }));
    }

    /// <summary>
    /// Envia uma notificação push de teste para um usuário.
    /// </summary>
    [HttpPost("test-push")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> TestPush([FromBody] SendPushNotificationRequest request)
    {
        var sent = await _pushNotificationService.SendToUserAsync(
            request.UserId,
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
