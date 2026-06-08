namespace WorkEz.Api.Enums;

/// <summary>
/// Controls whether a service category is visible and selectable by customers.
/// </summary>
public enum CategoryStatus
{
    /// <summary>Category is active and visible to customers.</summary>
    Active = 0,

    /// <summary>Category is hidden and cannot be selected for new services.</summary>
    Inactive = 1
}
