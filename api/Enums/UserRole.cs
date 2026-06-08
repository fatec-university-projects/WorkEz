namespace WorkEz.Api.Enums;

/// <summary>
/// Represents the roles available in the WorkEz system.
/// Each role maps to a dedicated profile entity (Customer, ServiceProvider, or Administrator).
/// </summary>
public enum UserRole
{
    /// <summary>End-user who creates and hires services.</summary>
    Customer = 0,

    /// <summary>Professional who offers and executes services.</summary>
    ServiceProvider = 1,

    /// <summary>Platform administrator with elevated privileges.</summary>
    Admin = 2
}
