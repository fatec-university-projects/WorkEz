namespace WorkEz.Domain.Common;

/// <summary>
/// Result Pattern for elegant error handling without throwing exceptions for control flow.
/// </summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string Error { get; }
    public string ErrorCode { get; }

    protected Result(bool isSuccess, string error, string errorCode)
    {
        IsSuccess = isSuccess;
        Error = error;
        ErrorCode = errorCode;
    }

    public static Result Success() => new(true, string.Empty, string.Empty);
    public static Result Failure(string error, string errorCode = "DOMAIN_ERROR") => new(false, error, errorCode);
}

/// <summary>
/// Generic Result Pattern holding a strongly-typed return Value on success.
/// </summary>
public class Result<T> : Result
{
    private readonly T? _value;

    public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Cannot access value of a failed result.");

    private Result(T value) : base(true, string.Empty, string.Empty) => _value = value;
    private Result(string error, string errorCode) : base(false, error, errorCode) => _value = default;

    public static Result<T> Success(T value) => new(value);
    public static new Result<T> Failure(string error, string errorCode = "DOMAIN_ERROR") => new(error, errorCode);
}
