using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Xunit;
using WorkEz.WebUID.Controllers;
using WorkEz.WebUID.WebSockets;

namespace WorkEz.WebUID.Tests;

public class UploadsAndWebSocketsTests
{
    private class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "workez_uploads_test_" + Guid.NewGuid().ToString("N"));
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "WorkEz.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Development";
    }

    private class FakeWebSocket : WebSocket
    {
        private readonly Queue<WebSocketReceiveResult> _receiveQueue = new();
        private readonly TaskCompletionSource _releaseReceiveTcs = new();
        private WebSocketState _state = WebSocketState.Open;

        public List<string> SentMessages { get; } = [];

        public void SetState(WebSocketState state) => _state = state;

        public void TriggerCloseFromClient()
        {
            _receiveQueue.Enqueue(new WebSocketReceiveResult(0, WebSocketMessageType.Close, true, WebSocketCloseStatus.NormalClosure, "Client closed"));
            _releaseReceiveTcs.TrySetResult();
        }

        public override WebSocketCloseStatus? CloseStatus => _state == WebSocketState.Closed ? WebSocketCloseStatus.NormalClosure : null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => _state;
        public override string? SubProtocol => null;

        public override void Abort() => _state = WebSocketState.Aborted;

        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
        {
            _state = WebSocketState.Closed;
            return Task.CompletedTask;
        }

        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken)
        {
            _state = WebSocketState.Closed;
            return Task.CompletedTask;
        }

        public override void Dispose() => _state = WebSocketState.Closed;

        public override async Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            if (_receiveQueue.Count == 0)
            {
                await _releaseReceiveTcs.Task;
            }
            if (_receiveQueue.Count > 0)
            {
                return _receiveQueue.Dequeue();
            }
            return new WebSocketReceiveResult(0, WebSocketMessageType.Close, true);
        }

        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            if (_state != WebSocketState.Open)
                throw new WebSocketException("WebSocket is not open.");

            var text = Encoding.UTF8.GetString(buffer.Array!, buffer.Offset, buffer.Count);
            SentMessages.Add(text);
            return Task.CompletedTask;
        }
    }

    private static UploadsController CreateUploadsController(FakeWebHostEnvironment env)
    {
        var controller = new UploadsController(env);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("cdn.workez.test");
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    [Fact]
    public async Task UploadsController_MultipartUpload_ShouldAcceptValidImages_AndRejectDangerousExtensionsOrOversizedFiles()
    {
        var env = new FakeWebHostEnvironment();
        try
        {
            var controller = CreateUploadsController(env);

            // 1. Imagem válida (.png) -> 200 OK
            var imgBytes = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 };
            using var validStream = new MemoryStream(imgBytes);
            var validFile = new FormFile(validStream, 0, imgBytes.Length, "file", "foto.png");

            var okRes = await controller.Upload(validFile);
            var okObj = Assert.IsType<OkObjectResult>(okRes);
            var json = JsonSerializer.Serialize(okObj.Value);
            Assert.Contains("https://cdn.workez.test/uploads/", json);
            Assert.Contains(".png", json);

            // 2. Extensões perigosas (.html, .svg, .exe, .js) -> 400 BadRequest (prevenção de XSS/Malware)
            foreach (var badExt in new[] { "exploit.html", "xss.svg", "malware.exe", "script.js" })
            {
                using var badStream = new MemoryStream([1, 2, 3]);
                var badFile = new FormFile(badStream, 0, 3, "file", badExt);
                var badRes = await controller.Upload(badFile);
                Assert.IsType<BadRequestObjectResult>(badRes);
            }

            // 3. Arquivo vazio -> 400 BadRequest
            using var emptyStream = new MemoryStream();
            var emptyFile = new FormFile(emptyStream, 0, 0, "file", "vazio.jpg");
            Assert.IsType<BadRequestObjectResult>(await controller.Upload(emptyFile));

            // 4. Arquivo acima de 10 MB -> 400 BadRequest
            var oversizedFile = new FormFile(validStream, 0, (10 * 1024 * 1024) + 1, "file", "grande.jpg");
            Assert.IsType<BadRequestObjectResult>(await controller.Upload(oversizedFile));
        }
        finally
        {
            if (Directory.Exists(env.WebRootPath))
                Directory.Delete(env.WebRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task UploadsController_UploadBase64_ShouldSaveDataUriAndRejectMalformedBase64()
    {
        var env = new FakeWebHostEnvironment();
        try
        {
            var controller = CreateUploadsController(env);

            const string webpBase64 = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
            var okRes = await controller.UploadBase64(new Base64UploadRequest(webpBase64, "foto.webp"));
            var okObj = Assert.IsType<OkObjectResult>(okRes);
            var json = JsonSerializer.Serialize(okObj.Value);
            Assert.Contains(".webp", json);

            // Base64 malformado -> 400 BadRequest
            var badBase64 = await controller.UploadBase64(new Base64UploadRequest("%%%nao-e-base64%%%", "bad.jpg"));
            Assert.IsType<BadRequestObjectResult>(badBase64);

            // Vazio -> 400 BadRequest
            var emptyBase64 = await controller.UploadBase64(new Base64UploadRequest("   ", null));
            Assert.IsType<BadRequestObjectResult>(emptyBase64);
        }
        finally
        {
            if (Directory.Exists(env.WebRootPath))
                Directory.Delete(env.WebRootPath, recursive: true);
        }
    }

    [Fact]
    public async Task ChatWebSocketManager_ShouldRegisterSubscribers_DeliverMessages_AndCleanUpOnClose()
    {
        var manager = new ChatWebSocketManager();
        var proposalId = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var socket = new FakeWebSocket();

        Assert.False(manager.HasActiveSubscribers(proposalId, serviceId));

        var handleTask = manager.HandleWebSocketAsync(proposalId, serviceId, socket);

        Assert.True(manager.HasActiveSubscribers(proposalId, null));
        Assert.True(manager.HasActiveSubscribers(null, serviceId));

        await manager.NotifyChatUpdateAsync(proposalId, serviceId, "new_message", new { text = "Olá WebSocket!" });

        Assert.Single(socket.SentMessages);
        using var doc = JsonDocument.Parse(socket.SentMessages[0]);
        Assert.Equal("new_message", doc.RootElement.GetProperty("eventType").GetString());
        Assert.Equal("Olá WebSocket!", doc.RootElement.GetProperty("payload").GetProperty("text").GetString());

        socket.TriggerCloseFromClient();
        await handleTask;

        Assert.False(manager.HasActiveSubscribers(proposalId, serviceId));
    }

    [Fact]
    public async Task TrackingWebSocketManager_ShouldDeliverServiceUpdates_AndPruneClosedSockets()
    {
        var manager = new TrackingWebSocketManager();
        var serviceId = Guid.NewGuid();
        var openSocket = new FakeWebSocket();
        var abortedSocket = new FakeWebSocket();

        var task1 = manager.HandleWebSocketAsync(serviceId, openSocket);
        var task2 = manager.HandleWebSocketAsync(serviceId, abortedSocket);

        abortedSocket.SetState(WebSocketState.Aborted);

        await manager.NotifyServiceUpdateAsync(serviceId, "status_changed", new { status = "on-the-way" });

        Assert.Single(openSocket.SentMessages);
        Assert.Contains("on-the-way", openSocket.SentMessages[0]);
        Assert.Empty(abortedSocket.SentMessages);

        openSocket.TriggerCloseFromClient();
        abortedSocket.TriggerCloseFromClient();
        await Task.WhenAll(task1, task2);
    }
}
