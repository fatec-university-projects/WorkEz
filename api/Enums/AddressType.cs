namespace WorkEz.Api.Enums;

/// <summary>
/// Distinguishes the purpose of a stored address.
/// </summary>
public enum AddressType
{
    /// <summary>Residential or billing address of the user.</summary>
    Home = 0,

    /// <summary>Commercial address.</summary>
    Work = 1,

    /// <summary>Specific location where the service should be performed.</summary>
    ServiceLocation = 2,

    /// <summary>Other / uncategorised address.</summary>
    Other = 3
}
