using System.Collections.Concurrent;
using System.Net;

namespace WorkEz.Api.Middleware;

/// <summary>
/// Simple in-memory rate limiting middleware using Token Bucket algorithm.
/// Limits requests per IP address: 100 requests per 60 seconds.
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly int _requestsPerMinute = 100;
    private readonly ConcurrentDictionary<string, RequestBucket> _buckets = new();

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;

        // Background task to clean up old buckets every 5 minutes
        _ = CleanupBucketsAsync();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = GetClientIpAddress(context);
        var bucket = _buckets.GetOrAdd(clientIp, _ => new RequestBucket(_requestsPerMinute));

        if (!bucket.AllowRequest())
        {
            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded: 100 requests per minute",
                retryAfter = 60
            });
            _logger.LogWarning($"Rate limit exceeded for IP: {clientIp}");
            return;
        }

        context.Response.Headers.Add("X-RateLimit-Limit", _requestsPerMinute.ToString());
        context.Response.Headers.Add("X-RateLimit-Remaining", bucket.GetRemainingRequests().ToString());

        await _next(context);
    }

    private string GetClientIpAddress(HttpContext context)
    {
        // Check X-Forwarded-For header (for proxies/load balancers)
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var xForwardedFor))
        {
            var ips = xForwardedFor.ToString().Split(',');
            return ips[0].Trim();
        }

        // Otherwise, use RemoteIpAddress
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private async Task CleanupBucketsAsync()
    {
        while (true)
        {
            await Task.Delay(TimeSpan.FromMinutes(5));

            // Remove buckets that haven't been accessed in 10 minutes
            var cutoff = DateTime.UtcNow.AddMinutes(-10);
            var keysToRemove = _buckets
                .Where(kvp => kvp.Value.LastAccessTime < cutoff)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var key in keysToRemove)
            {
                _buckets.TryRemove(key, out _);
            }
        }
    }

    private class RequestBucket
    {
        private int _tokens;
        private readonly int _capacity;
        private DateTime _lastRefillTime = DateTime.UtcNow;
        public DateTime LastAccessTime { get; private set; } = DateTime.UtcNow;

        public RequestBucket(int capacity)
        {
            _capacity = capacity;
            _tokens = capacity;
        }

        public bool AllowRequest()
        {
            RefillTokens();
            LastAccessTime = DateTime.UtcNow;

            if (_tokens > 0)
            {
                _tokens--;
                return true;
            }

            return false;
        }

        public int GetRemainingRequests()
        {
            RefillTokens();
            return _tokens;
        }

        private void RefillTokens()
        {
            var now = DateTime.UtcNow;
            var timePassed = now - _lastRefillTime;
            var tokensToAdd = (int)(timePassed.TotalSeconds * (_capacity / 60.0));

            if (tokensToAdd > 0)
            {
                _tokens = Math.Min(_capacity, _tokens + tokensToAdd);
                _lastRefillTime = now;
            }
        }
    }
}

public static class RateLimitingExtensions
{
    public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RateLimitingMiddleware>();
    }
}
