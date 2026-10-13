namespace WorkEz.Domain.Common;

/// <summary>
/// Custom exception for Domain rule violations.
/// </summary>
public class DomainException : Exception
{
    public string Code { get; }
    public DomainException(string message, string code = "DOMAIN_ERROR") : base(message) => Code = code;
}
