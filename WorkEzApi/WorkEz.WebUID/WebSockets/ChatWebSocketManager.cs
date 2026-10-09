using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace WorkEz.WebUID.WebSockets;

public interface IChatNotificationService
{
    Task NotifyChatUpdateAsync(Guid proposalId, Guid? serviceId, string eventType, object? payload = null);
}

public class ChatWebSocketManager : IChatNotificationService
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, WebSocket>> _socketsByProposal = new();
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, WebSocket>> _socketsByService = new();

    public async Task HandleWebSocketAsync(Guid? proposalId, Guid? serviceId, WebSocket webSocket)
    {
        var connectionId = Guid.NewGuid().ToString();
        if (proposalId.HasValue)
        {
            var pSockets = _socketsByProposal.GetOrAdd(proposalId.Value, _ => new ConcurrentDictionary<string, WebSocket>());
            pSockets.TryAdd(connectionId, webSocket);
        }
        if (serviceId.HasValue)
        {
            var sSockets = _socketsByService.GetOrAdd(serviceId.Value, _ => new ConcurrentDictionary<string, WebSocket>());
            sSockets.TryAdd(connectionId, webSocket);
        }

        var buffer = new byte[1024 * 4];
        try
        {
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed by client", CancellationToken.None);
                    break;
                }
            }
        }
        catch
        {
            // Disconnected or aborted
        }
        finally
        {
            if (proposalId.HasValue && _socketsByProposal.TryGetValue(proposalId.Value, out var pSockets))
            {
                pSockets.TryRemove(connectionId, out _);
                if (pSockets.IsEmpty) _socketsByProposal.TryRemove(proposalId.Value, out _);
            }
            if (serviceId.HasValue && _socketsByService.TryGetValue(serviceId.Value, out var sSockets))
            {
                sSockets.TryRemove(connectionId, out _);
                if (sSockets.IsEmpty) _socketsByService.TryRemove(serviceId.Value, out _);
            }
            if (webSocket.State == WebSocketState.Open)
            {
                try
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                }
                catch { }
            }
            webSocket.Dispose();
        }
    }

    public async Task NotifyChatUpdateAsync(Guid proposalId, Guid? serviceId, string eventType, object? payload = null)
    {
        var targetSockets = new HashSet<WebSocket>();

        if (_socketsByProposal.TryGetValue(proposalId, out var pSockets))
        {
            foreach (var ws in pSockets.Values)
            {
                if (ws.State == WebSocketState.Open)
                    targetSockets.Add(ws);
            }
        }

        if (serviceId.HasValue && _socketsByService.TryGetValue(serviceId.Value, out var sSockets))
        {
            foreach (var ws in sSockets.Values)
            {
                if (ws.State == WebSocketState.Open)
                    targetSockets.Add(ws);
            }
        }

        if (targetSockets.Count == 0) return;

        var message = JsonSerializer.Serialize(new
        {
            proposalId,
            serviceId,
            eventType,
            payload,
            timestamp = DateTime.UtcNow
        }, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var bytes = Encoding.UTF8.GetBytes(message);
        var segment = new ArraySegment<byte>(bytes);

        foreach (var socket in targetSockets)
        {
            try
            {
                await socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch
            {
                // socket closed or error, handled in finally
            }
        }
    }
}
