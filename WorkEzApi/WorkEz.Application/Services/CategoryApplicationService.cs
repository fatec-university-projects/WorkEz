using WorkEz.Application.DTOs;
using WorkEz.Domain.Common;
using WorkEz.Domain.Entities;
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

    private static readonly Category[] DefaultCategories =
    [
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111101"), Name = "Elétrica", Description = "Instalações, reparos de fiação, disjuntores e tomadas" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111102"), Name = "Hidráulica", Description = "Conserto de vazamentos, torneiras, encanamentos e registros" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111103"), Name = "Pintura", Description = "Pintura residencial, comercial, massa corrida e texturas" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111104"), Name = "Limpeza e Diarista", Description = "Faxina completa, limpeza pós-obra e conservação" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111105"), Name = "Montagem de Móveis", Description = "Montagem, desmontagem e pequenos reparos em móveis" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111106"), Name = "Climatização e Ar-Condicionado", Description = "Instalação, higienização e manutenção de ar-condicionado" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111107"), Name = "Jardinagem", Description = "Corte de grama, poda, paisagismo e manutenção de jardins" },
        new() { Id = Guid.Parse("11111111-1111-1111-1111-111111111108"), Name = "Alvenaria e Reformas", Description = "Pequenas obras, assentamento de pisos, reboco e reparos" }
    ];

    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var list = (await _categoryRepository.GetAllOrderedByNameAsync()).ToList();
        if (list.Count == 0)
        {
            foreach (var item in DefaultCategories)
            {
                await _categoryRepository.AddAsync(new Category
                {
                    Id = item.Id,
                    Name = item.Name,
                    Description = item.Description
                });
            }
            await _categoryRepository.SaveChangesAsync();
            list = (await _categoryRepository.GetAllOrderedByNameAsync()).ToList();
        }
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
