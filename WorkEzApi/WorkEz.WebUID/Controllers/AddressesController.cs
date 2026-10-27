using Microsoft.AspNetCore.Mvc;
using WorkEz.Domain.Entities;
using WorkEz.Domain.Interfaces;
using WorkEz.WebUID.Auth;

namespace WorkEz.WebUID.Controllers;

public record AddressDto(
    Guid Id,
    Guid UserId,
    string Street,
    string Number,
    string? Complement,
    string Neighborhood,
    string City,
    string State,
    string ZipCode,
    string AddressType,
    double? Latitude,
    double? Longitude
);

public record CreateAddressRequest(
    string Street,
    string Number,
    string? Complement,
    string Neighborhood,
    string City,
    string State,
    string ZipCode,
    string? AddressType = "Home",
    double? Latitude = null,
    double? Longitude = null
);

public record UpdateAddressRequest(
    string Street,
    string Number,
    string? Complement,
    string Neighborhood,
    string City,
    string State,
    string ZipCode,
    string? AddressType = "Home",
    double? Latitude = null,
    double? Longitude = null
);

/// <summary>
/// Gerenciamento de endereços salvos do cliente/usuário.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AddressesController(
    IBaseRepository<Address> addressRepo,
    IServiceRepository? serviceRepo = null) : ControllerBase
{
    private readonly IBaseRepository<Address> _addressRepo = addressRepo;
    private readonly IServiceRepository? _serviceRepo = serviceRepo;

    /// <summary>
    /// Retorna todos os endereços do usuário autenticado.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AddressDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyAddresses()
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var addresses = await _addressRepo.FindAsync(a => a.UserId == callerUserId.Value);

        var dtos = addresses.Select(a => new AddressDto(
            a.Id,
            a.UserId,
            a.Street,
            a.Number,
            a.Complement,
            a.Neighborhood,
            a.City,
            a.State,
            a.ZipCode,
            a.AddressType,
            a.Latitude,
            a.Longitude
        ));

        return Ok(dtos);
    }

    /// <summary>
    /// Retorna um endereço específico pelo Id.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AddressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var address = await _addressRepo.GetByIdAsync(id);
        if (address is null)
            return NotFound(new { message = "Endereço não encontrado." });

        if (address.UserId != callerUserId.Value && !User.IsAdmin())
            return Forbid();

        return Ok(new AddressDto(
            address.Id,
            address.UserId,
            address.Street,
            address.Number,
            address.Complement,
            address.Neighborhood,
            address.City,
            address.State,
            address.ZipCode,
            address.AddressType,
            address.Latitude,
            address.Longitude
        ));
    }

    /// <summary>
    /// Cadastra um novo endereço para o usuário autenticado.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AddressDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreateAddressRequest request)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        if (string.IsNullOrWhiteSpace(request.Street) || string.IsNullOrWhiteSpace(request.Number) || string.IsNullOrWhiteSpace(request.ZipCode))
        {
            return BadRequest(new { message = "Rua, número e CEP são obrigatórios." });
        }

        var address = new Address
        {
            UserId = callerUserId.Value,
            Street = request.Street.Trim(),
            Number = request.Number.Trim(),
            Complement = request.Complement?.Trim(),
            Neighborhood = request.Neighborhood.Trim(),
            City = request.City.Trim(),
            State = request.State.Trim().ToUpperInvariant(),
            ZipCode = request.ZipCode.Trim(),
            AddressType = string.IsNullOrWhiteSpace(request.AddressType) ? "Home" : request.AddressType.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };

        await _addressRepo.AddAsync(address);
        await _addressRepo.SaveChangesAsync();

        var dto = new AddressDto(
            address.Id,
            address.UserId,
            address.Street,
            address.Number,
            address.Complement,
            address.Neighborhood,
            address.City,
            address.State,
            address.ZipCode,
            address.AddressType,
            address.Latitude,
            address.Longitude
        );

        return CreatedAtAction(nameof(GetById), new { id = address.Id }, dto);
    }

    /// <summary>
    /// Atualiza um endereço existente.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AddressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAddressRequest request)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var address = await _addressRepo.GetByIdAsync(id);
        if (address is null)
            return NotFound(new { message = "Endereço não encontrado." });

        if (address.UserId != callerUserId.Value && !User.IsAdmin())
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Street) || string.IsNullOrWhiteSpace(request.Number) || string.IsNullOrWhiteSpace(request.ZipCode))
        {
            return BadRequest(new { message = "Rua, número e CEP são obrigatórios." });
        }

        address.Street = request.Street.Trim();
        address.Number = request.Number.Trim();
        address.Complement = request.Complement?.Trim();
        address.Neighborhood = request.Neighborhood.Trim();
        address.City = request.City.Trim();
        address.State = request.State.Trim().ToUpperInvariant();
        address.ZipCode = request.ZipCode.Trim();
        address.AddressType = string.IsNullOrWhiteSpace(request.AddressType) ? address.AddressType : request.AddressType.Trim();
        address.Latitude = request.Latitude ?? address.Latitude;
        address.Longitude = request.Longitude ?? address.Longitude;

        _addressRepo.Update(address);
        await _addressRepo.SaveChangesAsync();

        var dto = new AddressDto(
            address.Id,
            address.UserId,
            address.Street,
            address.Number,
            address.Complement,
            address.Neighborhood,
            address.City,
            address.State,
            address.ZipCode,
            address.AddressType,
            address.Latitude,
            address.Longitude
        );

        return Ok(dto);
    }

    /// <summary>
    /// Remove um endereço.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var callerUserId = User.GetUserId();
        if (callerUserId is null)
            return Unauthorized(new { message = "Usuário não autenticado." });

        var address = await _addressRepo.GetByIdAsync(id);
        if (address is null)
            return NotFound(new { message = "Endereço não encontrado." });

        if (address.UserId != callerUserId.Value && !User.IsAdmin())
            return Forbid();

        // Se houver serviços associados a este endereço, desvincula o AddressId (SetNull)
        // para que o histórico dos chamados continue intacto e não ocorra erro de FK RESTRICT
        if (_serviceRepo is not null)
        {
            var linkedServices = await _serviceRepo.FindAsync(s => s.AddressId == id);
            foreach (var s in linkedServices)
            {
                s.AddressId = null;
                _serviceRepo.Update(s);
            }
            await _serviceRepo.SaveChangesAsync();
        }

        _addressRepo.Remove(address);
        await _addressRepo.SaveChangesAsync();

        return NoContent();
    }
}
