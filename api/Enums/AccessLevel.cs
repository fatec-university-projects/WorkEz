namespace WorkEz.Api.Enums;

/// <summary>
/// Defines the permission tier of an Administrator account.
/// </summary>
public enum AccessLevel
{
    /// <summary>Can view data and moderate content.</summary>
    Moderator = 0,

    /// <summary>Can manage users, categories, and reports.</summary>
    Manager = 1,

    /// <summary>Full platform access including financial and system settings.</summary>
    SuperAdmin = 2
}
