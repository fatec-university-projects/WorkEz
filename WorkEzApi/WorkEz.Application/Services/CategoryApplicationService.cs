using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Interfaces;

namespace WorkEz.Application.Services;

public interface ICategoryApplicationService
{
    Task<IEnumerable<CategoryDto>> GetAllAsync();
    Task<IEnumerable<CategoryDto>> GetByProviderIdAsync(Guid providerId);
    Task<Result<bool>> UpdateProviderCategoriesAsync(Guid providerId, List<Guid> categoryIds, Guid callerUserId, bool isAdmin);
}

public class CategoryApplicationService(
    ICategoryRepository categoryRepository,
    IServiceProviderRepository providerRepository
) : ICategoryApplicationService
{
    private readonly ICategoryRepository _categoryRepository = categoryRepository;
    private readonly IServiceProviderRepository _providerRepository = providerRepository;

    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var list = await _categoryRepository.GetAllOrderedByNameAsync();
        return list.Select(c => new CategoryDto(c.Id, c.Name, c.Description));
    }

    public async Task<IEnumerable<CategoryDto>> GetByProviderIdAsync(Guid providerId)
    {
        var list = await _categoryRepository.GetByProviderIdAsync(providerId);
        return list.Select(c => new CategoryDto(c.Id, c.Name, c.Description));
    }

    public async Task<Result<bool>> UpdateProviderCategoriesAsync(Guid providerId, List<Guid> categoryIds, Guid callerUserId, bool isAdmin)
    {
        if (!isAdmin)
        {
            var provider = await _providerRepository.GetByIdAsync(providerId);
            if (provider == null || provider.UserId != callerUserId)
            {
                return Result<bool>.Failure("Você não tem permissão para alterar categorias deste prestador.", "FORBIDDEN");
            }
        }

        await _categoryRepository.UpdateProviderCategoriesAsync(providerId, categoryIds);
        return Result<bool>.Success(true);
    }
}
