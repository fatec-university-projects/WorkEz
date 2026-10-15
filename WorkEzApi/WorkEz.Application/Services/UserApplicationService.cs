using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface IUserApplicationService
{
    Task<Result<UserProfileDto>> GetProfileAsync(Guid userId);
    Task<Result<UserProfileDto>> GetByIdAsync(Guid id, Guid? callerUserId, bool isAdmin);
    Task<Result<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateUserProfileRequest request, string? scheme, string? host, string? webRootPath);
}

public class UserApplicationService(IUserRepository userRepository) : IUserApplicationService
{
    private readonly IUserRepository _userRepository = userRepository;

    public async Task<Result<UserProfileDto>> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return Result<UserProfileDto>.Failure("Usuário não encontrado.", "NOT_FOUND");

        return Result<UserProfileDto>.Success(MapToUserProfileDto(user));
    }

    public async Task<Result<UserProfileDto>> GetByIdAsync(Guid id, Guid? callerUserId, bool isAdmin)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
            return Result<UserProfileDto>.Failure("Usuário não encontrado.", "NOT_FOUND");

        var canSeeContact = (callerUserId.HasValue && callerUserId.Value == id) || isAdmin;
        return Result<UserProfileDto>.Success(MapToUserProfileDto(user, canSeeContact));
    }

    public async Task<Result<UserProfileDto>> UpdateProfileAsync(
        Guid userId,
        UpdateUserProfileRequest request,
        string? scheme,
        string? host,
        string? webRootPath)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return Result<UserProfileDto>.Failure("Usuário não encontrado para atualização.", "NOT_FOUND");

        if (!string.IsNullOrWhiteSpace(request.Name))
            user.Name = request.Name.Trim();

        var emailResult = await UpdateUserEmailAsync(user, request.Email);
        if (!emailResult.IsSuccess)
            return Result<UserProfileDto>.Failure(emailResult.Error!, emailResult.ErrorCode!);

        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        if (request.ProfilePicture != null)
        {
            user.ProfilePicture = await ProcessProfilePictureAsync(request.ProfilePicture, scheme, host, webRootPath);
        }

        user.Touch();
        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        return Result<UserProfileDto>.Success(MapToUserProfileDto(user));
    }

    private async Task<Result<bool>> UpdateUserEmailAsync(User user, string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return Result<bool>.Success(true);

        var newEmail = email.Trim().ToLowerInvariant();
        if (user.Email == newEmail)
            return Result<bool>.Success(true);

        var emailInUse = await _userRepository.IsEmailInUseAsync(newEmail, user.Id);
        if (emailInUse)
            return Result<bool>.Failure("Este e-mail já está sendo utilizado por outra conta.", "BAD_REQUEST");

        user.Email = newEmail;
        return Result<bool>.Success(true);
    }

    private static async Task<string?> ProcessProfilePictureAsync(
        string picRaw,
        string? scheme,
        string? host,
        string? webRootPath)
    {
        var pic = picRaw.Trim();
        if (!pic.StartsWith("data:image/") && pic.Length <= 400)
            return pic;

        try
        {
            var root = webRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(root, "uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var (ext, base64) = ParseImageData(pic);
            var bytes = Convert.FromBase64String(base64);
            var fileName = $"{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, fileName);
            await File.WriteAllBytesAsync(filePath, bytes);

            var baseUrl = !string.IsNullOrEmpty(scheme) && !string.IsNullOrEmpty(host)
                ? $"{scheme}://{host}"
                : string.Empty;

            return $"{baseUrl}/uploads/{fileName}";
        }
        catch
        {
            return pic.Length <= 500 ? pic : null;
        }
    }

    private static (string Extension, string Base64Data) ParseImageData(string dataUri)
    {
        var ext = ".jpg";
        var raw = dataUri;

        if (raw.StartsWith("data:image/"))
        {
            var commaIdx = raw.IndexOf(',');
            if (commaIdx >= 0)
            {
                var header = raw[..commaIdx];
                if (header.Contains("png")) ext = ".png";
                else if (header.Contains("webp")) ext = ".webp";
                raw = raw[(commaIdx + 1)..];
            }
        }

        return (ext, raw);
    }

    private static UserProfileDto MapToUserProfileDto(User user, bool canSeeContact = true) => new(
        user.Id,
        user.Name,
        canSeeContact ? user.Email : string.Empty,
        canSeeContact ? user.Phone : null,
        user.ProfilePicture,
        user.Role.ToString()
    );
}
