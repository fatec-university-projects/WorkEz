using System.Net;
using System.Text.Json;

namespace WorkEz.Api.Middleware;

/// <summary>
/// Global exception handling middleware that returns RFC 7807 Problem Details format.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception has occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";
        
        var response = new ProblemDetails
        {
            Instance = context.Request.Path,
            TraceId = context.TraceIdentifier
        };

        switch (exception)
        {
            case ArgumentNullException ex:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Status = StatusCodes.Status400BadRequest;
                response.Title = "One or more validation errors occurred.";
                response.Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1";
                response.Detail = ex.Message;
                response.Errors = new Dictionary<string, string[]> 
                { 
                    { "validation", new[] { ex.Message } } 
                };
                break;

            case ArgumentException ex:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Status = StatusCodes.Status400BadRequest;
                response.Title = "One or more validation errors occurred.";
                response.Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1";
                response.Detail = ex.Message;
                response.Errors = new Dictionary<string, string[]> 
                { 
                    { "validation", new[] { ex.Message } } 
                };
                break;

            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response.Status = StatusCodes.Status401Unauthorized;
                response.Title = "Unauthorized";
                response.Type = "https://tools.ietf.org/html/rfc7231#section-6.3.1";
                response.Detail = "User is not authenticated or token has expired.";
                break;

            case KeyNotFoundException ex:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                response.Status = StatusCodes.Status404NotFound;
                response.Title = "Resource not found";
                response.Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4";
                response.Detail = ex.Message;
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.Status = StatusCodes.Status500InternalServerError;
                response.Title = "Internal Server Error";
                response.Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1";
                response.Detail = "An internal server error has occurred. Please contact support.";
                break;
        }

        return context.Response.WriteAsJsonAsync(response);
    }
}

public class ProblemDetails
{
    public string? Type { get; set; }
    public string? Title { get; set; }
    public int? Status { get; set; }
    public string? Detail { get; set; }
    public string? Instance { get; set; }
    public string? TraceId { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }
}
