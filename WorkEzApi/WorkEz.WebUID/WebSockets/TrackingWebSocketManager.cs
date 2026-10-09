using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace WorkEz.WebUID.WebSockets;

public interface ITrackingNotificationService
{
    Task NotifyServiceUpdateAsync(Guid serviceId, string eventType, object? payload = null);
}

public class TrackingWebSocketManager : ITrackingNotificationService
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, WebSocket>> _socketsByService = new();

    public async Task HandleWebSocketAsync(Guid serviceId, WebSocket webSocket)
    {
        var connectionId = Guid.NewGuid().ToString();
        var serviceSockets = _socketsByService.GetOrAdd(serviceId, _ => new ConcurrentDictionary<string, WebSocket>());
        serviceSockets.TryAdd(connectionId, webSocket);

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
            // Aborted or closed
        }
        finally
        {
            serviceSockets.TryRemove(connectionId, out _);
            if (serviceSockets.IsEmpty)
            {
                _socketsByService.TryRemove(serviceId, out _);
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

    public async Task NotifyServiceUpdateAsync(Guid serviceId, string eventType, object? payload = null)
    {
        if (!_socketsByService.TryGetValue(serviceId, out var sockets) || sockets.IsEmpty)
            return;

        var message = JsonSerializer.Serialize(new
        {
            serviceId,
            eventType,
            payload,
            timestamp = DateTime.UtcNow
        });

        var bytes = Encoding.UTF8.GetBytes(message);
        var segment = new ArraySegment<byte>(bytes);

        foreach (var (connId, socket) in sockets)
        {
            if (socket.State == WebSocketState.Open)
            {
                try
                {
                    await socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch
                {
                    sockets.TryRemove(connId, out _);
                }
            }
            else
            {
                sockets.TryRemove(connId, out _);
            }
        }
    }
}
